"""Endpoints de análise de decisões de licenciamento."""

from __future__ import annotations

from fastapi import APIRouter, Query

from api.services.database import safe_query, run_query
from licenciaminer.database.queries import (
    QUERY_APROVACAO_ATIVIDADE_CLASSE,
    QUERY_ARQUIVAMENTO_ANALYSIS,
    QUERY_CFEM_VS_APROVACAO,
    QUERY_CLASSE_MODALIDADE,
    QUERY_DECISAO_POR_MODALIDADE,
    QUERY_INFRACOES_FAIXA_DECISAO,
    QUERY_INFRACOES_VS_APROVACAO,
    QUERY_MG_APPROVAL_RATES,
    QUERY_REINCIDENCIA,
    QUERY_RIGOR_REGIONAL,
    QUERY_SPATIAL_VS_APROVACAO,
    QUERY_TENDENCIA_INDEFERIMENTO,
    query_approval_stats,
    query_similar_cases,
)

router = APIRouter()


# ── Filtro helpers ──────────────────────────────────────────────────────────


def _build_where(
    regional: str | None = None,
    modalidade: str | None = None,
    classe: int | None = None,
    atividade: str | None = None,
    decisao: str | None = None,
    ano_min: int | None = None,
    ano_max: int | None = None,
    mining_only: bool = False,
    *,
    table_alias: str = "",
) -> tuple[str, list]:
    """Gera cláusula WHERE dinâmica para v_mg_semad."""
    prefix = f"{table_alias}." if table_alias else ""
    clauses: list[str] = []
    params: list = []

    if regional:
        clauses.append(f"{prefix}regional = ?")
        params.append(regional)
    if modalidade:
        clauses.append(f"{prefix}modalidade = ?")
        params.append(modalidade)
    if classe is not None:
        clauses.append(f"{prefix}classe = ?")
        params.append(classe)
    if atividade:
        clauses.append(f"{prefix}atividade LIKE ?")
        params.append(f"{atividade}%")
    if decisao:
        clauses.append(f"{prefix}decisao = ?")
        params.append(decisao)
    if ano_min is not None:
        clauses.append(f"CAST({prefix}ano AS INTEGER) >= ?")
        params.append(ano_min)
    if ano_max is not None:
        clauses.append(f"CAST({prefix}ano AS INTEGER) <= ?")
        params.append(ano_max)
    if mining_only:
        clauses.append(f"{prefix}atividade LIKE 'A-0%'")

    where = " AND ".join(clauses)
    return (f"WHERE {where}" if where else ""), params


# ── Novos endpoints filtráveis ─────────────────────────────────────────────


@router.get("/decisions/filter-options")
def get_filter_options():
    """Retorna valores únicos disponíveis para cada filtro."""
    return {
        "regional": [r[0] for r in safe_query(
            "SELECT DISTINCT regional FROM v_mg_semad WHERE regional IS NOT NULL AND regional != '' ORDER BY regional"
        ) if isinstance(r, dict) and r.get("regional")] if not safe_query(
            "SELECT DISTINCT regional FROM v_mg_semad WHERE regional IS NOT NULL AND regional != '' ORDER BY regional"
        ) else _query_distinct("regional"),
        "modalidade": _query_distinct("modalidade"),
        "classe": _query_distinct_int("classe"),
        "atividade_tipologia": _query_distinct_prefix("atividade"),
        "decisao": _query_distinct("decisao"),
        "anos": _query_distinct("ano"),
    }


def _query_distinct(col: str) -> list[str]:
    rows = safe_query(
        f"SELECT DISTINCT {col} FROM v_mg_semad WHERE {col} IS NOT NULL AND {col} != '' ORDER BY {col}"
    )
    return [r[col] for r in rows]


def _query_distinct_int(col: str) -> list[int]:
    rows = safe_query(
        f"SELECT DISTINCT {col} FROM v_mg_semad WHERE {col} IS NOT NULL ORDER BY {col}"
    )
    return [r[col] for r in rows]


def _query_distinct_prefix(col: str) -> list[dict]:
    """Retorna tipologias agrupadas (A - Minerárias, B - Metalúrgica, etc.)."""
    rows = safe_query(
        f"""
        SELECT SUBSTRING({col}, 1, 1) AS letra,
               MIN({col}) AS exemplo,
               COUNT(*) AS n
        FROM v_mg_semad
        WHERE {col} IS NOT NULL AND {col} != ''
        GROUP BY SUBSTRING({col}, 1, 1)
        ORDER BY letra
        """
    )
    labels = {
        "A": "A - Atividades Minerárias",
        "B": "B - Indústria Metalúrgica",
        "C": "C - Indústria Química",
        "D": "D - Indústria Alimentícia",
        "E": "E - Atividades de Infraestrutura",
        "F": "F - Gerenciamento de Resíduos",
        "G": "G - Atividades Agrossilvipastoris",
        "H": "H - Outras Atividades",
    }
    return [{"letra": r["letra"], "label": labels.get(r["letra"], r["letra"]), "n": r["n"]} for r in rows]


