"""Endpoints geoespaciais — GeoJSON para mapa de concessões minerárias."""

import logging

import geopandas as gpd
from fastapi import APIRouter, HTTPException, Query

from licenciaminer.config import DATA_DIR, REFERENCE_DIR
from licenciaminer.processors.normalize import normalize_processo

logger = logging.getLogger(__name__)

router = APIRouter()

# Paletas de cores para o frontend
CATEGORY_COLORS = {
    "Metálicos Ferrosos": "#E74C3C",
    "Metálicos Preciosos": "#FF5F00",
    "Metálicos Estratégicos": "#E67E22",
    "Metálicos Não-Ferrosos": "#9B59B6",
    "Gemas e Pedras Preciosas": "#1ABC9C",
    "Industrial": "#2980B9",
    "Construção Civil": "#95A5A6",
    "Rochas Ornamentais": "#8D6E63",
    "Água Mineral": "#156082",
}

REGIME_COLORS = {
    "portaria_lavra": "#FF5F00",
    "licenciamento": "#2980B9",
    "plg": "#E67E22",
    "registro_extracao": "#95A5A6",
}

FASE_COLORS = {
    "CONCESSÃO DE LAVRA": "#FF5F00",
    "CONCESSAO DE LAVRA": "#FF5F00",
    "LICENCIAMENTO": "#2980B9",
    "LAVRA GARIMPEIRA": "#E67E22",
    "AUTORIZAÇÃO DE PESQUISA": "#27AE60",
    "REQUERIMENTO DE PESQUISA": "#95A5A6",
    "REQUERIMENTO DE LAVRA": "#156082",
    "DISPONIBILIDADE": "#7f8c8d",
}

# Cache em memória (geometrias são estáticas)
_geo_cache: dict[str, object] = {}
MAX_POLYGONS = 5000


def _load_geometries():
    """Carrega geometrias ANM e simplifica para web."""
    if "gdf" in _geo_cache:
        return _geo_cache["gdf"]

    geo_path = REFERENCE_DIR / "anm_geometrias_mg.parquet"
    if not geo_path.exists():
        return None

    gdf = gpd.read_parquet(geo_path)
    gdf["processo_norm"] = gdf["PROCESSO"].apply(normalize_processo)
    gdf["geometry"] = gdf["geometry"].simplify(tolerance=0.001, preserve_topology=True)
    _geo_cache["gdf"] = gdf
    return gdf


def _load_concessoes_data():
    """Carrega dados tabulares SCM para enriquecer geometrias."""
    if "conc" in _geo_cache:
        return _geo_cache["conc"]

    import pandas as pd

    for fname in ["concessoes_mg.parquet", "scm_concessoes.parquet"]:
        path = DATA_DIR / "processed" / fname
        if path.exists():
            df = pd.read_parquet(path)
            _geo_cache["conc"] = df
            return df
    return None


def _load_restriction_layer(name: str):
    """Carrega camada de restrição (UCs ou TIs)."""
    cache_key = f"layer_{name}"
    if cache_key in _geo_cache:
        return _geo_cache[cache_key]

    paths = {
        "ucs": REFERENCE_DIR / "icmbio_ucs.parquet",
        "tis": REFERENCE_DIR / "funai_tis.parquet",
        "biomas": REFERENCE_DIR / "ibge_biomas.parquet",
        "energia": REFERENCE_DIR / "aneel_lt_mg.parquet",  # linhas de transmissão ANEEL/SIGEL
        "subestacoes": REFERENCE_DIR / "aneel_subestacoes_mg.parquet",  # áreas de subestação (ANEEL)
        "agua": REFERENCE_DIR / "ana_estacoes_fluviometricas_mg.parquet",  # estações fluviométricas ANA
        "ferrovias": REFERENCE_DIR / "ferrovias_br.parquet",  # ferrovias (MInfra/INDE)
        "portos": REFERENCE_DIR / "portos_br.parquet",  # portos (MInfra/INDE)
    }
    # Biomas sao poligonos continentais — simplificar mais forte para a web.
    tolerancias = {"biomas": 0.05}
    path = paths.get(name)
    if path and path.exists():
        gdf = gpd.read_parquet(path)
        tol = tolerancias.get(name, 0.005)
        gdf["geometry"] = gdf["geometry"].simplify(tolerance=tol, preserve_topology=True)
        _geo_cache[cache_key] = gdf
        return gdf
    return None


