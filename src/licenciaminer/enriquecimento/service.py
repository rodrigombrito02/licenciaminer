"""Enriquecimento dos 9 parametros do Funil a partir de bases publicas locais.

Para um direito minerario (processo) ou municipio, calcula um score 1-5 por
parametro + evidencia + nivel de confianca. Distancias usam CRS projetado
(SIRGAS UTM 23S) para precisao em MG.

Confianca:
  - alta: distancia real a base oficial (agua, energia, stakeholder)
  - media: derivado de dado tabular local (financeiro, mao de obra, geologico)
  - estimativa: proxy ate a base dedicada ser ingerida (logistica, licenciamento, climatico)
"""

from __future__ import annotations

import logging
from functools import lru_cache
from pathlib import Path

import geopandas as gpd
import pandas as pd

logger = logging.getLogger(__name__)

REF = Path(__file__).resolve().parents[3] / "data" / "reference"
PROC = Path(__file__).resolve().parents[3] / "data" / "processed"
CRS_M = 31983  # SIRGAS 2000 / UTM 23S — metros, bom para MG


def _norm_proc(p: str | None) -> str:
    return "".join(ch for ch in (p or "") if ch.isdigit())


# ── Carga preguicosa das bases (cacheadas) ──
@lru_cache(maxsize=1)
def _geometrias() -> gpd.GeoDataFrame:
    g = gpd.read_parquet(REF / "anm_geometrias_mg.parquet")
    g["_pn"] = g["PROCESSO"].map(_norm_proc)
    return g


@lru_cache(maxsize=8)
def _base(nome: str) -> gpd.GeoDataFrame | None:
    arquivos = {
        "agua": "ana_estacoes_fluviometricas_mg.parquet",
        "subestacoes": "aneel_subestacoes_mg.parquet",
        "lt": "aneel_lt_mg.parquet",
        "biomas": "ibge_biomas.parquet",
        "rodovias": "rodovias_estaduais_mg.parquet",
        "ferrovias": "ferrovias_br.parquet",
        "portos": "portos_br.parquet",
        "ocorrencias": "cprm_ocorrencias_mg.parquet",
        "geologia": "geosgb_ocorrencias.parquet",
    }
    f = arquivos.get(nome)
    if not f or not (REF / f).exists():
        return None
    g = gpd.read_parquet(REF / f)
    if g.crs is None:
        g = g.set_crs(4674)
    return g.to_crs(CRS_M)


def _ponto_do_processo(processo: str):
    """Centroide (em CRS metros) do DM, ou None."""
    pn = _norm_proc(processo)
    if not pn:
        return None
    g = _geometrias()
    sel = g[g["_pn"] == pn]
    if sel.empty:
        return None
    return sel.to_crs(CRS_M).geometry.iloc[0].centroid


@lru_cache(maxsize=1)
def _municipios() -> gpd.GeoDataFrame | None:
    f = REF / "ibge_municipios_mg_centroides.parquet"
    if not f.exists():
        return None
    g = gpd.read_parquet(f)
    if g.crs is None:
        g = g.set_crs(4674)
    g["municipio"] = g["municipio"].str.upper()
    return g.to_crs(CRS_M)


def _ponto(processo: str | None, municipio: str | None):
    """Coordenada do DM (preferida) ou centroide do município (fallback)."""
    p = _ponto_do_processo(processo) if processo else None
    if p is not None:
        return p, "DM"
    mun = (municipio or "").upper().split("-")[0].strip()
    g = _municipios()
    if mun and g is not None:
        sel = g[g["municipio"] == mun]
        if not sel.empty:
            return sel.geometry.iloc[0].centroid, "município"
    return None, None


def _dist_km(ponto, base: gpd.GeoDataFrame | None) -> float | None:
    if ponto is None or base is None or base.empty:
        return None
    return float(base.geometry.distance(ponto).min()) / 1000.0


def _score_dist(km: float | None) -> int:
    if km is None:
        return 0
    if km < 10:
        return 5
    if km < 25:
        return 4
    if km < 50:
        return 3
    if km < 100:
        return 2
    return 1


def _p(score, evidencia, confianca):
    return {"score": score, "evidencia": evidencia, "confianca": confianca}


# ── Parametros tabulares ──
@lru_cache(maxsize=1)
def _cfem_por_municipio() -> dict:
    try:
        import duckdb
        con = duckdb.connect()
        rows = con.execute(
            f"SELECT upper(Município) m, COUNT(*) n, SUM(TRY_CAST(ValorRecolhido AS DOUBLE)) v "
            f"FROM '{PROC / 'anm_cfem.parquet'}' GROUP BY 1"
        ).fetchall()
        return {r[0]: (r[1], r[2] or 0) for r in rows}
    except Exception as exc:
        logger.warning("cfem municipio: %s", exc)
        return {}


