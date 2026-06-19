"""Router do módulo Due Diligence editável (prefix /api/dd).

Convive ao lado de api/routers/due_diligence.py (stateless), que segue intacto.
Templates editáveis (régua-mestre) + instâncias por cliente (snapshot) + score
derivado dos critérios, reusando app/components/dd_scoring.
"""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.components.dd_scoring import calcular_conformidade
from licenciaminer.dd.database import (
    DDCriterio,
    DDDocumento,
    DDInstancia,
    DDInstanciaCriterio,
    DDInstanciaDocumento,
    DDTemplate,
    DDAuditoria,
    OBJETO_TIPO,
    criar_instancia_snapshot,
    get_session,
    registrar_auditoria,
)

router = APIRouter(prefix="/api/dd", tags=["Due Diligence (editável)"])


# ════════════════════════════════════════════════════════════════════
#  Serializers
# ════════════════════════════════════════════════════════════════════
def _crit_out(c: DDCriterio) -> dict:
    return {
        "id": c.id, "documento_id": c.documento_id, "requisito_id": c.requisito_id,
        "topico": c.topico, "teste_aderencia": c.teste_aderencia,
        "evidencia_esperada": c.evidencia_esperada, "proveniencia": c.proveniencia,
        "obrigatoriedade": c.obrigatoriedade, "peso": c.peso, "impacto": c.impacto,
        "norma_origem": c.norma_origem, "artigo_referencia": c.artigo_referencia,
        "ativo": c.ativo, "ordem": c.ordem,
    }


def _doc_out(d: DDDocumento) -> dict:
    return {
        "id": d.id, "template_id": d.template_id, "doc_id": d.doc_id, "nome": d.nome,
        "descricao": d.descricao, "modulo": d.modulo, "norma_referencia": d.norma_referencia,
        "obrigatorio": d.obrigatorio, "ordem": d.ordem,
        "criterios": [_crit_out(c) for c in sorted(d.criterios, key=lambda x: x.ordem) if c.ativo],
    }


def _tpl_out(t: DDTemplate) -> dict:
    return {
        "id": t.id, "objeto_tipo": t.objeto_tipo, "licenca_codigo": t.licenca_codigo,
        "nome": t.nome, "descricao": t.descricao, "versao": t.versao,
        "norma_origem": t.norma_origem, "ativo": t.ativo, "criado_por": t.criado_por,
        "criado_em": t.criado_em.isoformat() if t.criado_em else None,
    }


def _inst_crit_out(c: DDInstanciaCriterio) -> dict:
    return {
        "id": c.id, "inst_documento_id": c.inst_documento_id, "requisito_id": c.requisito_id,
        "topico": c.topico, "teste_aderencia": c.teste_aderencia,
        "evidencia_esperada": c.evidencia_esperada, "proveniencia": c.proveniencia,
        "obrigatoriedade": c.obrigatoriedade, "peso": c.peso,
        "avaliacao": c.avaliacao, "observacao": c.observacao,
        "evidencia_encontrada": c.evidencia_encontrada, "fonte_avaliacao": c.fonte_avaliacao,
    }


def _inst_doc_out(d: DDInstanciaDocumento) -> dict:
    return {
        "id": d.id, "instancia_id": d.instancia_id, "doc_id": d.doc_id, "nome": d.nome,
        "modulo": d.modulo, "norma_referencia": d.norma_referencia,
        "obrigatorio": d.obrigatorio, "status_doc": d.status_doc, "arquivo_ref": d.arquivo_ref,
        "criterios": [_inst_crit_out(c) for c in sorted(d.criterios, key=lambda x: x.ordem)],
    }


def _inst_out(i: DDInstancia) -> dict:
    return {
        "id": i.id, "template_id": i.template_id, "template_versao": i.template_versao,
        "objeto_tipo": i.objeto_tipo, "licenca_codigo": i.licenca_codigo, "cliente": i.cliente,
        "escopo": i.escopo, "atividade": i.atividade, "classe": i.classe, "status": i.status,
        "responsavel": i.responsavel, "criado_por": i.criado_por,
        "criado_em": i.criado_em.isoformat() if i.criado_em else None,
    }


