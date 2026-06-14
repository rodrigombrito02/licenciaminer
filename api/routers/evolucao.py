"""Endpoints do modulo Evolucao do Sistema. Interno (consultor/admin)."""

from __future__ import annotations

import logging
import re
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from licenciaminer.evolucao.database import (
    AnexoEvolucao,
    ComentarioEvolucao,
    ItemEvolucao,
    MODULOS,
    NIVEIS_VISIBILIDADE,
    ORIGENS,
    STATUS_FUNCIONALIDADE,
    STATUS_PRODUTO,
    STATUS_SPRINT,
    STATUS_SUGESTAO,
    get_session,
)

UPLOAD_DIR = Path(__file__).resolve().parents[2] / "data" / "evolucao_uploads"

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/evolucao", tags=["Evolução do Sistema"])


# ── Schemas ──
class ItemIn(BaseModel):
    tipo: str
    titulo: str
    descricao: Optional[str] = None
    modulo: Optional[str] = None
    status: Optional[str] = None
    prioridade: Optional[str] = None
    visibilidade: Optional[list[str]] = None
    telas: Optional[list[str]] = None
    origem: Optional[str] = None
    origem_detalhe: Optional[str] = None
    evidencia: Optional[str] = None
    autor: Optional[str] = None
    fase: Optional[str] = None


class ItemUpdate(BaseModel):
    titulo: Optional[str] = None
    descricao: Optional[str] = None
    modulo: Optional[str] = None
    status: Optional[str] = None
    prioridade: Optional[str] = None
    visibilidade: Optional[list[str]] = None
    telas: Optional[list[str]] = None
    evidencia: Optional[str] = None


class ComentarioIn(BaseModel):
    autor: Optional[str] = None
    texto: Optional[str] = None
    voto: Optional[str] = None  # aprovar|reprovar


def _coment_out(c: ComentarioEvolucao) -> dict:
    return {
        "id": c.id, "autor": c.autor, "texto": c.texto, "voto": c.voto,
        "criado_em": c.criado_em.isoformat() if c.criado_em else None,
    }


def _item_out(it: ItemEvolucao, with_coments: bool = False) -> dict:
    out = {
        "id": it.id, "tipo": it.tipo, "titulo": it.titulo, "descricao": it.descricao,
        "modulo": it.modulo, "status": it.status, "prioridade": it.prioridade,
        "visibilidade": it.visibilidade or [], "telas": it.telas or [],
        "origem": it.origem, "origem_detalhe": it.origem_detalhe,
        "evidencia": it.evidencia, "autor": it.autor, "fase": it.fase,
        "n_comentarios": len(it.comentarios),
        "votos_aprovar": sum(1 for c in it.comentarios if c.voto == "aprovar"),
        "votos_reprovar": sum(1 for c in it.comentarios if c.voto == "reprovar"),
        "criado_em": it.criado_em.isoformat() if it.criado_em else None,
        "atualizado_em": it.atualizado_em.isoformat() if it.atualizado_em else None,
    }
    out["n_anexos"] = len(it.anexos)
    if with_coments:
        out["comentarios"] = [_coment_out(c) for c in sorted(it.comentarios, key=lambda x: x.id)]
        out["anexos"] = [
            {"id": a.id, "nome_arquivo": a.nome_arquivo, "tamanho": a.tamanho,
             "enviado_por": a.enviado_por,
             "criado_em": a.criado_em.isoformat() if a.criado_em else None}
            for a in sorted(it.anexos, key=lambda x: x.id)
        ]
    return out


@router.get("/meta")
def meta() -> dict:
    """Vocabulario do modulo (modulos, status por tipo, niveis, origens)."""
    return {
        "modulos": MODULOS,
        "niveis_visibilidade": NIVEIS_VISIBILIDADE,
        "origens": ORIGENS,
        "status": {
            "sprint": STATUS_SPRINT,
            "funcionalidade": STATUS_FUNCIONALIDADE,
            "sugestao": STATUS_SUGESTAO,
            "produto": STATUS_PRODUTO,
        },
    }


@router.get("/itens")
def listar(
    tipo: Optional[str] = Query(None),
    modulo: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_session),
) -> list[dict]:
    q = db.query(ItemEvolucao)
    if tipo:
        q = q.filter(ItemEvolucao.tipo == tipo)
    if modulo:
        q = q.filter(ItemEvolucao.modulo == modulo)
    if status:
        q = q.filter(ItemEvolucao.status == status)
    itens = q.order_by(ItemEvolucao.atualizado_em.desc()).all()
    return [_item_out(it) for it in itens]


