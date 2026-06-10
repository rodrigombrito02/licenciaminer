"""Endpoints M9 — Gestão das Aquisições (PMBoK §12 + ISO 21502 §7.11).

Prefixo: /api/procurement
"""

from __future__ import annotations

from datetime import date
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from licenciaminer.riscos.database import get_session
from licenciaminer.riscos.models import Projeto
from licenciaminer.riscos.models_procurement import (
    Contrato,
    Fornecedor,
    MarcoSuprimentos,
    OrdemCompra,
    RFP,
)

router = APIRouter(prefix="/procurement", tags=["Procurement"])


# ---------------------------------------------------------------------------
# Serializers
# ---------------------------------------------------------------------------


def _s_fornecedor(f: Fornecedor) -> dict[str, Any]:
    return {
        "id": f.id,
        "codigo": f.codigo,
        "razao_social": f.razao_social,
        "cnpj": f.cnpj,
        "pais": f.pais,
        "categoria": f.categoria,
        "disciplina_epcm": f.disciplina_epcm,
        "porte": f.porte,
        "tipo_contratacao": f.tipo_contratacao,
        "status_homologacao": f.status_homologacao,
        "data_homologacao": f.data_homologacao.isoformat() if f.data_homologacao else None,
        "validade_homologacao": f.validade_homologacao.isoformat() if f.validade_homologacao else None,
        "rating_tecnico": f.rating_tecnico,
        "rating_comercial": f.rating_comercial,
        "rating_sustentabilidade": f.rating_sustentabilidade,
        "observacoes": f.observacoes,
        "contato_nome": f.contato_nome,
        "contato_email": f.contato_email,
    }


def _ciclo_real_dias(r: RFP) -> Optional[int]:
    if r.data_et_emitida and r.data_contrato_assinado:
        return (r.data_contrato_assinado - r.data_et_emitida).days
    return None


def _s_rfp(r: RFP) -> dict[str, Any]:
    return {
        "id": r.id,
        "projeto_id": r.projeto_id,
        "wbs_node_id": r.wbs_node_id,
        "codigo": r.codigo,
        "titulo": r.titulo,
        "descricao": r.descricao,
        "categoria": r.categoria,
        "disciplina_epcm": r.disciplina_epcm,
        "data_et_emitida": r.data_et_emitida.isoformat() if r.data_et_emitida else None,
        "data_rfp_publicada": r.data_rfp_publicada.isoformat() if r.data_rfp_publicada else None,
        "data_propostas_recebidas": r.data_propostas_recebidas.isoformat() if r.data_propostas_recebidas else None,
        "data_analise_tecnica_ok": r.data_analise_tecnica_ok.isoformat() if r.data_analise_tecnica_ok else None,
        "data_negociacao_comercial_ok": r.data_negociacao_comercial_ok.isoformat() if r.data_negociacao_comercial_ok else None,
        "data_adjudicacao": r.data_adjudicacao.isoformat() if r.data_adjudicacao else None,
        "data_contrato_assinado": r.data_contrato_assinado.isoformat() if r.data_contrato_assinado else None,
        "prazo_padrao_dias": r.prazo_padrao_dias,
        "ciclo_real_dias": _ciclo_real_dias(r),
        "fornecedores_convidados": r.fornecedores_convidados,
        "propostas_recebidas": r.propostas_recebidas,
        "propostas_validas": r.propostas_validas,
        "vencedor_id": r.vencedor_id,
        "vencedor_razao": r.vencedor.razao_social if r.vencedor else None,
        "valor_estimado": r.valor_estimado,
        "valor_adjudicado": r.valor_adjudicado,
        "moeda": r.moeda,
        "status": r.status,
        "observacoes": r.observacoes,
    }


def _s_contrato(c: Contrato) -> dict[str, Any]:
    valor_total = (c.valor_original or 0) + (c.valor_aditivos or 0)
    pct_valor = (c.valor_realizado or 0) / valor_total if valor_total else 0
    return {
        "id": c.id,
        "projeto_id": c.projeto_id,
        "wbs_node_id": c.wbs_node_id,
        "rfp_id": c.rfp_id,
        "fornecedor_id": c.fornecedor_id,
        "fornecedor_razao": c.fornecedor.razao_social if c.fornecedor else None,
        "fornecedor_codigo": c.fornecedor.codigo if c.fornecedor else None,
        "codigo": c.codigo,
        "titulo": c.titulo,
        "escopo": c.escopo,
        "tipo": c.tipo,
        "modalidade": c.modalidade,
        "data_assinatura": c.data_assinatura.isoformat() if c.data_assinatura else None,
        "data_inicio": c.data_inicio.isoformat() if c.data_inicio else None,
        "data_termino_prevista": c.data_termino_prevista.isoformat() if c.data_termino_prevista else None,
        "data_termino_real": c.data_termino_real.isoformat() if c.data_termino_real else None,
        "prazo_mobilizacao_dias": c.prazo_mobilizacao_dias,
        "valor_original": c.valor_original,
        "valor_aditivos": c.valor_aditivos,
        "valor_total": valor_total,
        "valor_realizado": c.valor_realizado,
        "percentual_valor_executado": pct_valor,
        "moeda": c.moeda,
        "garantias": c.garantias,
        "status": c.status,
        "percentual_executado": c.percentual_executado,
        "qtd_aditivos": c.qtd_aditivos,
        "observacoes": c.observacoes,
    }