# ════════════════════════════════════════════════════════════════════
#  Score derivado (reusa dd_scoring)
# ════════════════════════════════════════════════════════════════════
def _score_criterios(criterios: list[DDInstanciaCriterio]) -> dict:
    avals, pesos = {}, {}
    for c in criterios:
        if c.avaliacao:
            avals[str(c.id)] = c.avaliacao
            pesos[str(c.id)] = c.peso or 1.0
    res = calcular_conformidade(avals, pesos)
    return {
        "conformidade_ponderada": res.conformidade_ponderada,
        "conformidade_nao_ponderada": res.conformidade_nao_ponderada,
        "classificacao": res.classificacao, "cor": res.cor, "descricao": res.descricao,
        "atende": res.atende, "atende_parcial": res.atende_parcial,
        "nao_atende": res.nao_atende, "nao_aplica": res.nao_aplica,
    }


# ════════════════════════════════════════════════════════════════════
#  Templates / Documentos / Critérios
# ════════════════════════════════════════════════════════════════════
@router.get("/meta")
def meta() -> dict:
    return {"objeto_tipos": OBJETO_TIPO}


@router.get("/templates")
def listar_templates(
    objeto_tipo: Optional[str] = Query(None),
    licenca_codigo: Optional[str] = Query(None),
    ativo: Optional[bool] = Query(None),
    db: Session = Depends(get_session),
) -> list[dict]:
    q = db.query(DDTemplate)
    if objeto_tipo:
        q = q.filter(DDTemplate.objeto_tipo == objeto_tipo)
    if licenca_codigo:
        q = q.filter(DDTemplate.licenca_codigo == licenca_codigo)
    if ativo is not None:
        q = q.filter(DDTemplate.ativo == ativo)
    return [_tpl_out(t) for t in q.order_by(DDTemplate.objeto_tipo, DDTemplate.licenca_codigo).all()]


@router.get("/templates/{tpl_id}")
def obter_template(tpl_id: int, db: Session = Depends(get_session)) -> dict:
    t = db.get(DDTemplate, tpl_id)
    if not t:
        raise HTTPException(404, "Template não encontrado")
    return {"template": _tpl_out(t), "documentos": [_doc_out(d) for d in sorted(t.documentos, key=lambda x: x.ordem)]}


class TemplateIn(BaseModel):
    objeto_tipo: str = "licenca_ambiental"
    licenca_codigo: str
    nome: str
    descricao: Optional[str] = None
    norma_origem: Optional[str] = None
    criado_por: Optional[str] = None


@router.post("/templates", status_code=201)
def criar_template(body: TemplateIn, db: Session = Depends(get_session)) -> dict:
    t = DDTemplate(**body.model_dump())
    db.add(t)
    db.flush()
    registrar_auditoria(db, "template", t.id, "criar", autor=body.criado_por)
    db.commit()
    return _tpl_out(t)


class TemplatePatch(BaseModel):
    nome: Optional[str] = None
    descricao: Optional[str] = None
    norma_origem: Optional[str] = None
    ativo: Optional[bool] = None
    autor: Optional[str] = None
    justificativa: Optional[str] = None


@router.patch("/templates/{tpl_id}")
def editar_template(tpl_id: int, body: TemplatePatch, db: Session = Depends(get_session)) -> dict:
    t = db.get(DDTemplate, tpl_id)
    if not t:
        raise HTTPException(404, "Template não encontrado")
    diff = {}
    for campo in ("nome", "descricao", "norma_origem", "ativo"):
        val = getattr(body, campo)
        if val is not None and val != getattr(t, campo):
            diff[campo] = [getattr(t, campo), val]
            setattr(t, campo, val)
    registrar_auditoria(db, "template", t.id, "editar", autor=body.autor,
                        justificativa=body.justificativa, diff=diff or None)
    db.commit()
    return _tpl_out(t)


