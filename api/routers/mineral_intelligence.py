"""SQ Mineral Intelligence — pilotos com dado real (anzol + previews dos produtos).

Cada endpoint é a "amostra do entregável" de um produto proposto ao Lima, gerada
de base local pública (CFEM, SCM, RAL, projetos curados). Alimenta os previews na
página pública e a aba detalhada do Lima.
"""

import json
import logging
from pathlib import Path

from fastapi import APIRouter, Query

from api.services.database import run_query

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/mi", tags=["Mineral Intelligence"])

_REF = Path(__file__).resolve().parents[2] / "data" / "reference"

# Minerais estratégicos (fragmentos sem acento p/ casar com substancia_principal)
_ESTRATEGICOS = ["LITIO", "LÍTIO", "GRAFITA", "NIOBIO", "NIÓBIO", "TERRAS RARAS",
                 "COBRE", "NIQUEL", "NÍQUEL", "COBALTO", "VANADIO", "VANÁDIO"]

# Limpa valor BR "1.234,56" -> 1234.56 em SQL
_VAL = "TRY_CAST(REPLACE(REPLACE(ValorRecolhido, '.', ''), ',', '.') AS DOUBLE)"


@router.get("/pipeline-projetos")
def pipeline_projetos():
    """Anzol público: pipeline de grandes projetos minerários do Brasil (curado)."""
    path = _REF / "projetos_destaque.json"
    if not path.exists():
        return {"total": 0, "projetos": [], "por_categoria": {}, "por_status": {}}
    data = json.loads(path.read_text(encoding="utf-8"))
    projs = data.get("projetos", [])

    def _agg(field):
        out: dict = {}
        for p in projs:
            k = p.get(field) or "—"
            out[k] = out.get(k, 0) + 1
        return dict(sorted(out.items(), key=lambda x: -x[1]))

    # investimento total anunciado (quando em USD)
    inv = sum(p.get("investimento_valor") or 0 for p in projs
              if (p.get("investimento_moeda") or "").upper() == "USD")

    return {
        "total": len(projs),
        "investimento_usd_anunciado": inv,
        "por_categoria": _agg("categoria"),
        "por_status": _agg("status"),
        "projetos": [
            {
                "empresa": p.get("empresa"),
                "projeto": p.get("projeto"),
                "substancia": p.get("substancia"),
                "categoria": p.get("categoria"),
                "status": p.get("status"),
                "uf": (p.get("localizacao") or {}).get("uf"),
                "municipio": (p.get("localizacao") or {}).get("municipio"),
                "investimento_valor": p.get("investimento_valor"),
                "investimento_moeda": p.get("investimento_moeda"),
                "capacidade": p.get("capacidade"),
            }
            for p in projs
        ],
    }


@router.get("/monitor-cfem")
def monitor_cfem(ano: int = Query(2025, ge=2018, le=2026), limit: int = Query(15, ge=1, le=50)):
    """Produto B — Monitor CFEM: arrecadação por substância no ano (proxy de produção/preço)."""
    rows = run_query(
        f"""
        SELECT "Substância" AS substancia,
               SUM({_VAL}) AS valor_recolhido,
               COUNT(DISTINCT Processo) AS minas
        FROM 'data/processed/anm_cfem.parquet'
        WHERE Ano = ? AND {_VAL} IS NOT NULL
        GROUP BY 1 ORDER BY valor_recolhido DESC NULLS LAST LIMIT ?
        """,
        [ano, limit],
    )
    total = run_query(
        f"SELECT SUM({_VAL}) AS t FROM 'data/processed/anm_cfem.parquet' WHERE Ano = ?",
        [ano],
    )
    return {"ano": ano, "total_recolhido": (total[0]["t"] if total else None), "ranking": rows}


@router.get("/monitor-cfem-trimestral")
def monitor_cfem_trimestral(substancia: str = Query("FERRO"), trimestres: int = Query(6, ge=2, le=12)):
    """Produto B — Monitor CFEM trimestral: arrecadação por trimestre + variação período-a-período."""
    rows = run_query(
        f"""
        SELECT CAST(Ano AS INTEGER) AS ano,
               CAST(FLOOR((CAST("Mês" AS INTEGER)-1)/3) + 1 AS INTEGER) AS trimestre,
               SUM({_VAL}) AS valor
        FROM 'data/processed/anm_cfem.parquet'
        WHERE UPPER("Substância") LIKE ? AND {_VAL} IS NOT NULL
              AND "Mês" IS NOT NULL
        GROUP BY 1,2 ORDER BY ano DESC, trimestre DESC LIMIT ?
        """,
        [f"%{substancia.upper()}%", trimestres],
    )
    rows = list(reversed(rows))  # cronológico
    serie = []
    for i, r in enumerate(rows):
        ant = rows[i - 1]["valor"] if i > 0 and rows[i - 1]["valor"] else None
        var = round(100 * (r["valor"] - ant) / ant, 1) if ant else None
        serie.append({"periodo": f"{int(r['ano'])} T{int(r['trimestre'])}",
                      "valor": r["valor"], "variacao_pct": var})
    return {"substancia": substancia, "serie": serie}


