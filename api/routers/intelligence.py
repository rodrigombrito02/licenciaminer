"""Endpoints de Inteligência Comercial — Mineral Intelligence.

Pilares: Mercado/Cotações, Comércio Exterior, Produção/Arrecadação, Gestão Territorial.
Inclui KPI summary, time-series, AI summary (SSE) e minerais estratégicos.
"""

import csv
import json
import logging
import os
from datetime import datetime, timedelta

import anthropic
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from api.services.database import load_metadata, run_query, safe_query as _safe_query
from licenciaminer.config import DATA_DIR, REFERENCE_DIR

logger = logging.getLogger(__name__)

router = APIRouter()


# ── Mercado & Cotações ──


@router.get("/intelligence/ptax")
def get_ptax():
    """Retorna série histórica de câmbio USD/BRL (BCB PTAX)."""
    rows = _safe_query(
        "SELECT data, cotacao_venda FROM v_bcb_cotacoes ORDER BY data"
    )
    latest = rows[-1] if rows else None
    return {"rows": rows, "latest": latest, "total": len(rows)}


@router.get("/intelligence/commodities")
def get_commodity_prices():
    """Retorna cotações de commodities (CSV manual)."""
    commodity_csv = REFERENCE_DIR / "commodity_prices.csv"
    if not commodity_csv.exists():
        return {"rows": [], "minerals": []}

    with open(commodity_csv, encoding="utf-8") as f:
        commodities = list(csv.DictReader(f))

    minerals = sorted({r["mineral"] for r in commodities})

    # Última cotação por mineral
    latest_by_mineral = {}
    for row in commodities:
        mineral = row["mineral"]
        latest_by_mineral[mineral] = row  # CSV é cronológico, último ganha

    return {
        "rows": commodities,
        "minerals": minerals,
        "latest": latest_by_mineral,
    }


# ── Comércio Exterior ──


@router.get("/intelligence/comex")
def get_comex_data():
    """Retorna dados de comércio exterior mineral (Comex Stat/MDIC)."""
    rows = _safe_query("SELECT * FROM v_comex_mineracao")
    if not rows:
        return {"rows": [], "summary": None}

    # Resumo por fluxo
    summary = {"Exportação": 0, "Importação": 0}
    for r in rows:
        fluxo = r.get("fluxo", "")
        valor = r.get("valor_fob_usd", 0) or 0
        if fluxo in summary:
            summary[fluxo] += valor

    return {"rows": rows, "summary": summary, "total": len(rows)}


@router.get("/intelligence/comex/yearly")
def get_comex_yearly():
    """Retorna comércio exterior agrupado por ano e fluxo."""
    rows = _safe_query("""
        SELECT ano, fluxo,
               SUM(valor_fob_usd) AS valor_fob_usd
        FROM v_comex_mineracao
        WHERE ano IS NOT NULL AND fluxo IS NOT NULL
        GROUP BY ano, fluxo
        ORDER BY ano
    """)
    return {"rows": rows}


@router.get("/intelligence/comex/by-uf")
def get_comex_by_uf(
    fluxo: str = Query("Exportação", pattern="^(Exportação|Importação)$"),
    limit: int = Query(10, ge=1, le=30),
):
    """Retorna comércio exterior por UF."""
    rows = _safe_query(
        """
        SELECT uf, SUM(valor_fob_usd) AS valor_fob_usd
        FROM v_comex_mineracao
        WHERE fluxo = ?
        GROUP BY uf
        ORDER BY valor_fob_usd DESC
        LIMIT ?
        """,
        [fluxo, limit],
    )
    return {"fluxo": fluxo, "rows": rows}


# ── Produção & Arrecadação ──


@router.get("/intelligence/cfem/stats")
def get_cfem_stats():
    """Retorna estatísticas de arrecadação CFEM."""
    total = _safe_query("SELECT COUNT(*) AS n FROM v_cfem")
    n = total[0]["n"] if total else 0
    return {"total_records": n}


@router.get("/intelligence/cfem/top-municipios")
def get_cfem_top_municipios(limit: int = Query(15, ge=1, le=50)):
    """Top municípios por arrecadação CFEM."""
    rows = _safe_query(
        """
        SELECT "Município" AS municipio,
               SUM(TRY_CAST(
                   REPLACE(REPLACE("ValorRecolhido", '.', ''), ',', '.')
                   AS DOUBLE
               )) AS total
        FROM v_cfem
        WHERE "Município" IS NOT NULL
        GROUP BY "Município"
        ORDER BY total DESC
        LIMIT ?
        """,
        [limit],
    )
    return {"rows": rows}


