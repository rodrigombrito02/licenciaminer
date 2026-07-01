"""Endpoints da Inteligência de Mercado (feedback Lima).

Aditivo: convive com api/routers/mineral_intelligence.py (mesmo prefixo /api/mi).
- Produção beneficiada e Vendas comercializadas a partir do ANM RAL.
- Analytics do mercado seaborne de pelotas (base proprietária do Lima) — premium.

Fontes:
- data/processed/anm_ral.parquet (RAL; números com vírgula decimal).
- data/processed/seaborne_pellets.parquet (base Seaborne Pellets, já numérica).
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Query

from api.services.database import safe_query

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/mi", tags=["Inteligência de Mercado (Lima)"])

_PROC = Path(__file__).resolve().parents[2] / "data" / "processed"
_RAL = (_PROC / "anm_ral.parquet").as_posix()
_PELLETS = (_PROC / "seaborne_pellets.parquet").as_posix()

# número BR do RAL: vírgula decimal, sem separador de milhar
def _num(col: str) -> str:
    return f"TRY_CAST(REPLACE(\"{col}\", ',', '.') AS DOUBLE)"


def _ral_exists() -> bool:
    return (_PROC / "anm_ral.parquet").exists()


def _pellets_exists() -> bool:
    return (_PROC / "seaborne_pellets.parquet").exists()


# ════════════════════════════════════════════════════════════════════
#  ANM RAL — Produção beneficiada & Vendas comercializadas
# ════════════════════════════════════════════════════════════════════
@router.get("/ral/meta")
def ral_meta():
    """Anos e substâncias disponíveis (produção beneficiada), 2021+."""
    if not _ral_exists():
        return {"anos": [], "substancias": [], "ufs": []}
    anos = [r["a"] for r in safe_query(
        f"SELECT DISTINCT \"Ano base\" a FROM '{_RAL}' "
        f"WHERE \"Ano base\" >= '2021' ORDER BY a DESC")]
    subs = [r["s"] for r in safe_query(
        f"SELECT DISTINCT \"Substância Mineral\" s FROM '{_RAL}' "
        f"WHERE s IS NOT NULL ORDER BY s")]
    ufs = [r["u"] for r in safe_query(
        f"SELECT DISTINCT UF u FROM '{_RAL}' WHERE u IS NOT NULL ORDER BY u")]
    return {"anos": anos, "substancias": subs, "ufs": ufs}


@router.get("/ral/producao")
def ral_producao(
    ano: str = Query("2024"),
    substancia: Optional[str] = Query(None),
    uf: Optional[str] = Query(None),
):
    """Produção beneficiada (ANM RAL) — ranking por Estado e por Substância."""
    if not _ral_exists():
        return {"ano": ano, "por_estado": [], "por_substancia": [], "total_t": 0}
    filtros = ["_tipo_producao = 'producao_beneficiada'", f"\"Ano base\" = '{ano}'"]
    if substancia:
        filtros.append(f"\"Substância Mineral\" = '{substancia.replace(chr(39), chr(39)*2)}'")
    if uf:
        filtros.append(f"UF = '{uf.replace(chr(39), chr(39)*2)}'")
    where = " AND ".join(filtros)
    prod = _num("Quantidade Produção")

    por_estado = safe_query(
        f"SELECT UF estado, ROUND(SUM({prod}),0) qtd_t FROM '{_RAL}' "
        f"WHERE {where} AND {prod} IS NOT NULL GROUP BY UF ORDER BY qtd_t DESC")
    por_substancia = safe_query(
        f"SELECT \"Substância Mineral\" substancia, ROUND(SUM({prod}),0) qtd_t FROM '{_RAL}' "
        f"WHERE {where} AND {prod} IS NOT NULL GROUP BY 1 ORDER BY qtd_t DESC LIMIT 25")
    total = safe_query(
        f"SELECT ROUND(SUM({prod}),0) t FROM '{_RAL}' WHERE {where} AND {prod} IS NOT NULL")
    return {
        "ano": ano, "por_estado": por_estado, "por_substancia": por_substancia,
        "total_t": (total[0]["t"] if total else 0) or 0,
    }


@router.get("/ral/vendas")
def ral_vendas(
    ano: str = Query("2024"),
    substancia: Optional[str] = Query(None),
    uf: Optional[str] = Query(None),
):
    """Produção beneficiada comercializada (ANM RAL) — quantidade, valor e valor unitário."""
    if not _ral_exists():
        return {"ano": ano, "linhas": [], "total_valor": 0, "total_qtd": 0}
    filtros = ["_tipo_producao = 'producao_beneficiada'", f"\"Ano base\" = '{ano}'"]
    if substancia:
        filtros.append(f"\"Substância Mineral\" = '{substancia.replace(chr(39), chr(39)*2)}'")
    if uf:
        filtros.append(f"UF = '{uf.replace(chr(39), chr(39)*2)}'")
    where = " AND ".join(filtros)
    qtd = f"COALESCE({_num('Quantidade Venda (t)')}, {_num('Quantidade Venda')})"
    val = _num("Valor Venda (R$)")

    # agrega por substância (+UF quando filtra UF); valor unitário = valor/qtd
    linhas = safe_query(
        f"SELECT \"Substância Mineral\" substancia, UF uf, "
        f"ROUND(SUM({qtd}),0) qtd_t, ROUND(SUM({val}),2) valor_rs "
        f"FROM '{_RAL}' WHERE {where} AND {val} IS NOT NULL "
        f"GROUP BY 1,2 ORDER BY valor_rs DESC LIMIT 60")
    for l in linhas:
        q, v = l.get("qtd_t") or 0, l.get("valor_rs") or 0
        l["valor_unitario_rs"] = round(v / q, 2) if q else None
    tot = safe_query(
        f"SELECT ROUND(SUM({val}),2) v, ROUND(SUM({qtd}),0) q FROM '{_RAL}' "
        f"WHERE {where} AND {val} IS NOT NULL")
    return {
        "ano": ano, "linhas": linhas,
        "total_valor": (tot[0]["v"] if tot else 0) or 0,
        "total_qtd": (tot[0]["q"] if tot else 0) or 0,
    }


# ════════════════════════════════════════════════════════════════════
#  Seaborne Pellets — analytics premium (base proprietária Lima)
# ════════════════════════════════════════════════════════════════════
@router.get("/pellets/overview")
def pellets_overview():
    """Evolução do mercado seaborne de pelotas por ano + split DR vs BF."""
    if not _pellets_exists():
        return {"por_ano": [], "disponivel": False}
    por_ano = safe_query(
        f"SELECT ano, ROUND(SUM(vol)/1e6,1) mt, ROUND(SUM(valor)/1e9,2) bi_usd, "
        f"ROUND(SUM(CASE WHEN tipo='DR' THEN vol ELSE 0 END)/1e6,1) dr_mt, "
        f"ROUND(SUM(CASE WHEN tipo='BF' THEN vol ELSE 0 END)/1e6,1) bf_mt "
        f"FROM '{_PELLETS}' GROUP BY ano ORDER BY ano")
    return {"por_ano": por_ano, "disponivel": True}


@router.get("/pellets/share")
def pellets_share(ano: int = Query(2024)):
    """Market share por competidor (fornecedor) no ano."""
    if not _pellets_exists():
        return {"ano": ano, "competidores": []}
    comp = safe_query(
        f"SELECT competidor, ROUND(SUM(vol)/1e6,2) mt FROM '{_PELLETS}' "
        f"WHERE ano = {int(ano)} GROUP BY competidor ORDER BY mt DESC")
    tot = sum((c["mt"] or 0) for c in comp) or 1
    for c in comp:
        c["pct"] = round(100 * (c["mt"] or 0) / tot, 1)
    return {"ano": ano, "competidores": comp}


@router.get("/pellets/regioes")
def pellets_regioes(ano: int = Query(2024)):
    """Volume importado por região de destino + split DR/BF."""
    if not _pellets_exists():
        return {"ano": ano, "regioes": []}
    reg = safe_query(
        f"SELECT regiao, ROUND(SUM(vol)/1e6,1) mt, "
        f"ROUND(SUM(CASE WHEN tipo='DR' THEN vol ELSE 0 END)/1e6,1) dr_mt, "
        f"ROUND(SUM(CASE WHEN tipo='BF' THEN vol ELSE 0 END)/1e6,1) bf_mt "
        f"FROM '{_PELLETS}' WHERE ano = {int(ano)} AND regiao IS NOT NULL "
        f"GROUP BY regiao ORDER BY mt DESC")
    return {"ano": ano, "regioes": reg}


@router.get("/pellets/qualidade")
def pellets_qualidade():
    """Preço ajustado médio e teor de Fe por tipo (DR/BF) ao longo dos anos — prêmio de qualidade."""
    if not _pellets_exists():
        return {"series": []}
    series = safe_query(
        f"SELECT ano, tipo, ROUND(AVG(NULLIF(preco_ajustado,0)),2) preco_medio, "
        f"ROUND(AVG(NULLIF(fe,0)),2) fe_medio FROM '{_PELLETS}' "
        f"WHERE tipo IN ('DR','BF') GROUP BY ano, tipo ORDER BY ano, tipo")
    return {"series": series}
