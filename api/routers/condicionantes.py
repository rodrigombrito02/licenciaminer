"""Endpoints do Radar de Condicionantes (SQ Ambiental).

Interno (consultor/admin) + cliente-facing (visitante_pago) no front.
Calcula prazos efetivos e status (vencendo/atrasada) sobre a base local.
"""

from __future__ import annotations

import logging
from datetime import date, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from licenciaminer.condicionantes.database import (
    Condicionante,
    Licenca,
    STATUS_COND,
    get_session,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/condicionantes", tags=["Condicionantes"])


# ── Schemas ──
class LicencaIn(BaseModel):
    categoria: str = "ambiental"
    empreendimento: str
    cnpj: Optional[str] = None
    orgao: Optional[str] = None
    processo: Optional[str] = None
    numero_licenca: Optional[str] = None
    tipo: Optional[str] = None
    data_emissao: Optional[date] = None
    data_validade: Optional[date] = None
    municipio: Optional[str] = None
    uf: Optional[str] = None
    lider_responsavel: Optional[str] = None
    criado_por: Optional[str] = None
    acl: Optional[dict] = None


class LicencaUpdate(BaseModel):
    empreendimento: Optional[str] = None
    orgao: Optional[str] = None
    data_validade: Optional[date] = None
    lider_responsavel: Optional[str] = None
    acl: Optional[dict] = None


class CondicionanteIn(BaseModel):
    numero: Optional[str] = None
    descricao: str
    prazo_tipo: str = "data"
    prazo_data: Optional[date] = None
    prazo_dias: Optional[int] = None
    recorrencia: Optional[str] = None
    responsavel: Optional[str] = None
    status: Optional[str] = None
    evidencia: Optional[str] = None


class CondicionanteUpdate(BaseModel):
    status: Optional[str] = None
    responsavel: Optional[str] = None
    evidencia: Optional[str] = None
    prazo_data: Optional[date] = None


def _prazo_efetivo(c: Condicionante, emissao: Optional[date]) -> Optional[date]:
    """Resolve o prazo em data concreta quando possível."""
    if c.prazo_tipo == "data":
        return c.prazo_data
    if c.prazo_tipo == "dias_publicacao" and emissao and c.prazo_dias:
        return emissao + timedelta(days=c.prazo_dias)
    return None  # recorrente / vigencia não têm data única


def _status_efetivo(c: Condicionante, prazo_ef: Optional[date]) -> str:
    if c.status in ("cumprida", "nao_aplicavel"):
        return c.status
    if prazo_ef and prazo_ef < date.today():
        return "atrasada"
    return c.status


def _cond_out(c: Condicionante, emissao: Optional[date]) -> dict:
    prazo_ef = _prazo_efetivo(c, emissao)
    return {
        "id": c.id, "licenca_id": c.licenca_id, "numero": c.numero,
        "descricao": c.descricao, "prazo_tipo": c.prazo_tipo,
        "prazo_data": c.prazo_data.isoformat() if c.prazo_data else None,
        "prazo_dias": c.prazo_dias, "recorrencia": c.recorrencia,
        "prazo_efetivo": prazo_ef.isoformat() if prazo_ef else None,
        "responsavel": c.responsavel,
        "status": _status_efetivo(c, prazo_ef),
        "status_base": c.status,
        "evidencia": c.evidencia,
    }


def _lic_out(lic: Licenca, with_cond: bool = False) -> dict:
    conds = lic.condicionantes
    out = {
        "id": lic.id, "categoria": getattr(lic, "categoria", "ambiental"),
        "empreendimento": lic.empreendimento, "cnpj": lic.cnpj,
        "orgao": lic.orgao, "processo": lic.processo, "numero_licenca": lic.numero_licenca,
        "tipo": lic.tipo,
        "data_emissao": lic.data_emissao.isoformat() if lic.data_emissao else None,
        "data_validade": lic.data_validade.isoformat() if lic.data_validade else None,
        "municipio": lic.municipio, "uf": lic.uf,
        "lider_responsavel": lic.lider_responsavel, "criado_por": lic.criado_por, "acl": lic.acl,
        "n_condicionantes": len(conds),
    }
    # resumo de status
    resumo = {"cumprida": 0, "atrasada": 0, "pendente": 0, "em_andamento": 0}
    for c in conds:
        st = _status_efetivo(c, _prazo_efetivo(c, lic.data_emissao))
        resumo[st] = resumo.get(st, 0) + 1
    out["resumo_status"] = resumo
    if with_cond:
        out["condicionantes"] = [
            _cond_out(c, lic.data_emissao) for c in sorted(conds, key=lambda x: (x.numero or ""))
        ]
    return out


# ── Endpoints ──
@router.get("")
def listar_licencas(categoria: Optional[str] = None, db: Session = Depends(get_session)) -> list[dict]:
    q = db.query(Licenca)
    if categoria:
        q = q.filter(Licenca.categoria == categoria)
    lics = q.order_by(Licenca.atualizado_em.desc()).all()
    return [_lic_out(l) for l in lics]


@router.get("/resumo")
def resumo_geral(db: Session = Depends(get_session)) -> dict:
    lics = db.query(Licenca).all()
    total_cond = 0
    por_status = {"cumprida": 0, "atrasada": 0, "pendente": 0, "em_andamento": 0}
    vencendo_30 = 0
    hoje = date.today()
    for lic in lics:
        for c in lic.condicionantes:
            total_cond += 1
            prazo_ef = _prazo_efetivo(c, lic.data_emissao)
            st = _status_efetivo(c, prazo_ef)
            por_status[st] = por_status.get(st, 0) + 1
            if prazo_ef and st not in ("cumprida", "atrasada") and hoje <= prazo_ef <= hoje + timedelta(days=30):
                vencendo_30 += 1
    return {
        "licencas": len(lics),
        "condicionantes": total_cond,
        "por_status": por_status,
        "vencendo_30_dias": vencendo_30,
    }


@router.post("", status_code=201)
def criar_licenca(payload: LicencaIn, db: Session = Depends(get_session)) -> dict:
    lic = Licenca(**payload.model_dump())
    db.add(lic)
    db.commit()
    db.refresh(lic)
    return _lic_out(lic, with_cond=True)


@router.get("/{lic_id}")
def obter_licenca(lic_id: int, db: Session = Depends(get_session)) -> dict:
    lic = db.get(Licenca, lic_id)
    if not lic:
        raise HTTPException(404, "Licença não encontrada")
    return _lic_out(lic, with_cond=True)


@router.put("/{lic_id}")
def atualizar_licenca(lic_id: int, payload: LicencaUpdate, db: Session = Depends(get_session)) -> dict:
    lic = db.get(Licenca, lic_id)
    if not lic:
        raise HTTPException(404, "Licença não encontrada")
    for f, v in payload.model_dump(exclude_unset=True).items():
        setattr(lic, f, v)
    db.commit()
    db.refresh(lic)
    return _lic_out(lic, with_cond=True)


@router.delete("/{lic_id}", status_code=204)
def deletar_licenca(lic_id: int, db: Session = Depends(get_session)) -> None:
    lic = db.get(Licenca, lic_id)
    if not lic:
        raise HTTPException(404, "Licença não encontrada")
    db.delete(lic)
    db.commit()


@router.post("/{lic_id}/condicionantes", status_code=201)
def add_condicionante(lic_id: int, payload: CondicionanteIn, db: Session = Depends(get_session)) -> dict:
    lic = db.get(Licenca, lic_id)
    if not lic:
        raise HTTPException(404, "Licença não encontrada")
    c = Condicionante(licenca_id=lic_id, **payload.model_dump())
    db.add(c)
    db.commit()
    db.refresh(lic)
    return _lic_out(lic, with_cond=True)


@router.patch("/condicionantes/{cond_id}")
def atualizar_condicionante(cond_id: int, payload: CondicionanteUpdate, db: Session = Depends(get_session)) -> dict:
    c = db.get(Condicionante, cond_id)
    if not c:
        raise HTTPException(404, "Condicionante não encontrada")
    if payload.status is not None and payload.status not in STATUS_COND:
        raise HTTPException(422, f"Status inválido. Use: {STATUS_COND}")
    for f, v in payload.model_dump(exclude_unset=True).items():
        setattr(c, f, v)
    db.commit()
    db.refresh(c)
    lic = db.get(Licenca, c.licenca_id)
    return _cond_out(c, lic.data_emissao if lic else None)
