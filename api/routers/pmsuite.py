"""Endpoints Summo PM Suite — M1 Governance/Charter + M2 Scope/WBS.

Prefixo: /api/pmsuite
PMBoK §4 (Integração) + §5 (Escopo) + ISO 21502.
"""

from __future__ import annotations

from datetime import date
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from licenciaminer.riscos.database import get_session
from licenciaminer.riscos.models import Acao, Projeto, Risco
from licenciaminer.riscos.models_pmsuite import (
    ChangeRequest,
    CostCategory,
    DecisionLog,
    Deliverable,
    DependenciaWBS,
    EarnedValueSnapshot,
    ProjectBaseline,
    ProjectCharter,
    WBSNode,
)
from licenciaminer.riscos.services.cpm import calcular_cpm as calcular_cpm_service

router = APIRouter(prefix="/pmsuite", tags=["PM Suite"])


# ---------------------------------------------------------------------------
# Charter
# ---------------------------------------------------------------------------


def _serialize_charter(c: ProjectCharter) -> dict[str, Any]:
    return {
        "id": c.id,
        "projeto_id": c.projeto_id,
        "justificativa": c.justificativa,
        "business_case": c.business_case,
        "objetivo_smart": c.objetivo_smart,
        "beneficios_esperados": c.beneficios_esperados,
        "escopo_incluido": c.escopo_incluido,
        "escopo_excluido": c.escopo_excluido,
        "entregaveis_principais": c.entregaveis_principais,
        "premissas": c.premissas,
        "restricoes": c.restricoes,
        "criterios_sucesso": c.criterios_sucesso,
        "criterios_aceitacao": c.criterios_aceitacao,
        "orcamento_total": c.orcamento_total,
        "orcamento_contingencia": c.orcamento_contingencia,
        "moeda": c.moeda,
        "data_aprovacao": c.data_aprovacao.isoformat() if c.data_aprovacao else None,
        "data_inicio_prevista": c.data_inicio_prevista.isoformat() if c.data_inicio_prevista else None,
        "data_termino_prevista": c.data_termino_prevista.isoformat() if c.data_termino_prevista else None,
        "sponsor_id": c.sponsor_id,
        "sponsor_nome": c.sponsor.nome if c.sponsor else None,
        "gerente_projeto_id": c.gerente_projeto_id,
        "gerente_projeto_nome": c.gerente.nome if c.gerente else None,
        "aprovador_id": c.aprovador_id,
        "aprovador_nome": c.aprovador.nome if c.aprovador else None,
        "comite_steering": c.comite_steering,
        "versao": c.versao,
        "status": c.status,
    }


class CharterIn(BaseModel):
    justificativa: Optional[str] = None
    business_case: Optional[str] = None
    objetivo_smart: Optional[str] = None
    beneficios_esperados: Optional[str] = None
    escopo_incluido: Optional[str] = None
    escopo_excluido: Optional[str] = None
    entregaveis_principais: Optional[str] = None
    premissas: Optional[str] = None
    restricoes: Optional[str] = None
    criterios_sucesso: Optional[str] = None
    criterios_aceitacao: Optional[str] = None
    orcamento_total: Optional[float] = None
    orcamento_contingencia: Optional[float] = None
    moeda: Optional[str] = "BRL"
    data_aprovacao: Optional[date] = None
    data_inicio_prevista: Optional[date] = None
    data_termino_prevista: Optional[date] = None
    sponsor_id: Optional[int] = None
    gerente_projeto_id: Optional[int] = None
    aprovador_id: Optional[int] = None
    comite_steering: Optional[str] = None
    versao: Optional[int] = None
    status: Optional[str] = None


