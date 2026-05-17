"""Endpoints do módulo Plano de Ações — upload heterogêneo + CRUD.

Estrutura: Cliente → Projeto Estratégico (opcional) → Plano → Tarefa.
Suporta XLSX/CSV com mapeamento heurístico de colunas + override manual.
"""

from __future__ import annotations

import logging
from datetime import date, datetime
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from licenciaminer.planos_acao.database import get_session
from licenciaminer.planos_acao.models import (
    ClientePA,
    Plano,
    ProjetoEstrategico,
    TarefaPA,
)
from licenciaminer.planos_acao.parser import (
    CANONICAL_TERMS,
    detect_column_mapping,
    parse_xlsx_to_tarefas,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/planos-acao", tags=["Planos de Ação"])


# ══════════════════════════════════════════════════════════════════
# Schemas Pydantic
# ══════════════════════════════════════════════════════════════════

class ClienteIn(BaseModel):
    nome: str
    descricao: Optional[str] = None


class ClienteOut(BaseModel):
    id: int
    nome: str
    descricao: Optional[str] = None
    criado_em: datetime
    n_projetos: int = 0
    n_planos: int = 0

    class Config:
        from_attributes = True


class ProjetoIn(BaseModel):
    cliente_id: int
    nome: str
    descricao: Optional[str] = None
    status: str = "ativo"
    data_inicio: Optional[date] = None
    data_fim: Optional[date] = None


class ProjetoOut(BaseModel):
    id: int
    cliente_id: int
    nome: str
    descricao: Optional[str] = None
    status: str
    data_inicio: Optional[date] = None
    data_fim: Optional[date] = None
    criado_em: datetime
    n_planos: int = 0

    class Config:
        from_attributes = True


class PlanoOut(BaseModel):
    id: int
    cliente_id: int
    projeto_estrategico_id: Optional[int]
    nome: str
    descricao: Optional[str]
    arquivo_origem: Optional[str]
    coluna_mapping: Optional[dict]
    import_stats: Optional[dict]
    versao: int
    criado_em: datetime
    atualizado_em: datetime
    n_tarefas: int = 0

    class Config:
        from_attributes = True


class TarefaOut(BaseModel):
    id: int
    plano_id: int
    ordem: int
    descricao: Optional[str]
    data_inicio: Optional[date]
    data_fim: Optional[date]
    responsavel_pessoa: Optional[str]
    area_responsavel: Optional[str]
    status: Optional[str]
    classificacao: Optional[str]
    eap_codigo: Optional[str]
    eap_nivel: Optional[int]
    parent_eap: Optional[str]
    pct_concluido: Optional[float]
    raw_extra: Optional[dict]

    class Config:
        from_attributes = True


# ══════════════════════════════════════════════════════════════════
# CRUD Cliente
# ══════════════════════════════════════════════════════════════════

@router.get("/clientes", response_model=list[ClienteOut])
def listar_clientes(db: Session = Depends(get_session)):
    rows = db.query(ClientePA).order_by(ClientePA.nome).all()
    return [
        ClienteOut(
            id=c.id, nome=c.nome, descricao=c.descricao, criado_em=c.criado_em,
            n_projetos=len(c.projetos), n_planos=len(c.planos),
        )
        for c in rows
    ]


@router.post("/clientes", response_model=ClienteOut)
def criar_cliente(payload: ClienteIn, db: Session = Depends(get_session)):
    existing = db.query(ClientePA).filter(ClientePA.nome == payload.nome).first()
    if existing:
        raise HTTPException(409, f"Cliente '{payload.nome}' já existe (id {existing.id})")
    c = ClientePA(nome=payload.nome.strip(), descricao=payload.descricao)
    db.add(c)
    db.commit()
    db.refresh(c)
    return ClienteOut(
        id=c.id, nome=c.nome, descricao=c.descricao, criado_em=c.criado_em,
        n_projetos=0, n_planos=0,
    )


@router.delete("/clientes/{cliente_id}")
def deletar_cliente(cliente_id: int, db: Session = Depends(get_session)):
    c = db.query(ClientePA).filter(ClientePA.id == cliente_id).first()
    if not c:
        raise HTTPException(404, "Cliente não encontrado")
    db.delete(c)
    db.commit()
    return {"ok": True, "deletado": cliente_id}


# ══════════════════════════════════════════════════════════════════
# CRUD Projeto Estratégico
# ══════════════════════════════════════════════════════════════════

@router.get("/projetos", response_model=list[ProjetoOut])
def listar_projetos(
    cliente_id: Optional[int] = None,
    db: Session = Depends(get_session),
):
    q = db.query(ProjetoEstrategico)
    if cliente_id:
        q = q.filter(ProjetoEstrategico.cliente_id == cliente_id)
    rows = q.order_by(ProjetoEstrategico.nome).all()
    return [
        ProjetoOut(
            id=p.id, cliente_id=p.cliente_id, nome=p.nome,
            descricao=p.descricao, status=p.status,
            data_inicio=p.data_inicio, data_fim=p.data_fim,
            criado_em=p.criado_em, n_planos=len(p.planos),
        )
        for p in rows
    ]


@router.post("/projetos", response_model=ProjetoOut)
def criar_projeto(payload: ProjetoIn, db: Session = Depends(get_session)):
    cliente = db.query(ClientePA).filter(ClientePA.id == payload.cliente_id).first()
    if not cliente:
        raise HTTPException(404, "Cliente não encontrado")
    p = ProjetoEstrategico(
        cliente_id=payload.cliente_id,
        nome=payload.nome.strip(),
        descricao=payload.descricao,
        status=payload.status,
        data_inicio=payload.data_inicio,
        data_fim=payload.data_fim,
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return ProjetoOut(
        id=p.id, cliente_id=p.cliente_id, nome=p.nome,
        descricao=p.descricao, status=p.status,
        data_inicio=p.data_inicio, data_fim=p.data_fim,
        criado_em=p.criado_em, n_planos=0,
    )


@router.delete("/projetos/{projeto_id}")
def deletar_projeto(projeto_id: int, db: Session = Depends(get_session)):
    p = db.query(ProjetoEstrategico).filter(ProjetoEstrategico.id == projeto_id).first()
    if not p:
        raise HTTPException(404, "Projeto não encontrado")
    db.delete(p)
    db.commit()
    return {"ok": True, "deletado": projeto_id}


# ══════════════════════════════════════════════════════════════════
# Plano — listagem + detalhe + delete
# ══════════════════════════════════════════════════════════════════

@router.get("/planos", response_model=list[PlanoOut])
def listar_planos(
    cliente_id: Optional[int] = None,
    projeto_id: Optional[int] = None,
    db: Session = Depends(get_session),
):
    q = db.query(Plano)
    if cliente_id:
        q = q.filter(Plano.cliente_id == cliente_id)
    if projeto_id:
        q = q.filter(Plano.projeto_estrategico_id == projeto_id)
    rows = q.order_by(Plano.atualizado_em.desc()).all()
    return [
        PlanoOut(
            id=p.id, cliente_id=p.cliente_id,
            projeto_estrategico_id=p.projeto_estrategico_id,
            nome=p.nome, descricao=p.descricao,
            arquivo_origem=p.arquivo_origem, coluna_mapping=p.coluna_mapping,
            import_stats=p.import_stats, versao=p.versao,
            criado_em=p.criado_em, atualizado_em=p.atualizado_em,
            n_tarefas=len(p.tarefas),
        )
        for p in rows
    ]


@router.get("/planos/{plano_id}", response_model=PlanoOut)
def detalhe_plano(plano_id: int, db: Session = Depends(get_session)):
    p = db.query(Plano).filter(Plano.id == plano_id).first()
    if not p:
        raise HTTPException(404, "Plano não encontrado")
    return PlanoOut(
        id=p.id, cliente_id=p.cliente_id,
        projeto_estrategico_id=p.projeto_estrategico_id,
        nome=p.nome, descricao=p.descricao,
        arquivo_origem=p.arquivo_origem, coluna_mapping=p.coluna_mapping,
        import_stats=p.import_stats, versao=p.versao,
        criado_em=p.criado_em, atualizado_em=p.atualizado_em,
        n_tarefas=len(p.tarefas),
    )


@router.get("/planos/{plano_id}/tarefas", response_model=list[TarefaOut])
def listar_tarefas(plano_id: int, db: Session = Depends(get_session)):
    p = db.query(Plano).filter(Plano.id == plano_id).first()
    if not p:
        raise HTTPException(404, "Plano não encontrado")
    return [
        TarefaOut(
            id=t.id, plano_id=t.plano_id, ordem=t.ordem,
            descricao=t.descricao, data_inicio=t.data_inicio, data_fim=t.data_fim,
            responsavel_pessoa=t.responsavel_pessoa, area_responsavel=t.area_responsavel,
            status=t.status, classificacao=t.classificacao,
            eap_codigo=t.eap_codigo, eap_nivel=t.eap_nivel, parent_eap=t.parent_eap,
            pct_concluido=t.pct_concluido, raw_extra=t.raw_extra,
        )
        for t in sorted(p.tarefas, key=lambda x: x.ordem)
    ]


@router.delete("/planos/{plano_id}")
def deletar_plano(plano_id: int, db: Session = Depends(get_session)):
    p = db.query(Plano).filter(Plano.id == plano_id).first()
    if not p:
        raise HTTPException(404, "Plano não encontrado")
    db.delete(p)
    db.commit()
    return {"ok": True, "deletado": plano_id}


# ══════════════════════════════════════════════════════════════════
# Upload — preview e import
# ══════════════════════════════════════════════════════════════════

@router.post("/upload/preview")
async def upload_preview(file: UploadFile = File(...)):
    """Lê o XLSX e devolve preview do mapeamento inferido + amostra das primeiras 5 linhas.

    Não persiste nada — só serve para o frontend mostrar atribuição manual antes do import.
    """
    if not file.filename:
        raise HTTPException(400, "Arquivo sem nome")
    if not file.filename.lower().endswith((".xlsx", ".xls", ".xlsm")):
        raise HTTPException(400, "Formato não suportado (use XLSX)")
    content = await file.read()
    try:
        result = parse_xlsx_to_tarefas(content)
    except Exception as e:
        logger.exception("upload_preview erro")
        raise HTTPException(500, f"Erro no parse: {e}") from e

    return {
        "filename": file.filename,
        "sheet": result.get("sheet_name_usada"),
        "headers": result.get("headers", []),
        "mapping_sugerido": result.get("mapping", {}),
        "campos_canonicos": list(CANONICAL_TERMS.keys()),
        "n_linhas_total": result.get("n_linhas_total"),
        "n_linhas_validas": result.get("n_linhas_validas"),
        "amostra": result.get("tarefas", [])[:5],
    }


@router.post("/upload/importar", response_model=PlanoOut)
async def upload_importar(
    file: UploadFile = File(...),
    cliente_id: int = Form(...),
    nome: str = Form(...),
    projeto_id: Optional[int] = Form(None),
    descricao: Optional[str] = Form(None),
    custom_mapping: Optional[str] = Form(None),  # JSON string
    db: Session = Depends(get_session),
):
    """Importa XLSX como novo Plano (cria registros + tarefas).

    Args:
        file: arquivo XLSX
        cliente_id: cliente alvo (obrigatório)
        nome: nome do plano (ex: "Plano de Drenagem")
        projeto_id: projeto estratégico ao qual vincular (opcional — None = plano avulso)
        descricao: descrição opcional
        custom_mapping: JSON com mapeamento manual {campo_canonico: nome_coluna_original}
    """
    import json as jsonlib

    cliente = db.query(ClientePA).filter(ClientePA.id == cliente_id).first()
    if not cliente:
        raise HTTPException(404, f"Cliente {cliente_id} não encontrado")

    if projeto_id:
        projeto = db.query(ProjetoEstrategico).filter(ProjetoEstrategico.id == projeto_id).first()
        if not projeto:
            raise HTTPException(404, f"Projeto {projeto_id} não encontrado")
        if projeto.cliente_id != cliente_id:
            raise HTTPException(400, "Projeto não pertence ao cliente informado")

    if not file.filename or not file.filename.lower().endswith((".xlsx", ".xls", ".xlsm")):
        raise HTTPException(400, "Formato não suportado (use XLSX)")

    content = await file.read()

    mapping_override: dict[str, str] | None = None
    if custom_mapping:
        try:
            mapping_override = jsonlib.loads(custom_mapping)
        except Exception:
            raise HTTPException(400, "custom_mapping inválido (use JSON)")

    try:
        result = parse_xlsx_to_tarefas(content, custom_mapping=mapping_override)
    except Exception as e:
        logger.exception("upload_importar erro")
        raise HTTPException(500, f"Erro no parse: {e}") from e

    plano = Plano(
        cliente_id=cliente_id,
        projeto_estrategico_id=projeto_id,
        nome=nome.strip(),
        descricao=descricao,
        arquivo_origem=file.filename,
        coluna_mapping=result.get("mapping"),
        import_stats={
            "n_linhas_total": result.get("n_linhas_total"),
            "n_linhas_validas": result.get("n_linhas_validas"),
            "headers": result.get("headers", []),
            "sheet": result.get("sheet_name_usada"),
        },
    )
    db.add(plano)
    db.flush()

    for t in result.get("tarefas", []):
        db.add(TarefaPA(plano_id=plano.id, **t))

    db.commit()
    db.refresh(plano)

    return PlanoOut(
        id=plano.id, cliente_id=plano.cliente_id,
        projeto_estrategico_id=plano.projeto_estrategico_id,
        nome=plano.nome, descricao=plano.descricao,
        arquivo_origem=plano.arquivo_origem,
        coluna_mapping=plano.coluna_mapping,
        import_stats=plano.import_stats,
        versao=plano.versao,
        criado_em=plano.criado_em, atualizado_em=plano.atualizado_em,
        n_tarefas=len(plano.tarefas),
    )


# ══════════════════════════════════════════════════════════════════
# Meta
# ══════════════════════════════════════════════════════════════════

@router.get("/meta/campos-canonicos")
def get_campos_canonicos():
    """Lista os campos canônicos com sinônimos reconhecidos automaticamente."""
    return {
        "campos": [
            {"campo": c, "sinonimos": terms}
            for c, terms in CANONICAL_TERMS.items()
        ]
    }
