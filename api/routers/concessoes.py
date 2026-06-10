"""Endpoints de concessões minerárias — decretos de lavra e instrumentos similares."""

import csv
import io
import logging

from fastapi import APIRouter, HTTPException, Query
from starlette.responses import StreamingResponse

from api.services.database import run_query, safe_query

logger = logging.getLogger(__name__)

router = APIRouter()

# Regimes e labels (13 CSVs do Cadastro Mineiro)
REGIME_LABELS = {
    "requerimento_pesquisa": "Requerimento de Pesquisa",
    "alvara_pesquisa": "Alvará de Pesquisa",
    "relatorio_pesquisa": "Relatório de Pesquisa Aprovado",
    "requerimento_lavra": "Requerimento de Lavra",
    "portaria_lavra": "Portaria de Lavra",
    "requerimento_licenciamento": "Requerimento de Licenciamento",
    "licenciamento": "Licenciamento",
    "requerimento_plg": "Requerimento de PLG",
    "plg": "Lavra Garimpeira (PLG)",
    "registro_extracao": "Registro de Extração",
    "requerimento_registro_extracao": "Req. Registro de Extração",
    "guia_utilizacao": "Guia de Utilização",
    "cessao_direitos": "Cessão de Direitos",
}

# Colunas pesadas excluídas do SELECT em listagens
_HEAVY_COLUMNS = {"texto_documentos", "documentos_pdf", "documents_str"}

# Colunas de busca textual
_SEARCHABLE = ["titular", "processo", "processo_norm", "substancia_principal",
               "municipio_principal", "cpf_cnpj_do_titular"]


def _resolve_view() -> str:
    """Retorna view disponível: v_scm (maior, nacional) ou v_concessoes (enriquecido MG)."""
    scm_count = 0
    conc_count = 0
    try:
        r = run_query("SELECT COUNT(*) AS n FROM v_scm LIMIT 1")
        scm_count = r[0]["n"] if r else 0
    except Exception:
        pass
    try:
        r = run_query("SELECT COUNT(*) AS n FROM v_concessoes LIMIT 1")
        conc_count = r[0]["n"] if r else 0
    except Exception:
        pass
    # Prefer v_scm when it has more data (national collection)
    if scm_count > conc_count and scm_count > 0:
        return "v_scm"
    if conc_count > 0:
        return "v_concessoes"
    if scm_count > 0:
        return "v_scm"
    raise HTTPException(status_code=503, detail="Dataset de concessões não disponível")


def _get_columns(view: str) -> list[str]:
    """Retorna colunas da view excluindo as pesadas."""
    desc = run_query(f"DESCRIBE {view}")
    return [r["column_name"] for r in desc if r["column_name"] not in _HEAVY_COLUMNS]


@router.get("/concessoes/filters")
def get_filter_options():
    """Retorna opções únicas para os filtros da sidebar."""
    view = _resolve_view()
    options: dict[str, list] = {}

    for field, alias in [
        ("regime", "regimes"),
        ("categoria", "categorias"),
    ]:
        try:
            rows = run_query(
                f"SELECT DISTINCT {field} FROM {view} "
                f"WHERE {field} IS NOT NULL ORDER BY {field}"
            )
            options[alias] = [r[field] for r in rows]
        except Exception:
            options[alias] = []

    try:
        rows = run_query(
            f"SELECT DISTINCT substancia_principal FROM {view} "
            "WHERE substancia_principal IS NOT NULL "
            "ORDER BY substancia_principal LIMIT 200"
        )
        options["substancias"] = [r["substancia_principal"] for r in rows]
    except Exception:
        options["substancias"] = []

    try:
        rows = run_query(
            f"SELECT DISTINCT municipio_principal FROM {view} "
            "WHERE municipio_principal IS NOT NULL "
            "ORDER BY municipio_principal LIMIT 300"
        )
        options["municipios"] = [r["municipio_principal"] for r in rows]
    except Exception:
        options["municipios"] = []

    # UFs extraídas do campo municipio_principal
    try:
        rows = run_query(
            f"""
            SELECT DISTINCT SUBSTRING(municipio_principal, LENGTH(municipio_principal) - 1, 2) AS uf
            FROM {view}
            WHERE municipio_principal LIKE '% - __'
            ORDER BY uf
            """
        )
        options["ufs"] = [r["uf"] for r in rows if r.get("uf")]
    except Exception:
        options["ufs"] = []

    # Pipeline: contagem por regime (para funnel chart)
    try:
        rows = run_query(
            f"SELECT regime, COUNT(*) AS n FROM {view} WHERE regime IS NOT NULL GROUP BY regime ORDER BY n DESC"
        )
        options["pipeline"] = {r["regime"]: r["n"] for r in rows}
    except Exception:
        options["pipeline"] = {}

    options["regime_labels"] = REGIME_LABELS
    options["view"] = view

    return options