@router.get("/resumo")
def resumo(db: Session = Depends(get_session)) -> dict:
    itens = db.query(ItemEvolucao).all()
    por_tipo: dict[str, int] = {}
    por_status: dict[str, int] = {}
    por_modulo: dict[str, int] = {}
    for it in itens:
        por_tipo[it.tipo] = por_tipo.get(it.tipo, 0) + 1
        por_status[it.status] = por_status.get(it.status, 0) + 1
        if it.modulo:
            por_modulo[it.modulo] = por_modulo.get(it.modulo, 0) + 1
    return {"total": len(itens), "por_tipo": por_tipo, "por_status": por_status, "por_modulo": por_modulo}


@router.post("/itens", status_code=201)
def criar(payload: ItemIn, db: Session = Depends(get_session)) -> dict:
    status = payload.status or (
        "nova" if payload.tipo == "sugestao"
        else "no_ar" if payload.tipo == "funcionalidade"
        else "proposta"
    )
    it = ItemEvolucao(
        tipo=payload.tipo, titulo=payload.titulo, descricao=payload.descricao,
        modulo=payload.modulo, status=status, prioridade=payload.prioridade,
        visibilidade=payload.visibilidade, telas=payload.telas,
        origem=payload.origem, origem_detalhe=payload.origem_detalhe,
        evidencia=payload.evidencia, autor=payload.autor, fase=payload.fase,
    )
    db.add(it)
    db.commit()
    db.refresh(it)
    return _item_out(it, with_coments=True)


@router.get("/itens/{item_id}")
def obter(item_id: int, db: Session = Depends(get_session)) -> dict:
    it = db.get(ItemEvolucao, item_id)
    if not it:
        raise HTTPException(404, "Item não encontrado")
    return _item_out(it, with_coments=True)


@router.put("/itens/{item_id}")
def atualizar(item_id: int, payload: ItemUpdate, db: Session = Depends(get_session)) -> dict:
    it = db.get(ItemEvolucao, item_id)
    if not it:
        raise HTTPException(404, "Item não encontrado")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(it, field, value)
    db.commit()
    db.refresh(it)
    return _item_out(it, with_coments=True)


@router.delete("/itens/{item_id}", status_code=204)
def deletar(item_id: int, db: Session = Depends(get_session)) -> None:
    it = db.get(ItemEvolucao, item_id)
    if not it:
        raise HTTPException(404, "Item não encontrado")
    db.delete(it)
    db.commit()


@router.post("/itens/{item_id}/comentarios", status_code=201)
def comentar(item_id: int, payload: ComentarioIn, db: Session = Depends(get_session)) -> dict:
    it = db.get(ItemEvolucao, item_id)
    if not it:
        raise HTTPException(404, "Item não encontrado")
    if payload.voto and payload.voto not in ("aprovar", "reprovar"):
        raise HTTPException(422, "Voto inválido")
    c = ComentarioEvolucao(
        item_id=item_id, autor=payload.autor, texto=payload.texto, voto=payload.voto
    )
    db.add(c)
    db.commit()
    db.refresh(it)
    return _item_out(it, with_coments=True)


# ── Anexos (upload de arquivos pelo Lima) ──

@router.post("/itens/{item_id}/anexos", status_code=201)
async def upload_anexo(
    item_id: int,
    file: UploadFile = File(...),
    enviado_por: Optional[str] = Form(None),
    db: Session = Depends(get_session),
) -> dict:
    it = db.get(ItemEvolucao, item_id)
    if not it:
        raise HTTPException(404, "Item não encontrado")
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    safe = re.sub(r"[^A-Za-z0-9._-]", "_", file.filename or "arquivo")
    dest = UPLOAD_DIR / f"{item_id}__{safe}"
    conteudo = await file.read()
    dest.write_bytes(conteudo)
    a = AnexoEvolucao(
        item_id=item_id, nome_arquivo=file.filename or safe,
        caminho=str(dest), tamanho=len(conteudo), enviado_por=enviado_por,
    )
    db.add(a)
    db.commit()
    db.refresh(it)
    return _item_out(it, with_coments=True)


@router.get("/anexos/{anexo_id}")
def baixar_anexo(anexo_id: int, db: Session = Depends(get_session)):
    a = db.get(AnexoEvolucao, anexo_id)
    if not a or not Path(a.caminho).exists():
        raise HTTPException(404, "Anexo não encontrado")
    return FileResponse(a.caminho, filename=a.nome_arquivo)


@router.delete("/anexos/{anexo_id}", status_code=204)
def deletar_anexo(anexo_id: int, db: Session = Depends(get_session)) -> None:
    a = db.get(AnexoEvolucao, anexo_id)
    if not a:
        raise HTTPException(404, "Anexo não encontrado")
    try:
        Path(a.caminho).unlink(missing_ok=True)
    except Exception:
        pass
    db.delete(a)
    db.commit()