def _s_po(p: OrdemCompra) -> dict[str, Any]:
    return {
        "id": p.id,
        "projeto_id": p.projeto_id,
        "contrato_id": p.contrato_id,
        "wbs_node_id": p.wbs_node_id,
        "fornecedor_id": p.fornecedor_id,
        "fornecedor_razao": p.fornecedor.razao_social if p.fornecedor else None,
        "codigo": p.codigo,
        "descricao": p.descricao,
        "data_emissao": p.data_emissao.isoformat() if p.data_emissao else None,
        "data_entrega_prevista": p.data_entrega_prevista.isoformat() if p.data_entrega_prevista else None,
        "data_entrega_real": p.data_entrega_real.isoformat() if p.data_entrega_real else None,
        "quantidade": p.quantidade,
        "unidade": p.unidade,
        "valor_total": p.valor_total,
        "moeda": p.moeda,
        "status": p.status,
        "e_long_lead": p.e_long_lead,
        "observacoes": p.observacoes,
    }


def _s_marco(m: MarcoSuprimentos) -> dict[str, Any]:
    desvio: Optional[int] = None
    if m.data_planejada and m.data_real:
        desvio = (m.data_real - m.data_planejada).days
    return {
        "id": m.id,
        "projeto_id": m.projeto_id,
        "wbs_node_id": m.wbs_node_id,
        "contrato_id": m.contrato_id,
        "codigo": m.codigo,
        "titulo": m.titulo,
        "tipo": m.tipo,
        "data_planejada": m.data_planejada.isoformat() if m.data_planejada else None,
        "data_real": m.data_real.isoformat() if m.data_real else None,
        "desvio_dias": desvio,
        "status": m.status,
        "observacoes": m.observacoes,
    }


# ---------------------------------------------------------------------------
# IN schemas
# ---------------------------------------------------------------------------


class FornecedorIn(BaseModel):
    codigo: str
    razao_social: str
    cnpj: Optional[str] = None
    pais: str = "Brasil"
    categoria: str = "equipamento"
    disciplina_epcm: Optional[str] = None
    porte: str = "medio"
    tipo_contratacao: str = "direta"
    status_homologacao: str = "em_analise"
    data_homologacao: Optional[date] = None
    validade_homologacao: Optional[date] = None
    rating_tecnico: Optional[int] = None
    rating_comercial: Optional[int] = None
    rating_sustentabilidade: Optional[int] = None
    observacoes: Optional[str] = None
    contato_nome: Optional[str] = None
    contato_email: Optional[str] = None


class RFPIn(BaseModel):
    wbs_node_id: Optional[int] = None
    codigo: str
    titulo: str
    descricao: Optional[str] = None
    categoria: str = "equipamento"
    disciplina_epcm: Optional[str] = None
    data_et_emitida: Optional[date] = None
    data_rfp_publicada: Optional[date] = None
    data_propostas_recebidas: Optional[date] = None
    data_analise_tecnica_ok: Optional[date] = None
    data_negociacao_comercial_ok: Optional[date] = None
    data_adjudicacao: Optional[date] = None
    data_contrato_assinado: Optional[date] = None
    prazo_padrao_dias: int = 150
    fornecedores_convidados: int = 0
    propostas_recebidas: int = 0
    propostas_validas: int = 0
    vencedor_id: Optional[int] = None
    valor_estimado: Optional[float] = None
    valor_adjudicado: Optional[float] = None
    moeda: str = "BRL"
    status: str = "em_preparacao"
    observacoes: Optional[str] = None


class ContratoIn(BaseModel):
    wbs_node_id: Optional[int] = None
    rfp_id: Optional[int] = None
    fornecedor_id: int
    codigo: str
    titulo: str
    escopo: Optional[str] = None
    tipo: str = "preco_unitario"
    modalidade: Optional[str] = None
    data_assinatura: Optional[date] = None
    data_inicio: Optional[date] = None
    data_termino_prevista: Optional[date] = None
    data_termino_real: Optional[date] = None
    prazo_mobilizacao_dias: int = 45
    valor_original: float = 0.0
    valor_aditivos: float = 0.0
    valor_realizado: float = 0.0
    moeda: str = "BRL"
    garantias: Optional[str] = None
    status: str = "vigente"
    percentual_executado: int = 0
    qtd_aditivos: int = 0
    observacoes: Optional[str] = None


