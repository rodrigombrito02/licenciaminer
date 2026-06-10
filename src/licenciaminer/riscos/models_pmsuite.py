"""Modelos do Summo PM Suite — ampliação para gestão de projetos (PMBoK + ISO 21502).

Módulos cobertos aqui:
- M1 Governance & Charter: ProjectCharter, ProjectBaseline, ChangeRequest, DecisionLog
- M2 Scope: WBSNode (hierarquia), Deliverable

Integração: riscos e ações ganham campo wbs_node_id (em models.py); Projeto já existente
vira hub do qual tudo se pendura.
"""

from __future__ import annotations

from datetime import date, datetime
from typing import Optional

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from licenciaminer.riscos.models import Base, Pessoa, Projeto


# ---------------------------------------------------------------------------
# M1 — Governance & Charter
# ---------------------------------------------------------------------------


class ProjectCharter(Base):
    """Termo de Abertura do Projeto (PMBoK §4.1 / ISO 21502 §4.3.1)."""

    __tablename__ = "project_charter"

    id: Mapped[int] = mapped_column(primary_key=True)
    projeto_id: Mapped[int] = mapped_column(ForeignKey("projeto.id"), unique=True)

    # Contexto e justificativa
    justificativa: Mapped[Optional[str]] = mapped_column(Text)
    business_case: Mapped[Optional[str]] = mapped_column(Text)
    objetivo_smart: Mapped[Optional[str]] = mapped_column(Text)
    beneficios_esperados: Mapped[Optional[str]] = mapped_column(Text)

    # Escopo de alto nível
    escopo_incluido: Mapped[Optional[str]] = mapped_column(Text)
    escopo_excluido: Mapped[Optional[str]] = mapped_column(Text)
    entregaveis_principais: Mapped[Optional[str]] = mapped_column(Text)

    # Premissas, restrições, critérios
    premissas: Mapped[Optional[str]] = mapped_column(Text)
    restricoes: Mapped[Optional[str]] = mapped_column(Text)
    criterios_sucesso: Mapped[Optional[str]] = mapped_column(Text)
    criterios_aceitacao: Mapped[Optional[str]] = mapped_column(Text)

    # Resumo financeiro
    orcamento_total: Mapped[Optional[float]] = mapped_column(Float)
    orcamento_contingencia: Mapped[Optional[float]] = mapped_column(Float)
    moeda: Mapped[str] = mapped_column(String(10), default="BRL")

    # Cronograma resumido
    data_aprovacao: Mapped[Optional[date]] = mapped_column(Date)
    data_inicio_prevista: Mapped[Optional[date]] = mapped_column(Date)
    data_termino_prevista: Mapped[Optional[date]] = mapped_column(Date)

    # Governança
    sponsor_id: Mapped[Optional[int]] = mapped_column(ForeignKey("pessoa.id"))
    gerente_projeto_id: Mapped[Optional[int]] = mapped_column(ForeignKey("pessoa.id"))
    aprovador_id: Mapped[Optional[int]] = mapped_column(ForeignKey("pessoa.id"))
    comite_steering: Mapped[Optional[str]] = mapped_column(Text)

    # Versão e status
    versao: Mapped[int] = mapped_column(Integer, default=1)
    status: Mapped[str] = mapped_column(String(40), default="rascunho")
    # rascunho | em_aprovacao | aprovado | revisao | arquivado

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    projeto: Mapped[Projeto] = relationship()
    sponsor: Mapped[Optional[Pessoa]] = relationship(foreign_keys=[sponsor_id])
    gerente: Mapped[Optional[Pessoa]] = relationship(foreign_keys=[gerente_projeto_id])
    aprovador: Mapped[Optional[Pessoa]] = relationship(foreign_keys=[aprovador_id])


class ProjectBaseline(Base):
    """Linha de base aprovada (escopo+cronograma+custo) — referência para medir variação."""

    __tablename__ = "project_baseline"

    id: Mapped[int] = mapped_column(primary_key=True)
    projeto_id: Mapped[int] = mapped_column(ForeignKey("projeto.id"))
    versao: Mapped[int] = mapped_column(Integer, default=1)
    nome: Mapped[str] = mapped_column(String(200))
    descricao: Mapped[Optional[str]] = mapped_column(Text)
    data_aprovacao: Mapped[date] = mapped_column(Date)

    escopo_snapshot: Mapped[Optional[str]] = mapped_column(Text)  # JSON ou descrição
    orcamento: Mapped[Optional[float]] = mapped_column(Float)
    data_inicio: Mapped[Optional[date]] = mapped_column(Date)
    data_termino: Mapped[Optional[date]] = mapped_column(Date)

    ativa: Mapped[bool] = mapped_column(Boolean, default=False)
    aprovador_id: Mapped[Optional[int]] = mapped_column(ForeignKey("pessoa.id"))
    motivo: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    projeto: Mapped[Projeto] = relationship()
    aprovador: Mapped[Optional[Pessoa]] = relationship()