@router.get("/radar-estrategicos")
def radar_estrategicos(limit: int = Query(40, ge=1, le=200)):
    """Produto D — Radar de Minerais Estratégicos: requerimentos por substância × fase."""
    like = " OR ".join("UPPER(substancia_principal) LIKE ?" for _ in _ESTRATEGICOS)
    params = [f"%{m}%" for m in _ESTRATEGICOS]
    por_subs = run_query(
        f"""
        SELECT substancia_principal AS substancia, COUNT(*) AS n
        FROM v_scm WHERE ({like})
        GROUP BY 1 ORDER BY n DESC LIMIT ?
        """,
        [*params, limit],
    )
    por_fase = run_query(
        f"""
        SELECT fase_atual AS fase, COUNT(*) AS n
        FROM v_scm WHERE ({like}) AND fase_atual IS NOT NULL
        GROUP BY 1 ORDER BY n DESC
        """,
        params,
    )
    total = run_query(f"SELECT COUNT(*) AS n FROM v_scm WHERE ({like})", params)
    return {
        "total": total[0]["n"] if total else 0,
        "por_substancia": por_subs,
        "por_fase": por_fase,
    }


@router.get("/clipping")
def clipping():
    """Produto F — Clipping setorial (isca freemium): destaques proprietários do
    nosso dado + slot de manchetes (conectável via N8N/Google Alerts, sem inventar)."""
    destaques = []

    # 1. Maior arrecadação CFEM por substância (último ano cheio)
    cf = run_query(
        f"""SELECT "Substância" AS s, SUM({_VAL}) AS v FROM 'data/processed/anm_cfem.parquet'
            WHERE Ano = 2025 AND {_VAL} IS NOT NULL GROUP BY 1 ORDER BY v DESC LIMIT 1""")
    if cf:
        destaques.append({"tipo": "CFEM", "texto": f"{cf[0]['s']} liderou a arrecadação de CFEM em 2025",
                          "valor": cf[0]["v"], "unidade": "R$"})

    # 2. Maior projeto anunciado (pipeline curado)
    path = _REF / "projetos_destaque.json"
    if path.exists():
        projs = json.loads(path.read_text(encoding="utf-8")).get("projetos", [])
        comusd = [p for p in projs if (p.get("investimento_moeda") or "").upper() == "USD" and p.get("investimento_valor")]
        if comusd:
            top = max(comusd, key=lambda p: p["investimento_valor"])
            destaques.append({"tipo": "Projeto", "texto": f"{top['empresa']} — {top['projeto']}",
                              "valor": top["investimento_valor"], "unidade": "US$"})

    # 3. Minerais estratégicos em movimento (requerimentos)
    like = " OR ".join("UPPER(substancia_principal) LIKE ?" for _ in _ESTRATEGICOS)
    tot = run_query(f"SELECT COUNT(*) AS n FROM v_scm WHERE ({like})", [f"%{m}%" for m in _ESTRATEGICOS])
    if tot:
        destaques.append({"tipo": "Estratégicos", "texto": "requerimentos ativos em minerais críticos (lítio, cobre, terras raras…)",
                          "valor": tot[0]["n"], "unidade": "un"})

    return {
        "titulo": "Clipping Mineral Summo",
        "destaques": destaques,
        "manchetes": [],  # slot — conectar fonte de notícias (N8N / Google Alerts)
        "manchetes_status": "Conecte uma fonte (N8N ou Google Alerts) para popular as manchetes do setor.",
    }


@router.get("/atlas-ferro")
def atlas_ferro(limit: int = Query(20, ge=1, le=100)):
    """Produto A — Atlas DR-Grade (proto): municípios produtores de ferro por CFEM recolhido."""
    rows = run_query(
        f"""
        SELECT "Município" AS municipio, UF AS uf,
               SUM({_VAL}) AS valor_recolhido,
               COUNT(DISTINCT Processo) AS minas
        FROM 'data/processed/anm_cfem.parquet'
        WHERE UPPER("Substância") LIKE '%FERRO%' AND Ano >= 2023 AND {_VAL} IS NOT NULL
        GROUP BY 1, 2 ORDER BY valor_recolhido DESC NULLS LAST LIMIT ?
        """,
        [limit],
    )
    return {"substancia": "Minério de Ferro", "desde": 2023, "ranking": rows}