@router.get("/intelligence/cfem/top-substancias")
def get_cfem_top_substancias(limit: int = Query(10, ge=1, le=50)):
    """Top substâncias por arrecadação CFEM."""
    rows = _safe_query(
        """
        SELECT "Substância" AS substancia,
               SUM(TRY_CAST(
                   REPLACE(REPLACE("ValorRecolhido", '.', ''), ',', '.')
                   AS DOUBLE
               )) AS total
        FROM v_cfem
        WHERE "Substância" IS NOT NULL
        GROUP BY "Substância"
        ORDER BY total DESC
        LIMIT ?
        """,
        [limit],
    )
    return {"rows": rows}


@router.get("/intelligence/ral/stats")
def get_ral_stats():
    """Retorna estatísticas do RAL (Relatório Anual de Lavra)."""
    total = _safe_query("SELECT COUNT(*) AS n FROM v_ral")
    n = total[0]["n"] if total else 0
    return {"total_records": n}


@router.get("/intelligence/ral/top-substancias")
def get_ral_top_substancias(limit: int = Query(10, ge=1, le=50)):
    """Top substâncias por registros RAL."""
    rows = _safe_query(
        """
        SELECT "Substância Mineral" AS substancia, COUNT(*) AS n
        FROM v_ral
        WHERE "Substância Mineral" IS NOT NULL
        GROUP BY "Substância Mineral"
        ORDER BY n DESC
        LIMIT ?
        """,
        [limit],
    )
    return {"rows": rows}


# ── Gestão Territorial ──


@router.get("/intelligence/anm/stats")
def get_anm_stats():
    """Retorna estatísticas de processos ANM."""
    total = _safe_query("SELECT COUNT(*) AS n FROM v_anm")
    n = total[0]["n"] if total else 0
    return {"total_records": n}


@router.get("/intelligence/anm/by-fase")
def get_anm_by_fase():
    """Processos ANM agrupados por fase."""
    rows = _safe_query("""
        SELECT FASE AS fase, COUNT(*) AS n
        FROM v_anm
        WHERE FASE IS NOT NULL
        GROUP BY FASE
        ORDER BY n DESC
    """)
    return {"rows": rows}


@router.get("/intelligence/anm/by-substancia")
def get_anm_by_substancia(limit: int = Query(15, ge=1, le=50)):
    """Top substâncias por processos ANM."""
    rows = _safe_query(
        """
        SELECT SUBS AS substancia, COUNT(*) AS n
        FROM v_anm
        WHERE SUBS IS NOT NULL
        GROUP BY SUBS
        ORDER BY n DESC
        LIMIT ?
        """,
        [limit],
    )
    return {"rows": rows}


# ── KPI Summary ──


_CFEM_VALUE_EXPR = """TRY_CAST(
    REPLACE(REPLACE("ValorRecolhido", '.', ''), ',', '.') AS DOUBLE
)"""


