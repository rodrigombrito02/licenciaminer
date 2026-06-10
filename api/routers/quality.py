"""Endpoints M5 — Gestão da Qualidade do Projeto (PMBoK §8 + ISO 9001).

Prefixo: /api/quality
"""

from __future__ import annotations

from datetime import date
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from licenciaminer.riscos.database import get_session
from licenciaminer.riscos.models import Projeto
from licenciaminer.riscos.models_pmsuite import WBSNode
from licenciaminer.riscos.models_quality import (
    AuditoriaQualidade,
    InspecaoQualidade,
    MetricaQualidade,
    NaoConformidade,
    RequisitoQualidade,
)

router = APIRouter(prefix="/quality", tags=["Quality"])


# ---------------------------------------------------------------------------
# Serializers
# ---------------------------------------------------------------------------


def _s_requisito(r: RequisitoQualidade) -> dict[str, Any]:
    return {
        "id": r.id,
        "projeto_id": r.projeto_id,
        "wbs_node_id": r.wbs_node_id,
        "codigo": r.codigo,
        "titulo": r.titulo,
        "descricao": r.descricao,
        "categoria": r.categoria,
        "norma_referencia": r.norma_referencia,
        "criterio_aceitacao": r.criterio_aceitacao,
        "metodo_verificacao": r.metodo_verificacao,
        "criticidade": r.criticidade,
        "mandatorio": r.mandatorio,
        "responsavel_id": r.responsavel_id,
        "status": r.status,
    }


def _s_inspecao(i: InspecaoQualidade) -> dict[str, Any]:
    return {
        "id": i.id,
        "projeto_id": i.projeto_id,
        "requisito_id": i.requisito_id,
        "requisito_codigo": i.requisito.codigo if i.requisito else None,
        "wbs_node_id": i.wbs_node_id,
        "codigo": i.codigo,
        "titulo": i.titulo,
        "descricao": i.descricao,
        "tipo": i.tipo,
        "fase": i.fase,
        "data_planejada": i.data_planejada.isoformat() if i.data_planejada else None,
        "data_execucao": i.data_execucao.isoformat() if i.data_execucao else None,
        "inspetor_id": i.inspetor_id,
        "resultado": i.resultado,
        "observacoes": i.observacoes,
        "evidencia_url": i.evidencia_url,
    }


def _s_nc(n: NaoConformidade) -> dict[str, Any]:
    return {
        "id": n.id,
        "projeto_id": n.projeto_id,
        "inspecao_id": n.inspecao_id,
        "inspecao_codigo": n.inspecao.codigo if n.inspecao else None,
        "requisito_id": n.requisito_id,
        "requisito_codigo": n.requisito.codigo if n.requisito else None,
        "wbs_node_id": n.wbs_node_id,
        "risco_id": n.risco_id,
        "codigo": n.codigo,
        "titulo": n.titulo,
        "descricao": n.descricao,
        "severidade": n.severidade,
        "tipo": n.tipo,
        "origem_deteccao": n.origem_deteccao,
        "problema_observado": n.problema_observado,
        "why_1": n.why_1,
        "why_2": n.why_2,
        "why_3": n.why_3,
        "why_4": n.why_4,
        "why_5": n.why_5,
        "causa_raiz": n.causa_raiz,
        "categoria_causa": n.categoria_causa,
        "acao_imediata": n.acao_imediata,
        "acao_corretiva_id": n.acao_corretiva_id,
        "acao_preventiva_id": n.acao_preventiva_id,
        "status": n.status,
        "data_abertura": n.data_abertura.isoformat() if n.data_abertura else None,
        "data_encerramento": n.data_encerramento.isoformat() if n.data_encerramento else None,
        "prazo_tratamento": n.prazo_tratamento.isoformat() if n.prazo_tratamento else None,
        "custo_impacto": n.custo_impacto,
        "responsavel_id": n.responsavel_id,
        "aprovador_id": n.aprovador_id,
    }