@router.get("/projetos/{projeto_id}/charter")
def get_charter(projeto_id: int, db: Session = Depends(get_session)) -> dict[str, Any]:
    c = db.query(ProjectCharter).filter_by(projeto_id=projeto_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Charter não encontrado")
    return _serialize_charter(c)


@router.put("/projetos/{projeto_id}/charter")
def update_charter(
    projeto_id: int, payload: CharterIn, db: Session = Depends(get_session)
) -> dict[str, Any]:
    c = db.query(ProjectCharter).filter_by(projeto_id=projeto_id).first()
    if not c:
        if not db.get(Projeto, projeto_id):
            raise HTTPException(status_code=404, detail="Projeto não encontrado")
        c = ProjectCharter(projeto_id=projeto_id)
        db.add(c)
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(c, k, v)
    db.commit()
    db.refresh(c)
    return _serialize_charter(c)


# ---------------------------------------------------------------------------
# Baselines
# ---------------------------------------------------------------------------


@router.get("/projetos/{projeto_id}/baselines")
def list_baselines(projeto_id: int, db: Session = Depends(get_session)) -> list[dict[str, Any]]:
    baselines = (
        db.query(ProjectBaseline)
        .filter_by(projeto_id=projeto_id)
        .order_by(ProjectBaseline.data_aprovacao.desc())
        .all()
    )
    return [
        {
            "id": b.id,
            "versao": b.versao,
            "nome": b.nome,
            "descricao": b.descricao,
            "data_aprovacao": b.data_aprovacao.isoformat(),
            "orcamento": b.orcamento,
            "data_inicio": b.data_inicio.isoformat() if b.data_inicio else None,
            "data_termino": b.data_termino.isoformat() if b.data_termino else None,
            "ativa": b.ativa,
            "aprovador_nome": b.aprovador.nome if b.aprovador else None,
            "motivo": b.motivo,
        }
        for b in baselines
    ]


# ---------------------------------------------------------------------------
# Change Requests
# ---------------------------------------------------------------------------


class ChangeRequestIn(BaseModel):
    codigo: str
    titulo: str
    descricao: Optional[str] = None
    justificativa: Optional[str] = None
    categoria: str
    origem: Optional[str] = None
    impacto_escopo: Optional[str] = None
    impacto_cronograma_dias: Optional[int] = None
    impacto_custo: Optional[float] = None
    impacto_qualidade: Optional[str] = None
    impacto_risco: Optional[str] = None
    status: str = "aberta"
    prioridade: str = "media"
    solicitante_id: Optional[int] = None
    aprovador_id: Optional[int] = None
    data_abertura: date
    data_decisao: Optional[date] = None
    decisao: Optional[str] = None
    observacoes: Optional[str] = None


def _serialize_cr(cr: ChangeRequest) -> dict[str, Any]:
    return {
        "id": cr.id,
        "projeto_id": cr.projeto_id,
        "codigo": cr.codigo,
        "titulo": cr.titulo,
        "descricao": cr.descricao,
        "justificativa": cr.justificativa,
        "categoria": cr.categoria,
        "origem": cr.origem,
        "impacto_escopo": cr.impacto_escopo,
        "impacto_cronograma_dias": cr.impacto_cronograma_dias,
        "impacto_custo": cr.impacto_custo,
        "impacto_qualidade": cr.impacto_qualidade,
        "impacto_risco": cr.impacto_risco,
        "status": cr.status,
        "prioridade": cr.prioridade,
        "solicitante_id": cr.solicitante_id,
        "solicitante_nome": cr.solicitante.nome if cr.solicitante else None,
        "aprovador_id": cr.aprovador_id,
        "aprovador_nome": cr.aprovador.nome if cr.aprovador else None,
        "data_abertura": cr.data_abertura.isoformat(),
        "data_decisao": cr.data_decisao.isoformat() if cr.data_decisao else None,
        "data_implementacao": cr.data_implementacao.isoformat() if cr.data_implementacao else None,
        "decisao": cr.decisao,
        "observacoes": cr.observacoes,
    }


@router.get("/projetos/{projeto_id}/change-requests")
def list_crs(
    projeto_id: int,
    status: Optional[str] = None,
    db: Session = Depends(get_session),
) -> list[dict[str, Any]]:
    q = db.query(ChangeRequest).filter_by(projeto_id=projeto_id)
    if status:
        q = q.filter(ChangeRequest.status == status)
    return [_serialize_cr(cr) for cr in q.order_by(ChangeRequest.data_abertura.desc()).all()]


@router.post("/projetos/{projeto_id}/change-requests", status_code=201)
def create_cr(
    projeto_id: int, payload: ChangeRequestIn, db: Session = Depends(get_session)
) -> dict[str, Any]:
    if not db.get(Projeto, projeto_id):
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    cr = ChangeRequest(projeto_id=projeto_id, **payload.model_dump())
    db.add(cr)
    db.commit()
    db.refresh(cr)
    return _serialize_cr(cr)


@router.put("/change-requests/{cr_id}")
def update_cr(
    cr_id: int, payload: ChangeRequestIn, db: Session = Depends(get_session)
) -> dict[str, Any]:
    cr = db.get(ChangeRequest, cr_id)
    if not cr:
        raise HTTPException(status_code=404, detail="CR não encontrada")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(cr, k, v)
    db.commit()
    db.refresh(cr)
    return _serialize_cr(cr)


# ---------------------------------------------------------------------------
# Decisions
# ---------------------------------------------------------------------------


class DecisionIn(BaseModel):
    codigo: Optional[str] = None
    titulo: str
    contexto: Optional[str] = None
    alternativas_consideradas: Optional[str] = None
    decisao: str
    rationale: Optional[str] = None
    impactos: Optional[str] = None
    decisor_id: Optional[int] = None
    data_decisao: date
    forum: Optional[str] = None
    stakeholders_envolvidos: Optional[str] = None


@router.get("/projetos/{projeto_id}/decisoes")
def list_decisoes(projeto_id: int, db: Session = Depends(get_session)) -> list[dict[str, Any]]:
    decs = (
        db.query(DecisionLog)
        .filter_by(projeto_id=projeto_id)
        .order_by(DecisionLog.data_decisao.desc())
        .all()
    )
    return [
        {
            "id": d.id,
            "codigo": d.codigo,
            "titulo": d.titulo,
            "contexto": d.contexto,
            "alternativas_consideradas": d.alternativas_consideradas,
            "decisao": d.decisao,
            "rationale": d.rationale,
            "impactos": d.impactos,
            "decisor_id": d.decisor_id,
            "decisor_nome": d.decisor.nome if d.decisor else None,
            "data_decisao": d.data_decisao.isoformat(),
            "forum": d.forum,
            "stakeholders_envolvidos": d.stakeholders_envolvidos,
        }
        for d in decs
    ]


@router.post("/projetos/{projeto_id}/decisoes", status_code=201)
def create_decisao(
    projeto_id: int, payload: DecisionIn, db: Session = Depends(get_session)
) -> dict[str, Any]:
    if not db.get(Projeto, projeto_id):
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    d = DecisionLog(projeto_id=projeto_id, **payload.model_dump())
    db.add(d)
    db.commit()
    db.refresh(d)
    return {"id": d.id}


# ---------------------------------------------------------------------------
# WBS
# ---------------------------------------------------------------------------


def _serialize_wbs(n: WBSNode, include_children: bool = False) -> dict[str, Any]:
    data: dict[str, Any] = {
        "id": n.id,
        "projeto_id": n.projeto_id,
        "parent_id": n.parent_id,
        "codigo_wbs": n.codigo_wbs,
        "nome": n.nome,
        "descricao": n.descricao,
        "nivel": n.nivel,
        "tipo": n.tipo,
        "responsavel_id": n.responsavel_id,
        "responsavel_nome": n.responsavel.nome if n.responsavel else None,
        "orcamento_estimado": n.orcamento_estimado,
        "duracao_dias_estimada": n.duracao_dias_estimada,
        "data_inicio_planejada": n.data_inicio_planejada.isoformat() if n.data_inicio_planejada else None,
        "data_termino_planejada": n.data_termino_planejada.isoformat() if n.data_termino_planejada else None,
        "is_critico": n.is_critico,
        "is_long_lead": n.is_long_lead,
        "is_marco": n.is_marco,
        "is_terceirizado": n.is_terceirizado,
        "disciplina_epcm": n.disciplina_epcm,
        "executor": n.executor,
        "is_servico_contratado": n.is_servico_contratado,
        "ciclo_suprimentos_dias": n.ciclo_suprimentos_dias,
        "ciclo_mobilizacao_dias": n.ciclo_mobilizacao_dias,
        "percentual_concluido": n.percentual_concluido,
        "status": n.status,
        "ordem": n.ordem,
    }
    if include_children:
        data["children"] = [
            _serialize_wbs(c, include_children=True)
            for c in sorted(n.children, key=lambda x: x.codigo_wbs)
        ]
    return data


@router.get("/projetos/{projeto_id}/wbs")
def get_wbs_tree(projeto_id: int, db: Session = Depends(get_session)) -> list[dict[str, Any]]:
    """Retorna árvore hierárquica da WBS."""
    raizes = (
        db.query(WBSNode)
        .filter(WBSNode.projeto_id == projeto_id, WBSNode.parent_id.is_(None))
        .order_by(WBSNode.codigo_wbs)
        .all()
    )
    return [_serialize_wbs(n, include_children=True) for n in raizes]


@router.get("/projetos/{projeto_id}/wbs/flat")
def get_wbs_flat(
    projeto_id: int,
    apenas_servicos_contratados: bool = False,
    apenas_criticos: bool = False,
    db: Session = Depends(get_session),
) -> list[dict[str, Any]]:
    """Lista plana da WBS com filtros opcionais."""
    q = db.query(WBSNode).filter_by(projeto_id=projeto_id)
    if apenas_servicos_contratados:
        q = q.filter(WBSNode.is_servico_contratado == True)
    if apenas_criticos:
        q = q.filter(WBSNode.is_critico == True)
    nodes = q.order_by(WBSNode.codigo_wbs).all()
    return [_serialize_wbs(n) for n in nodes]


@router.get("/projetos/{projeto_id}/wbs/matriz-riscos")
def wbs_matriz_riscos(projeto_id: int, db: Session = Depends(get_session)) -> list[dict[str, Any]]:
    """Para cada nó WBS, quantos riscos + quantas ações estão vinculados."""
    nodes = (
        db.query(WBSNode).filter_by(projeto_id=projeto_id).order_by(WBSNode.codigo_wbs).all()
    )
    riscos = db.query(Risco).filter_by(projeto_id=projeto_id).all()
    out = []
    for n in nodes:
        riscos_no = [r for r in riscos if r.wbs_node_id == n.id]
        por_cls: dict[str, int] = {}
        for r in riscos_no:
            c = r.classificacao_residual or "(na)"
            por_cls[c] = por_cls.get(c, 0) + 1
        out.append(
            {
                "id": n.id,
                "codigo_wbs": n.codigo_wbs,
                "nome": n.nome,
                "nivel": n.nivel,
                "tipo": n.tipo,
                "is_critico": n.is_critico,
                "is_servico_contratado": n.is_servico_contratado,
                "executor": n.executor,
                "n_riscos": len(riscos_no),
                "riscos_por_classificacao": por_cls,
                "riscos": [
                    {
                        "id": r.id,
                        "codigo": r.codigo,
                        "nome": r.nome[:80],
                        "classificacao_residual": r.classificacao_residual,
                    }
                    for r in riscos_no
                ],
            }
        )
    return out


class WBSNodeIn(BaseModel):
    parent_id: Optional[int] = None
    codigo_wbs: str
    nome: str
    descricao: Optional[str] = None
    nivel: int = 1
    tipo: str = "work_package"
    responsavel_id: Optional[int] = None
    orcamento_estimado: Optional[float] = None
    duracao_dias_estimada: Optional[int] = None
    data_inicio_planejada: Optional[date] = None
    data_termino_planejada: Optional[date] = None
    is_critico: bool = False
    is_long_lead: bool = False
    is_marco: bool = False
    is_terceirizado: bool = False
    disciplina_epcm: Optional[str] = None
    executor: Optional[str] = None
    is_servico_contratado: bool = False
    ciclo_suprimentos_dias: Optional[int] = None
    ciclo_mobilizacao_dias: Optional[int] = None


@router.post("/projetos/{projeto_id}/wbs", status_code=201)
def create_wbs_node(
    projeto_id: int, payload: WBSNodeIn, db: Session = Depends(get_session)
) -> dict[str, Any]:
    n = WBSNode(projeto_id=projeto_id, **payload.model_dump())
    db.add(n)
    db.commit()
    db.refresh(n)
    return _serialize_wbs(n)


@router.put("/wbs/{node_id}")
def update_wbs_node(
    node_id: int, payload: WBSNodeIn, db: Session = Depends(get_session)
) -> dict[str, Any]:
    n = db.get(WBSNode, node_id)
    if not n:
        raise HTTPException(status_code=404, detail="WBS node não encontrado")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(n, k, v)
    db.commit()
    db.refresh(n)
    return _serialize_wbs(n)


@router.delete("/wbs/{node_id}", status_code=204)
def delete_wbs_node(node_id: int, db: Session = Depends(get_session)) -> None:
    n = db.get(WBSNode, node_id)
    if not n:
        raise HTTPException(status_code=404, detail="WBS node não encontrado")
    db.delete(n)
    db.commit()


# ---------------------------------------------------------------------------
# M3 — Cronograma (CPM)
# ---------------------------------------------------------------------------


@router.post("/projetos/{projeto_id}/cronograma/calcular")
def recalcular_cpm(projeto_id: int, db: Session = Depends(get_session)) -> dict[str, Any]:
    """Roda o algoritmo CPM (forward/backward pass) sobre a WBS."""
    if not db.get(Projeto, projeto_id):
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    return calcular_cpm_service(db, projeto_id)


@router.get("/projetos/{projeto_id}/cronograma")
def get_cronograma(projeto_id: int, db: Session = Depends(get_session)) -> dict[str, Any]:
    """Retorna cronograma calculado (nós com datas + dependências)."""
    nodes = (
        db.query(WBSNode)
        .filter_by(projeto_id=projeto_id)
        .order_by(WBSNode.codigo_wbs)
        .all()
    )
    if not nodes:
        return {"nodes": [], "dependencias": [], "data_inicio": None, "data_termino": None}

    deps = (
        db.query(DependenciaWBS)
        .filter(
            DependenciaWBS.predecessor_id.in_([n.id for n in nodes]),
            DependenciaWBS.sucessor_id.in_([n.id for n in nodes]),
        )
        .all()
    )

    inicios = [n.inicio_cedo for n in nodes if n.inicio_cedo]
    terminos = [n.termino_cedo for n in nodes if n.termino_cedo]

    return {
        "data_inicio": min(inicios).isoformat() if inicios else None,
        "data_termino": max(terminos).isoformat() if terminos else None,
        "nodes": [
            {
                "id": n.id,
                "codigo_wbs": n.codigo_wbs,
                "nome": n.nome,
                "nivel": n.nivel,
                "tipo": n.tipo,
                "is_marco": n.is_marco,
                "is_critico": n.is_critico,
                "is_long_lead": n.is_long_lead,
                "is_terceirizado": n.is_terceirizado,
                "disciplina_epcm": n.disciplina_epcm,
                "executor": n.executor,
                "duracao_dias": n.duracao_dias_estimada,
                "inicio_cedo": n.inicio_cedo.isoformat() if n.inicio_cedo else None,
                "termino_cedo": n.termino_cedo.isoformat() if n.termino_cedo else None,
                "inicio_tarde": n.inicio_tarde.isoformat() if n.inicio_tarde else None,
                "termino_tarde": n.termino_tarde.isoformat() if n.termino_tarde else None,
                "folga_total_dias": n.folga_total_dias,
                "caminho_critico": n.caminho_critico,
                "percentual_concluido": n.percentual_concluido,
            }
            for n in nodes
        ],
        "dependencias": [
            {
                "id": d.id,
                "predecessor_id": d.predecessor_id,
                "sucessor_id": d.sucessor_id,
                "tipo": d.tipo,
                "lag_dias": d.lag_dias,
            }
            for d in deps
        ],
    }


# ---------------------------------------------------------------------------
# M4 — Cost & EVM
# ---------------------------------------------------------------------------


@router.get("/projetos/{projeto_id}/custos/categorias")
def list_cost_categories(projeto_id: int, db: Session = Depends(get_session)) -> list[dict[str, Any]]:
    cats = (
        db.query(CostCategory)
        .filter_by(projeto_id=projeto_id)
        .order_by(CostCategory.ordem)
        .all()
    )
    return [
        {
            "id": c.id,
            "codigo": c.codigo,
            "nome": c.nome,
            "tipo": c.tipo,
            "cor": c.cor,
            "ordem": c.ordem,
            "orcamento_planejado": c.orcamento_planejado,
            "orcamento_comprometido": c.orcamento_comprometido,
            "valor_realizado": c.valor_realizado,
            "pct_comprometido": (
                round((c.orcamento_comprometido / c.orcamento_planejado) * 100, 1)
                if c.orcamento_planejado
                else 0
            ),
            "pct_realizado": (
                round((c.valor_realizado / c.orcamento_planejado) * 100, 1)
                if c.orcamento_planejado
                else 0
            ),
        }
        for c in cats
    ]


@router.get("/projetos/{projeto_id}/custos/evm")
def list_evm_snapshots(projeto_id: int, db: Session = Depends(get_session)) -> list[dict[str, Any]]:
    snaps = (
        db.query(EarnedValueSnapshot)
        .filter_by(projeto_id=projeto_id)
        .order_by(EarnedValueSnapshot.data_snapshot)
        .all()
    )
    return [
        {
            "id": s.id,
            "data_snapshot": s.data_snapshot.isoformat(),
            "periodo": s.periodo,
            "bac": s.bac,
            "pv": s.pv,
            "ev": s.ev,
            "ac": s.ac,
            "sv": s.sv,
            "cv": s.cv,
            "spi": round(s.spi, 3) if s.spi else None,
            "cpi": round(s.cpi, 3) if s.cpi else None,
            "eac": s.eac,
            "etc": s.etc,
            "vac": s.vac,
            "observacoes": s.observacoes,
        }
        for s in snaps
    ]


@router.put("/riscos/{risco_id}/wbs/{wbs_node_id}")
def vincular_risco_wbs(
    risco_id: int, wbs_node_id: int, db: Session = Depends(get_session)
) -> dict[str, Any]:
    r = db.get(Risco, risco_id)
    if not r:
        raise HTTPException(status_code=404, detail="Risco não encontrado")
    r.wbs_node_id = wbs_node_id
    db.commit()
    return {"ok": True}


# ---------------------------------------------------------------------------
# Dashboard resumido do projeto
# ---------------------------------------------------------------------------


@router.get("/projetos/{projeto_id}/resumo")
def resumo_projeto(projeto_id: int, db: Session = Depends(get_session)) -> dict[str, Any]:
    p = db.get(Projeto, projeto_id)
    if not p:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")

    charter = db.query(ProjectCharter).filter_by(projeto_id=projeto_id).first()
    wbs_nodes = db.query(WBSNode).filter_by(projeto_id=projeto_id).all()
    riscos = db.query(Risco).filter_by(projeto_id=projeto_id).all()
    acoes = (
        db.query(Acao).filter(Acao.risco_id.in_([r.id for r in riscos])).all()
        if riscos
        else []
    )
    crs = db.query(ChangeRequest).filter_by(projeto_id=projeto_id).all()
    decisoes = db.query(DecisionLog).filter_by(projeto_id=projeto_id).all()

    servicos_contratados = [n for n in wbs_nodes if n.is_servico_contratado]
    long_leads = [n for n in wbs_nodes if n.is_long_lead]
    criticos = [n for n in wbs_nodes if n.is_critico and not n.is_marco]
    marcos = [n for n in wbs_nodes if n.is_marco]

    por_disciplina: dict[str, int] = {}
    for n in wbs_nodes:
        if n.disciplina_epcm:
            por_disciplina[n.disciplina_epcm] = por_disciplina.get(n.disciplina_epcm, 0) + 1
    por_executor: dict[str, int] = {}
    for n in wbs_nodes:
        if n.executor:
            por_executor[n.executor] = por_executor.get(n.executor, 0) + 1

    return {
        "projeto": {
            "id": p.id,
            "codigo": p.codigo,
            "nome": p.nome,
            "descricao": p.descricao,
            "status": p.status,
            "data_inicio": p.data_inicio.isoformat() if p.data_inicio else None,
            "data_fim": p.data_fim.isoformat() if p.data_fim else None,
            "owner_nome": p.owner.nome if p.owner else None,
            "orcamento": p.orcamento,
        },
        "charter_existe": charter is not None,
        "charter_status": charter.status if charter else None,
        "wbs_total_nodes": len(wbs_nodes),
        "wbs_marcos": len(marcos),
        "wbs_criticos": len(criticos),
        "wbs_long_leads": len(long_leads),
        "wbs_servicos_contratados": len(servicos_contratados),
        "por_disciplina_epcm": por_disciplina,
        "por_executor": por_executor,
        "total_riscos": len(riscos),
        "riscos_com_wbs": sum(1 for r in riscos if r.wbs_node_id),
        "total_crs": len(crs),
        "crs_abertas": sum(1 for cr in crs if cr.status in ("aberta", "em_analise")),
        "total_decisoes": len(decisoes),
        "proximos_marcos": [
            {
                "codigo": n.codigo_wbs,
                "nome": n.nome,
                "data": n.data_termino_planejada.isoformat() if n.data_termino_planejada else None,
                "is_terceirizado": n.is_terceirizado,
            }
            for n in sorted(
                [m for m in marcos if m.data_termino_planejada],
                key=lambda x: x.data_termino_planejada,
            )[:8]
        ],
    }