@router.get("/intelligence/kpi-summary")
def get_kpi_summary():
    """Retorna KPIs resumidos para o strip de inteligência."""
    meta = load_metadata()

    # USD/BRL
    ptax_rows = _safe_query(
        "SELECT data, cotacao_venda FROM v_bcb_cotacoes ORDER BY data"
    )
    usd_brl = None
    if ptax_rows:
        latest = ptax_rows[-1]
        # Sparkline: last 30 data points
        spark = [r["cotacao_venda"] for r in ptax_rows[-30:]]
        # Delta vs 30 days ago
        prev = ptax_rows[-31]["cotacao_venda"] if len(ptax_rows) > 30 else ptax_rows[0]["cotacao_venda"]
        delta = (latest["cotacao_venda"] - prev) / prev if prev else 0
        usd_brl = {
            "latest": latest["cotacao_venda"],
            "date": latest["data"],
            "delta": round(delta, 4),
            "sparkline": spark,
        }

    # Iron ore (commodity CSV)
    ferro = None
    commodity_csv = REFERENCE_DIR / "commodity_prices.csv"
    if commodity_csv.exists():
        with open(commodity_csv, encoding="utf-8") as f:
            rows = [r for r in csv.DictReader(f) if "Ferro" in r.get("mineral", "")]
        if rows:
            latest_row = rows[-1]
            prev_row = rows[-2] if len(rows) > 1 else rows[0]
            latest_price = float(latest_row["preco_usd"])
            prev_price = float(prev_row["preco_usd"])
            delta = (latest_price - prev_price) / prev_price if prev_price else 0
            ferro = {
                "latest": latest_price,
                "unit": latest_row.get("unidade", "USD/t"),
                "date": latest_row["data"],
                "delta": round(delta, 4),
                "sparkline": [float(r["preco_usd"]) for r in rows],
            }

    # Trade balance YTD
    current_year = datetime.now().year
    balanca = None
    comex_rows = _safe_query(
        """
        SELECT fluxo, SUM(valor_fob_usd) AS total
        FROM v_comex_mineracao
        WHERE ano = ?
        GROUP BY fluxo
        """,
        [current_year],
    )
    if comex_rows:
        export_val = sum(r["total"] for r in comex_rows if r["fluxo"] == "Exportação")
        import_val = sum(r["total"] for r in comex_rows if r["fluxo"] == "Importação")
        balance = export_val - import_val

        # Previous year for delta
        prev_rows = _safe_query(
            """
            SELECT fluxo, SUM(valor_fob_usd) AS total
            FROM v_comex_mineracao
            WHERE ano = ?
            GROUP BY fluxo
            """,
            [current_year - 1],
        )
        prev_balance = 0
        if prev_rows:
            prev_exp = sum(r["total"] for r in prev_rows if r["fluxo"] == "Exportação")
            prev_imp = sum(r["total"] for r in prev_rows if r["fluxo"] == "Importação")
            prev_balance = prev_exp - prev_imp

        delta = (balance - prev_balance) / abs(prev_balance) if prev_balance else 0

        # Sparkline: yearly balances
        yearly = _safe_query(
            """
            SELECT ano,
                   SUM(CASE WHEN fluxo = 'Exportação' THEN valor_fob_usd ELSE 0 END) -
                   SUM(CASE WHEN fluxo = 'Importação' THEN valor_fob_usd ELSE 0 END) AS balance
            FROM v_comex_mineracao
            GROUP BY ano ORDER BY ano
            """
        )
        balanca = {
            "valor_usd": balance,
            "delta_yoy": round(delta, 4),
            "sparkline": [r["balance"] for r in yearly],
        }

    # CFEM YTD
    cfem_ytd = None
    cfem_rows = _safe_query(
        f"""
        SELECT Ano as ano,
               SUM({_CFEM_VALUE_EXPR}) AS total
        FROM v_cfem
        WHERE Ano >= ? - 1
        GROUP BY Ano
        ORDER BY Ano
        """,
        [current_year],
    )
    if cfem_rows:
        current = next((r for r in cfem_rows if r["ano"] == current_year), None)
        previous = next((r for r in cfem_rows if r["ano"] == current_year - 1), None)
        current_val = current["total"] if current else 0
        prev_val = previous["total"] if previous else 0
        delta = (current_val - prev_val) / prev_val if prev_val else 0

        # Sparkline: yearly totals
        yearly_cfem = _safe_query(
            f"""
            SELECT Ano as ano, SUM({_CFEM_VALUE_EXPR}) AS total
            FROM v_cfem
            GROUP BY Ano ORDER BY Ano
            """
        )
        cfem_ytd = {
            "valor_brl": current_val,
            "delta_yoy": round(delta, 4),
            "sparkline": [r["total"] for r in yearly_cfem],
        }

    # Freshness from metadata
    freshness = {}
    for key, source_key in [("ptax", "bcb_ptax"), ("cfem", "anm_cfem"), ("comex", "comex_mineracao")]:
        if source_key in meta:
            freshness[key] = meta[source_key].get("collected_at", "")[:10]

    return {
        "usd_brl": usd_brl,
        "ferro": ferro,
        "balanca_ytd": balanca,
        "cfem_ytd": cfem_ytd,
        "freshness": freshness,
    }


# ── CFEM Time-Series ──


@router.get("/intelligence/cfem/time-series")
def get_cfem_time_series(
    ano_min: int = Query(2022, ge=2010, le=2030),
    ano_max: int = Query(2026, ge=2010, le=2030),
    substancia: str | None = Query(None),
    municipio: str | None = Query(None),
):
    """Série temporal CFEM mensal com filtros opcionais."""
    conditions = ["Ano BETWEEN ? AND ?"]
    params: list = [ano_min, ano_max]

    if substancia:
        conditions.append('"Substância" = ?')
        params.append(substancia)
    if municipio:
        conditions.append('"Município" = ?')
        params.append(municipio)

    where = " AND ".join(conditions)
    rows = _safe_query(
        f"""
        SELECT Ano AS ano, "Mês" AS mes,
               SUM({_CFEM_VALUE_EXPR}) AS total
        FROM v_cfem
        WHERE {where}
        GROUP BY Ano, "Mês"
        ORDER BY Ano, "Mês"
        """,
        params,
    )
    return {"rows": rows}


# ── COMEX by Country ──


@router.get("/intelligence/comex/by-country")
def get_comex_by_country(
    fluxo: str = Query("Exportação", pattern="^(Exportação|Importação)$"),
    limit: int = Query(10, ge=1, le=30),
):
    """Top países por comércio exterior mineral."""
    rows = _safe_query(
        """
        SELECT pais, SUM(valor_fob_usd) AS valor_fob_usd,
               SUM(peso_kg) AS peso_kg
        FROM v_comex_mineracao
        WHERE fluxo = ?
        GROUP BY pais
        ORDER BY valor_fob_usd DESC
        LIMIT ?
        """,
        [fluxo, limit],
    )
    return {"fluxo": fluxo, "rows": rows}


# ── COMEX Monthly Time-Series ──


