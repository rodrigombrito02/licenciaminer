"""Captação — inbox de demandas (leads), interações e conversão.

Roteia leads dos CTAs dos produtos, qualifica por frente e promove ao Funil de
Oportunidades quando vira negócio de ativo. Interno (consultor/admin).
"""

import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from licenciaminer.captacao.database import (
    Demanda,
    InteracaoDemanda,
    ORIGENS,
    FRENTES,
    STATUS,
    get_session,
)
from licenciaminer.oportunidades.database import (
    Oportunidade,
    SessionLocal as OportunidadeSession,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/captacao", tags=["Captação"])

ORIGEM_LABELS = {
    "sq_ambiental": "SQ Ambiental",
    "ativos": "Ativos Minerários",
    "mineral_intelligence": "Mineral Intelligence",
    "sq_consultoria": "SQ Consultoria",
    "sq_solucoes": "SQ Soluções",
    "site": "Site",
    "indicacao": "Indicação",
    "outro": "Outro",
}
FRENTE_LABELS = {
    "ambiental": "Ambiental",
    "ativos": "Ativos Minerários",
    "mineral_intelligence": "Mineral Intelligence",
    "consultoria": "Consultoria",
    "solucoes": "Soluções",
}
STATUS_LABELS = {
    "novo": "Novo",
    "qualificando": "Qualificando",
    "proposta": "Proposta",
    "ganho": "Ganho",
    "perdido": "Perdido",
}


# ── Schemas ──
class DemandaIn(BaseModel):
    titulo: str
    descricao: Optional[str] = None
    origem: Optional[str] = None
    frente: Optional[str] = None
    contato_nome: Optional[str] = None
    contato_email: Optional[str] = None
    contato_telefone: Optional[str] = None
    empresa: Optional[str] = None
    cnpj: Optional[str] = None
    processo_anm: Optional[str] = None
    responsavel: Optional[str] = None
    valor_estimado: Optional[float] = None
    criado_por: Optional[str] = None


class DemandaPatch(BaseModel):
    status: Optional[str] = None
    frente: Optional[str] = None
    responsavel: Optional[str] = None
    valor_estimado: Optional[float] = None
    contato_nome: Optional[str] = None
    contato_email: Optional[str] = None
    contato_telefone: Optional[str] = None
    empresa: Optional[str] = None
    cnpj: Optional[str] = None


class InteracaoIn(BaseModel):
    autor: Optional[str] = None
    texto: str
    tipo: Optional[str] = "nota"


class InteracaoOut(BaseModel):
    id: int
    autor: Optional[str]
    texto: Optional[str]
    tipo: Optional[str]
    criado_em: datetime

    class Config:
        from_attributes = True


class DemandaOut(BaseModel):
    id: int
    titulo: str
    descricao: Optional[str]
    origem: Optional[str]
    frente: Optional[str]
    status: str
    contato_nome: Optional[str]
    contato_email: Optional[str]
    contato_telefone: Optional[str]
    empresa: Optional[str]
    cnpj: Optional[str]
    oportunidade_id: Optional[int]
    processo_anm: Optional[str]
    responsavel: Optional[str]
    valor_estimado: Optional[float]
    criado_por: Optional[str]
    criado_em: datetime
    atualizado_em: datetime
    n_interacoes: int = 0
    interacoes: list[InteracaoOut] = []

    class Config:
        from_attributes = True


def _to_out(d: Demanda, com_interacoes: bool = False) -> DemandaOut:
    out = DemandaOut.model_validate(d)
    out.n_interacoes = len(d.interacoes)
    out.interacoes = [InteracaoOut.model_validate(i) for i in
                      sorted(d.interacoes, key=lambda x: x.criado_em, reverse=True)] if com_interacoes else []
    return out


# ── Endpoints ──
@router.get("/meta")
def meta():
    return {
        "origens": ORIGENS, "origem_labels": ORIGEM_LABELS,
        "frentes": FRENTES, "frente_labels": FRENTE_LABELS,
        "status": STATUS, "status_labels": STATUS_LABELS,
    }


@router.get("/demandas", response_model=list[DemandaOut])
def listar(
    status: Optional[str] = Query(None),
    frente: Optional[str] = Query(None),
    origem: Optional[str] = Query(None),
    db: Session = Depends(get_session),
):
    q = db.query(Demanda)
    if status:
        q = q.filter(Demanda.status == status)
    if frente:
        q = q.filter(Demanda.frente == frente)
    if origem:
        q = q.filter(Demanda.origem == origem)
    rows = q.order_by(Demanda.atualizado_em.desc()).all()
    return [_to_out(d) for d in rows]


@router.post("/demandas", response_model=DemandaOut)
def criar(payload: DemandaIn, db: Session = Depends(get_session)):
    d = Demanda(**payload.model_dump(exclude_none=True), status="novo")
    db.add(d)
    db.commit()
    db.refresh(d)
    return _to_out(d)


@router.get("/demandas/{demanda_id}", response_model=DemandaOut)
def detalhe(demanda_id: int, db: Session = Depends(get_session)):
    d = db.query(Demanda).filter(Demanda.id == demanda_id).first()
    if not d:
        raise HTTPException(404, "Demanda não encontrada")
    return _to_out(d, com_interacoes=True)


@router.patch("/demandas/{demanda_id}", response_model=DemandaOut)
def atualizar(demanda_id: int, payload: DemandaPatch, db: Session = Depends(get_session)):
    d = db.query(Demanda).filter(Demanda.id == demanda_id).first()
    if not d:
        raise HTTPException(404, "Demanda não encontrada")
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(d, k, v)
    db.commit()
    db.refresh(d)
    return _to_out(d, com_interacoes=True)


@router.delete("/demandas/{demanda_id}")
def deletar(demanda_id: int, db: Session = Depends(get_session)):
    d = db.query(Demanda).filter(Demanda.id == demanda_id).first()
    if not d:
        raise HTTPException(404, "Demanda não encontrada")
    db.delete(d)
    db.commit()
    return {"ok": True}


@router.post("/demandas/{demanda_id}/interacoes", response_model=DemandaOut)
def add_interacao(demanda_id: int, payload: InteracaoIn, db: Session = Depends(get_session)):
    d = db.query(Demanda).filter(Demanda.id == demanda_id).first()
    if not d:
        raise HTTPException(404, "Demanda não encontrada")
    db.add(InteracaoDemanda(
        demanda_id=demanda_id, autor=payload.autor, texto=payload.texto, tipo=payload.tipo,
    ))
    db.commit()
    db.refresh(d)
    return _to_out(d, com_interacoes=True)


@router.post("/demandas/{demanda_id}/promover", response_model=DemandaOut)
def promover_ao_funil(demanda_id: int, db: Session = Depends(get_session)):
    """Cria uma Oportunidade no Funil a partir da demanda e vincula. Idempotente."""
    d = db.query(Demanda).filter(Demanda.id == demanda_id).first()
    if not d:
        raise HTTPException(404, "Demanda não encontrada")

    if d.oportunidade_id:
        return _to_out(d, com_interacoes=True)

    op_db = OportunidadeSession()
    try:
        op = Oportunidade(
            titulo=d.titulo,
            descricao=f"Promovida da Captação (demanda #{d.id}).",
            etapa="prospect",
            processo_anm=d.processo_anm,
            criado_por=d.responsavel or d.criado_por,
            valor_estimado=d.valor_estimado,
        )
        op_db.add(op)
        op_db.commit()
        op_db.refresh(op)
        op_id = op.id
    finally:
        op_db.close()

    d.oportunidade_id = op_id
    if d.status in ("novo", "qualificando"):
        d.status = "proposta"
    db.commit()
    db.refresh(d)
    return _to_out(d, com_interacoes=True)


@router.get("/kpis")
def kpis(db: Session = Depends(get_session)):
    total = db.query(func.count(Demanda.id)).scalar() or 0

    def _group(col):
        rows = db.query(col, func.count(Demanda.id)).group_by(col).all()
        return {(k or "—"): n for k, n in rows}

    por_status = _group(Demanda.status)
    por_origem = _group(Demanda.origem)
    por_frente = _group(Demanda.frente)

    ganhos = por_status.get("ganho", 0)
    perdidos = por_status.get("perdido", 0)
    fechados = ganhos + perdidos
    taxa_conversao = round(100 * ganhos / fechados, 1) if fechados else None

    return {
        "total": total,
        "por_status": por_status,
        "por_origem": por_origem,
        "por_frente": por_frente,
        "ganhos": ganhos,
        "taxa_conversao": taxa_conversao,
    }