@router.post("/templates/{tpl_id}/nova-versao", status_code=201)
def nova_versao(tpl_id: int, body: TemplatePatch, db: Session = Depends(get_session)) -> dict:
    base = db.get(DDTemplate, tpl_id)
    if not base:
        raise HTTPException(404, "Template não encontrado")
    nova_v = (
        db.query(DDTemplate)
        .filter(DDTemplate.objeto_tipo == base.objeto_tipo,
                DDTemplate.licenca_codigo == base.licenca_codigo)
        .count()
    ) + 1
    # desativa versões anteriores
    for t in db.query(DDTemplate).filter(
        DDTemplate.objeto_tipo == base.objeto_tipo,
        DDTemplate.licenca_codigo == base.licenca_codigo,
    ).all():
        t.ativo = False
    novo = DDTemplate(
        objeto_tipo=base.objeto_tipo, licenca_codigo=base.licenca_codigo, nome=base.nome,
        descricao=base.descricao, versao=nova_v, norma_origem=base.norma_origem,
        ativo=True, criado_por=body.autor,
    )
    db.add(novo)
    db.flush()
    for d in base.documentos:
        nd = DDDocumento(
            template_id=novo.id, doc_id=d.doc_id, nome=d.nome, descricao=d.descricao,
            modulo=d.modulo, norma_referencia=d.norma_referencia, obrigatorio=d.obrigatorio, ordem=d.ordem,
        )
        db.add(nd)
        db.flush()
        for c in d.criterios:
            if not c.ativo:
                continue
            db.add(DDCriterio(
                documento_id=nd.id, requisito_id=c.requisito_id, topico=c.topico,
                teste_aderencia=c.teste_aderencia, evidencia_esperada=c.evidencia_esperada,
                proveniencia=c.proveniencia, obrigatoriedade=c.obrigatoriedade, peso=c.peso,
                impacto=c.impacto, norma_origem=c.norma_origem, artigo_referencia=c.artigo_referencia,
                ordem=c.ordem,
            ))
    registrar_auditoria(db, "template", novo.id, "criar", autor=body.autor,
                        justificativa=body.justificativa or f"Nova versão v{nova_v} a partir de v{base.versao}")
    db.commit()
    return _tpl_out(novo)


class DocumentoIn(BaseModel):
    template_id: int
    nome: str
    doc_id: Optional[str] = None
    descricao: Optional[str] = None
    modulo: Optional[str] = None
    norma_referencia: Optional[str] = None
    obrigatorio: bool = True
    ordem: int = 0
    autor: Optional[str] = None


@router.post("/documentos", status_code=201)
def criar_documento(body: DocumentoIn, db: Session = Depends(get_session)) -> dict:
    data = body.model_dump(exclude={"autor"})
    d = DDDocumento(**data)
    db.add(d)
    db.flush()
    registrar_auditoria(db, "documento", d.id, "criar", autor=body.autor)
    db.commit()
    return _doc_out(d)


class DocumentoPatch(BaseModel):
    nome: Optional[str] = None
    descricao: Optional[str] = None
    modulo: Optional[str] = None
    norma_referencia: Optional[str] = None
    obrigatorio: Optional[bool] = None
    ordem: Optional[int] = None
    autor: Optional[str] = None
    justificativa: Optional[str] = None


@router.patch("/documentos/{doc_id}")
def editar_documento(doc_id: int, body: DocumentoPatch, db: Session = Depends(get_session)) -> dict:
    d = db.get(DDDocumento, doc_id)
    if not d:
        raise HTTPException(404, "Documento não encontrado")
    diff = {}
    for campo in ("nome", "descricao", "modulo", "norma_referencia", "obrigatorio", "ordem"):
        val = getattr(body, campo)
        if val is not None and val != getattr(d, campo):
            diff[campo] = [getattr(d, campo), val]
            setattr(d, campo, val)
    registrar_auditoria(db, "documento", d.id, "editar", autor=body.autor,
                        justificativa=body.justificativa, diff=diff or None)
    db.commit()
    return _doc_out(d)


class CriterioIn(BaseModel):
    documento_id: int
    evidencia_esperada: str
    topico: Optional[str] = None
    teste_aderencia: Optional[str] = None
    proveniencia: str = "consultor"
    obrigatoriedade: str = "obrigatorio"
    peso: float = 1.0
    impacto: Optional[float] = None
    norma_origem: Optional[str] = None
    artigo_referencia: Optional[str] = None
    ordem: int = 0
    autor: Optional[str] = None
    justificativa: Optional[str] = None


@router.post("/criterios", status_code=201)
def criar_criterio(body: CriterioIn, db: Session = Depends(get_session)) -> dict:
    data = body.model_dump(exclude={"autor", "justificativa"})
    c = DDCriterio(**data)
    db.add(c)
    db.flush()
    registrar_auditoria(db, "criterio", c.id, "criar", autor=body.autor, justificativa=body.justificativa)
    db.commit()
    return _crit_out(c)


class CriterioPatch(BaseModel):
    evidencia_esperada: Optional[str] = None
    topico: Optional[str] = None
    teste_aderencia: Optional[str] = None
    proveniencia: Optional[str] = None
    obrigatoriedade: Optional[str] = None
    peso: Optional[float] = None
    impacto: Optional[float] = None
    ordem: Optional[int] = None
    autor: Optional[str] = None
    justificativa: Optional[str] = None