@router.get("/intelligence/comex/monthly")
def get_comex_monthly(
    ano_min: int = Query(2021, ge=2010, le=2030),
    ano_max: int = Query(2026, ge=2010, le=2030),
):
    """Série temporal mensal de comércio exterior."""
    rows = _safe_query(
        """
        SELECT ano, mes, fluxo,
               SUM(valor_fob_usd) AS valor_fob_usd,
               SUM(peso_kg) AS peso_kg
        FROM v_comex_mineracao
        WHERE ano BETWEEN ? AND ?
        GROUP BY ano, mes, fluxo
        ORDER BY ano, mes, fluxo
        """,
        [ano_min, ano_max],
    )
    return {"rows": rows}


# ── RAL by Substance with Value ──


@router.get("/intelligence/ral/top-substancias-value")
def get_ral_top_substancias_value(limit: int = Query(10, ge=1, le=50)):
    """Top substâncias RAL por valor de venda e produção."""
    rows = _safe_query(
        """
        SELECT "Substância Mineral" AS substancia,
               SUM(TRY_CAST(REPLACE(REPLACE("Valor Venda (R$)", '.', ''), ',', '.') AS DOUBLE)) AS valor_venda,
               SUM(TRY_CAST(REPLACE(REPLACE("Quantidade Produção - Minério ROM (t)", '.', ''), ',', '.') AS DOUBLE)) AS qtd_producao
        FROM v_ral
        WHERE "Substância Mineral" IS NOT NULL
        GROUP BY "Substância Mineral"
        ORDER BY valor_venda DESC NULLS LAST
        LIMIT ?
        """,
        [limit],
    )
    return {"rows": rows}


# ── Strategic Minerals ──