@router.get("/decisions/summary")
def get_summary(
    regional: str | None = Query(None),
    modalidade: str | None = Query(None),
    classe: int | None = Query(None),
    atividade: str | None = Query(None),
    decisao: str | None = Query(None),
    ano_min: int | None = Query(None),
    ano_max: int | None = Query(None),
    mining_only: bool = Query(False),
):
    """KPIs de resumo filtrados."""
    where, params = _build_where(regional, modalidade, classe, atividade, decisao, ano_min, ano_max, mining_only)
    rows = safe_query(
        f"""
        SELECT
            COUNT(*) AS total,
            SUM(CASE WHEN decisao = 'deferido' THEN 1 ELSE 0 END) AS deferidos,
            SUM(CASE WHEN decisao = 'indeferido' THEN 1 ELSE 0 END) AS indeferidos,
            SUM(CASE WHEN decisao = 'arquivamento' THEN 1 ELSE 0 END) AS arquivamentos,
            ROUND(100.0 * SUM(CASE WHEN decisao = 'deferido' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 1) AS taxa_aprovacao
        FROM v_mg_semad
        {where}
        """,
        params,
    )
    return rows[0] if rows else {}


@router.get("/decisions/by-regional")
def get_by_regional(
    regional: str | None = Query(None),
    modalidade: str | None = Query(None),
    classe: int | None = Query(None),
    atividade: str | None = Query(None),
    decisao: str | None = Query(None),
    ano_min: int | None = Query(None),
    ano_max: int | None = Query(None),
    mining_only: bool = Query(False),
):
    """Contagem por regional, filtrada."""
    where, params = _build_where(regional, modalidade, classe, atividade, decisao, ano_min, ano_max, mining_only)
    return safe_query(
        f"""
        SELECT regional, COUNT(*) AS total,
            SUM(CASE WHEN decisao='deferido' THEN 1 ELSE 0 END) AS deferidos,
            SUM(CASE WHEN decisao='indeferido' THEN 1 ELSE 0 END) AS indeferidos,
            ROUND(100.0 * SUM(CASE WHEN decisao='deferido' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 1) AS taxa
        FROM v_mg_semad {where}
        GROUP BY regional ORDER BY total DESC
        """,
        params,
    )


@router.get("/decisions/by-classe")
def get_by_classe(
    regional: str | None = Query(None),
    modalidade: str | None = Query(None),
    classe: int | None = Query(None),
    atividade: str | None = Query(None),
    decisao: str | None = Query(None),
    ano_min: int | None = Query(None),
    ano_max: int | None = Query(None),
    mining_only: bool = Query(False),
):
    """Contagem por classe, filtrada."""
    where, params = _build_where(regional, modalidade, classe, atividade, decisao, ano_min, ano_max, mining_only)
    return safe_query(
        f"""
        SELECT classe, COUNT(*) AS total,
            SUM(CASE WHEN decisao='deferido' THEN 1 ELSE 0 END) AS deferidos,
            ROUND(100.0 * SUM(CASE WHEN decisao='deferido' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 1) AS taxa
        FROM v_mg_semad {where}
        GROUP BY classe ORDER BY classe
        """,
        params,
    )


@router.get("/decisions/by-atividade")
def get_by_atividade(
    regional: str | None = Query(None),
    modalidade: str | None = Query(None),
    classe: int | None = Query(None),
    atividade: str | None = Query(None),
    decisao: str | None = Query(None),
    ano_min: int | None = Query(None),
    ano_max: int | None = Query(None),
    mining_only: bool = Query(False),
):
    """Contagem por tipologia de atividade, filtrada."""
    where, params = _build_where(regional, modalidade, classe, atividade, decisao, ano_min, ano_max, mining_only)
    return safe_query(
        f"""
        SELECT SUBSTRING(atividade, 1, 1) AS tipologia,
            COUNT(*) AS total,
            SUM(CASE WHEN decisao='deferido' THEN 1 ELSE 0 END) AS deferidos,
            ROUND(100.0 * SUM(CASE WHEN decisao='deferido' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 1) AS taxa
        FROM v_mg_semad {where} {"AND" if where else "WHERE"} atividade IS NOT NULL AND atividade != ''
        GROUP BY SUBSTRING(atividade, 1, 1) ORDER BY total DESC
        """,
        params,
    )