def _s_auditoria(a: AuditoriaQualidade) -> dict[str, Any]:
    return {
        "id": a.id,
        "projeto_id": a.projeto_id,
        "codigo": a.codigo,
        "titulo": a.titulo,
        "escopo": a.escopo,
        "criterios": a.criterios,
        "tipo": a.tipo,
        "data_planejada": a.data_planejada.isoformat() if a.data_planejada else None,
        "data_execucao_inicio": a.data_execucao_inicio.isoformat()
        if a.data_execucao_inicio
        else None,
        "data_execucao_fim": a.data_execucao_fim.isoformat()
        if a.data_execucao_fim
        else None,
        "auditor_lider_id": a.auditor_lider_id,
        "equipe_auditoria": a.equipe_auditoria,
        "organizacao_auditora": a.organizacao_auditora,
        "status": a.status,
        "resultado": a.resultado,
        "conformidade_pct": a.conformidade_pct,
        "ncs_abertas": a.ncs_abertas,
        "pontos_melhoria": a.pontos_melhoria,
        "resumo_executivo": a.resumo_executivo,
        "relatorio_url": a.relatorio_url,
    }


def _s_metrica(m: MetricaQualidade) -> dict[str, Any]:
    fpy = (
        m.inspecoes_aprovadas / m.inspecoes_executadas
        if m.inspecoes_executadas
        else None
    )
    return {
        "id": m.id,
        "projeto_id": m.projeto_id,
        "data_snapshot": m.data_snapshot.isoformat() if m.data_snapshot else None,
        "periodo": m.periodo,
        "inspecoes_planejadas": m.inspecoes_planejadas,
        "inspecoes_executadas": m.inspecoes_executadas,
        "inspecoes_aprovadas": m.inspecoes_aprovadas,
        "first_pass_yield": fpy,
        "ncs_abertas": m.ncs_abertas,
        "ncs_encerradas": m.ncs_encerradas,
        "ncs_criticas_abertas": m.ncs_criticas_abertas,
        "tempo_medio_encerramento_dias": m.tempo_medio_encerramento_dias,
        "auditorias_planejadas": m.auditorias_planejadas,
        "auditorias_executadas": m.auditorias_executadas,
        "conformidade_media_pct": m.conformidade_media_pct,
        "custo_nao_qualidade": m.custo_nao_qualidade,
        "observacoes": m.observacoes,
    }


# ---------------------------------------------------------------------------
# Pydantic IN schemas
# ---------------------------------------------------------------------------


class RequisitoIn(BaseModel):
    wbs_node_id: Optional[int] = None
    codigo: str
    titulo: str
    descricao: Optional[str] = None
    categoria: str = "tecnico"
    norma_referencia: Optional[str] = None
    criterio_aceitacao: Optional[str] = None
    metodo_verificacao: Optional[str] = None
    criticidade: str = "media"
    mandatorio: bool = True
    responsavel_id: Optional[int] = None
    status: str = "ativo"


class InspecaoIn(BaseModel):
    requisito_id: Optional[int] = None
    wbs_node_id: Optional[int] = None
    codigo: str
    titulo: str
    descricao: Optional[str] = None
    tipo: str = "inspecao"
    fase: Optional[str] = None
    data_planejada: Optional[date] = None
    data_execucao: Optional[date] = None
    inspetor_id: Optional[int] = None
    resultado: str = "pendente"
    observacoes: Optional[str] = None
    evidencia_url: Optional[str] = None


class NCIn(BaseModel):
    inspecao_id: Optional[int] = None
    requisito_id: Optional[int] = None
    wbs_node_id: Optional[int] = None
    risco_id: Optional[int] = None
    codigo: str
    titulo: str
    descricao: Optional[str] = None
    severidade: str = "media"
    tipo: str = "produto"
    origem_deteccao: Optional[str] = None
    problema_observado: Optional[str] = None
    why_1: Optional[str] = None
    why_2: Optional[str] = None
    why_3: Optional[str] = None
    why_4: Optional[str] = None
    why_5: Optional[str] = None
    causa_raiz: Optional[str] = None
    categoria_causa: Optional[str] = None
    acao_imediata: Optional[str] = None
    status: str = "aberta"
    data_abertura: date
    data_encerramento: Optional[date] = None
    prazo_tratamento: Optional[date] = None
    custo_impacto: Optional[float] = None
    responsavel_id: Optional[int] = None
    aprovador_id: Optional[int] = None


