"""Endpoints de Fluxo de Comunicações (ISO 31000 §6.2).

Prefixo: /api/comunicacoes
"""

from __future__ import annotations

from datetime import date
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from licenciaminer.riscos.database import get_session
from licenciaminer.riscos.models_comunicacoes import (
    Canal,
    EnvioComunicacao,
    MatrizRACIComunicacao,
    Stakeholder,
    TemplateComunicacao,
)

router = APIRouter(prefix="/comunicacoes", tags=["Comunicações"])


# ---------------------------------------------------------------------------
# Stakeholders
# ---------------------------------------------------------------------------


class StakeholderIn(BaseModel):
    nome: str
    tipo: str
    organizacao: Optional[str] = None
    cargo: Optional[str] = None
    descricao: Optional[str] = None
    contato_email: Optional[str] = None
    contato_telefone: Optional[str] = None
    contato_outros: Optional[str] = None
    criticidade: int = Field(3, ge=1, le=5)
    ativo: bool = True


def _serialize_sh(s: Stakeholder) -> dict[str, Any]:
    return {
        "id": s.id,
        "nome": s.nome,
        "tipo": s.tipo,
        "organizacao": s.organizacao,
        "cargo": s.cargo,
        "descricao": s.descricao,
        "contato_email": s.contato_email,
        "contato_telefone": s.contato_telefone,
        "contato_outros": s.contato_outros,
        "criticidade": s.criticidade,
        "ativo": s.ativo,
    }


@router.get("/stakeholders")
def list_stakeholders(
    tipo: Optional[str] = None, db: Session = Depends(get_session)
) -> list[dict[str, Any]]:
    q = db.query(Stakeholder).filter_by(ativo=True)
    if tipo:
        q = q.filter(Stakeholder.tipo == tipo)
    return [_serialize_sh(s) for s in q.order_by(Stakeholder.criticidade.desc(), Stakeholder.nome).all()]


@router.post("/stakeholders", status_code=201)
def create_stakeholder(
    payload: StakeholderIn, db: Session = Depends(get_session)
) -> dict[str, Any]:
    if db.query(Stakeholder).filter_by(nome=payload.nome).first():
        raise HTTPException(status_code=409, detail="Stakeholder já existe")
    s = Stakeholder(**payload.model_dump())
    db.add(s)
    db.commit()
    db.refresh(s)
    return _serialize_sh(s)


@router.put("/stakeholders/{sh_id}")
def update_stakeholder(
    sh_id: int, payload: StakeholderIn, db: Session = Depends(get_session)
) -> dict[str, Any]:
    s = db.get(Stakeholder, sh_id)
    if not s:
        raise HTTPException(status_code=404, detail="Stakeholder não encontrado")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(s, k, v)
    db.commit()
    db.refresh(s)
    return _serialize_sh(s)


@router.delete("/stakeholders/{sh_id}", status_code=204)
def delete_stakeholder(sh_id: int, db: Session = Depends(get_session)) -> None:
    s = db.get(Stakeholder, sh_id)
    if not s:
        raise HTTPException(status_code=404, detail="Stakeholder não encontrado")
    s.ativo = False
    db.commit()


# ---------------------------------------------------------------------------
# Canais
# ---------------------------------------------------------------------------


@router.get("/canais")
def list_canais(db: Session = Depends(get_session)) -> list[dict[str, Any]]:
    return [
        {
            "id": c.id,
            "nome": c.nome,
            "tipo": c.tipo,
            "formal": c.formal,
            "latencia_min": c.latencia_min,
            "descricao": c.descricao,
        }
        for c in db.query(Canal).order_by(Canal.nome).all()
    ]


# ---------------------------------------------------------------------------
# Templates
# ---------------------------------------------------------------------------


class TemplateIn(BaseModel):
    codigo: str
    titulo: str
    categoria: Optional[str] = None
    corpo: str
    canal_sugerido: Optional[str] = None
    publicos_sugeridos: Optional[str] = None
    risco_id: Optional[int] = None
    cenario_id: Optional[int] = None
    aprovacao_juridica: bool = False


def _serialize_template(t: TemplateComunicacao) -> dict[str, Any]:
    return {
        "id": t.id,
        "codigo": t.codigo,
        "titulo": t.titulo,
        "categoria": t.categoria,
        "corpo": t.corpo,
        "canal_sugerido": t.canal_sugerido,
        "publicos_sugeridos": t.publicos_sugeridos,
        "risco_id": t.risco_id,
        "cenario_id": t.cenario_id,
        "aprovacao_juridica": t.aprovacao_juridica,
    }