@router.get("/intelligence/minerals/strategic")
def get_strategic_minerals():
    """Retorna classificação de substâncias minerais (referência)."""
    csv_path = REFERENCE_DIR / "substancias_classificacao.csv"
    if not csv_path.exists():
        return {"rows": []}

    with open(csv_path, encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    return {"rows": rows}


# ── Commodity Time-Series (pivoted by mineral) ──


@router.get("/intelligence/commodities/time-series")
def get_commodity_time_series(mineral: str | None = Query(None)):
    """Retorna série temporal de cotações pivotada por mineral."""
    commodity_csv = REFERENCE_DIR / "commodity_prices.csv"
    if not commodity_csv.exists():
        return {"rows": [], "minerals": []}

    with open(commodity_csv, encoding="utf-8") as f:
        raw = list(csv.DictReader(f))

    minerals = sorted({r["mineral"] for r in raw})

    if mineral:
        filtered = [r for r in raw if r["mineral"] == mineral]
        rows = [
            {"data": r["data"], "preco": float(r["preco_usd"]), "mineral": r["mineral"]}
            for r in filtered
        ]
    else:
        # Pivot: one row per date, one column per mineral
        by_date: dict[str, dict] = {}
        for r in raw:
            d = r["data"]
            if d not in by_date:
                by_date[d] = {"data": d}
            # Sanitize mineral name for JSON key
            key = r["mineral"].split("(")[0].strip().lower().replace(" ", "_")
            by_date[d][key] = float(r["preco_usd"])
        rows = sorted(by_date.values(), key=lambda x: x["data"])

    return {"rows": rows, "minerals": minerals}


# ── Regulatory Pulse ──


@router.get("/intelligence/regulatory-pulse")
def get_regulatory_pulse():
    """Sinais regulatórios consolidados para o dashboard."""
    current_year = datetime.now().year
    signals = []

    # IBAMA infractions (EXTRACT returns float, cast to int for comparison)
    ibama = _safe_query(
        """
        SELECT
            CAST(EXTRACT(YEAR FROM TRY_CAST(DAT_HORA_AUTO_INFRACAO AS TIMESTAMP)) AS INTEGER) AS ano,
            COUNT(*) AS total
        FROM v_ibama_infracoes
        WHERE DAT_HORA_AUTO_INFRACAO IS NOT NULL
        GROUP BY ano
        HAVING ano >= ?
        ORDER BY ano
        """,
        [current_year - 1],
    )
    if ibama:
        current = next((r for r in ibama if int(r.get("ano", 0)) == current_year), None)
        previous = next((r for r in ibama if int(r.get("ano", 0)) == current_year - 1), None)
        if current:
            delta = None
            if previous and previous["total"]:
                delta = round((current["total"] - previous["total"]) / previous["total"] * 100, 1)
            signals.append({
                "key": "ibama_infracoes",
                "label": "IBAMA Infrações",
                "value": current["total"],
                "year": current_year,
                "delta_pct": delta,
                "fonte": "IBAMA",
            })

    # SEMAD approval rate (ano column is string)
    semad = _safe_query(
        """
        SELECT
            COUNT(*) AS total,
            SUM(CASE WHEN LOWER(decisao) LIKE '%%deferid%%'
                     AND LOWER(decisao) NOT LIKE '%%indefer%%' THEN 1 ELSE 0 END) AS aprovados
        FROM v_mg_semad
        WHERE CAST(ano AS INTEGER) = ?
        """,
        [current_year],
    )
    if semad and semad[0].get("total"):
        taxa = round(semad[0]["aprovados"] / semad[0]["total"] * 100, 1) if semad[0]["total"] else 0
        signals.append({
            "key": "semad_aprovacao",
            "label": "SEMAD Aprovação",
            "value": taxa,
            "unit": "%",
            "total": semad[0]["total"],
            "year": current_year,
            "fonte": "SEMAD/MG",
        })

    # ANM new processes (current year vs previous)
    anm = _safe_query(
        "SELECT ANO AS ano, COUNT(*) AS n FROM v_anm WHERE ANO >= ? GROUP BY ANO ORDER BY ANO",
        [current_year - 1],
    )
    if anm:
        anm_cur = next((r for r in anm if int(r.get("ano", 0)) == current_year), None)
        anm_prev = next((r for r in anm if int(r.get("ano", 0)) == current_year - 1), None)
        if anm_cur and anm_cur["n"]:
            delta = None
            if anm_prev and anm_prev["n"]:
                delta = round((anm_cur["n"] - anm_prev["n"]) / anm_prev["n"] * 100, 1)
            signals.append({
                "key": "anm_processos",
                "label": "ANM Novos Processos",
                "value": anm_cur["n"],
                "year": current_year,
                "delta_pct": delta,
                "fonte": "ANM/SIGMINE",
            })

    # COPAM meetings (data is DD/MM/YYYY string — use strptime)
    copam = _safe_query(
        """
        SELECT COUNT(*) AS n
        FROM v_copam
        WHERE data IS NOT NULL
          AND TRY_STRPTIME(data, '%d/%m/%Y') >= CURRENT_DATE - INTERVAL '365 days'
        """
    )
    if copam and copam[0].get("n"):
        signals.append({
            "key": "copam_reunioes",
            "label": "COPAM Reuniões (12m)",
            "value": copam[0]["n"],
            "fonte": "COPAM/CMI",
        })
    else:
        # Fallback: show total COPAM meetings if no recent data
        copam_total = _safe_query("SELECT COUNT(*) AS n FROM v_copam")
        if copam_total and copam_total[0].get("n"):
            signals.append({
                "key": "copam_reunioes",
                "label": "COPAM Reuniões (total)",
                "value": copam_total[0]["n"],
                "fonte": "COPAM/CMI",
            })

    return {"signals": signals}


# ── IBAMA Infractions Trend ──


@router.get("/intelligence/ibama/infracoes-trend")
def get_ibama_infracoes_trend():
    """Infrações IBAMA por ano."""
    rows = _safe_query(
        """
        SELECT
            EXTRACT(YEAR FROM TRY_CAST(dat_hora_auto_infracao AS TIMESTAMP)) AS ano,
            COUNT(*) AS total
        FROM v_ibama_infracoes
        WHERE dat_hora_auto_infracao IS NOT NULL
        GROUP BY ano
        HAVING ano IS NOT NULL
        ORDER BY ano
        """
    )
    return {"rows": [{"ano": int(r["ano"]), "total": r["total"]} for r in rows if r.get("ano")]}


# ── SEMAD Licensing Trend ──


@router.get("/intelligence/semad/licensing-trend")
def get_semad_licensing_trend():
    """Tendência de licenciamento SEMAD MG por ano."""
    rows = _safe_query(
        """
        SELECT ano,
               COUNT(*) AS total,
               SUM(CASE WHEN LOWER(decisao) LIKE '%%deferid%%'
                        AND LOWER(decisao) NOT LIKE '%%indefer%%' THEN 1 ELSE 0 END) AS aprovados,
               SUM(CASE WHEN LOWER(decisao) LIKE '%%indefer%%' THEN 1 ELSE 0 END) AS indeferidos
        FROM v_mg_semad
        WHERE ano IS NOT NULL
        GROUP BY ano
        ORDER BY ano
        """
    )
    result = []
    for r in rows:
        taxa = round(r["aprovados"] / r["total"] * 100, 1) if r["total"] else 0
        result.append({
            "ano": r["ano"],
            "total": r["total"],
            "aprovados": r["aprovados"],
            "indeferidos": r["indeferidos"],
            "taxa_aprovacao": taxa,
        })
    return {"rows": result}


# ── AI Summary ──


class AISummaryRequest(BaseModel):
    """Payload para geração de resumo AI."""
    context: dict


_AI_SYSTEM_PROMPT = """Você é um sócio sênior de estratégia mineral no Summo Quartile, com 20+ anos no setor de mineração brasileiro.

Escreva um briefing executivo usando EXATAMENTE este formato com tags XML:

<cenario>
2-3 parágrafos curtos sobre o cenário atual do setor mineral.
Cruze dados com contexto macro — commodities, câmbio, regulatório, movimentos do setor.
Cada parágrafo: 2-3 frases no máximo.
</cenario>

<sinais>
- CFEM: R$ X bilhões YTD, alta de Y% — interpretação
- Câmbio: USD/BRL em X,XX — impacto nas exportações
- Ferro 62%: US$ X/t — tendência e driver
- Balança mineral: saldo de US$ X bi — contexto
(4-6 bullets, cada um = número específico + interpretação estratégica)
</sinais>

<riscos>
- Risco: descrição concreta do risco
- Oportunidade: descrição concreta da oportunidade
- Risco: outro risco
- Oportunidade: outra oportunidade
(4-6 bullets, alterne riscos e oportunidades)
</riscos>

REGRAS OBRIGATÓRIAS:
- Use EXATAMENTE as tags <cenario>, <sinais>, <riscos> — NÃO use markdown **bold** para títulos
- Comece IMEDIATAMENTE com <cenario> — sem preâmbulo
- Cite fontes: BCB PTAX, ANM/CFEM, Comex Stat/MDIC, IBAMA, SEMAD/MG
- Português brasileiro executivo, números em formato BR (1.234,56)
- Máximo ~1000 palavras total
- NÃO comece com "Com base nos dados"
- OBRIGATÓRIO incluir as 3 seções: <cenario>, <sinais>, <riscos> — nunca omita nenhuma
"""


@router.get("/intelligence/ai-status")
def get_ai_status():
    """Verifica se a API de AI está disponível."""
    available = bool(os.environ.get("ANTHROPIC_API_KEY"))
    return {"available": available}


# ── Server-side briefing cache ──

_briefing_cache: dict = {"sections": [], "generated_at": None}
_briefing_lock = __import__("threading").Lock()
BRIEFING_TTL_SECONDS = 3600  # 1 hour


def _generate_briefing_sync():
    """Generate briefing and store in server cache. Called from background thread."""
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        logger.warning("ANTHROPIC_API_KEY not set — skipping briefing generation")
        return

    data_context = _build_data_context()
    user_message = (
        "Dados quantitativos do setor mineral brasileiro "
        "(fonte: banco de dados Summo Quartile):\n\n"
        f"{data_context}\n\n"
        "Com base nesses dados e no seu conhecimento do setor mineral "
        "brasileiro, escreva o briefing executivo."
    )

    try:
        client = anthropic.Anthropic(api_key=api_key)
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=10000,
            system=_AI_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_message}],
        )
        raw_text = response.content[0].text
        sections = _parse_xml_sections(raw_text)
        with _briefing_lock:
            _briefing_cache["sections"] = sections
            _briefing_cache["generated_at"] = datetime.now().isoformat()
        logger.info("Briefing generated: %d sections", len(sections))
    except Exception:
        logger.exception("Failed to generate briefing")