class AuditoriaIn(BaseModel):
    codigo: str
    titulo: str
    escopo: Optional[str] = None
    criterios: Optional[str] = None
    tipo: str = "interna"
    data_planejada: Optional[date] = None
    data_execucao_inicio: Optional[date] = None
    data_execucao_fim: Optional[date] = None
    auditor_lider_id: Optional[int] = None
    equipe_auditoria: Optional[str] = None
    organizacao_auditora: Optional[str] = None
    status: str = "planejada"
    resultado: Optional[str] = None
    conformidade_pct: Optional[float] = None
    ncs_abertas: int = 0
    pontos_melhoria: int = 0
    resumo_executivo: Optional[str] = None
    relatorio_url: Optional[str] = None


# ---------------------------------------------------------------------------
# Requisitos
# ---------------------------------------------------------------------------


@router.get("/projetos/{projeto_id}/requisitos")
def listar_requisitos(projeto_id: int, db: Session = Depends(get_session)) -> list[dict[str, Any]]:
    rows = (
        db.query(RequisitoQualidade)
        .filter_by(projeto_id=projeto_id)
        .order_by(RequisitoQualidade.codigo)
        .all()
    )
    return [_s_requisito(r) for r in rows]


@router.post("/projetos/{projeto_id}/requisitos")
def criar_requisito(projeto_id: int, body: RequisitoIn, db: Session = Depends(get_session)) -> dict[str, Any]:
    if not db.query(Projeto).filter_by(id=projeto_id).first():
        raise HTTPException(404, "projeto não encontrado")
    r = RequisitoQualidade(projeto_id=projeto_id, **body.model_dump())
    db.add(r)
    db.commit()
    db.refresh(r)
    return _s_requisito(r)


@router.put("/requisitos/{req_id}")
def atualizar_requisito(req_id: int, body: RequisitoIn, db: Session = Depends(get_session)) -> dict[str, Any]:
    r = db.query(RequisitoQualidade).filter_by(id=req_id).first()
    if not r:
        raise HTTPException(404, "requisito não encontrado")
    for k, v in body.model_dump().items():
        setattr(r, k, v)
    db.commit()
    db.refresh(r)
    return _s_requisito(r)


@router.delete("/requisitos/{req_id}")
def deletar_requisito(req_id: int, db: Session = Depends(get_session)) -> dict[str, bool]:
    r = db.query(RequisitoQualidade).filter_by(id=req_id).first()
    if not r:
        raise HTTPException(404, "requisito não encontrado")
    db.delete(r)
    db.commit()
    return {"ok": True}


# ---------------------------------------------------------------------------
# Inspeções
# ---------------------------------------------------------------------------


@router.get("/projetos/{projeto_id}/inspecoes")
def listar_inspecoes(projeto_id: int, db: Session = Depends(get_session)) -> list[dict[str, Any]]:
    rows = (
        db.query(InspecaoQualidade)
        .filter_by(projeto_id=projeto_id)
        .order_by(InspecaoQualidade.data_planejada.desc().nullslast())
        .all()
    )
    return [_s_inspecao(i) for i in rows]


@router.post("/projetos/{projeto_id}/inspecoes")
def criar_inspecao(projeto_id: int, body: InspecaoIn, db: Session = Depends(get_session)) -> dict[str, Any]:
    if not db.query(Projeto).filter_by(id=projeto_id).first():
        raise HTTPException(404, "projeto não encontrado")
    i = InspecaoQualidade(projeto_id=projeto_id, **body.model_dump())
    db.add(i)
    db.commit()
    db.refresh(i)
    return _s_inspecao(i)


@router.put("/inspecoes/{insp_id}")
def atualizar_inspecao(insp_id: int, body: InspecaoIn, db: Session = Depends(get_session)) -> dict[str, Any]:
    i = db.query(InspecaoQualidade).filter_by(id=insp_id).first()
    if not i:
        raise HTTPException(404, "inspeção não encontrada")
    for k, v in body.model_dump().items():
        setattr(i, k, v)
    db.commit()
    db.refresh(i)
    return _s_inspecao(i)