@router.get("/templates")
def list_templates(
    categoria: Optional[str] = None,
    cenario_id: Optional[int] = None,
    risco_id: Optional[int] = None,
    db: Session = Depends(get_session),
) -> list[dict[str, Any]]:
    q = db.query(TemplateComunicacao)
    if categoria:
        q = q.filter(TemplateComunicacao.categoria == categoria)
    if cenario_id:
        q = q.filter(TemplateComunicacao.cenario_id == cenario_id)
    if risco_id:
        q = q.filter(TemplateComunicacao.risco_id == risco_id)
    return [_serialize_template(t) for t in q.order_by(TemplateComunicacao.codigo).all()]


@router.get("/templates/{template_id}")
def get_template(template_id: int, db: Session = Depends(get_session)) -> dict[str, Any]:
    t = db.get(TemplateComunicacao, template_id)
    if not t:
        raise HTTPException(status_code=404, detail="Template não encontrado")
    return _serialize_template(t)


@router.post("/templates", status_code=201)
def create_template(
    payload: TemplateIn, db: Session = Depends(get_session)
) -> dict[str, Any]:
    if db.query(TemplateComunicacao).filter_by(codigo=payload.codigo).first():
        raise HTTPException(status_code=409, detail="Código já existe")
    t = TemplateComunicacao(**payload.model_dump())
    db.add(t)
    db.commit()
    db.refresh(t)
    return _serialize_template(t)


@router.put("/templates/{template_id}")
def update_template(
    template_id: int, payload: TemplateIn, db: Session = Depends(get_session)
) -> dict[str, Any]:
    t = db.get(TemplateComunicacao, template_id)
    if not t:
        raise HTTPException(status_code=404, detail="Template não encontrado")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(t, k, v)
    db.commit()
    db.refresh(t)
    return _serialize_template(t)


@router.delete("/templates/{template_id}", status_code=204)
def delete_template(template_id: int, db: Session = Depends(get_session)) -> None:
    t = db.get(TemplateComunicacao, template_id)
    if not t:
        raise HTTPException(status_code=404, detail="Template não encontrado")
    db.delete(t)
    db.commit()


# ---------------------------------------------------------------------------
# Matriz RACI
# ---------------------------------------------------------------------------


class RACIIn(BaseModel):
    entidade_tipo: str = Field(..., pattern="^(risco|cenario|bcp)$")
    entidade_id: int
    stakeholder_id: int
    papel: str = Field(..., pattern="^(responsavel|aprovador|consultado|informado)$")
    momento: str = "deteccao"
    canal_preferido: Optional[str] = None
    prazo_max_min: Optional[int] = None
    observacao: Optional[str] = None
    obrigatorio: bool = True


def _serialize_raci(r: MatrizRACIComunicacao) -> dict[str, Any]:
    return {
        "id": r.id,
        "entidade_tipo": r.entidade_tipo,
        "entidade_id": r.entidade_id,
        "stakeholder_id": r.stakeholder_id,
        "stakeholder_nome": r.stakeholder.nome if r.stakeholder else None,
        "stakeholder_tipo": r.stakeholder.tipo if r.stakeholder else None,
        "papel": r.papel,
        "momento": r.momento,
        "canal_preferido": r.canal_preferido,
        "prazo_max_min": r.prazo_max_min,
        "observacao": r.observacao,
        "obrigatorio": r.obrigatorio,
    }


@router.get("/raci")
def list_raci(
    entidade_tipo: Optional[str] = None,
    entidade_id: Optional[int] = None,
    db: Session = Depends(get_session),
) -> list[dict[str, Any]]:
    q = db.query(MatrizRACIComunicacao)
    if entidade_tipo:
        q = q.filter(MatrizRACIComunicacao.entidade_tipo == entidade_tipo)
    if entidade_id is not None:
        q = q.filter(MatrizRACIComunicacao.entidade_id == entidade_id)
    return [_serialize_raci(r) for r in q.all()]


@router.post("/raci", status_code=201)
def create_raci(payload: RACIIn, db: Session = Depends(get_session)) -> dict[str, Any]:
    r = MatrizRACIComunicacao(**payload.model_dump())
    db.add(r)
    db.commit()
    db.refresh(r)
    return _serialize_raci(r)


@router.delete("/raci/{raci_id}", status_code=204)
def delete_raci(raci_id: int, db: Session = Depends(get_session)) -> None:
    r = db.get(MatrizRACIComunicacao, raci_id)
    if not r:
        raise HTTPException(status_code=404, detail="RACI não encontrado")
    db.delete(r)
    db.commit()