@router.get("/decisions/trend")
def get_trend_filtered(
    regional: str | None = Query(None),
    modalidade: str | None = Query(None),
    classe: int | None = Query(None),
    atividade: str | None = Query(None),
    decisao: str | None = Query(None),
    ano_min: int | None = Query(None),
    ano_max: int | None = Query(None),
    mining_only: bool = Query(False),
):
    """Timeline por ano, filtrada."""
    where, params = _build_where(regional, modalidade, classe, atividade, decisao, ano_min, ano_max, mining_only)
    return safe_query(
        f"""
        SELECT ano, COUNT(*) AS total,
            SUM(CASE WHEN decisao='deferido' THEN 1 ELSE 0 END) AS deferidos,
            SUM(CASE WHEN decisao='indeferido' THEN 1 ELSE 0 END) AS indeferidos,
            ROUND(100.0 * SUM(CASE WHEN decisao='deferido' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 1) AS taxa
        FROM v_mg_semad {where}
        GROUP BY ano ORDER BY ano
        """,
        params,
    )


@router.get("/decisions/by-modalidade-filtered")
def get_by_modalidade_filtered(
    regional: str | None = Query(None),
    modalidade: str | None = Query(None),
    classe: int | None = Query(None),
    atividade: str | None = Query(None),
    decisao: str | None = Query(None),
    ano_min: int | None = Query(None),
    ano_max: int | None = Query(None),
    mining_only: bool = Query(False),
):
    """Contagem por modalidade, filtrada."""
    where, params = _build_where(regional, modalidade, classe, atividade, decisao, ano_min, ano_max, mining_only)
    return safe_query(
        f"""
        SELECT modalidade, COUNT(*) AS total,
            SUM(CASE WHEN decisao='deferido' THEN 1 ELSE 0 END) AS deferidos,
            SUM(CASE WHEN decisao='indeferido' THEN 1 ELSE 0 END) AS indeferidos,
            ROUND(100.0 * SUM(CASE WHEN decisao='deferido' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 1) AS taxa
        FROM v_mg_semad {where}
        GROUP BY modalidade ORDER BY total DESC
        """,
        params,
    )


@router.get("/decisions/profile")
def get_licensing_profile(
    atividade: str = Query(..., description="Código de atividade (ex: A-02-06-2)"),
    classe: int | None = Query(None),
    regional: str | None = Query(None),
):
    """Perfil de licenciamento: probabilidade, rigor, tendência, complexidade."""
    # 1. Stats para o perfil específico
    where_parts = ["atividade LIKE ?"]
    params = [f"{atividade}%"]
    if classe is not None:
        where_parts.append("classe = ?")
        params.append(classe)
    if regional:
        where_parts.append("regional = ?")
        params.append(regional)
    where = "WHERE " + " AND ".join(where_parts)

    profile_rows = safe_query(
        f"""
        SELECT
            COUNT(*) AS n_decisoes,
            SUM(CASE WHEN decisao='deferido' THEN 1 ELSE 0 END) AS deferidos,
            ROUND(100.0 * SUM(CASE WHEN decisao='deferido' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 1) AS probabilidade
        FROM v_mg_semad {where}
        """,
        params,
    )
    profile = profile_rows[0] if profile_rows else {"n_decisoes": 0, "deferidos": 0, "probabilidade": None}

    # 2. Media geral para calcular rigor
    global_rows = safe_query(
        "SELECT ROUND(100.0 * SUM(CASE WHEN decisao='deferido' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 1) AS media_geral FROM v_mg_semad"
    )
    media_geral = global_rows[0]["media_geral"] if global_rows else 0

    # 3. Rigor regional (se regional foi informada)
    rigor_delta = None
    if regional:
        regional_rows = safe_query(
            "SELECT ROUND(100.0 * SUM(CASE WHEN decisao='deferido' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 1) AS taxa_regional FROM v_mg_semad WHERE regional = ?",
            [regional],
        )
        if regional_rows and regional_rows[0].get("taxa_regional") is not None:
            rigor_delta = round(regional_rows[0]["taxa_regional"] - media_geral, 1)

    # 4. Tendência (últimos 3 anos vs. 3 anos anteriores)
    tendencia_rows = safe_query(
        f"""
        SELECT
            ROUND(100.0 * SUM(CASE WHEN CAST(ano AS INT) >= 2023 AND decisao='deferido' THEN 1 ELSE 0 END)
                / NULLIF(SUM(CASE WHEN CAST(ano AS INT) >= 2023 THEN 1 ELSE 0 END), 0), 1) AS taxa_recente,
            ROUND(100.0 * SUM(CASE WHEN CAST(ano AS INT) BETWEEN 2020 AND 2022 AND decisao='deferido' THEN 1 ELSE 0 END)
                / NULLIF(SUM(CASE WHEN CAST(ano AS INT) BETWEEN 2020 AND 2022 THEN 1 ELSE 0 END), 0), 1) AS taxa_anterior
        FROM v_mg_semad {where}
        """,
        params,
    )
    tendencia = None
    if tendencia_rows and tendencia_rows[0].get("taxa_recente") is not None and tendencia_rows[0].get("taxa_anterior") is not None:
        tendencia = round(tendencia_rows[0]["taxa_recente"] - tendencia_rows[0]["taxa_anterior"], 1)

    return {
        "atividade": atividade,
        "classe": classe,
        "regional": regional,
        "n_decisoes": profile.get("n_decisoes", 0),
        "probabilidade_aprovacao": profile.get("probabilidade"),
        "media_geral": media_geral,
        "rigor_regional_delta": rigor_delta,
        "tendencia_3anos": tendencia,
    }


