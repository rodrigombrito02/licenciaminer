"""Endpoints do Funil de Oportunidades — apenas para admin/socios.

CRUD + mudanca de etapa + score consolidado + geracao de Relatorio
de Viabilidade (HTML/PDF) no estilo Summo.
"""

from __future__ import annotations

import logging
from datetime import date, datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from licenciaminer.oportunidades.database import (
    ETAPAS,
    MudancaEtapa,
    Oportunidade,
    get_session,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/oportunidades", tags=["Oportunidades"])


# ══════════════════════════════════════════════════════════════════
# Schemas
# ══════════════════════════════════════════════════════════════════

class OportunidadeIn(BaseModel):
    titulo: str
    descricao: Optional[str] = None
    processo_anm: Optional[str] = None
    substancia: Optional[str] = None
    fase_anm: Optional[str] = None
    area_ha: Optional[float] = None
    municipio: Optional[str] = None
    uf: Optional[str] = None
    responsavel: Optional[str] = None
    valor_estimado: Optional[float] = None
    prazo_etapa: Optional[date] = None
    criado_por: Optional[str] = None


class AvaliacaoIn(BaseModel):
    """Atualizacao parcial dos 9 scores e notas."""
    score_agua: Optional[float] = None
    score_energia: Optional[float] = None
    score_logistica: Optional[float] = None
    score_mao_obra: Optional[float] = None
    score_licenciamento: Optional[float] = None
    score_financeiro: Optional[float] = None
    score_stakeholder: Optional[float] = None
    score_geologico: Optional[float] = None
    score_climatico: Optional[float] = None
    notas_avaliacao: Optional[dict] = None


class MudarEtapaIn(BaseModel):
    etapa: str
    nota: Optional[str] = None
    por: Optional[str] = None


class OportunidadeOut(BaseModel):
    id: int
    titulo: str
    descricao: Optional[str]
    etapa: str
    processo_anm: Optional[str]
    substancia: Optional[str]
    fase_anm: Optional[str]
    area_ha: Optional[float]
    municipio: Optional[str]
    uf: Optional[str]
    score_agua: Optional[float]
    score_energia: Optional[float]
    score_logistica: Optional[float]
    score_mao_obra: Optional[float]
    score_licenciamento: Optional[float]
    score_financeiro: Optional[float]
    score_stakeholder: Optional[float]
    score_geologico: Optional[float]
    score_climatico: Optional[float]
    score_consolidado: Optional[float] = None
    notas_avaliacao: Optional[dict]
    responsavel: Optional[str]
    valor_estimado: Optional[float]
    prazo_etapa: Optional[date]
    criado_por: Optional[str]
    criado_em: datetime
    atualizado_em: datetime

    class Config:
        from_attributes = True


def _to_out(o: Oportunidade) -> OportunidadeOut:
    scores = [
        o.score_agua, o.score_energia, o.score_logistica, o.score_mao_obra,
        o.score_licenciamento, o.score_financeiro, o.score_stakeholder,
        o.score_geologico, o.score_climatico,
    ]
    scores_validos = [s for s in scores if s is not None]
    consolidado = round(sum(scores_validos) / len(scores_validos), 1) if scores_validos else None

    return OportunidadeOut(
        id=o.id, titulo=o.titulo, descricao=o.descricao, etapa=o.etapa,
        processo_anm=o.processo_anm, substancia=o.substancia, fase_anm=o.fase_anm,
        area_ha=o.area_ha, municipio=o.municipio, uf=o.uf,
        score_agua=o.score_agua, score_energia=o.score_energia,
        score_logistica=o.score_logistica, score_mao_obra=o.score_mao_obra,
        score_licenciamento=o.score_licenciamento, score_financeiro=o.score_financeiro,
        score_stakeholder=o.score_stakeholder, score_geologico=o.score_geologico,
        score_climatico=o.score_climatico, score_consolidado=consolidado,
        notas_avaliacao=o.notas_avaliacao, responsavel=o.responsavel,
        valor_estimado=o.valor_estimado, prazo_etapa=o.prazo_etapa,
        criado_por=o.criado_por, criado_em=o.criado_em, atualizado_em=o.atualizado_em,
    )


# ══════════════════════════════════════════════════════════════════
# Endpoints
# ══════════════════════════════════════════════════════════════════

@router.get("/etapas")
def get_etapas():
    """Lista as 8 etapas do funil."""
    labels = {
        "prospect": "Prospect",
        "avaliacao": "Avaliação",
        "relatorio": "Relatório",
        "investidores": "Investidores",
        "aprovacao": "Aprovação",
        "estruturacao": "Estruturação",
        "implantacao": "Implantação",
        "operacao": "Operação",
    }
    return [{"codigo": e, "label": labels[e]} for e in ETAPAS]


@router.get("/", response_model=list[OportunidadeOut])
def listar_oportunidades(
    etapa: Optional[str] = Query(None),
    substancia: Optional[str] = Query(None),
    db: Session = Depends(get_session),
):
    q = db.query(Oportunidade)
    if etapa:
        q = q.filter(Oportunidade.etapa == etapa)
    if substancia:
        q = q.filter(Oportunidade.substancia.ilike(f"%{substancia}%"))
    rows = q.order_by(Oportunidade.atualizado_em.desc()).all()
    return [_to_out(o) for o in rows]


@router.post("/", response_model=OportunidadeOut)
def criar_oportunidade(payload: OportunidadeIn, db: Session = Depends(get_session)):
    o = Oportunidade(**payload.model_dump(exclude_none=True), etapa="prospect")
    db.add(o)
    db.flush()
    db.add(MudancaEtapa(
        oportunidade_id=o.id,
        etapa_anterior=None,
        etapa_nova="prospect",
        nota="Criada",
        por=payload.criado_por,
    ))
    db.commit()
    db.refresh(o)
    return _to_out(o)


@router.get("/{oportunidade_id}", response_model=OportunidadeOut)
def detalhe_oportunidade(oportunidade_id: int, db: Session = Depends(get_session)):
    o = db.query(Oportunidade).filter(Oportunidade.id == oportunidade_id).first()
    if not o:
        raise HTTPException(404, "Oportunidade nao encontrada")
    return _to_out(o)


@router.patch("/{oportunidade_id}/avaliacao", response_model=OportunidadeOut)
def atualizar_avaliacao(
    oportunidade_id: int,
    payload: AvaliacaoIn,
    db: Session = Depends(get_session),
):
    o = db.query(Oportunidade).filter(Oportunidade.id == oportunidade_id).first()
    if not o:
        raise HTTPException(404, "Oportunidade nao encontrada")
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(o, k, v)
    db.commit()
    db.refresh(o)
    return _to_out(o)


@router.post("/{oportunidade_id}/mudar-etapa", response_model=OportunidadeOut)
def mudar_etapa(
    oportunidade_id: int,
    payload: MudarEtapaIn,
    db: Session = Depends(get_session),
):
    if payload.etapa not in ETAPAS:
        raise HTTPException(400, f"Etapa invalida. Use uma de: {ETAPAS}")
    o = db.query(Oportunidade).filter(Oportunidade.id == oportunidade_id).first()
    if not o:
        raise HTTPException(404, "Oportunidade nao encontrada")
    etapa_anterior = o.etapa
    o.etapa = payload.etapa
    db.add(MudancaEtapa(
        oportunidade_id=o.id,
        etapa_anterior=etapa_anterior,
        etapa_nova=payload.etapa,
        nota=payload.nota,
        por=payload.por,
    ))
    db.commit()
    db.refresh(o)
    return _to_out(o)


@router.delete("/{oportunidade_id}")
def deletar_oportunidade(oportunidade_id: int, db: Session = Depends(get_session)):
    o = db.query(Oportunidade).filter(Oportunidade.id == oportunidade_id).first()
    if not o:
        raise HTTPException(404, "Oportunidade nao encontrada")
    db.delete(o)
    db.commit()
    return {"ok": True, "deletado": oportunidade_id}


# ══════════════════════════════════════════════════════════════════
# KPIs do funil
# ══════════════════════════════════════════════════════════════════

@router.get("/kpis/resumo")
def kpis_resumo(db: Session = Depends(get_session)):
    """Contagens por etapa para drag-and-drop kanban e dashboards."""
    rows = db.query(Oportunidade).all()
    by_etapa: dict[str, int] = {e: 0 for e in ETAPAS}
    valor_pipeline = 0.0
    for o in rows:
        by_etapa[o.etapa] = by_etapa.get(o.etapa, 0) + 1
        if o.valor_estimado:
            valor_pipeline += float(o.valor_estimado)
    return {
        "total": len(rows),
        "por_etapa": by_etapa,
        "valor_pipeline_estimado": valor_pipeline,
    }


# ══════════════════════════════════════════════════════════════════
# Relatorio de Viabilidade (HTML)
# ══════════════════════════════════════════════════════════════════

@router.post("/{oportunidade_id}/relatorio", response_class=HTMLResponse)
def gerar_relatorio_viabilidade(oportunidade_id: int, db: Session = Depends(get_session)):
    """Gera Relatorio Completo de Viabilidade da oportunidade (HTML)."""
    o = db.query(Oportunidade).filter(Oportunidade.id == oportunidade_id).first()
    if not o:
        raise HTTPException(404, "Oportunidade nao encontrada")
    from api.services.report_templates import render_relatorio_viabilidade_oportunidade

    html = render_relatorio_viabilidade_oportunidade(_to_out(o).model_dump())
    return HTMLResponse(content=html)
