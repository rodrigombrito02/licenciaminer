"""Endpoints de Análise de Viabilidade Ambiental.

Produto de entrada (anzol): avalia perfil de licenciamento e gera
relatório preliminar + estimativa de escopo para proposta técnica.
"""

from __future__ import annotations

import base64
import logging
from pathlib import Path

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Path, Query
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from api.services.database import run_query, safe_query
from app.components.dd_inventory import (
    LICENCA_DESC,
    LICENCA_MAP,
    filtrar_documentos,
    load_requisitos,
)
from licenciaminer.database.queries import QUERY_CNPJ_PROFILE
from licenciaminer.viabilidade.database import Analise, get_session

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/viabilidade/generate-report")
def generate_viability_report(
    atividade: str = Query(...),
    classe: int = Query(..., ge=1, le=6),
    regional: str | None = Query(None),
    licenca_tipo: str = Query("LAC1"),
    cnpj: str | None = Query(None),
):
    """Gera relatório HTML de viabilidade com dados reais."""
    from starlette.responses import HTMLResponse
    from api.services.report_templates import render_viabilidade

    # Reutiliza o endpoint de perfil para obter dados
    data = get_viability_profile(atividade, classe, regional, licenca_tipo, cnpj)
    html = render_viabilidade(data)
    return HTMLResponse(content=html)


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

    # 6. Índice de Sucesso (diagnóstico prescritivo — substitui "probabilidade")
    idx = prob.get("probabilidade")
    if idx is None:
        faixa, interpretacao = "indeterminado", "Sem histórico suficiente do segmento para calcular o índice."
    elif idx >= 75:
        faixa, interpretacao = "alto", "Segmento com histórico favorável — foco em executar o protocolo sem falhas."
    elif idx >= 60:
        faixa, interpretacao = "medio", "Viável, mas com fatores de atenção — o plano de ação reduz o risco."
    else:
        faixa, interpretacao = "baixo", "Segmento desafiador — tratar os fatores críticos antes de protocolar."
    indice_sucesso = {"valor": idx, "faixa": faixa, "rotulo": "Índice de Sucesso", "interpretacao": interpretacao}

    # 7. Plano de ação — ação prescritiva por fator de risco
    ACOES = {
        "Probabilidade histórica": "Reforçar o estudo do segmento e antecipar as exigências recorrentes da regional.",
        "EIA/RIMA obrigatório": "Iniciar o EIA/RIMA desde já — é o caminho crítico do cronograma.",
        "Classe de impacto": "Estruturar o licenciamento (trifásico se aplicável) com folga de prazo.",
        "Rigor da regional": "Mapear o padrão de exigências desta regional e pré-responder no protocolo.",
        "Tendência (3 anos)": "Atenção à piora recente do deferimento — revisar premissas de prazo e completude.",
    }
    plano_acao = [
        {"fator": f["fator"], "prioridade": f["risco"], "acao": ACOES.get(f["fator"], "Tratar este fator no plano.")}
        for f in fatores if f["risco"] in ("alto", "moderado")
    ]
    plano_acao.sort(key=lambda x: 0 if x["prioridade"] == "alto" else 1)

    return {
        "perfil": {
            "probabilidade": prob.get("probabilidade"),
            "n_decisoes": prob.get("n_decisoes", 0),
            "media_geral": media_geral,
            "rigor_delta": rigor_delta,
            "tendencia": tendencia,
        },
        "indice_sucesso": indice_sucesso,
        "plano_acao": plano_acao,
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


# ══════════════════════════════════════════════════════════════════
# Lookup por CNPJ — auto-populate de atividade/classe/regional
# ══════════════════════════════════════════════════════════════════

@router.get("/viabilidade/lookup-by-cnpj/{cnpj}")
def lookup_viabilidade_by_cnpj(cnpj: str):
    """Lookup que sugere atividade, classe e regional mais comuns para o CNPJ."""
    cnpj_clean = "".join(c for c in cnpj if c.isdigit())
    if len(cnpj_clean) != 14:
        return {"erro": "CNPJ invalido — informe 14 digitos", "cnpj": cnpj}

    profile_rows = run_query(QUERY_CNPJ_PROFILE, [cnpj_clean])
    profile = profile_rows[0] if profile_rows else None
    if not profile:
        return {
            "cnpj": cnpj_clean,
            "encontrado": False,
            "mensagem": "CNPJ nao tem decisoes SEMAD-MG historicas.",
        }

    razao = profile.get("razao_social") or ""

    ativ_rows = safe_query(
        "SELECT atividade, COUNT(*) AS n FROM v_mg_semad "
        "WHERE cnpj_cpf = ? AND atividade LIKE 'A-0%' "
        "GROUP BY atividade ORDER BY n DESC LIMIT 5",
        [cnpj_clean],
    )
    classe_rows = safe_query(
        "SELECT classe, COUNT(*) AS n FROM v_mg_semad "
        "WHERE cnpj_cpf = ? AND classe IS NOT NULL "
        "GROUP BY classe ORDER BY n DESC LIMIT 3",
        [cnpj_clean],
    )
    reg_rows = safe_query(
        "SELECT regional, COUNT(*) AS n FROM v_mg_semad "
        "WHERE cnpj_cpf = ? AND regional IS NOT NULL AND regional != '' "
        "GROUP BY regional ORDER BY n DESC LIMIT 3",
        [cnpj_clean],
    )
    modal_rows = safe_query(
        "SELECT modalidade, COUNT(*) AS n FROM v_mg_semad "
        "WHERE cnpj_cpf = ? AND modalidade IS NOT NULL AND modalidade != '' "
        "GROUP BY modalidade ORDER BY n DESC LIMIT 5",
        [cnpj_clean],
    )

    sugestao = {
        "atividade": ativ_rows[0]["atividade"][:4] if ativ_rows else None,
        "classe": int(classe_rows[0]["classe"]) if classe_rows and classe_rows[0]["classe"] else None,
        "regional": reg_rows[0]["regional"] if reg_rows else None,
        "licenca_tipo": modal_rows[0]["modalidade"] if modal_rows else None,
    }

    return {
        "cnpj": cnpj_clean,
        "encontrado": True,
        "razao_social": razao,
        "total_decisoes": profile.get("total_decisoes", 0),
        "taxa_aprovacao_historica": profile.get("taxa_aprovacao"),
        "atividades_top": [{"codigo": a["atividade"], "n": a["n"]} for a in ativ_rows],
        "classes_top": [{"classe": int(c["classe"]) if c["classe"] else None, "n": c["n"]} for c in classe_rows],
        "regionais_top": [{"regional": r["regional"], "n": r["n"]} for r in reg_rows],
        "modalidades_top": [{"modalidade": m["modalidade"], "n": m["n"]} for m in modal_rows],
        "sugestao_auto_populate": sugestao,
    }


# ══════════════════════════════════════════════════════════════════
# Historico de analises (SQLite isolado)
# ══════════════════════════════════════════════════════════════════

class AnaliseSalvarRequest(BaseModel):
    titulo: str
    cnpj: Optional[str] = None
    razao_social: Optional[str] = None
    atividade: str
    classe: int
    regional: Optional[str] = None
    licenca_tipo: str
    resultado: dict
    notas: Optional[str] = None


class AnaliseOut(BaseModel):
    id: int
    titulo: str
    cnpj: Optional[str]
    razao_social: Optional[str]
    atividade: str
    classe: int
    regional: Optional[str]
    licenca_tipo: str
    criado_em: str
    atualizado_em: str
    probabilidade: Optional[float] = None
    risco_geral: Optional[str] = None
    notas: Optional[str] = None


@router.post("/viabilidade/historico", response_model=AnaliseOut)
def salvar_analise(payload: AnaliseSalvarRequest, db: Session = Depends(get_session)):
    """Salva uma analise no historico para retomada posterior."""
    cnpj_clean = None
    if payload.cnpj:
        cnpj_clean = "".join(c for c in payload.cnpj if c.isdigit()) or None
    a = Analise(
        titulo=payload.titulo.strip()[:200],
        cnpj=cnpj_clean,
        razao_social=payload.razao_social,
        atividade=payload.atividade,
        classe=payload.classe,
        regional=payload.regional,
        licenca_tipo=payload.licenca_tipo,
        resultado=payload.resultado,
        notas=payload.notas,
    )
    db.add(a)
    db.commit()
    db.refresh(a)
    prob = (a.resultado or {}).get("perfil", {}).get("probabilidade")
    risco = (a.resultado or {}).get("risco_geral")
    return AnaliseOut(
        id=a.id, titulo=a.titulo, cnpj=a.cnpj, razao_social=a.razao_social,
        atividade=a.atividade, classe=a.classe, regional=a.regional,
        licenca_tipo=a.licenca_tipo,
        criado_em=a.criado_em.isoformat(), atualizado_em=a.atualizado_em.isoformat(),
        probabilidade=prob, risco_geral=risco, notas=a.notas,
    )


@router.get("/viabilidade/historico", response_model=list[AnaliseOut])
def listar_analises(
    cnpj: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_session),
):
    q = db.query(Analise).order_by(Analise.atualizado_em.desc())
    if cnpj:
        cnpj_clean = "".join(c for c in cnpj if c.isdigit())
        if cnpj_clean:
            q = q.filter(Analise.cnpj == cnpj_clean)
    rows = q.limit(limit).all()
    out: list[AnaliseOut] = []
    for a in rows:
        prob = (a.resultado or {}).get("perfil", {}).get("probabilidade")
        risco = (a.resultado or {}).get("risco_geral")
        out.append(AnaliseOut(
            id=a.id, titulo=a.titulo, cnpj=a.cnpj, razao_social=a.razao_social,
            atividade=a.atividade, classe=a.classe, regional=a.regional,
            licenca_tipo=a.licenca_tipo,
            criado_em=a.criado_em.isoformat(), atualizado_em=a.atualizado_em.isoformat(),
            probabilidade=prob, risco_geral=risco, notas=a.notas,
        ))
    return out