def start_briefing_scheduler():
    """Start background thread that generates briefing on startup + every hour."""
    import threading

    def _loop():
        import time
        _generate_briefing_sync()
        while True:
            time.sleep(BRIEFING_TTL_SECONDS)
            _generate_briefing_sync()

    t = threading.Thread(target=_loop, daemon=True, name="briefing-scheduler")
    t.start()
    logger.info("Briefing scheduler started (TTL=%ds)", BRIEFING_TTL_SECONDS)


def _build_data_context() -> str:
    """Coleta dados reais do banco para enriquecer o prompt da AI."""
    sections = []

    # PTAX
    ptax = _safe_query(
        "SELECT data, cotacao_venda FROM v_bcb_cotacoes ORDER BY data DESC LIMIT 5"
    )
    if ptax:
        latest = ptax[0]
        sections.append(
            f"USD/BRL (PTAX): última cotação {latest['cotacao_venda']:.4f} em {latest['data']}"
        )

    # CFEM YTD
    current_year = datetime.now().year
    cfem_ytd = _safe_query(
        f"""
        SELECT Ano as ano, SUM({_CFEM_VALUE_EXPR}) AS total
        FROM v_cfem WHERE Ano IN (?, ?)
        GROUP BY Ano ORDER BY Ano
        """,
        [current_year - 1, current_year],
    )
    if cfem_ytd:
        for r in cfem_ytd:
            sections.append(f"CFEM {r['ano']}: R$ {r['total']:,.2f}")

    # CFEM top 5 municipalities
    cfem_mun = _safe_query(
        f"""
        SELECT "Município" AS municipio,
               SUM({_CFEM_VALUE_EXPR}) AS total
        FROM v_cfem WHERE "Município" IS NOT NULL
        GROUP BY "Município" ORDER BY total DESC LIMIT 5
        """
    )
    if cfem_mun:
        mun_list = ", ".join(f"{r['municipio']} (R$ {r['total']:,.0f})" for r in cfem_mun)
        sections.append(f"Top municípios CFEM: {mun_list}")

    # CFEM top 5 substances
    cfem_sub = _safe_query(
        f"""
        SELECT "Substância" AS substancia,
               SUM({_CFEM_VALUE_EXPR}) AS total
        FROM v_cfem WHERE "Substância" IS NOT NULL
        GROUP BY "Substância" ORDER BY total DESC LIMIT 5
        """
    )
    if cfem_sub:
        sub_list = ", ".join(f"{r['substancia']} (R$ {r['total']:,.0f})" for r in cfem_sub)
        sections.append(f"Top substâncias CFEM: {sub_list}")

    # Trade balance
    comex = _safe_query(
        """
        SELECT ano, fluxo, SUM(valor_fob_usd) AS total
        FROM v_comex_mineracao
        WHERE ano >= ? - 1
        GROUP BY ano, fluxo ORDER BY ano
        """,
        [current_year],
    )
    if comex:
        for year in sorted({r["ano"] for r in comex}):
            exp = sum(r["total"] for r in comex if r["ano"] == year and r["fluxo"] == "Exportação")
            imp = sum(r["total"] for r in comex if r["ano"] == year and r["fluxo"] == "Importação")
            sections.append(f"Comércio exterior {year}: Export US$ {exp:,.0f}, Import US$ {imp:,.0f}, Saldo US$ {exp - imp:,.0f}")

    # Top export countries
    top_countries = _safe_query(
        """
        SELECT pais, SUM(valor_fob_usd) AS total
        FROM v_comex_mineracao WHERE fluxo = 'Exportação'
        GROUP BY pais ORDER BY total DESC LIMIT 5
        """
    )
    if top_countries:
        countries = ", ".join(f"{r['pais']} (US$ {r['total']:,.0f})" for r in top_countries)
        sections.append(f"Top destinos exportação: {countries}")

    # ANM stats
    anm = _safe_query("SELECT COUNT(*) AS n FROM v_anm")
    if anm:
        sections.append(f"Processos ANM registrados: {anm[0]['n']:,}")

    # Commodity prices
    commodity_csv = REFERENCE_DIR / "commodity_prices.csv"
    if commodity_csv.exists():
        with open(commodity_csv, encoding="utf-8") as f:
            rows = list(csv.DictReader(f))
        # Latest per mineral
        latest_by = {}
        for r in rows:
            latest_by[r["mineral"]] = r
        for mineral, data in latest_by.items():
            sections.append(f"{mineral}: {data['preco_usd']} {data.get('unidade', '')} (ref. {data['data']})")

    # IBAMA infractions trend
    ibama_trend = _safe_query(
        """
        SELECT
            EXTRACT(YEAR FROM TRY_CAST(dat_hora_auto_infracao AS TIMESTAMP)) AS ano,
            COUNT(*) AS total
        FROM v_ibama_infracoes
        WHERE dat_hora_auto_infracao IS NOT NULL
        GROUP BY ano
        ORDER BY ano DESC
        LIMIT 3
        """
    )
    if ibama_trend:
        parts = [f"{int(r['ano'])}: {r['total']:,} infrações" for r in ibama_trend if r.get("ano")]
        if parts:
            sections.append(f"IBAMA infrações ambientais: {'; '.join(parts)}")

    # SEMAD licensing approval rate
    semad_rate = _safe_query(
        """
        SELECT ano,
               COUNT(*) AS total,
               SUM(CASE WHEN LOWER(decisao) LIKE '%deferid%'
                        AND LOWER(decisao) NOT LIKE '%indefer%' THEN 1 ELSE 0 END) AS aprovados,
               SUM(CASE WHEN LOWER(decisao) LIKE '%indefer%' THEN 1 ELSE 0 END) AS indeferidos
        FROM v_mg_semad
        WHERE ano IS NOT NULL AND ano >= ?
        GROUP BY ano ORDER BY ano DESC
        """,
        [current_year - 1],
    )
    if semad_rate:
        for r in semad_rate:
            taxa = (r["aprovados"] / r["total"] * 100) if r["total"] else 0
            sections.append(
                f"SEMAD licenciamento {r['ano']}: {r['total']:,} decisões, "
                f"{r['aprovados']:,} aprovadas ({taxa:.1f}%), {r['indeferidos']:,} indeferidas"
            )

    # ANM concession processes count
    anm_total = _safe_query("SELECT COUNT(*) AS n FROM v_anm")
    if anm_total and anm_total[0].get("n"):
        sections.append(f"Processos minerários ANM (MG): {anm_total[0]['n']:,}")

    # COPAM recent meetings
    copam_recent = _safe_query(
        """
        SELECT COUNT(*) AS n
        FROM v_copam
        WHERE data IS NOT NULL
          AND TRY_CAST(data AS DATE) >= CURRENT_DATE - INTERVAL '180 days'
        """
    )
    if copam_recent and copam_recent[0].get("n"):
        sections.append(f"COPAM: {copam_recent[0]['n']} reuniões nos últimos 6 meses")

    # Freshness
    meta = load_metadata()
    fresh_parts = []
    for key in ["bcb_ptax", "anm_cfem", "comex_mineracao", "ibama_infracoes", "mg_semad"]:
        if key in meta:
            dt = meta[key].get("collected_at", "")[:10]
            fresh_parts.append(f"{key}: {dt}")
    if fresh_parts:
        sections.append(f"Dados coletados em: {', '.join(fresh_parts)}")

    return "\n".join(f"- {s}" for s in sections)


