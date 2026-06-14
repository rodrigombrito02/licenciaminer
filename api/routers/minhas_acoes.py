"""Agrega as acoes atribuidas a um membro da Summo em todos os modulos.

Alimenta o 'Ola, [nome]' da home interna. Match por nome flexivel
(primeiro nome, case-insensitive) — quando uma acao e atribuida a um membro,
ela aparece no resumo dele ao logar.
"""

from __future__ import annotations

import logging
import sqlite3
from datetime import date
from pathlib import Path

from fastapi import APIRouter, Query

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/minhas-acoes", tags=["Minhas Ações"])

DATA_DIR = Path(__file__).resolve().parents[2] / "data"


def _norm(nome: str) -> str:
    return (nome or "").strip().lower()


def _match(valor: str | None, nome: str, primeiro: str) -> bool:
    if not valor:
        return False
    v = valor.lower()
    return nome in v or (len(primeiro) >= 3 and primeiro in v)


def _safe_rows(db_path: Path, query: str) -> list[sqlite3.Row]:
    if not db_path.exists():
        return []
    try:
        con = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
        con.row_factory = sqlite3.Row
        try:
            return con.execute(query).fetchall()
        finally:
            con.close()
    except Exception as exc:  # tabela ausente etc.
        logger.warning("minhas-acoes: %s — %s", db_path.name, exc)
        return []


@router.get("")
def minhas_acoes(nome: str = Query(..., description="Nome do membro Summo")) -> dict:
    nome_n = _norm(nome)
    primeiro = nome_n.split(" ")[0] if nome_n else ""
    hoje = date.today().isoformat()

    tarefas: list[dict] = []
    oportunidades: list[dict] = []

    # ── Plano de Ações ──
    for r in _safe_rows(
        DATA_DIR / "planos_acao.db",
        "SELECT descricao, responsavel_pessoa, data_fim, status, pct_concluido, plano_id "
        "FROM pa_tarefas",
    ):
        if _match(r["responsavel_pessoa"], nome_n, primeiro):
            tarefas.append({
                "origem": "Plano de Ações",
                "titulo": r["descricao"],
                "prazo": r["data_fim"],
                "status": r["status"],
                "pct": r["pct_concluido"],
            })

    # ── Funil de Oportunidades (lidero) ──
    for r in _safe_rows(
        DATA_DIR / "oportunidades.db",
        "SELECT titulo, responsavel, etapa, prazo_etapa FROM op_oportunidades",
    ):
        if _match(r["responsavel"], nome_n, primeiro):
            oportunidades.append({
                "origem": "Funil de Oportunidades",
                "titulo": r["titulo"],
                "etapa": r["etapa"],
                "prazo": r["prazo_etapa"],
            })

    # ── Mapeamentos (sou líder) ──
    for r in _safe_rows(
        DATA_DIR / "mapeamentos.db",
        "SELECT nome, lider_responsavel FROM mp_mapeamentos",
    ):
        if _match(r["lider_responsavel"], nome_n, primeiro):
            tarefas.append({
                "origem": "Mapeamento",
                "titulo": f"Liderar tese: {r['nome']}",
                "prazo": None,
                "status": "ativo",
                "pct": None,
            })

    # Métricas
    def _atrasada(t: dict) -> bool:
        p = t.get("prazo")
        st = (t.get("status") or "").lower()
        return bool(p and p < hoje and "conclu" not in st)

    atrasadas = sum(1 for t in tarefas if _atrasada(t))
    abertas = sum(1 for t in tarefas if "conclu" not in (t.get("status") or "").lower())

    return {
        "nome": nome,
        "resumo": {
            "tarefas_abertas": abertas,
            "atrasadas": atrasadas,
            "oportunidades": len(oportunidades),
            "total": len(tarefas) + len(oportunidades),
        },
        "tarefas": tarefas,
        "oportunidades": oportunidades,
    }