@router.delete("/inspecoes/{insp_id}")
def deletar_inspecao(insp_id: int, db: Session = Depends(get_session)) -> dict[str, bool]:
    i = db.query(InspecaoQualidade).filter_by(id=insp_id).first()
    if not i:
        raise HTTPException(404, "inspeção não encontrada")
    db.delete(i)
    db.commit()
    return {"ok": True}


# ---------------------------------------------------------------------------
# Não Conformidades
# ---------------------------------------------------------------------------


@router.get("/projetos/{projeto_id}/ncs")
def listar_ncs(projeto_id: int, db: Session = Depends(get_session)) -> list[dict[str, Any]]:
    rows = (
        db.query(NaoConformidade)
        .filter_by(projeto_id=projeto_id)
        .order_by(NaoConformidade.data_abertura.desc())
        .all()
    )
    return [_s_nc(n) for n in rows]


@router.get("/ncs/{nc_id}")
def obter_nc(nc_id: int, db: Session = Depends(get_session)) -> dict[str, Any]:
    n = db.query(NaoConformidade).filter_by(id=nc_id).first()
    if not n:
        raise HTTPException(404, "NC não encontrada")
    return _s_nc(n)


@router.post("/projetos/{projeto_id}/ncs")
def criar_nc(projeto_id: int, body: NCIn, db: Session = Depends(get_session)) -> dict[str, Any]:
    if not db.query(Projeto).filter_by(id=projeto_id).first():
        raise HTTPException(404, "projeto não encontrado")
    n = NaoConformidade(projeto_id=projeto_id, **body.model_dump())
    db.add(n)
    db.commit()
    db.refresh(n)
    return _s_nc(n)


@router.put("/ncs/{nc_id}")
def atualizar_nc(nc_id: int, body: NCIn, db: Session = Depends(get_session)) -> dict[str, Any]:
    n = db.query(NaoConformidade).filter_by(id=nc_id).first()
    if not n:
        raise HTTPException(404, "NC não encontrada")
    for k, v in body.model_dump().items():
        setattr(n, k, v)
    db.commit()
    db.refresh(n)
    return _s_nc(n)


@router.delete("/ncs/{nc_id}")
def deletar_nc(nc_id: int, db: Session = Depends(get_session)) -> dict[str, bool]:
    n = db.query(NaoConformidade).filter_by(id=nc_id).first()
    if not n:
        raise HTTPException(404, "NC não encontrada")
    db.delete(n)
    db.commit()
    return {"ok": True}


# ---------------------------------------------------------------------------
# Auditorias
# ---------------------------------------------------------------------------


@router.get("/projetos/{projeto_id}/auditorias")
def listar_auditorias(projeto_id: int, db: Session = Depends(get_session)) -> list[dict[str, Any]]:
    rows = (
        db.query(AuditoriaQualidade)
        .filter_by(projeto_id=projeto_id)
        .order_by(AuditoriaQualidade.data_planejada.desc().nullslast())
        .all()
    )
    return [_s_auditoria(a) for a in rows]


@router.post("/projetos/{projeto_id}/auditorias")
def criar_auditoria(projeto_id: int, body: AuditoriaIn, db: Session = Depends(get_session)) -> dict[str, Any]:
    if not db.query(Projeto).filter_by(id=projeto_id).first():
        raise HTTPException(404, "projeto não encontrado")
    a = AuditoriaQualidade(projeto_id=projeto_id, **body.model_dump())
    db.add(a)
    db.commit()
    db.refresh(a)
    return _s_auditoria(a)


@router.put("/auditorias/{aud_id}")
def atualizar_auditoria(aud_id: int, body: AuditoriaIn, db: Session = Depends(get_session)) -> dict[str, Any]:
    a = db.query(AuditoriaQualidade).filter_by(id=aud_id).first()
    if not a:
        raise HTTPException(404, "auditoria não encontrada")
    for k, v in body.model_dump().items():
        setattr(a, k, v)
    db.commit()
    db.refresh(a)
    return _s_auditoria(a)


@router.delete("/auditorias/{aud_id}")
def deletar_auditoria(aud_id: int, db: Session = Depends(get_session)) -> dict[str, bool]:
    a = db.query(AuditoriaQualidade).filter_by(id=aud_id).first()
    if not a:
        raise HTTPException(404, "auditoria não encontrada")
    db.delete(a)
    db.commit()
    return {"ok": True}