def _parse_xml_sections(raw: str) -> list[dict]:
    """Parse XML-tagged briefing into structured sections."""
    import re

    section_defs = [
        ("cenario", "Cenário Atual"),
        ("sinais", "Sinais de Mercado"),
        ("riscos", "Riscos e Oportunidades"),
    ]
    sections = []
    for tag, title in section_defs:
        match = re.search(rf"<{tag}>([\s\S]*?)</{tag}>", raw, re.IGNORECASE)
        if match and match.group(1).strip():
            sections.append({"title": title, "content": match.group(1).strip()})

    # Fallback: if XML parsing failed, return raw text as single section
    if not sections:
        cleaned = re.sub(r"</?(?:cenario|sinais|riscos)>", "", raw, flags=re.IGNORECASE).strip()
        if cleaned:
            sections.append({"title": "", "content": cleaned})

    return sections


@router.get("/intelligence/briefing")
def get_briefing():
    """Return server-cached briefing (generated in background, shared by all users)."""
    with _briefing_lock:
        sections = _briefing_cache["sections"]
        generated_at = _briefing_cache["generated_at"]

    if not sections:
        return {"sections": [], "generated_at": None, "status": "generating"}

    return {"sections": sections, "generated_at": generated_at, "status": "ready"}


@router.post("/intelligence/briefing/refresh")
def refresh_briefing():
    """Force-regenerate briefing (admin use)."""
    import threading
    threading.Thread(target=_generate_briefing_sync, daemon=True).start()
    return {"status": "regenerating"}