@router.get("/concessoes/stats")
def get_concessoes_stats(
    search: str | None = Query(None, max_length=200),
    regime: list[str] | None = Query(None),
    categoria: list[str] | None = Query(None),
    substancia: list[str] | None = Query(None),
    municipio: list[str] | None = Query(None),
    cfem_status: str | None = Query(None, pattern="^(ativo|inativo)$"),
    estrategico: bool | None = Query(None),
    uf: str | None = Query(None, max_length=2, description="Filtrar por UF (ex: MG, PA, BA)"),
):
    """Retorna KPIs agregados para o filtro atual."""
    view = _resolve_view()
    where, params = _build_where(
        view, search, regime, categoria, substancia, municipio, cfem_status, estrategico, uf=uf,
    )

    stats = {}

    r = run_query(f"SELECT COUNT(*) AS total FROM {view} WHERE {where}", params)
    stats["total"] = r[0]["total"] if r else 0

    if view == "v_concessoes":
        r = run_query(
            f"SELECT COUNT(*) AS n FROM {view} WHERE {where} AND ativo_cfem = true",
            params,
        )
        stats["cfem_ativas"] = r[0]["n"] if r else 0
    else:
        stats["cfem_ativas"] = None

    r = run_query(
        f"SELECT COUNT(DISTINCT substancia_principal) AS n FROM {view} WHERE {where}",
        params,
    )
    stats["substancias"] = r[0]["n"] if r else 0

    r = run_query(
        f"SELECT COUNT(DISTINCT municipio_principal) AS n FROM {view} WHERE {where}",
        params,
    )
    stats["municipios"] = r[0]["n"] if r else 0

    return stats


