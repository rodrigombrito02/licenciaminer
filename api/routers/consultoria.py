"""SQ Consultoria — carteira de clientes + escopos multi-frente. Interno."""

import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from licenciaminer.consultoria.database import (
    Cliente,
    Escopo,
    STATUS_CLIENTE,
    TIPOS_ESCOPO,
    STATUS_ESCOPO,
    MODULOS_VINCULAVEIS,
    get_session,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/consultoria", tags=["SQ Consultoria"])

TIPO_LABELS = {
    "diagnostico": "Diagnóstico & estratégia",
    "riscos_crises": "Riscos & crises",
    "projetos": "Gestão de projetos",
    "governanca": "Governança corporativa",
    "ambiental": "Ambiental",
    "outro": "Outro",
}
STATUS_CLIENTE_LABELS = {"prospect": "Prospect", "ativo": "Ativo", "inativo": "Inativo"}
STATUS_ESCOPO_LABELS = {
    "proposto": "Proposto", "em_andamento": "Em andamento",
    "concluido": "Concluído", "pausado": "Pausado",
}


# ── Schemas ──
class ClienteIn(BaseModel):
    nome: str
    cnpj: Optional[str] = None
    setor: Optional[str] = None
    status: Optional[str] = "prospect"
    contato_nome: Optional[str] = None
    contato_email: Optional[str] = None
    contato_telefone: Optional[str] = None
    responsavel: Optional[str] = None
    notas: Optional[str] = None
    criado_por: Optional[str] = None


class ClientePatch(BaseModel):
    nome: Optional[str] = None
    cnpj: Optional[str] = None
    setor: Optional[str] = None
    status: Optional[str] = None
    contato_nome: Optional[str] = None
    contato_email: Optional[str] = None
    contato_telefone: Optional[str] = None
    responsavel: Optional[str] = None
    notas: Optional[str] = None


class EscopoIn(BaseModel):
    titulo: str
    tipo: Optional[str] = "diagnostico"
    descricao: Optional[str] = None
    status: Optional[str] = "proposto"
    responsavel: Optional[str] = None
    valor: Optional[float] = None
    vinculos: Optional[list] = None


class EscopoPatch(BaseModel):
    titulo: Optional[str] = None
    tipo: Optional[str] = None
    descricao: Optional[str] = None
    status: Optional[str] = None
    responsavel: Optional[str] = None
    valor: Optional[float] = None
    vinculos: Optional[list] = None


class EscopoOut(BaseModel):
    id: int
    cliente_id: int
    titulo: str
    tipo: str
    descricao: Optional[str]
    status: str
    responsavel: Optional[str]
    valor: Optional[float]
    vinculos: Optional[list]
    criado_em: datetime
    atualizado_em: datetime

    class Config:
        from_attributes = True


class ClienteOut(BaseModel):
    id: int
    nome: str
    cnpj: Optional[str]
    setor: Optional[str]
    status: str
    contato_nome: Optional[str]
    contato_email: Optional[str]
    contato_telefone: Optional[str]
    responsavel: Optional[str]
    notas: Optional[str]
    criado_por: Optional[str]
    criado_em: datetime
    atualizado_em: datetime
    n_escopos: int = 0
    escopos: list[EscopoOut] = []

    class Config:
        from_attributes = True


def _cli_out(c: Cliente, com_escopos: bool = False) -> ClienteOut:
    out = ClienteOut.model_validate(c)
    out.n_escopos = len(c.escopos)
    out.escopos = [EscopoOut.model_validate(e) for e in
                   sorted(c.escopos, key=lambda x: x.criado_em)] if com_escopos else []
    return out


# ── Endpoints ──
@router.get("/meta")
def meta():
    return {
        "status_cliente": STATUS_CLIENTE, "status_cliente_labels": STATUS_CLIENTE_LABELS,
        "tipos_escopo": TIPOS_ESCOPO, "tipo_labels": TIPO_LABELS,
        "status_escopo": STATUS_ESCOPO, "status_escopo_labels": STATUS_ESCOPO_LABELS,
        "modulos_vinculaveis": MODULOS_VINCULAVEIS,
    }


@router.get("/clientes", response_model=list[ClienteOut])
def listar_clientes(status: Optional[str] = Query(None), db: Session = Depends(get_session)):
    q = db.query(Cliente)
    if status:
        q = q.filter(Cliente.status == status)
    return [_cli_out(c) for c in q.order_by(Cliente.atualizado_em.desc()).all()]


@router.post("/clientes", response_model=ClienteOut)
def criar_cliente(payload: ClienteIn, db: Session = Depends(get_session)):
    c = Cliente(**payload.model_dump(exclude_none=True))
    db.add(c)
    db.commit()
    db.refresh(c)
    return _cli_out(c, com_escopos=True)


@router.get("/clientes/{cliente_id}", response_model=ClienteOut)
def detalhe_cliente(cliente_id: int, db: Session = Depends(get_session)):
    c = db.query(Cliente).filter(Cliente.id == cliente_id).first()
    if not c:
        raise HTTPException(404, "Cliente não encontrado")
    return _cli_out(c, com_escopos=True)


@router.patch("/clientes/{cliente_id}", response_model=ClienteOut)
def atualizar_cliente(cliente_id: int, payload: ClientePatch, db: Session = Depends(get_session)):
    c = db.query(Cliente).filter(Cliente.id == cliente_id).first()
    if not c:
        raise HTTPException(404, "Cliente não encontrado")
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(c, k, v)
    db.commit()
    db.refresh(c)
    return _cli_out(c, com_escopos=True)


@router.delete("/clientes/{cliente_id}")
def deletar_cliente(cliente_id: int, db: Session = Depends(get_session)):
    c = db.query(Cliente).filter(Cliente.id == cliente_id).first()
    if not c:
        raise HTTPException(404, "Cliente não encontrado")
    db.delete(c)
    db.commit()
    return {"ok": True}


@router.post("/clientes/{cliente_id}/escopos", response_model=ClienteOut)
def criar_escopo(cliente_id: int, payload: EscopoIn, db: Session = Depends(get_session)):
    c = db.query(Cliente).filter(Cliente.id == cliente_id).first()
    if not c:
        raise HTTPException(404, "Cliente não encontrado")
    db.add(Escopo(cliente_id=cliente_id, **payload.model_dump(exclude_none=True)))
    # promover prospect a ativo ao ganhar primeiro escopo
    if c.status == "prospect":
        c.status = "ativo"
    db.commit()
    db.refresh(c)
    return _cli_out(c, com_escopos=True)


@router.patch("/escopos/{escopo_id}", response_model=EscopoOut)
def atualizar_escopo(escopo_id: int, payload: EscopoPatch, db: Session = Depends(get_session)):
    e = db.query(Escopo).filter(Escopo.id == escopo_id).first()
    if not e:
        raise HTTPException(404, "Escopo não encontrado")
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(e, k, v)
    db.commit()
    db.refresh(e)
    return EscopoOut.model_validate(e)


@router.delete("/escopos/{escopo_id}")
def deletar_escopo(escopo_id: int, db: Session = Depends(get_session)):
    e = db.query(Escopo).filter(Escopo.id == escopo_id).first()
    if not e:
        raise HTTPException(404, "Escopo não encontrado")
    db.delete(e)
    db.commit()
    return {"ok": True}


@router.get("/kpis")
def kpis(db: Session = Depends(get_session)):
    total_clientes = db.query(func.count(Cliente.id)).scalar() or 0
    ativos = db.query(func.count(Cliente.id)).filter(Cliente.status == "ativo").scalar() or 0
    total_escopos = db.query(func.count(Escopo.id)).scalar() or 0
    em_andamento = db.query(func.count(Escopo.id)).filter(Escopo.status == "em_andamento").scalar() or 0

    por_tipo = {(k or "—"): n for k, n in
                db.query(Escopo.tipo, func.count(Escopo.id)).group_by(Escopo.tipo).all()}

    return {
        "total_clientes": total_clientes,
        "clientes_ativos": ativos,
        "total_escopos": total_escopos,
        "escopos_em_andamento": em_andamento,
        "por_tipo": por_tipo,
    }
