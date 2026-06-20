"""Router do módulo Due Diligence editável (prefix /api/dd).

Convive ao lado de api/routers/due_diligence.py (stateless), que segue intacto.
Templates editáveis (régua-mestre) + instâncias por cliente (snapshot) + score
derivado dos critérios, reusando app/components/dd_scoring.
"""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from datetime import datetime
from html import escape as _esc

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
    STATUS_DOC,
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
        "projeto": i.projeto, "escopo": i.escopo, "atividade": i.atividade,
        "atividades": i.atividades, "classe": i.classe, "status": i.status,
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
    return {"objeto_tipos": OBJETO_TIPO, "status_doc": STATUS_DOC}


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
    projeto: Optional[str] = None
    escopo: Optional[str] = None
    atividade: Optional[str] = None
    atividades: Optional[list] = None
    classe: Optional[int] = None
    responsavel: Optional[str] = None
    criado_por: Optional[str] = None


@router.post("/instancias", status_code=201)
def criar_instancia(body: InstanciaIn, db: Session = Depends(get_session)) -> dict:
    tpl = db.get(DDTemplate, body.template_id)
    if not tpl:
        raise HTTPException(404, "Template não encontrado")
    inst = criar_instancia_snapshot(
        db, tpl, cliente=body.cliente, projeto=body.projeto, escopo=body.escopo,
        atividade=body.atividade, atividades=body.atividades, classe=body.classe,
        responsavel=body.responsavel, criado_por=body.criado_por,
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


class DocStatusIn(BaseModel):
    status_doc: Optional[str] = None
    arquivo_ref: Optional[str] = None
    autor: Optional[str] = None


@router.patch("/instancias/{inst_id}/documentos/{doc_id}")
def status_documento(inst_id: int, doc_id: int, body: DocStatusIn,
                     db: Session = Depends(get_session)) -> dict:
    d = db.get(DDInstanciaDocumento, doc_id)
    if not d or d.instancia_id != inst_id:
        raise HTTPException(404, "Documento da instância não encontrado")
    if body.status_doc is not None:
        d.status_doc = body.status_doc
    if body.arquivo_ref is not None:
        d.arquivo_ref = body.arquivo_ref
    db.commit()
    return _inst_doc_out(d)


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


def _doc_score_tuple(crits: list[DDInstanciaCriterio]):
    res = _score_criterios(crits)
    obrig = [c for c in crits if c.obrigatoriedade == "obrigatorio"]
    return (
        round(res["conformidade_ponderada"] * 100, 1),
        res["classificacao"], res["cor"],
        sum(1 for c in obrig if c.avaliacao == "Atende"), len(obrig),
    )


_RELATORIO_CSS = """
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
  color:#11202e;line-height:1.55;font-size:14px;background:#fff}
.wrap{max-width:900px;margin:0 auto;padding:32px 28px 60px}
header{background:linear-gradient(135deg,#0A2540,#13283f 55%,#0E7490);color:#fff;
  border-radius:14px;padding:24px 26px;margin-bottom:22px}
header .badge{display:inline-block;background:rgba(255,192,0,.18);color:#FFC000;font-size:11px;
  font-weight:700;padding:4px 10px;border-radius:999px;text-transform:uppercase;letter-spacing:.5px}
header h1{font-size:22px;font-weight:800;margin:10px 0 4px}
header .meta{color:#cdd8e3;font-size:13px;margin-top:8px}
header .meta b{color:#fff}
h2{font-size:16px;font-weight:800;color:#0A2540;margin:26px 0 8px;border-bottom:2px solid #e4e9ef;padding-bottom:6px}
p.lead{color:#5b6b7b;margin-bottom:10px}
.score-box{display:flex;align-items:center;gap:18px;border:1px solid #e4e9ef;border-radius:12px;padding:18px 20px;margin:8px 0}
.score-num{font-size:40px;font-weight:800;line-height:1}
.score-lab{font-size:13px;color:#5b6b7b}
table{width:100%;border-collapse:collapse;font-size:13px;margin:8px 0 4px}
th,td{text-align:left;padding:8px 10px;border-bottom:1px solid #e9edf2;vertical-align:top}
th{background:#f6f8fa;color:#5b6b7b;font-size:11px;text-transform:uppercase;letter-spacing:.4px}
.prio{display:inline-block;font-size:11px;font-weight:700;padding:2px 9px;border-radius:999px}
.prio-alta{background:#fdecea;color:#c0392b}.prio-media{background:#fff3da;color:#9a6b00}
.note{color:#5b6b7b;font-size:12px;margin-top:6px}
.foot{margin-top:30px;border-top:1px solid #e4e9ef;padding-top:12px;color:#8a98a6;font-size:11px;text-align:center}
.kpis{display:flex;gap:10px;flex-wrap:wrap;margin:6px 0}
.kpi{border:1px solid #e4e9ef;border-radius:10px;padding:10px 14px;flex:1;min-width:120px}
.kpi .n{font-size:20px;font-weight:800;color:#0E7490}.kpi .l{font-size:11px;color:#5b6b7b}
@media print{.noprint{display:none}body{font-size:12px}.wrap{padding:0}}
.btn{display:inline-block;background:#E67E22;color:#fff;text-decoration:none;font-weight:700;
  padding:9px 16px;border-radius:8px;font-size:13px;border:0;cursor:pointer}
"""


@router.get("/instancias/{inst_id}/relatorio", response_class=HTMLResponse)
def relatorio_instancia(inst_id: int, db: Session = Depends(get_session)) -> HTMLResponse:
    i = db.get(DDInstancia, inst_id)
    if not i:
        raise HTTPException(404, "Instância não encontrada")
    docs = sorted(i.documentos, key=lambda d: d.ordem)
    todos = [c for d in docs for c in d.criterios]
    glob = _score_criterios(todos)
    gpct = round(glob["conformidade_ponderada"] * 100, 1)
    n_crit = len(todos)
    aval = sum(1 for c in todos if c.avaliacao)

    doc_rows, plano = [], []
    for d in docs:
        crits = list(d.criterios)
        pct, classif, cor, oa, ot = _doc_score_tuple(crits)
        doc_rows.append(
            f"<tr><td>{_esc(d.nome)}</td><td>{_esc(d.status_doc or '—')}</td>"
            f"<td style='text-align:center'>{oa}/{ot}</td>"
            f"<td style='text-align:center;color:{cor};font-weight:700'>{pct}%</td>"
            f"<td style='color:{cor}'>{_esc(classif or '—')}</td></tr>"
        )
        if (d.status_doc or "") == "Não Apresentado":
            plano.append((d.nome, "Documento não apresentado", "Apresentar o documento exigido", "Alta"))
        for c in crits:
            if c.obrigatoriedade != "obrigatorio":
                continue
            base = c.teste_aderencia or c.evidencia_esperada
            if c.avaliacao == "Não Atende":
                plano.append((d.nome, c.evidencia_esperada, f"Atender: {base}", "Alta"))
            elif c.avaliacao == "Atende Parcialmente":
                plano.append((d.nome, c.evidencia_esperada, f"Complementar: {base}", "Média"))

    plano_rows = "".join(
        f"<tr><td>{idx + 1}</td><td>{_esc(doc)}</td><td>{_esc(item)}</td><td>{_esc(acao)}</td>"
        f"<td style='text-align:center'><span class='prio prio-{'alta' if prio == 'Alta' else 'media'}'>{prio}</span></td></tr>"
        for idx, (doc, item, acao, prio) in enumerate(plano)
    ) or "<tr><td colspan='5' style='text-align:center;color:#1c7a45'>Sem ações pendentes nos critérios obrigatórios avaliados.</td></tr>"

    atividades = ", ".join(i.atividades) if i.atividades else (i.atividade or "—")
    data = datetime.utcnow().strftime("%d/%m/%Y")
    obj_label = {"licenca_ambiental": "Licenciamento ambiental", "anuencia": "Anuência",
                 "regularizacao_fundiaria": "Regularização fundiária"}.get(i.objeto_tipo, i.objeto_tipo)

    html = f"""<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Relatório de Diligência — {_esc(i.cliente)}</title><style>{_RELATORIO_CSS}</style></head>
<body><div class="wrap">
<div class="noprint" style="text-align:right;margin-bottom:10px">
  <button class="btn" onclick="window.print()">🖨️ Salvar como PDF</button></div>
<header>
  <span class="badge">Summo Quartile · Diligência Summo</span>
  <h1>Relatório de Diligência — {_esc(obj_label)}</h1>
  <div class="meta"><b>Cliente:</b> {_esc(i.cliente)}{(' &nbsp;·&nbsp; <b>Projeto:</b> ' + _esc(i.projeto)) if i.projeto else ''}<br>
  <b>Licença/objeto:</b> {_esc(i.licenca_codigo)} &nbsp;·&nbsp; <b>Atividades:</b> {_esc(atividades)}
  {(' &nbsp;·&nbsp; <b>Classe:</b> ' + str(i.classe)) if i.classe else ''}<br>
  <b>Escopo:</b> {_esc(i.escopo or '—')} &nbsp;·&nbsp; <b>Data:</b> {data}</div>
</header>

<h2>1. Introdução</h2>
<p class="lead">Este relatório apresenta o diagnóstico de conformidade do processo de
{_esc(obj_label.lower())} de <b>{_esc(i.cliente)}</b>, conduzido pela metodologia Summo de
Diligência (objeto → documentação aplicável → requisitos → critérios de aderência →
diagnóstico e plano de ação). A análise verifica a presença e a aderência dos documentos e
critérios exigidos, apontando lacunas e o caminho até a conformidade.</p>

<h2>2. Objetivo</h2>
<p class="lead">Mensurar o grau de aderência do processo às exigências aplicáveis, identificar
o que falta ou precisa ser melhorado e fornecer um plano de ação priorizado para elevar a
aderência até o patamar necessário para a submissão/protocolo.</p>

<h2>3. Diagnóstico do processo</h2>
<div class="score-box">
  <div><div class="score-num" style="color:{glob['cor']}">{gpct}%</div><div class="score-lab">aderência ponderada</div></div>
  <div><div style="font-weight:800;color:{glob['cor']};font-size:16px">{_esc(glob['classificacao'] or '—')}</div>
  <div class="score-lab">{_esc(glob['descricao'] or '')}</div></div>
</div>
<div class="kpis">
  <div class="kpi"><div class="n">{len(docs)}</div><div class="l">documentos</div></div>
  <div class="kpi"><div class="n">{n_crit}</div><div class="l">critérios</div></div>
  <div class="kpi"><div class="n">{aval}</div><div class="l">avaliados</div></div>
  <div class="kpi"><div class="n">{len(plano)}</div><div class="l">ações no plano</div></div>
</div>
<p class="note">Aderência ponderada considera apenas critérios avaliados (exclui "Não se aplica").</p>

<h2>4. Diagnóstico dos documentos</h2>
<table><thead><tr><th>Documento</th><th>Status</th><th>Obrig. atendidos</th><th>Aderência</th><th>Classificação</th></tr></thead>
<tbody>{''.join(doc_rows)}</tbody></table>

<h2>5. Plano de ação</h2>
<p class="lead">Ações priorizadas a partir dos critérios obrigatórios não atendidos / parciais e
dos documentos não apresentados.</p>
<table><thead><tr><th>#</th><th>Documento</th><th>Item</th><th>Ação recomendada</th><th>Prioridade</th></tr></thead>
<tbody>{plano_rows}</tbody></table>
<p class="note">Diagnóstico de conformidade documental — não substitui os estudos técnicos
específicos (ex.: análise de ruptura, estudos de fauna/espeleologia), que devem ser elaborados
pelos especialistas responsáveis.</p>

<div class="foot">Summo Quartile · Diligência Summo · Relatório gerado em {data} · documento de trabalho</div>
</div></body></html>"""
    return HTMLResponse(content=html)
