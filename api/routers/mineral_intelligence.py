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