@router.get("/geo/concessoes")
def get_concessoes_geojson(
    regime: list[str] | None = Query(None),
    categoria: list[str] | None = Query(None),
    substancia: list[str] | None = Query(None),
    cfem_status: str | None = Query(None, pattern="^(ativo|inativo)$"),
    estrategico: bool | None = Query(None),
    limit: int = Query(MAX_POLYGONS, ge=1, le=MAX_POLYGONS),
):
    """Retorna GeoJSON de concessões minerárias com filtros opcionais.

    Geometrias são simplificadas para renderização web.
    Máximo 5000 polígonos por request.
    """
    gdf = _load_geometries()
    if gdf is None:
        raise HTTPException(status_code=503, detail="Geometrias não disponíveis")

    # Enriquecer com dados SCM
    conc_df = _load_concessoes_data()
    enriched = False
    if conc_df is not None and "processo_norm" in conc_df.columns:
        enrich_cols = ["processo_norm"]
        for col in ["titular", "regime", "substancia_principal", "municipio_principal",
                     "categoria", "ativo_cfem", "cfem_total", "estrategico"]:
            if col in conc_df.columns:
                enrich_cols.append(col)

        conc_dedup = conc_df[enrich_cols].drop_duplicates(subset=["processo_norm"])
        gdf = gdf.merge(conc_dedup, on="processo_norm", how="left")
        enriched = True

    # Aplicar filtros
    filtered = gdf.copy()

    if enriched:
        if regime:
            filtered = filtered[filtered["regime"].isin(regime)]
        if categoria:
            filtered = filtered[filtered["categoria"].isin(categoria)]
        if substancia:
            filtered = filtered[filtered["substancia_principal"].isin(substancia)]
        if cfem_status == "ativo":
            filtered = filtered[filtered["ativo_cfem"] == True]  # noqa: E712
        elif cfem_status == "inativo":
            filtered = filtered[
                (filtered["ativo_cfem"] == False) | (filtered["ativo_cfem"].isna())  # noqa: E712
            ]
        if estrategico is True:
            filtered = filtered[filtered["estrategico"] == "sim"]

    # Remover geometrias vazias
    filtered = filtered[filtered.geometry.notna() & ~filtered.geometry.is_empty]

    total_before_limit = len(filtered)
    filtered = filtered.head(limit)

    # Selecionar colunas para GeoJSON (sem dados pesados)
    keep_cols = ["geometry", "processo_norm"]
    for col in ["FASE", "AREA_HA", "titular", "regime", "substancia_principal",
                 "municipio_principal", "categoria", "ativo_cfem", "cfem_total", "estrategico"]:
        if col in filtered.columns:
            keep_cols.append(col)

    geojson = filtered[keep_cols].__geo_interface__

    return {
        "total": total_before_limit,
        "returned": len(filtered),
        "truncated": total_before_limit > limit,
        "enriched": enriched,
        "geojson": geojson,
    }


@router.get("/geo/concessoes/stats")
def get_geo_stats(
    regime: list[str] | None = Query(None),
    categoria: list[str] | None = Query(None),
    substancia: list[str] | None = Query(None),
    cfem_status: str | None = Query(None, pattern="^(ativo|inativo)$"),
    estrategico: bool | None = Query(None),
):
    """Retorna KPIs para o mapa (sem transferir geometrias)."""
    gdf = _load_geometries()
    if gdf is None:
        raise HTTPException(status_code=503, detail="Geometrias não disponíveis")

    conc_df = _load_concessoes_data()
    enriched = False
    if conc_df is not None and "processo_norm" in conc_df.columns:
        enrich_cols = ["processo_norm"]
        for col in ["titular", "regime", "substancia_principal", "municipio_principal",
                     "categoria", "ativo_cfem", "cfem_total", "estrategico"]:
            if col in conc_df.columns:
                enrich_cols.append(col)
        conc_dedup = conc_df[enrich_cols].drop_duplicates(subset=["processo_norm"])
        merged = gdf.merge(conc_dedup, on="processo_norm", how="left")
        enriched = True
    else:
        merged = gdf

    filtered = merged[merged.geometry.notna() & ~merged.geometry.is_empty]

    if enriched:
        if regime:
            filtered = filtered[filtered["regime"].isin(regime)]
        if categoria:
            filtered = filtered[filtered["categoria"].isin(categoria)]
        if substancia:
            filtered = filtered[filtered["substancia_principal"].isin(substancia)]
        if cfem_status == "ativo":
            filtered = filtered[filtered["ativo_cfem"] == True]  # noqa: E712
        elif cfem_status == "inativo":
            filtered = filtered[
                (filtered["ativo_cfem"] == False) | (filtered["ativo_cfem"].isna())  # noqa: E712
            ]
        if estrategico is True:
            filtered = filtered[filtered["estrategico"] == "sim"]

    stats = {
        "total_polygons": len(filtered),
        "total_all": len(gdf),
        "enriched": enriched,
    }

    if enriched and "regime" in filtered.columns:
        stats["enriched_count"] = int(filtered["regime"].notna().sum())
    if "substancia_principal" in filtered.columns:
        stats["distinct_substances"] = int(filtered["substancia_principal"].nunique())
    if "AREA_HA" in filtered.columns:
        stats["total_area_ha"] = float(filtered["AREA_HA"].sum())

    return stats


@router.get("/geo/concessoes/filters")
def get_geo_filter_options():
    """Retorna opções para filtros do mapa."""
    gdf = _load_geometries()
    if gdf is None:
        raise HTTPException(status_code=503, detail="Geometrias não disponíveis")

    conc_df = _load_concessoes_data()
    options: dict[str, list] = {}

    if conc_df is not None:
        for col, key in [
            ("regime", "regimes"),
            ("categoria", "categorias"),
        ]:
            if col in conc_df.columns:
                options[key] = sorted(conc_df[col].dropna().unique().tolist())
            else:
                options[key] = []

        if "substancia_principal" in conc_df.columns:
            options["substancias"] = sorted(
                conc_df["substancia_principal"].dropna().unique().tolist()
            )[:100]
        else:
            options["substancias"] = []
    else:
        options = {"regimes": [], "categorias": [], "substancias": []}

    if "FASE" in gdf.columns:
        options["fases"] = sorted(gdf["FASE"].dropna().unique().tolist())

    return {
        "options": options,
        "color_palettes": {
            "categoria": CATEGORY_COLORS,
            "regime": REGIME_COLORS,
            "fase": FASE_COLORS,
        },
    }


@router.get("/geo/layers/{layer_name}")
def get_restriction_layer(layer_name: str):
    """Retorna GeoJSON de camada geo (UCs, TIs ou Biomas)."""
    if layer_name not in ("ucs", "tis", "biomas", "energia", "subestacoes", "agua", "ferrovias", "portos"):
        raise HTTPException(status_code=404, detail="Camada não encontrada.")

    gdf = _load_restriction_layer(layer_name)
    if gdf is None:
        raise HTTPException(
            status_code=503,
            detail=f"Camada '{layer_name}' não disponível",
        )

    return gdf.__geo_interface__