# ---------------------------------------------------------------------------
# Envios
# ---------------------------------------------------------------------------


class EnvioIn(BaseModel):
    data_envio: date
    template_id: Optional[int] = None
    stakeholder_id: Optional[int] = None
    canal: str
    assunto: Optional[str] = None
    conteudo: Optional[str] = None
    entidade_tipo: Optional[str] = None
    entidade_id: Optional[int] = None
    enviado_por: Optional[str] = None
    resultado: str = "enviado"
    observacao: Optional[str] = None


def _serialize_envio(e: EnvioComunicacao) -> dict[str, Any]:
    return {
        "id": e.id,
        "data_envio": e.data_envio.isoformat(),
        "template_id": e.template_id,
        "template_codigo": e.template.codigo if e.template else None,
        "template_titulo": e.template.titulo if e.template else None,
        "stakeholder_id": e.stakeholder_id,
        "stakeholder_nome": e.stakeholder.nome if e.stakeholder else None,
        "canal": e.canal,
        "assunto": e.assunto,
        "conteudo": e.conteudo,
        "entidade_tipo": e.entidade_tipo,
        "entidade_id": e.entidade_id,
        "enviado_por": e.enviado_por,
        "resultado": e.resultado,
        "observacao": e.observacao,
        "created_at": e.created_at,
    }


@router.get("/envios")
def list_envios(
    entidade_tipo: Optional[str] = None,
    entidade_id: Optional[int] = None,
    limit: int = 100,
    db: Session = Depends(get_session),
) -> list[dict[str, Any]]:
    q = db.query(EnvioComunicacao)
    if entidade_tipo:
        q = q.filter(EnvioComunicacao.entidade_tipo == entidade_tipo)
    if entidade_id is not None:
        q = q.filter(EnvioComunicacao.entidade_id == entidade_id)
    envios = q.order_by(EnvioComunicacao.data_envio.desc()).limit(limit).all()
    return [_serialize_envio(e) for e in envios]


@router.post("/envios", status_code=201)
def create_envio(payload: EnvioIn, db: Session = Depends(get_session)) -> dict[str, Any]:
    e = EnvioComunicacao(**payload.model_dump())
    db.add(e)
    db.commit()
    db.refresh(e)
    return _serialize_envio(e)


@router.delete("/envios/{envio_id}", status_code=204)
def delete_envio(envio_id: int, db: Session = Depends(get_session)) -> None:
    e = db.get(EnvioComunicacao, envio_id)
    if not e:
        raise HTTPException(status_code=404, detail="Envio não encontrado")
    db.delete(e)
    db.commit()


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------


@router.get("/dashboard")
def dashboard(db: Session = Depends(get_session)) -> dict[str, Any]:
    stakeholders = db.query(Stakeholder).filter_by(ativo=True).all()
    templates = db.query(TemplateComunicacao).all()
    envios = db.query(EnvioComunicacao).all()
    raci = db.query(MatrizRACIComunicacao).all()

    por_tipo_sh: dict[str, int] = {}
    for s in stakeholders:
        por_tipo_sh[s.tipo] = por_tipo_sh.get(s.tipo, 0) + 1

    por_categoria_tpl: dict[str, int] = {}
    for t in templates:
        por_categoria_tpl[t.categoria or "(sem)"] = (
            por_categoria_tpl.get(t.categoria or "(sem)", 0) + 1
        )

    por_canal_envio: dict[str, int] = {}
    for e in envios:
        por_canal_envio[e.canal] = por_canal_envio.get(e.canal, 0) + 1

    # cobertura RACI por cenário
    entidades_com_raci: set[tuple[str, int]] = set(
        (r.entidade_tipo, r.entidade_id) for r in raci
    )

    return {
        "total_stakeholders": len(stakeholders),
        "total_templates": len(templates),
        "total_envios": len(envios),
        "entidades_com_raci": len(entidades_com_raci),
        "por_tipo_stakeholder": por_tipo_sh,
        "por_categoria_template": por_categoria_tpl,
        "por_canal_envio": por_canal_envio,
        "ultimos_envios": [
            {
                "id": e.id,
                "data_envio": e.data_envio.isoformat(),
                "template_codigo": e.template.codigo if e.template else None,
                "stakeholder_nome": e.stakeholder.nome if e.stakeholder else None,
                "canal": e.canal,
                "resultado": e.resultado,
                "assunto": e.assunto,
            }
            for e in sorted(envios, key=lambda x: x.data_envio, reverse=True)[:10]
        ],
    }