@router.patch("/criterios/{crit_id}")
def editar_criterio(crit_id: int, body: CriterioPatch, db: Session = Depends(get_session)) -> dict:
    c = db.get(DDCriterio, crit_id)
    if not c:
        raise HTTPException(404, "Critério não encontrado")
    diff = {}
    for campo in ("evidencia_esperada", "topico", "teste_aderencia", "proveniencia",
                  "obrigatoriedade", "peso", "impacto", "ordem"):
        val = getattr(body, campo)
        if val is not None and val != getattr(c, campo):
            diff[campo] = [getattr(c, campo), val]
            setattr(c, campo, val)
    registrar_auditoria(db, "criterio", c.id, "editar", autor=body.autor,
                        justificativa=body.justificativa, diff=diff or None)
    db.commit()
    return _crit_out(c)


@router.delete("/criterios/{crit_id}")
def remover_criterio(crit_id: int, autor: Optional[str] = Query(None),
                     justificativa: Optional[str] = Query(None),
                     db: Session = Depends(get_session)) -> dict:
    c = db.get(DDCriterio, crit_id)
    if not c:
        raise HTTPException(404, "Critério não encontrado")
    c.ativo = False  # soft-delete
    registrar_auditoria(db, "criterio", c.id, "desativar", autor=autor, justificativa=justificativa)
    db.commit()
    return {"ok": True, "id": crit_id}


@router.get("/auditoria")
def auditoria(entidade: str = Query(...), entidade_id: int = Query(...),
              db: Session = Depends(get_session)) -> list[dict]:
    rows = (
        db.query(DDAuditoria)
        .filter(DDAuditoria.entidade == entidade, DDAuditoria.entidade_id == entidade_id)
        .order_by(DDAuditoria.criado_em.desc())
        .all()
    )
    return [{
        "id": r.id, "entidade": r.entidade, "entidade_id": r.entidade_id, "acao": r.acao,
        "autor": r.autor, "justificativa": r.justificativa, "diff": r.diff,
        "criado_em": r.criado_em.isoformat() if r.criado_em else None,
    } for r in rows]


# ════════════════════════════════════════════════════════════════════
#  Instâncias (snapshot + avaliação + score)
# ════════════════════════════════════════════════════════════════════
class InstanciaIn(BaseModel):
    template_id: int
    cliente: str
    escopo: Optional[str] = None
    atividade: Optional[str] = None
    classe: Optional[int] = None
    responsavel: Optional[str] = None
    criado_por: Optional[str] = None


@router.post("/instancias", status_code=201)
def criar_instancia(body: InstanciaIn, db: Session = Depends(get_session)) -> dict:
    tpl = db.get(DDTemplate, body.template_id)
    if not tpl:
        raise HTTPException(404, "Template não encontrado")
    inst = criar_instancia_snapshot(
        db, tpl, cliente=body.cliente, escopo=body.escopo, atividade=body.atividade,
        classe=body.classe, responsavel=body.responsavel, criado_por=body.criado_por,
        status="em_avaliacao",
    )
    db.commit()
    return _inst_out(inst)


@router.get("/instancias")
def listar_instancias(
    cliente: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    objeto_tipo: Optional[str] = Query(None),
    db: Session = Depends(get_session),
) -> list[dict]:
    q = db.query(DDInstancia)
    if cliente:
        q = q.filter(DDInstancia.cliente.ilike(f"%{cliente}%"))
    if status:
        q = q.filter(DDInstancia.status == status)
    if objeto_tipo:
        q = q.filter(DDInstancia.objeto_tipo == objeto_tipo)
    return [_inst_out(i) for i in q.order_by(DDInstancia.criado_em.desc()).all()]


@router.get("/instancias/{inst_id}")
def obter_instancia(inst_id: int, db: Session = Depends(get_session)) -> dict:
    i = db.get(DDInstancia, inst_id)
    if not i:
        raise HTTPException(404, "Instância não encontrada")
    return {"instancia": _inst_out(i),
            "documentos": [_inst_doc_out(d) for d in sorted(i.documentos, key=lambda x: x.ordem)]}


class InstanciaPatch(BaseModel):
    status: Optional[str] = None
    escopo: Optional[str] = None
    responsavel: Optional[str] = None