@lru_cache(maxsize=1)
def _semad_por_municipio() -> dict:
    """Taxa de deferimento SEMAD por municipio: {MUN: (deferidos, total)}."""
    try:
        import duckdb
        con = duckdb.connect()
        rows = con.execute(
            f"SELECT upper(municipio) m, "
            f"SUM(CASE WHEN lower(decisao)='deferido' THEN 1 ELSE 0 END) def, COUNT(*) tot "
            f"FROM '{PROC / 'mg_semad_licencas_api.parquet'}' WHERE municipio IS NOT NULL GROUP BY 1"
        ).fetchall()
        return {r[0]: (r[1], r[2]) for r in rows}
    except Exception as exc:
        logger.warning("semad municipio: %s", exc)
        return {}


def enriquecer(
    processo: str | None = None,
    municipio: str | None = None,
    uf: str | None = None,
    substancia: str | None = None,
    categoria: str | None = None,
    valor_relativo: str | None = None,
    tem_uc: bool | None = None,
    tem_ti: bool | None = None,
) -> dict:
    """Calcula os 9 parametros. Robusto: cada um em try/except."""
    out: dict = {}
    ponto, origem = _ponto(processo, municipio)
    # Confiança da distância: alta se geometria do DM, média se centroide do município
    conf_dist = "alta" if origem == "DM" else "media"
    suf = "" if origem == "DM" else " (referência: centroide do município)"
    mun_key = (municipio or "").upper().split("-")[0].strip()

    # 1. Água — distância à estação fluviométrica (ANA)
    try:
        km = _dist_km(ponto, _base("agua"))
        if km is not None:
            out["agua"] = _p(_score_dist(km), f"{km:.0f} km da estação fluviométrica ANA mais próxima{suf}", conf_dist)
        else:
            out["agua"] = _p(0, "Não localizável (sem geometria nem município)", "estimativa")
    except Exception as e:
        out["agua"] = _p(0, f"erro: {e}", "estimativa")

    # 2. Energia — distância à subestação OU linha de transmissão (ANEEL)
    try:
        d_sub = _dist_km(ponto, _base("subestacoes"))
        d_lt = _dist_km(ponto, _base("lt"))
        cand = [d for d in (d_sub, d_lt) if d is not None]
        if cand:
            km = min(cand)
            qual = "subestação" if d_sub is not None and km == d_sub else "linha de transmissão"
            out["energia"] = _p(_score_dist(km), f"{km:.0f} km da {qual} ANEEL mais próxima{suf}", conf_dist)
        else:
            out["energia"] = _p(0, "Não localizável", "estimativa")
    except Exception as e:
        out["energia"] = _p(0, f"erro: {e}", "estimativa")

    # 3. Logística — multimodal: rodovia + ferrovia (menor distância pondera o score)
    try:
        d_rod = _dist_km(ponto, _base("rodovias"))
        d_fer = _dist_km(ponto, _base("ferrovias"))
        cand = [d for d in (d_rod, d_fer) if d is not None]
        if cand:
            km = min(cand)
            sc = 5 if km < 2 else 4 if km < 5 else 3 if km < 15 else 2 if km < 30 else 1
            partes = []
            if d_rod is not None:
                partes.append(f"{d_rod:.1f} km de rodovia")
            if d_fer is not None:
                partes.append(f"{d_fer:.0f} km de ferrovia")
            out["logistica"] = _p(sc, " · ".join(partes) + suf, conf_dist)
        else:
            out["logistica"] = _p(3, "Estimativa — sem localização", "estimativa")
    except Exception as e:
        out["logistica"] = _p(0, f"erro: {e}", "estimativa")

    # 3b. Destinação — porto mais próximo (rota de escoamento/exportação)
    try:
        portos = _base("portos")
        km = _dist_km(ponto, portos)
        if km is not None and ponto is not None:
            nome = None
            try:
                idx = portos.geometry.distance(ponto).idxmin()
                nome = portos.loc[idx].get("nome")
            except Exception:
                nome = None
            sc = 5 if km < 50 else 4 if km < 150 else 3 if km < 300 else 2 if km < 600 else 1
            alvo = f" — {nome}" if nome else ""
            out["destinacao"] = _p(sc, f"{km:.0f} km do porto mais próximo{alvo}{suf}", conf_dist)
        else:
            out["destinacao"] = _p(0, "Porto não localizável", "estimativa")
    except Exception as e:
        out["destinacao"] = _p(0, f"erro: {e}", "estimativa")

    # 4. Mão de obra — atividade mineira no município (CFEM)
    try:
        cf = _cfem_por_municipio()
        n, v = cf.get(mun_key, (0, 0))
        if n >= 20:
            sc, txt = 5, "região com forte atividade mineira (mão de obra disponível)"
        elif n >= 5:
            sc, txt = 4, "atividade mineira relevante no município"
        elif n >= 1:
            sc, txt = 3, "alguma atividade mineira local"
        else:
            sc, txt = 2, "pouca/sem atividade mineira no município"
        out["mao_obra"] = _p(sc, f"{n} recolhimentos CFEM — {txt}", "media")
    except Exception as e:
        out["mao_obra"] = _p(0, f"erro: {e}", "estimativa")

    # 5. Licenciamento — taxa histórica de deferimento SEMAD no município
    try:
        sm = _semad_por_municipio()
        deferidos, total = sm.get(mun_key, (0, 0))
        if total >= 5:
            taxa = deferidos / total
            sc = 5 if taxa > 0.85 else 4 if taxa > 0.75 else 3 if taxa > 0.6 else 2 if taxa > 0.4 else 1
            out["licenciamento"] = _p(sc, f"Deferimento histórico SEMAD no município: {taxa*100:.0f}% ({total} decisões)", "media")
        elif total >= 1:
            out["licenciamento"] = _p(3, f"Poucas decisões SEMAD no município ({total}) — base estatística fraca", "estimativa")
        else:
            out["licenciamento"] = _p(3, "Sem histórico SEMAD no município — ver Análise Preliminar", "estimativa")
    except Exception as e:
        out["licenciamento"] = _p(0, f"erro: {e}", "estimativa")

    # 6. Financeiro — valor relativo da substância
    try:
        vr = (valor_relativo or "").lower()
        mapa = {"muito_alto": (5, "muito alto"), "alto": (4, "alto"),
                "medio": (3, "médio"), "baixo": (2, "baixo")}
        sc, txt = mapa.get(vr, (3, "a avaliar"))
        out["financeiro"] = _p(sc, f"Valor relativo da substância: {txt}", "media")
    except Exception as e:
        out["financeiro"] = _p(0, f"erro: {e}", "estimativa")

    # 7. Stakeholder/ESG — sobreposição com UC/TI
    try:
        if tem_ti:
            out["stakeholder"] = _p(1, "Sobrepõe Terra Indígena — alto risco socioambiental", "alta")
        elif tem_uc:
            out["stakeholder"] = _p(2, "Sobrepõe Unidade de Conservação", "alta")
        elif tem_uc is False and tem_ti is False:
            out["stakeholder"] = _p(5, "Sem sobreposição com UC/TI", "alta")
        else:
            out["stakeholder"] = _p(0, "Sobreposição não avaliada", "estimativa")
    except Exception as e:
        out["stakeholder"] = _p(0, f"erro: {e}", "estimativa")

    # 8. Geológico — ocorrência mineral conhecida mais próxima (SGB/ex-CPRM)
    try:
        geo = _base("geologia")
        km = _dist_km(ponto, geo)
        if km is not None and ponto is not None:
            # status da ocorrência mais próxima (Mina/Garimpo = sinal forte)
            status = None
            try:
                idx = geo.geometry.distance(ponto).idxmin()
                status = geo.loc[idx].get("STATUS_ECONOMICO")
            except Exception:
                status = None
            forte = str(status) in ("Mina", "Garimpo")
            if km < 5:
                sc = 5 if forte else 4
            elif km < 15:
                sc = 4 if forte else 3
            elif km < 40:
                sc = 3
            else:
                sc = 2
            alvo = f" ({status})" if status else ""
            out["geologico"] = _p(sc, f"{km:.0f} km da ocorrência mineral SGB mais próxima{alvo}{suf}", conf_dist)
        elif (categoria or "").startswith("Metálicos"):
            out["geologico"] = _p(4, f"Substância de classe metálica ({categoria})", "media")
        else:
            out["geologico"] = _p(3, "A caracterizar (sondagem/SGB)", "estimativa")
    except Exception as e:
        out["geologico"] = _p(0, f"erro: {e}", "estimativa")

    # 9. Climático/Pluviometria — regime de chuva → drenagem, gestão de água, OpEx.
    # Score reflete FAVORABILIDADE OPERACIONAL: chuva moderada e bem distribuída = melhor;
    # muito alta = OpEx de drenagem/bombeamento; muito baixa = escassez para o processo.
    try:
        if ponto is not None and _base("biomas") is not None:
            b = _base("biomas")
            hit = b[b.geometry.contains(ponto)]
            bioma = hit["Bioma"].iloc[0] if not hit.empty else None
            clima = {
                "Caatinga": (2, "~600-900 mm/ano (semiárido): risco de escassez hídrica para o processo"),
                "Cerrado": (3, "~1200-1400 mm/ano, estação chuvosa concentrada: dimensionar drenagem para picos"),
                "Mata Atlântica": (3, "~1300-1600 mm/ano (alta): maior OpEx de drenagem e bombeamento de mina"),
                "Amazônia": (2, "~2000+ mm/ano (muito alta): gestão de água e drenagem críticas, OpEx elevado"),
                "Pampa": (4, "~1400 mm/ano bem distribuído: regime favorável à operação"),
                "Pantanal": (2, "sazonal com alagamento: risco operacional e de contenção"),
            }
            sc, txt = clima.get(bioma, (3, "regime a caracterizar"))
            ev = f"Bioma {bioma} — {txt}" if bioma else "Bioma não identificado"
            out["climatico"] = _p(sc, ev, "estimativa")
        else:
            out["climatico"] = _p(3, "Estimativa — pluviometria precisa (INMET normais) a integrar", "estimativa")
    except Exception as e:
        out["climatico"] = _p(0, f"erro: {e}", "estimativa")

    return out