# ---------------------------------------------------------------------------
# Endpoints — Fornecedores
# ---------------------------------------------------------------------------


@router.get("/fornecedores")
def listar_fornecedores(db: Session = Depends(get_session)) -> list[dict[str, Any]]:
    rows = db.query(Fornecedor).order_by(Fornecedor.razao_social).all()
    return [_s_fornecedor(f) for f in rows]


@router.post("/fornecedores")
def criar_fornecedor(body: FornecedorIn, db: Session = Depends(get_session)) -> dict[str, Any]:
    f = Fornecedor(**body.model_dump())
    db.add(f)
    db.commit()
    db.refresh(f)
    return _s_fornecedor(f)


@router.put("/fornecedores/{frn_id}")
def atualizar_fornecedor(frn_id: int, body: FornecedorIn, db: Session = Depends(get_session)) -> dict[str, Any]:
    f = db.query(Fornecedor).filter_by(id=frn_id).first()
    if not f:
        raise HTTPException(404, "fornecedor não encontrado")
    for k, v in body.model_dump().items():
        setattr(f, k, v)
    db.commit()
    db.refresh(f)
    return _s_fornecedor(f)


# ---------------------------------------------------------------------------
# Endpoints — RFPs
# ---------------------------------------------------------------------------


@router.get("/projetos/{projeto_id}/rfps")
def listar_rfps(projeto_id: int, db: Session = Depends(get_session)) -> list[dict[str, Any]]:
    rows = (
        db.query(RFP)
        .filter_by(projeto_id=projeto_id)
        .order_by(RFP.data_et_emitida.desc().nullslast())
        .all()
    )
    return [_s_rfp(r) for r in rows]


@router.post("/projetos/{projeto_id}/rfps")
def criar_rfp(projeto_id: int, body: RFPIn, db: Session = Depends(get_session)) -> dict[str, Any]:
    if not db.query(Projeto).filter_by(id=projeto_id).first():
        raise HTTPException(404, "projeto não encontrado")
    r = RFP(projeto_id=projeto_id, **body.model_dump())
    db.add(r)
    db.commit()
    db.refresh(r)
    return _s_rfp(r)


@router.put("/rfps/{rfp_id}")
def atualizar_rfp(rfp_id: int, body: RFPIn, db: Session = Depends(get_session)) -> dict[str, Any]:
    r = db.query(RFP).filter_by(id=rfp_id).first()
    if not r:
        raise HTTPException(404, "RFP não encontrada")
    for k, v in body.model_dump().items():
        setattr(r, k, v)
    db.commit()
    db.refresh(r)
    return _s_rfp(r)


# ---------------------------------------------------------------------------
# Endpoints — Contratos
# ---------------------------------------------------------------------------


@router.get("/projetos/{projeto_id}/contratos")
def listar_contratos(projeto_id: int, db: Session = Depends(get_session)) -> list[dict[str, Any]]:
    rows = (
        db.query(Contrato)
        .filter_by(projeto_id=projeto_id)
        .order_by(Contrato.data_assinatura.desc().nullslast())
        .all()
    )
    return [_s_contrato(c) for c in rows]


@router.post("/projetos/{projeto_id}/contratos")
def criar_contrato(projeto_id: int, body: ContratoIn, db: Session = Depends(get_session)) -> dict[str, Any]:
    if not db.query(Projeto).filter_by(id=projeto_id).first():
        raise HTTPException(404, "projeto não encontrado")
    c = Contrato(projeto_id=projeto_id, **body.model_dump())
    db.add(c)
    db.commit()
    db.refresh(c)
    return _s_contrato(c)


@router.put("/contratos/{ctr_id}")
def atualizar_contrato(ctr_id: int, body: ContratoIn, db: Session = Depends(get_session)) -> dict[str, Any]:
    c = db.query(Contrato).filter_by(id=ctr_id).first()
    if not c:
        raise HTTPException(404, "contrato não encontrado")
    for k, v in body.model_dump().items():
        setattr(c, k, v)
    db.commit()
    db.refresh(c)
    return _s_contrato(c)


# ---------------------------------------------------------------------------
# Endpoints — POs e Marcos
# ---------------------------------------------------------------------------


@router.get("/projetos/{projeto_id}/pos")
def listar_pos(projeto_id: int, db: Session = Depends(get_session)) -> list[dict[str, Any]]:
    rows = (
        db.query(OrdemCompra)
        .filter_by(projeto_id=projeto_id)
        .order_by(OrdemCompra.data_emissao.desc())
        .all()
    )
    return [_s_po(p) for p in rows]