class ChangeRequest(Base):
    """Change Request formal (PMBoK §4.6 Controle Integrado de Mudanças)."""

    __tablename__ = "change_request"

    id: Mapped[int] = mapped_column(primary_key=True)
    projeto_id: Mapped[int] = mapped_column(ForeignKey("projeto.id"))
    codigo: Mapped[str] = mapped_column(String(40))
    titulo: Mapped[str] = mapped_column(String(300))
    descricao: Mapped[Optional[str]] = mapped_column(Text)
    justificativa: Mapped[Optional[str]] = mapped_column(Text)

    # Tipo e origem
    categoria: Mapped[str] = mapped_column(String(40))
    # escopo | cronograma | custo | qualidade | risco | externo | regulatorio
    origem: Mapped[Optional[str]] = mapped_column(String(40))
    # cliente | regulador | contratado | time_interno | sponsor | risco_materializado

    # Análise de impacto (PMBoK recomenda avaliar todas as dimensões)
    impacto_escopo: Mapped[Optional[str]] = mapped_column(Text)
    impacto_cronograma_dias: Mapped[Optional[int]] = mapped_column(Integer)
    impacto_custo: Mapped[Optional[float]] = mapped_column(Float)
    impacto_qualidade: Mapped[Optional[str]] = mapped_column(Text)
    impacto_risco: Mapped[Optional[str]] = mapped_column(Text)

    # Workflow
    status: Mapped[str] = mapped_column(String(40), default="aberta")
    # aberta | em_analise | aprovada | rejeitada | implementada | cancelada
    prioridade: Mapped[str] = mapped_column(String(20), default="media")
    # baixa | media | alta | critica

    solicitante_id: Mapped[Optional[int]] = mapped_column(ForeignKey("pessoa.id"))
    aprovador_id: Mapped[Optional[int]] = mapped_column(ForeignKey("pessoa.id"))
    data_abertura: Mapped[date] = mapped_column(Date)
    data_decisao: Mapped[Optional[date]] = mapped_column(Date)
    data_implementacao: Mapped[Optional[date]] = mapped_column(Date)

    decisao: Mapped[Optional[str]] = mapped_column(Text)
    observacoes: Mapped[Optional[str]] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    projeto: Mapped[Projeto] = relationship()
    solicitante: Mapped[Optional[Pessoa]] = relationship(foreign_keys=[solicitante_id])
    aprovador: Mapped[Optional[Pessoa]] = relationship(foreign_keys=[aprovador_id])


class DecisionLog(Base):
    """Registro de decisões importantes do projeto (ISO 21502 §4.3.5)."""

    __tablename__ = "decision_log"

    id: Mapped[int] = mapped_column(primary_key=True)
    projeto_id: Mapped[int] = mapped_column(ForeignKey("projeto.id"))
    codigo: Mapped[Optional[str]] = mapped_column(String(40))
    titulo: Mapped[str] = mapped_column(String(300))
    contexto: Mapped[Optional[str]] = mapped_column(Text)
    alternativas_consideradas: Mapped[Optional[str]] = mapped_column(Text)
    decisao: Mapped[str] = mapped_column(Text)
    rationale: Mapped[Optional[str]] = mapped_column(Text)
    impactos: Mapped[Optional[str]] = mapped_column(Text)

    decisor_id: Mapped[Optional[int]] = mapped_column(ForeignKey("pessoa.id"))
    data_decisao: Mapped[date] = mapped_column(Date)
    forum: Mapped[Optional[str]] = mapped_column(String(200))
    # "Steering Committee", "Executive Review", etc.
    stakeholders_envolvidos: Mapped[Optional[str]] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    projeto: Mapped[Projeto] = relationship()
    decisor: Mapped[Optional[Pessoa]] = relationship()


# ---------------------------------------------------------------------------
# M2 — Scope Management (WBS/EAP)
# ---------------------------------------------------------------------------