@router.get("/decisions/insights")
def get_contextual_insights(
    regional: str | None = Query(None),
    modalidade: str | None = Query(None),
    classe: int | None = Query(None),
    atividade: str | None = Query(None),
    mining_only: bool = Query(False),
):
    """Insights automáticos contextuais."""
    insights = []

    # Insight 1: Regional mais rigorosa
    rigor = safe_query(
        """
        SELECT regional,
            ROUND(100.0 * SUM(CASE WHEN decisao='indeferido' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 1) AS taxa_rejeicao,
            COUNT(*) AS n
        FROM v_mg_semad
        WHERE regional IS NOT NULL AND regional != ''
        GROUP BY regional HAVING COUNT(*) >= 50
        ORDER BY taxa_rejeicao DESC LIMIT 1
        """
    )
    if rigor:
        r = rigor[0]
        nome_curto = r["regional"].replace("Unidade Regional de Regularização Ambiental ", "").replace("Unidade Regional de Gestão das Águas ", "")
        insights.append({
            "tipo": "rigor",
            "titulo": f"{nome_curto} é a regional mais rigorosa",
            "descricao": f"Taxa de rejeição de {r['taxa_rejeicao']}% ({r['n']} decisões)",
        })

    # Insight 2: Tendência recente
    tendencia = safe_query(
        """
        SELECT
            ROUND(100.0 * SUM(CASE WHEN CAST(ano AS INT) = 2025 AND decisao='deferido' THEN 1 ELSE 0 END)
                / NULLIF(SUM(CASE WHEN CAST(ano AS INT) = 2025 THEN 1 ELSE 0 END), 0), 1) AS taxa_2025,
            ROUND(100.0 * SUM(CASE WHEN CAST(ano AS INT) = 2024 AND decisao='deferido' THEN 1 ELSE 0 END)
                / NULLIF(SUM(CASE WHEN CAST(ano AS INT) = 2024 THEN 1 ELSE 0 END), 0), 1) AS taxa_2024
        FROM v_mg_semad
        """
    )
    if tendencia and tendencia[0].get("taxa_2025") is not None and tendencia[0].get("taxa_2024") is not None:
        delta = round(tendencia[0]["taxa_2025"] - tendencia[0]["taxa_2024"], 1)
        direcao = "subiu" if delta > 0 else "caiu"
        insights.append({
            "tipo": "tendencia",
            "titulo": f"Taxa de aprovação {direcao} {abs(delta)}pp em 2025",
            "descricao": f"De {tendencia[0]['taxa_2024']}% em 2024 para {tendencia[0]['taxa_2025']}% em 2025",
        })

    # Insight 3: Classe com menor aprovação em mineração
    classe_rows = safe_query(
        """
        SELECT classe,
            ROUND(100.0 * SUM(CASE WHEN decisao='deferido' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 1) AS taxa,
            COUNT(*) AS n
        FROM v_mg_semad WHERE atividade LIKE 'A-0%'
        GROUP BY classe HAVING COUNT(*) >= 20
        ORDER BY taxa ASC LIMIT 1
        """
    )
    if classe_rows:
        c = classe_rows[0]
        insights.append({
            "tipo": "risco",
            "titulo": f"Classe {c['classe']} tem a menor aprovação em mineração",
            "descricao": f"Apenas {c['taxa']}% de aprovação ({c['n']} decisões)",
        })

    # Insight 4: Volume de decisões recente
    vol = safe_query(
        "SELECT COUNT(*) AS n_2026 FROM v_mg_semad WHERE CAST(ano AS INT) = 2026"
    )
    if vol and vol[0].get("n_2026", 0) > 0:
        insights.append({
            "tipo": "volume",
            "titulo": f"{vol[0]['n_2026']} decisões em 2026",
            "descricao": "Dados atualizados do licenciamento ambiental em MG",
        })

    return insights


