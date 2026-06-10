"""Endpoints do modulo Riscos v2 (generico, multi-cliente)."""

from __future__ import annotations

import logging
from datetime import date, datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from licenciaminer.riscos_v2.database import (
    ClienteRV,
    ProjetoRV,
    RiscoRV,
    get_session,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/riscos-v2", tags=["Riscos v2"])


# ── Schemas ──

class ClienteIn(BaseModel):
    nome: str
    descricao: Optional[str] = None


class ClienteOut(BaseModel):
    id: int
    nome: str
    descricao: Optional[str]
    criado_em: datetime
    n_projetos: int = 0


class ProjetoIn(BaseModel):
    cliente_id: int
    nome: str
    descricao: Optional[str] = None
    tipo: str = "projeto"  # erm / projeto / crise


class ProjetoOut(BaseModel):
    id: int
    cliente_id: int
    nome: str
    descricao: Optional[str]
    tipo: str
    status: str
    criado_em: datetime
    n_riscos: int = 0


class RiscoIn(BaseModel):
    projeto_id: int
    codigo: Optional[str] = None
    titulo: str
    descricao: Optional[str] = None
    categoria: Optional[str] = None
    causa: Optional[str] = None
    consequencia: Optional[str] = None
    probabilidade: Optional[int] = None
    impacto: Optional[int] = None
    estrategia: Optional[str] = None
    responsavel: Optional[str] = None
    prazo: Optional[date] = None
    status: str = "identificado"


class RiscoOut(BaseModel):
    id: int
    projeto_id: int
    codigo: Optional[str]
    titulo: str
    descricao: Optional[str]
    categoria: Optional[str]
    causa: Optional[str]
    consequencia: Optional[str]
    probabilidade: Optional[int]
    impacto: Optional[int]
    severidade: Optional[float]
    nivel: Optional[str]
    estrategia: Optional[str]
    responsavel: Optional[str]
    prazo: Optional[date]
    status: str
    raw_extra: Optional[dict]
    criado_em: datetime


def _classificar_nivel(p: int | None, i: int | None) -> tuple[float | None, str | None]:
    if p is None or i is None:
        return None, None
    sev = p * i
    if sev >= 20:
        nivel = "critico"
    elif sev >= 12:
        nivel = "alto"
    elif sev >= 6:
        nivel = "moderado"
    else:
        nivel = "baixo"
    return float(sev), nivel


# ── Clientes ──

@router.get("/clientes", response_model=list[ClienteOut])
def listar_clientes(db: Session = Depends(get_session)):
    rows = db.query(ClienteRV).order_by(ClienteRV.nome).all()
    return [
        ClienteOut(
            id=c.id, nome=c.nome, descricao=c.descricao,
            criado_em=c.criado_em, n_projetos=len(c.projetos),
        )
        for c in rows
    ]


@router.post("/clientes", response_model=ClienteOut)
def criar_cliente(payload: ClienteIn, db: Session = Depends(get_session)):
    if db.query(ClienteRV).filter(ClienteRV.nome == payload.nome).first():
        raise HTTPException(409, f"Cliente '{payload.nome}' ja existe")
    c = ClienteRV(nome=payload.nome.strip(), descricao=payload.descricao)
    db.add(c)
    db.commit()
    db.refresh(c)
    return ClienteOut(
        id=c.id, nome=c.nome, descricao=c.descricao,
        criado_em=c.criado_em, n_projetos=0,
    )


@router.delete("/clientes/{cliente_id}")
def deletar_cliente(cliente_id: int, db: Session = Depends(get_session)):
    c = db.query(ClienteRV).filter(ClienteRV.id == cliente_id).first()
    if not c:
        raise HTTPException(404, "Cliente nao encontrado")
    db.delete(c)
    db.commit()
    return {"ok": True}


# ── Projetos ──

@router.get("/projetos", response_model=list[ProjetoOut])
def listar_projetos(
    cliente_id: Optional[int] = Query(None),
    tipo: Optional[str] = Query(None),
    db: Session = Depends(get_session),
):
    q = db.query(ProjetoRV)
    if cliente_id:
        q = q.filter(ProjetoRV.cliente_id == cliente_id)
    if tipo:
        q = q.filter(ProjetoRV.tipo == tipo)
    rows = q.order_by(ProjetoRV.nome).all()
    return [
        ProjetoOut(
            id=p.id, cliente_id=p.cliente_id, nome=p.nome,
            descricao=p.descricao, tipo=p.tipo, status=p.status,
            criado_em=p.criado_em, n_riscos=len(p.riscos),
        )
        for p in rows
    ]


@router.post("/projetos", response_model=ProjetoOut)
def criar_projeto(payload: ProjetoIn, db: Session = Depends(get_session)):
    cliente = db.query(ClienteRV).filter(ClienteRV.id == payload.cliente_id).first()
    if not cliente:
        raise HTTPException(404, "Cliente nao encontrado")
    p = ProjetoRV(
        cliente_id=payload.cliente_id,
        nome=payload.nome.strip(),
        descricao=payload.descricao,
        tipo=payload.tipo,
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return ProjetoOut(
        id=p.id, cliente_id=p.cliente_id, nome=p.nome,
        descricao=p.descricao, tipo=p.tipo, status=p.status,
        criado_em=p.criado_em, n_riscos=0,
    )


@router.delete("/projetos/{projeto_id}")
def deletar_projeto(projeto_id: int, db: Session = Depends(get_session)):
    p = db.query(ProjetoRV).filter(ProjetoRV.id == projeto_id).first()
    if not p:
        raise HTTPException(404, "Projeto nao encontrado")
    db.delete(p)
    db.commit()
    return {"ok": True}


# ── Riscos ──

@router.get("/projetos/{projeto_id}/riscos", response_model=list[RiscoOut])
def listar_riscos(projeto_id: int, db: Session = Depends(get_session)):
    p = db.query(ProjetoRV).filter(ProjetoRV.id == projeto_id).first()
    if not p:
        raise HTTPException(404, "Projeto nao encontrado")
    return [
        RiscoOut(
            id=r.id, projeto_id=r.projeto_id, codigo=r.codigo, titulo=r.titulo,
            descricao=r.descricao, categoria=r.categoria, causa=r.causa,
            consequencia=r.consequencia, probabilidade=r.probabilidade,
            impacto=r.impacto, severidade=r.severidade, nivel=r.nivel,
            estrategia=r.estrategia, responsavel=r.responsavel, prazo=r.prazo,
            status=r.status, raw_extra=r.raw_extra, criado_em=r.criado_em,
        )
        for r in p.riscos
    ]


@router.post("/riscos", response_model=RiscoOut)
def criar_risco(payload: RiscoIn, db: Session = Depends(get_session)):
    projeto = db.query(ProjetoRV).filter(ProjetoRV.id == payload.projeto_id).first()
    if not projeto:
        raise HTTPException(404, "Projeto nao encontrado")

    severidade, nivel = _classificar_nivel(payload.probabilidade, payload.impacto)
    r = RiscoRV(
        projeto_id=payload.projeto_id,
        codigo=payload.codigo,
        titulo=payload.titulo.strip()[:300],
        descricao=payload.descricao,
        categoria=payload.categoria,
        causa=payload.causa,
        consequencia=payload.consequencia,
        probabilidade=payload.probabilidade,
        impacto=payload.impacto,
        severidade=severidade,
        nivel=nivel,
        estrategia=payload.estrategia,
        responsavel=payload.responsavel,
        prazo=payload.prazo,
        status=payload.status,
    )
    db.add(r)
    db.commit()
    db.refresh(r)
    return RiscoOut(
        id=r.id, projeto_id=r.projeto_id, codigo=r.codigo, titulo=r.titulo,
        descricao=r.descricao, categoria=r.categoria, causa=r.causa,
        consequencia=r.consequencia, probabilidade=r.probabilidade,
        impacto=r.impacto, severidade=r.severidade, nivel=r.nivel,
        estrategia=r.estrategia, responsavel=r.responsavel, prazo=r.prazo,
        status=r.status, raw_extra=r.raw_extra, criado_em=r.criado_em,
    )


@router.delete("/riscos/{risco_id}")
def deletar_risco(risco_id: int, db: Session = Depends(get_session)):
    r = db.query(RiscoRV).filter(RiscoRV.id == risco_id).first()
    if not r:
        raise HTTPException(404, "Risco nao encontrado")
    db.delete(r)
    db.commit()
    return {"ok": True}


@router.get("/projetos/{projeto_id}/matriz")
def matriz_5x5(projeto_id: int, db: Session = Depends(get_session)):
    """Devolve contagem de riscos por celula da matriz 5x5 (probabilidade x impacto)."""
    p = db.query(ProjetoRV).filter(ProjetoRV.id == projeto_id).first()
    if not p:
        raise HTTPException(404, "Projeto nao encontrado")
    matriz: dict[str, int] = {}
    for prob in range(1, 6):
        for imp in range(1, 6):
            matriz[f"{prob}-{imp}"] = 0
    for r in p.riscos:
        if r.probabilidade and r.impacto:
            key = f"{r.probabilidade}-{r.impacto}"
            matriz[key] = matriz.get(key, 0) + 1
    return {
        "projeto_id": projeto_id,
        "total": len(p.riscos),
        "matriz": matriz,
        "por_nivel": {
            "critico": sum(1 for r in p.riscos if r.nivel == "critico"),
            "alto": sum(1 for r in p.riscos if r.nivel == "alto"),
            "moderado": sum(1 for r in p.riscos if r.nivel == "moderado"),
            "baixo": sum(1 for r in p.riscos if r.nivel == "baixo"),
            "sem_avaliacao": sum(1 for r in p.riscos if not r.nivel),
        },
    }