class WBSNode(Base):
    """Nó da WBS (Work Breakdown Structure) — hierarquia recursiva.

    PMBoK §5.4 + Practice Standard for WBS.
    """

    __tablename__ = "wbs_node"
    __table_args__ = (UniqueConstraint("projeto_id", "codigo_wbs"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    projeto_id: Mapped[int] = mapped_column(ForeignKey("projeto.id"))
    parent_id: Mapped[Optional[int]] = mapped_column(ForeignKey("wbs_node.id"))
    codigo_wbs: Mapped[str] = mapped_column(String(40))
    # Ex: "1.2.3"
    nome: Mapped[str] = mapped_column(String(300))
    descricao: Mapped[Optional[str]] = mapped_column(Text)

    nivel: Mapped[int] = mapped_column(Integer, default=0)
    tipo: Mapped[str] = mapped_column(String(40), default="work_package")
    # fase | deliverable | work_package | activity

    # Atributos técnicos
    responsavel_id: Mapped[Optional[int]] = mapped_column(ForeignKey("pessoa.id"))
    orcamento_estimado: Mapped[Optional[float]] = mapped_column(Float)
    duracao_dias_estimada: Mapped[Optional[int]] = mapped_column(Integer)
    data_inicio_planejada: Mapped[Optional[date]] = mapped_column(Date)
    data_termino_planejada: Mapped[Optional[date]] = mapped_column(Date)

    # Marcadores
    is_critico: Mapped[bool] = mapped_column(Boolean, default=False)
    # Pacote crítico (alto CAPEX ou long lead time)
    is_long_lead: Mapped[bool] = mapped_column(Boolean, default=False)
    # Long lead item — entrega longa prazo
    is_marco: Mapped[bool] = mapped_column(Boolean, default=False)
    # Milestone sem duração
    is_terceirizado: Mapped[bool] = mapped_column(Boolean, default=False)
    # Entregue por contrato de terceiros

    # Modalidade de execução (EPCM descentralizado)
    disciplina_epcm: Mapped[Optional[str]] = mapped_column(String(20))
    # E (engenharia) | P (procurement/suprimentos) | C (construção) | M (montagem)
    executor: Mapped[Optional[str]] = mapped_column(String(40))
    # interno | terceiro | gerenciadora | hibrido
    is_servico_contratado: Mapped[bool] = mapped_column(Boolean, default=False)
    # Requer ciclo de contratação externa (ET, RFP, etc.)
    ciclo_suprimentos_dias: Mapped[Optional[int]] = mapped_column(Integer)
    # Ciclo médio de contratação — default 150 dias neste projeto
    ciclo_mobilizacao_dias: Mapped[Optional[int]] = mapped_column(Integer)
    # Ciclo de mobilização após assinatura — default 45 dias

    # Status
    percentual_concluido: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(40), default="nao_iniciado")
    # nao_iniciado | em_andamento | concluido | cancelado | em_atraso

    # CPM (Critical Path Method) — calculado via forward/backward pass
    inicio_cedo: Mapped[Optional[date]] = mapped_column(Date)
    termino_cedo: Mapped[Optional[date]] = mapped_column(Date)
    inicio_tarde: Mapped[Optional[date]] = mapped_column(Date)
    termino_tarde: Mapped[Optional[date]] = mapped_column(Date)
    folga_total_dias: Mapped[Optional[int]] = mapped_column(Integer)
    folga_livre_dias: Mapped[Optional[int]] = mapped_column(Integer)
    caminho_critico: Mapped[bool] = mapped_column(Boolean, default=False)

    ordem: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    projeto: Mapped[Projeto] = relationship()
    parent: Mapped[Optional["WBSNode"]] = relationship(
        remote_side="WBSNode.id", back_populates="children"
    )
    children: Mapped[list["WBSNode"]] = relationship(
        back_populates="parent", cascade="all, delete-orphan"
    )
    responsavel: Mapped[Optional[Pessoa]] = relationship()


class DependenciaWBS(Base):
    """Dependência entre nós WBS (PMBoK §6.3 — Sequenciamento de atividades).

    Tipos PDM (Precedence Diagramming Method):
    - FS: Finish-to-Start (default, sucessor inicia após término do predecessor)
    - SS: Start-to-Start
    - FF: Finish-to-Finish
    - SF: Start-to-Finish
    """

    __tablename__ = "dependencia_wbs"
    __table_args__ = (UniqueConstraint("predecessor_id", "sucessor_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    predecessor_id: Mapped[int] = mapped_column(ForeignKey("wbs_node.id"))
    sucessor_id: Mapped[int] = mapped_column(ForeignKey("wbs_node.id"))
    tipo: Mapped[str] = mapped_column(String(10), default="FS")
    # FS | SS | FF | SF
    lag_dias: Mapped[int] = mapped_column(Integer, default=0)
    # Pode ser negativo (lead). Ex: SS com lag -5 = sucessor começa 5d antes do início do predecessor
    obrigatoria: Mapped[bool] = mapped_column(Boolean, default=True)

    predecessor: Mapped["WBSNode"] = relationship(foreign_keys=[predecessor_id])
    sucessor: Mapped["WBSNode"] = relationship(foreign_keys=[sucessor_id])


class CostCategory(Base):
    """Categoria contábil do orçamento (PMBoK §7 — Cost Management)."""

    __tablename__ = "cost_category"

    id: Mapped[int] = mapped_column(primary_key=True)
    projeto_id: Mapped[int] = mapped_column(ForeignKey("projeto.id"))
    codigo: Mapped[str] = mapped_column(String(20))
    nome: Mapped[str] = mapped_column(String(200))
    tipo: Mapped[str] = mapped_column(String(20), default="CAPEX")
    # CAPEX | OPEX | CONTINGENCIA
    cor: Mapped[Optional[str]] = mapped_column(String(20))
    ordem: Mapped[int] = mapped_column(Integer, default=0)
    orcamento_planejado: Mapped[Optional[float]] = mapped_column(Float)
    orcamento_comprometido: Mapped[Optional[float]] = mapped_column(Float)
    valor_realizado: Mapped[Optional[float]] = mapped_column(Float)


class EarnedValueSnapshot(Base):
    """Snapshot de Earned Value Management (PMBoK §7.4 + PMI Practice Standard for EVM).

    Métricas:
    - PV (Planned Value) = orçamento planejado no período
    - EV (Earned Value) = orçamento do trabalho realizado
    - AC (Actual Cost) = custo real gasto
    - SV = EV - PV (schedule variance)
    - CV = EV - AC (cost variance)
    - SPI = EV/PV (schedule performance index)
    - CPI = EV/AC (cost performance index)
    - EAC = BAC/CPI (estimate at completion)
    - ETC = EAC - AC (estimate to complete)
    - VAC = BAC - EAC (variance at completion)
    """

    __tablename__ = "earned_value_snapshot"

    id: Mapped[int] = mapped_column(primary_key=True)
    projeto_id: Mapped[int] = mapped_column(ForeignKey("projeto.id"))
    data_snapshot: Mapped[date] = mapped_column(Date)
    periodo: Mapped[Optional[str]] = mapped_column(String(40))
    # Ex: "2026-Q1", "2026-03"

    # Valores absolutos (BRL)
    bac: Mapped[float] = mapped_column(Float)  # Budget at Completion
    pv: Mapped[float] = mapped_column(Float)   # Planned Value acumulado até data
    ev: Mapped[float] = mapped_column(Float)   # Earned Value acumulado
    ac: Mapped[float] = mapped_column(Float)   # Actual Cost acumulado

    # Derivados
    sv: Mapped[Optional[float]] = mapped_column(Float)  # Schedule Variance
    cv: Mapped[Optional[float]] = mapped_column(Float)  # Cost Variance
    spi: Mapped[Optional[float]] = mapped_column(Float)  # Schedule Performance Index
    cpi: Mapped[Optional[float]] = mapped_column(Float)  # Cost Performance Index
    eac: Mapped[Optional[float]] = mapped_column(Float)  # Estimate At Completion
    etc: Mapped[Optional[float]] = mapped_column(Float)  # Estimate To Complete
    vac: Mapped[Optional[float]] = mapped_column(Float)  # Variance At Completion

    observacoes: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class Deliverable(Base):
    """Entregável formal com critério de aceitação."""

    __tablename__ = "deliverable"

    id: Mapped[int] = mapped_column(primary_key=True)
    projeto_id: Mapped[int] = mapped_column(ForeignKey("projeto.id"))
    wbs_node_id: Mapped[Optional[int]] = mapped_column(ForeignKey("wbs_node.id"))
    codigo: Mapped[str] = mapped_column(String(40))
    nome: Mapped[str] = mapped_column(String(300))
    descricao: Mapped[Optional[str]] = mapped_column(Text)
    criterios_aceitacao: Mapped[Optional[str]] = mapped_column(Text)
    dono_id: Mapped[Optional[int]] = mapped_column(ForeignKey("pessoa.id"))
    data_prevista: Mapped[Optional[date]] = mapped_column(Date)
    data_entrega_real: Mapped[Optional[date]] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(40), default="nao_iniciado")
    # nao_iniciado | em_andamento | entregue | aprovado | rejeitado
    percentual_concluido: Mapped[int] = mapped_column(Integer, default=0)

    projeto: Mapped[Projeto] = relationship()
    wbs_node: Mapped[Optional[WBSNode]] = relationship()
    dono: Mapped[Optional[Pessoa]] = relationship()