@router.get("/projetos/{projeto_id}/marcos")
def listar_marcos(projeto_id: int, db: Session = Depends(get_session)) -> list[dict[str, Any]]:
    rows = (
        db.query(MarcoSuprimentos)
        .filter_by(projeto_id=projeto_id)
        .order_by(MarcoSuprimentos.data_planejada.nullslast())
        .all()
    )
    return [_s_marco(m) for m in rows]


# ---------------------------------------------------------------------------
# Dashboard agregado
# ---------------------------------------------------------------------------


@router.get("/projetos/{projeto_id}/dashboard")
def dashboard(projeto_id: int, db: Session = Depends(get_session)) -> dict[str, Any]:
    if not db.query(Projeto).filter_by(id=projeto_id).first():
        raise HTTPException(404, "projeto não encontrado")

    fornecedores = db.query(Fornecedor).all()
    rfps = db.query(RFP).filter_by(projeto_id=projeto_id).all()
    contratos = db.query(Contrato).filter_by(projeto_id=projeto_id).all()
    pos = db.query(OrdemCompra).filter_by(projeto_id=projeto_id).all()
    marcos = db.query(MarcoSuprimentos).filter_by(projeto_id=projeto_id).all()

    # Ciclo médio real x padrão (apenas RFPs com contrato assinado)
    ciclos_reais = [_ciclo_real_dias(r) for r in rfps if _ciclo_real_dias(r) is not None]
    ciclo_medio = sum(ciclos_reais) / len(ciclos_reais) if ciclos_reais else None
    dentro_prazo = sum(
        1
        for r in rfps
        if (cr := _ciclo_real_dias(r)) is not None and cr <= r.prazo_padrao_dias
    )
    aderencia_prazo_rfp = dentro_prazo / len(ciclos_reais) if ciclos_reais else None

    # Contratos financeiro
    valor_contratado = sum((c.valor_original or 0) + (c.valor_aditivos or 0) for c in contratos)
    valor_realizado_ctr = sum((c.valor_realizado or 0) for c in contratos)
    total_aditivos = sum((c.valor_aditivos or 0) for c in contratos)
    pct_aditivos = total_aditivos / sum((c.valor_original or 0) for c in contratos) if contratos else 0

    # POs long-lead
    pos_long_lead = [p for p in pos if p.e_long_lead]
    valor_long_lead = sum((p.valor_total or 0) for p in pos_long_lead)

    # Homologação
    hom_dist: dict[str, int] = {}
    for f in fornecedores:
        hom_dist[f.status_homologacao] = hom_dist.get(f.status_homologacao, 0) + 1

    # Marcos status
    marcos_status: dict[str, int] = {}
    for m in marcos:
        marcos_status[m.status] = marcos_status.get(m.status, 0) + 1
    em_risco = sum(1 for m in marcos if m.status == "em_risco")
    atrasados = sum(1 for m in marcos if m.status == "atrasado")

    # RFPs status distribuição
    rfp_status: dict[str, int] = {}
    for r in rfps:
        rfp_status[r.status] = rfp_status.get(r.status, 0) + 1

    # Contratos por disciplina EPCM
    ctr_disc: dict[str, int] = {}
    for c in contratos:
        if c.fornecedor and c.fornecedor.disciplina_epcm:
            d = c.fornecedor.disciplina_epcm
            ctr_disc[d] = ctr_disc.get(d, 0) + 1

    return {
        "projeto_id": projeto_id,
        "kpis": {
            "fornecedores_total": len(fornecedores),
            "fornecedores_homologados": sum(
                1 for f in fornecedores if f.status_homologacao == "homologado"
            ),
            "rfps_total": len(rfps),
            "rfps_contratadas": sum(1 for r in rfps if r.status == "contratada"),
            "rfps_em_andamento": sum(
                1
                for r in rfps
                if r.status in ("publicada", "analise_tecnica", "negociacao", "adjudicada")
            ),
            "ciclo_padrao_dias": 150,
            "ciclo_medio_real_dias": ciclo_medio,
            "aderencia_prazo_rfp": aderencia_prazo_rfp,
            "contratos_total": len(contratos),
            "contratos_em_execucao": sum(1 for c in contratos if c.status == "em_execucao"),
            "valor_contratado_total": valor_contratado,
            "valor_realizado_contratos": valor_realizado_ctr,
            "valor_aditivos_total": total_aditivos,
            "pct_aditivos_sobre_original": pct_aditivos,
            "pos_total": len(pos),
            "pos_long_lead": len(pos_long_lead),
            "valor_long_lead": valor_long_lead,
            "marcos_em_risco": em_risco,
            "marcos_atrasados": atrasados,
        },
        "distribuicao_homologacao": hom_dist,
        "distribuicao_status_rfp": rfp_status,
        "distribuicao_status_marcos": marcos_status,
        "contratos_por_disciplina_epcm": ctr_disc,
    }