@router.get("/concessoes")
def list_concessoes(
    search: str | None = Query(None, max_length=200),
    regime: list[str] | None = Query(None),
    categoria: list[str] | None = Query(None),
    substancia: list[str] | None = Query(None),
    municipio: list[str] | None = Query(None),
    cfem_status: str | None = Query(None, pattern="^(ativo|inativo)$"),
    estrategico: bool | None = Query(None),
    uf: str | None = Query(None, max_length=2, description="Filtrar por UF (ex: MG, PA, BA)"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    """Lista concessões com filtros, paginação e colunas leves."""
    view = _resolve_view()
    where, params = _build_where(
        view, search, regime, categoria, substancia, municipio, cfem_status, estrategico, uf=uf,
    )

    cols = _get_columns(view)
    select_sql = ", ".join(cols)

    count_r = run_query(f"SELECT COUNT(*) AS total FROM {view} WHERE {where}", params)
    total = count_r[0]["total"] if count_r else 0

    rows = run_query(
        f"SELECT {select_sql} FROM {view} WHERE {where} "
        f"ORDER BY processo_norm LIMIT ? OFFSET ?",
        [*params, limit, offset],
    )

    return {
        "view": view,
        "total": total,
        "limit": limit,
        "offset": offset,
        "regime_labels": REGIME_LABELS,
        "rows": rows,
    }


@router.get("/concessoes/export.csv")
def export_concessoes_csv(
    search: str | None = Query(None, max_length=200),
    regime: list[str] | None = Query(None),
    categoria: list[str] | None = Query(None),
    substancia: list[str] | None = Query(None),
    municipio: list[str] | None = Query(None),
    cfem_status: str | None = Query(None, pattern="^(ativo|inativo)$"),
    estrategico: bool | None = Query(None),
    uf: str | None = Query(None, max_length=2, description="Filtrar por UF"),
):
    """Exporta concessões filtradas como CSV (max 20.000 linhas)."""
    view = _resolve_view()
    where, params = _build_where(
        view, search, regime, categoria, substancia, municipio, cfem_status, estrategico, uf=uf,
    )

    count_r = run_query(f"SELECT COUNT(*) AS total FROM {view} WHERE {where}", params)
    total = count_r[0]["total"] if count_r else 0
    if total > 20000:
        raise HTTPException(
            status_code=400,
            detail=f"Dataset muito grande ({total} registros). Aplique filtros para reduzir a menos de 20.000.",
        )

    cols = _get_columns(view)
    select_sql = ", ".join(cols)
    rows = run_query(
        f"SELECT {select_sql} FROM {view} WHERE {where} ORDER BY processo_norm",
        params,
    )

    output = io.StringIO()
    if rows:
        writer = csv.DictWriter(output, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="concessoes.csv"'},
    )


@router.get("/concessoes/detail")
def get_concessao_detail(
    processo: str = Query(..., min_length=3, max_length=30),
):
    """Retorna registro completo de uma concessão por processo_norm.

    Uses query param instead of path param because processo_norm contains '/'
    (e.g. '000994/1940') which breaks URL path routing.
    """
    view = _resolve_view()
    cols = _get_columns(view)
    select_sql = ", ".join(cols)

    rows = run_query(
        f"SELECT {select_sql} FROM {view} WHERE processo_norm = ?",
        [processo],
    )
    if not rows:
        raise HTTPException(status_code=404, detail="Concessão não encontrada")

    row = rows[0]
    row["regime_label"] = REGIME_LABELS.get(row.get("regime", ""), row.get("regime", ""))
    row["scm_url"] = "https://sistemas.anm.gov.br/SCM/Extra/site/admin/pesquisarProcessos.aspx"

    return row


# ── Helpers ──


def _build_where(
    view: str,
    search: str | None,
    regime: list[str] | None,
    categoria: list[str] | None,
    substancia: list[str] | None,
    municipio: list[str] | None,
    cfem_status: str | None,
    estrategico: bool | None,
    uf: str | None = None,
) -> tuple[str, list]:
    """Constrói WHERE parametrizado a partir dos filtros."""
    clauses: list[str] = []
    params: list = []

    if search:
        safe = (
            search.replace("\\", "\\\\")
            .replace("%", "\\%")
            .replace("_", "\\_")
        )
        conds = [
            f"LOWER(CAST({col} AS VARCHAR)) LIKE ? ESCAPE '\\'"
            for col in _SEARCHABLE
        ]
        clauses.append(f"({' OR '.join(conds)})")
        for _ in _SEARCHABLE:
            params.append(f"%{safe.lower()}%")

    if regime:
        placeholders = ", ".join("?" for _ in regime)
        clauses.append(f"regime IN ({placeholders})")
        params.extend(regime)

    if categoria:
        placeholders = ", ".join("?" for _ in categoria)
        clauses.append(f"categoria IN ({placeholders})")
        params.extend(categoria)

    if substancia:
        placeholders = ", ".join("?" for _ in substancia)
        clauses.append(f"substancia_principal IN ({placeholders})")
        params.extend(substancia)

    if municipio:
        placeholders = ", ".join("?" for _ in municipio)
        clauses.append(f"municipio_principal IN ({placeholders})")
        params.extend(municipio)

    if cfem_status and view == "v_concessoes":
        if cfem_status == "ativo":
            clauses.append("ativo_cfem = true")
        else:
            clauses.append("(ativo_cfem = false OR ativo_cfem IS NULL)")

    if estrategico is not None and view == "v_concessoes":
        if estrategico:
            clauses.append("estrategico = 'sim'")
        else:
            clauses.append("(estrategico != 'sim' OR estrategico IS NULL)")

    if uf:
        clauses.append("municipio_principal LIKE ?")
        params.append(f"% - {uf}")

    where_sql = " AND ".join(clauses) if clauses else "1=1"
    return where_sql, params