@router.get("/viabilidade/historico/{analise_id}")
def detalhe_analise(analise_id: int, db: Session = Depends(get_session)):
    a = db.query(Analise).filter(Analise.id == analise_id).first()
    if not a:
        raise HTTPException(404, "Analise nao encontrada")
    return {
        "id": a.id, "titulo": a.titulo, "cnpj": a.cnpj, "razao_social": a.razao_social,
        "atividade": a.atividade, "classe": a.classe, "regional": a.regional,
        "licenca_tipo": a.licenca_tipo,
        "resultado": a.resultado, "notas": a.notas,
        "criado_em": a.criado_em.isoformat(),
        "atualizado_em": a.atualizado_em.isoformat(),
    }


@router.delete("/viabilidade/historico/{analise_id}")
def deletar_analise(analise_id: int, db: Session = Depends(get_session)):
    a = db.query(Analise).filter(Analise.id == analise_id).first()
    if not a:
        raise HTTPException(404, "Analise nao encontrada")
    db.delete(a)
    db.commit()
    return {"ok": True, "deletado": analise_id}


# ══════════════════════════════════════════════════════════════════
# Proposta Tecnica
# ══════════════════════════════════════════════════════════════════

class PropostaRequest(BaseModel):
    atividade: str
    classe: int
    regional: Optional[str] = None
    licenca_tipo: str = "LAC1"
    cnpj: Optional[str] = None
    razao_social: Optional[str] = None
    titulo_empreendimento: Optional[str] = None


@router.post("/viabilidade/generate-proposta", response_class=HTMLResponse)
def gerar_proposta_tecnica(request: PropostaRequest):
    """Gera Proposta Tecnica em HTML a partir de uma analise de viabilidade."""
    from api.services.report_templates import render_proposta_tecnica_viabilidade

    perfil_data = get_viability_profile(
        atividade=request.atividade,
        classe=request.classe,
        regional=request.regional,
        licenca_tipo=request.licenca_tipo,
        cnpj=request.cnpj,
    )

    if request.razao_social:
        emp = perfil_data.get("empresa") or {}
        emp["razao_social"] = request.razao_social
        perfil_data["empresa"] = emp

    if request.cnpj:
        inp = perfil_data.get("input", {}) or {}
        inp["cnpj"] = request.cnpj
        perfil_data["input"] = inp

    html = render_proposta_tecnica_viabilidade(perfil_data)
    return HTMLResponse(content=html)