# ── Monitoramento ─────────────────────────────────────────────────────────


@router.get("/intelligence/monitoring/top-empresas")
def get_monitoring_top_empresas(limit: int = Query(20, ge=5, le=50)):
    """Top empresas por volume de processos ANM + CFEM."""
    # Processos ANM (v_scm)
    processos = _safe_query(
        """
        SELECT cpf_cnpj_do_titular AS cnpj,
               MIN(titular) AS empresa,
               COUNT(*) AS total_processos,
               SUM(CASE WHEN fase_atual LIKE '%Pesquisa%' THEN 1 ELSE 0 END) AS pesquisas,
               SUM(CASE WHEN fase_atual LIKE '%Lavra%' OR fase_atual LIKE '%Concess%' THEN 1 ELSE 0 END) AS lavras,
               MIN(substancia_principal) AS substancia_exemplo
        FROM v_scm
        WHERE cpf_cnpj_do_titular IS NOT NULL AND cpf_cnpj_do_titular != ''
        GROUP BY cpf_cnpj_do_titular
        HAVING COUNT(*) >= 20
        ORDER BY total_processos DESC
        LIMIT ?
        """,
        [limit],
    )

    # CFEM por CNPJ
    cfem_map: dict[str, float] = {}
    try:
        cfem_rows = _safe_query(
            """
            SELECT "CPF_CNPJ" AS cnpj,
                   SUM(CAST(REPLACE("ValorRecolhido", ',', '.') AS DOUBLE)) AS cfem_total
            FROM v_cfem
            WHERE "CPF_CNPJ" IS NOT NULL
            GROUP BY "CPF_CNPJ"
            """
        )
        cfem_map = {r["cnpj"]: r["cfem_total"] for r in cfem_rows if r.get("cnpj")}
    except Exception:
        pass

    # Merge
    for p in processos:
        cnpj = p.get("cnpj", "")
        p["cfem_total"] = cfem_map.get(cnpj, 0)

    return processos


@router.get("/intelligence/monitoring/pipeline")
def get_monitoring_pipeline():
    """Pipeline minerário nacional: contagem por fase."""
    return _safe_query(
        """
        SELECT fase_atual, COUNT(*) AS n
        FROM v_scm
        WHERE fase_atual IS NOT NULL AND fase_atual != ''
        GROUP BY fase_atual
        ORDER BY n DESC
        """
    )


@router.get("/intelligence/monitoring/projetos")
def get_monitoring_projetos():
    """Projetos de mineração em destaque (base curada)."""
    projetos_path = REFERENCE_DIR / "projetos_destaque.json"
    if not projetos_path.exists():
        return {"total": 0, "projetos": []}
    with open(projetos_path, encoding="utf-8") as f:
        data = json.load(f)
    return {
        "total": len(data.get("projetos", [])),
        "atualizado_em": data.get("_metadata", {}).get("atualizado_em"),
        "projetos": data.get("projetos", []),
    }