# ---------------------------------------------------------------------------
# Métricas
# ---------------------------------------------------------------------------


@router.get("/projetos/{projeto_id}/metricas")
def listar_metricas(projeto_id: int, db: Session = Depends(get_session)) -> list[dict[str, Any]]:
    rows = (
        db.query(MetricaQualidade)
        .filter_by(projeto_id=projeto_id)
        .order_by(MetricaQualidade.data_snapshot)
        .all()
    )
    return [_s_metrica(m) for m in rows]


# ---------------------------------------------------------------------------
# Dashboard agregado
# ---------------------------------------------------------------------------


@router.get("/projetos/{projeto_id}/dashboard")
def dashboard(projeto_id: int, db: Session = Depends(get_session)) -> dict[str, Any]:
    if not db.query(Projeto).filter_by(id=projeto_id).first():
        raise HTTPException(404, "projeto não encontrado")

    reqs = db.query(RequisitoQualidade).filter_by(projeto_id=projeto_id).all()
    insps = db.query(InspecaoQualidade).filter_by(projeto_id=projeto_id).all()
    ncs = db.query(NaoConformidade).filter_by(projeto_id=projeto_id).all()
    auds = db.query(AuditoriaQualidade).filter_by(projeto_id=projeto_id).all()
    metricas = (
        db.query(MetricaQualidade)
        .filter_by(projeto_id=projeto_id)
        .order_by(MetricaQualidade.data_snapshot)
        .all()
    )

    insp_aprov = [i for i in insps if i.resultado == "aprovado"]
    insp_reprov = [i for i in insps if i.resultado == "reprovado"]
    insp_executadas = [i for i in insps if i.resultado not in ("pendente", "cancelado")]
    fpy = len(insp_aprov) / len(insp_executadas) if insp_executadas else None

    ncs_abertas = [n for n in ncs if n.status not in ("encerrada", "cancelada")]
    ncs_criticas_abertas = [n for n in ncs_abertas if n.severidade == "critica"]
    ncs_encerradas = [n for n in ncs if n.status == "encerrada"]
    custo_nq_total = sum((n.custo_impacto or 0) for n in ncs)

    aud_concluidas = [a for a in auds if a.status == "concluida"]
    conf_media = (
        sum(a.conformidade_pct or 0 for a in aud_concluidas) / len(aud_concluidas)
        if aud_concluidas
        else None
    )

    # Severidade distribuição
    sev_dist: dict[str, int] = {}
    for n in ncs:
        sev_dist[n.severidade] = sev_dist.get(n.severidade, 0) + 1

    # Categoria causa (Ishikawa)
    cat_dist: dict[str, int] = {}
    for n in ncs:
        if n.categoria_causa:
            cat_dist[n.categoria_causa] = cat_dist.get(n.categoria_causa, 0) + 1

    # Requisitos por criticidade
    req_crit_dist: dict[str, int] = {}
    for r in reqs:
        req_crit_dist[r.criticidade] = req_crit_dist.get(r.criticidade, 0) + 1

    return {
        "projeto_id": projeto_id,
        "kpis": {
            "requisitos_total": len(reqs),
            "requisitos_mandatorios": sum(1 for r in reqs if r.mandatorio),
            "inspecoes_total": len(insps),
            "inspecoes_aprovadas": len(insp_aprov),
            "inspecoes_reprovadas": len(insp_reprov),
            "inspecoes_pendentes": sum(1 for i in insps if i.resultado == "pendente"),
            "first_pass_yield": fpy,
            "ncs_total": len(ncs),
            "ncs_abertas": len(ncs_abertas),
            "ncs_criticas_abertas": len(ncs_criticas_abertas),
            "ncs_encerradas": len(ncs_encerradas),
            "custo_nao_qualidade_total": custo_nq_total,
            "auditorias_total": len(auds),
            "auditorias_concluidas": len(aud_concluidas),
            "conformidade_media_pct": conf_media,
        },
        "distribuicao_severidade": sev_dist,
        "distribuicao_causa_ishikawa": cat_dist,
        "requisitos_por_criticidade": req_crit_dist,
        "metricas_historico": [_s_metrica(m) for m in metricas],
    }
