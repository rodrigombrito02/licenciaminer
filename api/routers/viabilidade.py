"""Endpoints de Análise de Viabilidade Ambiental.

Produto de entrada (anzol): avalia perfil de licenciamento e gera
relatório preliminar + estimativa de escopo para proposta técnica.
"""

from __future__ import annotations

import base64
import logging
from pathlib import Path

from fastapi import APIRouter, Query
from pydantic import BaseModel

from api.services.database import safe_query
from app.components.dd_inventory import (
    LICENCA_DESC,
    LICENCA_MAP,
    filtrar_documentos,
    load_requisitos,
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/viabilidade/perfil")
def get_viability_profile(
    atividade: str = Query(..., description="Código de atividade (ex: A-02)"),
    classe: int = Query(..., ge=1, le=6),
    regional: str | None = Query(None),
    licenca_tipo: str = Query("LAC1"),
    cnpj: str | None = Query(None),
):
    """Perfil de viabilidade: probabilidade, rigor, fatores, escopo estimado."""

    # 1. Perfil de licenciamento (reutiliza lógica do decisions/profile)
    where_parts = ["atividade LIKE ?"]
    params = [f"{atividade}%"]
    if classe:
        where_parts.append("classe = ?")
        params.append(classe)
    if regional:
        where_parts.append("regional = ?")
        params.append(regional)
    where = "WHERE " + " AND ".join(where_parts)

    profile = safe_query(
        f"""
        SELECT COUNT(*) AS n_decisoes,
            SUM(CASE WHEN decisao='deferido' THEN 1 ELSE 0 END) AS deferidos,
            ROUND(100.0 * SUM(CASE WHEN decisao='deferido' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 1) AS probabilidade
        FROM v_mg_semad {where}
        """,
        params,
    )
    prob = profile[0] if profile else {"n_decisoes": 0, "deferidos": 0, "probabilidade": None}

    # Media geral
    global_rows = safe_query(
        "SELECT ROUND(100.0 * SUM(CASE WHEN decisao='deferido' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 1) AS media FROM v_mg_semad"
    )
    media_geral = global_rows[0]["media"] if global_rows else 78.3

    # Rigor regional
    rigor_delta = None
    if regional:
        reg_rows = safe_query(
            "SELECT ROUND(100.0 * SUM(CASE WHEN decisao='deferido' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 1) AS taxa FROM v_mg_semad WHERE regional = ?",
            [regional],
        )
        if reg_rows and reg_rows[0].get("taxa") is not None:
            rigor_delta = round(reg_rows[0]["taxa"] - media_geral, 1)

    # Tendência 3 anos
    tend_rows = safe_query(
        f"""
        SELECT
            ROUND(100.0 * SUM(CASE WHEN CAST(ano AS INT) >= 2023 AND decisao='deferido' THEN 1 ELSE 0 END)
                / NULLIF(SUM(CASE WHEN CAST(ano AS INT) >= 2023 THEN 1 ELSE 0 END), 0), 1) AS recente,
            ROUND(100.0 * SUM(CASE WHEN CAST(ano AS INT) BETWEEN 2020 AND 2022 AND decisao='deferido' THEN 1 ELSE 0 END)
                / NULLIF(SUM(CASE WHEN CAST(ano AS INT) BETWEEN 2020 AND 2022 THEN 1 ELSE 0 END), 0), 1) AS anterior
        FROM v_mg_semad {where}
        """,
        params,
    )
    tendencia = None
    if tend_rows and tend_rows[0].get("recente") is not None and tend_rows[0].get("anterior") is not None:
        tendencia = round(tend_rows[0]["recente"] - tend_rows[0]["anterior"], 1)

    # 2. Fatores de atenção
    eia_obrigatorio = classe >= 4
    fatores = [
        {
            "fator": "Probabilidade histórica",
            "valor": f"{prob.get('probabilidade', 0)}% ({prob.get('n_decisoes', 0)} decisões)",
            "risco": "alto" if (prob.get("probabilidade") or 0) < 60 else "moderado" if (prob.get("probabilidade") or 0) < 75 else "baixo",
        },
        {
            "fator": "EIA/RIMA obrigatório",
            "valor": "Sim" if eia_obrigatorio else "Não",
            "risco": "alto" if eia_obrigatorio else "baixo",
        },
        {
            "fator": "Classe de impacto",
            "valor": f"Classe {classe}",
            "risco": "alto" if classe >= 5 else "moderado" if classe >= 3 else "baixo",
        },
    ]
    if rigor_delta is not None:
        fatores.append({
            "fator": "Rigor da regional",
            "valor": f"{rigor_delta:+.1f}pp vs média",
            "risco": "alto" if rigor_delta < -10 else "moderado" if rigor_delta < -3 else "baixo",
        })
    if tendencia is not None:
        fatores.append({
            "fator": "Tendência (3 anos)",
            "valor": f"{tendencia:+.1f}pp",
            "risco": "alto" if tendencia < -5 else "moderado" if tendencia < 0 else "baixo",
        })

    # 3. Estimativa de escopo
    docs = filtrar_documentos(licenca_tipo)
    # Count reqs (approximate from all-requirements logic)
    all_reqs = load_requisitos()
    # Use LICENCA_REQ_KEYS mapping from due_diligence router
    from api.routers.due_diligence import LICENCA_REQ_KEYS  # noqa: E402
    req_keys = set(LICENCA_REQ_KEYS.get(licenca_tipo, []))
    for d in docs:
        did = (d.get("doc_id") or "").strip()
        if did and did != "-":
            req_keys.add(did)
    n_reqs = sum(1 for r in all_reqs if (r.get("documento") or "").strip() in req_keys)

    # 4. Risco geral
    riscos_altos = sum(1 for f in fatores if f["risco"] == "alto")
    risco_geral = "alto" if riscos_altos >= 2 else "moderado" if riscos_altos >= 1 else "baixo"
    recomendacao = (
        "Due Diligence completa recomendada antes do protocolo"
        if risco_geral in ("alto", "moderado")
        else "Perfil de baixo risco — considere DD simplificada"
    )

    # 5. Contexto empresa (se CNPJ)
    empresa = None
    if cnpj:
        emp_rows = safe_query(
            """
            SELECT COUNT(*) AS n_decisoes,
                SUM(CASE WHEN decisao='deferido' THEN 1 ELSE 0 END) AS deferidos,
                ROUND(100.0 * SUM(CASE WHEN decisao='deferido' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 1) AS taxa
            FROM v_mg_semad WHERE cnpj_cpf = ?
            """,
            [cnpj],
        )
        infracoes = safe_query(
            "SELECT COUNT(*) AS n FROM v_ibama_infracoes WHERE CPF_CNPJ_INFRATOR = ?",
            [cnpj],
        )
        empresa = {
            "cnpj": cnpj,
            "decisoes": emp_rows[0] if emp_rows else {},
            "infracoes": infracoes[0]["n"] if infracoes else 0,
        }

    return {
        "perfil": {
            "probabilidade": prob.get("probabilidade"),
            "n_decisoes": prob.get("n_decisoes", 0),
            "media_geral": media_geral,
            "rigor_delta": rigor_delta,
            "tendencia": tendencia,
        },
        "fatores": fatores,
        "escopo": {
            "licenca_tipo": licenca_tipo,
            "licenca_desc": LICENCA_DESC.get(licenca_tipo, licenca_tipo),
            "n_documentos": len(docs),
            "n_requisitos": n_reqs,
            "n_normas": 6,
        },
        "risco_geral": risco_geral,
        "recomendacao": recomendacao,
        "empresa": empresa,
        "input": {
            "atividade": atividade,
            "classe": classe,
            "regional": regional,
            "licenca_tipo": licenca_tipo,
        },
    }