@router.patch("/instancias/{inst_id}")
def editar_instancia(inst_id: int, body: InstanciaPatch, db: Session = Depends(get_session)) -> dict:
    i = db.get(DDInstancia, inst_id)
    if not i:
        raise HTTPException(404, "Instância não encontrada")
    for campo in ("status", "escopo", "responsavel"):
        val = getattr(body, campo)
        if val is not None:
            setattr(i, campo, val)
    db.commit()
    return _inst_out(i)


class AvaliarIn(BaseModel):
    avaliacao: Optional[str] = None
    observacao: Optional[str] = None
    autor: Optional[str] = None


@router.post("/instancias/{inst_id}/criterios/{crit_id}/avaliar")
def avaliar_criterio(inst_id: int, crit_id: int, body: AvaliarIn,
                     db: Session = Depends(get_session)) -> dict:
    c = db.get(DDInstanciaCriterio, crit_id)
    if not c:
        raise HTTPException(404, "Critério da instância não encontrado")
    c.avaliacao = body.avaliacao
    if body.observacao is not None:
        c.observacao = body.observacao
    c.fonte_avaliacao = "manual"
    registrar_auditoria(db, "inst_criterio", c.id, "avaliar", autor=body.autor,
                        diff={"avaliacao": [None, body.avaliacao]})
    db.commit()
    return _inst_crit_out(c)


class AvaliarLoteIn(BaseModel):
    avaliacoes: dict[str, str]
    autor: Optional[str] = None


@router.patch("/instancias/{inst_id}/criterios")
def avaliar_lote(inst_id: int, body: AvaliarLoteIn, db: Session = Depends(get_session)) -> dict:
    n = 0
    for cid, aval in body.avaliacoes.items():
        c = db.get(DDInstanciaCriterio, int(cid))
        if c:
            c.avaliacao = aval
            c.fonte_avaliacao = "manual"
            n += 1
    db.commit()
    return {"atualizados": n}


class InstCriterioIn(BaseModel):
    inst_documento_id: int
    evidencia_esperada: str
    topico: Optional[str] = None
    teste_aderencia: Optional[str] = None
    obrigatoriedade: str = "obrigatorio"
    peso: float = 1.0
    autor: Optional[str] = None


@router.post("/instancias/{inst_id}/criterios", status_code=201)
def add_criterio_instancia(inst_id: int, body: InstCriterioIn,
                           db: Session = Depends(get_session)) -> dict:
    doc = db.get(DDInstanciaDocumento, body.inst_documento_id)
    if not doc or doc.instancia_id != inst_id:
        raise HTTPException(404, "Documento da instância não encontrado")
    c = DDInstanciaCriterio(
        inst_documento_id=body.inst_documento_id, evidencia_esperada=body.evidencia_esperada,
        topico=body.topico, teste_aderencia=body.teste_aderencia,
        proveniencia="consultor", obrigatoriedade=body.obrigatoriedade, peso=body.peso,
    )
    db.add(c)
    db.flush()
    registrar_auditoria(db, "inst_criterio", c.id, "criar", autor=body.autor,
                        justificativa="Critério adicionado na instância")
    db.commit()
    return _inst_crit_out(c)


@router.get("/instancias/{inst_id}/score")
def score_instancia(inst_id: int, db: Session = Depends(get_session)) -> dict:
    i = db.get(DDInstancia, inst_id)
    if not i:
        raise HTTPException(404, "Instância não encontrada")
    por_documento = []
    todos: list[DDInstanciaCriterio] = []
    for d in sorted(i.documentos, key=lambda x: x.ordem):
        crits = list(d.criterios)
        todos.extend(crits)
        sc = _score_criterios(crits)
        obrig = [c for c in crits if c.obrigatoriedade == "obrigatorio"]
        por_documento.append({
            "doc_id": d.id, "nome": d.nome,
            "pct": round(sc["conformidade_ponderada"] * 100, 1),
            "status": sc["classificacao"], "cor": sc["cor"],
            "obrigatorios_atendidos": sum(1 for c in obrig if c.avaliacao == "Atende"),
            "obrigatorios_total": len(obrig),
            "criterios_total": len(crits),
            "avaliados": sum(1 for c in crits if c.avaliacao),
        })
    glob = _score_criterios(todos)
    glob["conformidade_ponderada_pct"] = round(glob["conformidade_ponderada"] * 100, 1)
    return {"por_documento": por_documento, "global": glob}