@router.get("/decisions/approval-rates")
def get_approval_rates():
    """Taxa de aprovação por classe/atividade/regional/ano."""
    return safe_query(QUERY_MG_APPROVAL_RATES)


@router.get("/decisions/by-modalidade")
def get_decisions_by_modalidade():
    """Distribuição de decisões por modalidade."""
    return safe_query(QUERY_DECISAO_POR_MODALIDADE)


@router.get("/decisions/activity-class-heatmap")
def get_activity_class_heatmap():
    """Heatmap: taxa de aprovação por atividade x classe."""
    return safe_query(QUERY_APROVACAO_ATIVIDADE_CLASSE)


@router.get("/decisions/rejection-trend")
def get_rejection_trend():
    """Tendência temporal de indeferimentos."""
    return safe_query(QUERY_TENDENCIA_INDEFERIMENTO)


@router.get("/decisions/regional-rigor")
def get_regional_rigor():
    """Ranking de regionais por rigor (taxa de indeferimento)."""
    return safe_query(QUERY_RIGOR_REGIONAL)


@router.get("/decisions/infraction-bands")
def get_infraction_bands():
    """Correlação infrações IBAMA x decisão por faixa."""
    return safe_query(QUERY_INFRACOES_FAIXA_DECISAO)


@router.get("/decisions/recidivism")
def get_recidivism():
    """Reincidência: empresas com múltiplas decisões."""
    return safe_query(QUERY_REINCIDENCIA)


@router.get("/decisions/shelving-analysis")
def get_shelving_analysis():
    """Análise de arquivamentos por classe e grupo de atividade."""
    return safe_query(QUERY_ARQUIVAMENTO_ANALYSIS)


@router.get("/decisions/class-modalidade")
def get_class_modalidade():
    """Interação classe x modalidade."""
    return safe_query(QUERY_CLASSE_MODALIDADE)


@router.get("/decisions/infractions-vs-approval")
def get_infractions_vs_approval():
    """Empresas com infrações IBAMA vs taxa de aprovação."""
    return safe_query(QUERY_INFRACOES_VS_APROVACAO)


@router.get("/decisions/cfem-vs-approval")
def get_cfem_vs_approval():
    """CFEM vs taxa de aprovação."""
    return safe_query(QUERY_CFEM_VS_APROVACAO)


@router.get("/decisions/spatial-vs-approval")
def get_spatial_vs_approval():
    """Sobreposição espacial vs taxa de aprovação."""
    return safe_query(QUERY_SPATIAL_VS_APROVACAO)


@router.get("/decisions/similar-cases")
def get_similar_cases(
    atividade: str = Query(..., description="Código de atividade (ex: A-01-01)"),
    classe: int | None = Query(None, description="Classe (1-6)"),
    regional: str | None = Query(None, description="Regional SEMAD"),
    limit: int = Query(10, ge=1, le=50),
):
    """Casos similares para uma atividade/classe/regional."""
    q, p = query_similar_cases(atividade, classe, regional, limit)
    return safe_query(q, p)


@router.get("/decisions/approval-stats")
def get_approval_stats(
    atividade: str | None = Query(None, description="Prefixo de atividade"),
    classe: int | None = Query(None, description="Classe (1-6)"),
    regional: str | None = Query(None, description="Regional SEMAD"),
):
    """Estatísticas de aprovação filtradas."""
    q, p = query_approval_stats(atividade, classe, regional)
    return safe_query(q, p)


@router.get("/decisions/top-empresas")
def get_top_empresas():
    """Top 50 empresas de mineração por volume de decisões (com nome)."""
    return safe_query(
        """
        SELECT cnpj_cpf, MIN(empreendimento) AS empreendimento, COUNT(*) AS n
        FROM v_mg_semad
        WHERE atividade LIKE 'A-0%'
          AND cnpj_cpf IS NOT NULL AND cnpj_cpf != '' AND LENGTH(cnpj_cpf) = 14
        GROUP BY cnpj_cpf
        HAVING COUNT(*) >= 3
        ORDER BY n DESC
        LIMIT 50
        """
    )
