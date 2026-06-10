"""Modelo de dados de Gestão de Crises (ISO 22361) e Continuidade (ISO 22301).

Estendido sobre o mesmo DB SQLite do módulo de Riscos. Entidades-chave:
- ComiteCrise, MembroComite (comitê e seus membros com papéis)
- CenarioCrise (cenário + categoria + severidade + vínculo opcional com Risco)
- AcionamentoStep (árvore de acionamento do cenário)
- Runbook, RunbookStep (playbook por cenário, passo a passo)
- Simulado (exercícios tabletop/funcional/full-scale + resultados)
- LicaoAprendida (post-incident review)
- ProcessoCritico (BIA — BCP ISO 22301), PlanoRecuperacao, PlanoRecuperacaoStep, TestePlano
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
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from licenciaminer.riscos.models import Base, Pessoa, Risco


# ---------------------------------------------------------------------------
# Comitê de crise
# ---------------------------------------------------------------------------


class ComiteCrise(Base):
    __tablename__ = "comite_crise"

    id: Mapped[int] = mapped_column(primary_key=True)
    nome: Mapped[str] = mapped_column(String(200), unique=True)
    descricao: Mapped[Optional[str]] = mapped_column(Text)
    nivel: Mapped[Optional[str]] = mapped_column(String(40))  # estrategico | tatico | operacional
    ativo: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    membros: Mapped[list["MembroComite"]] = relationship(
        back_populates="comite", cascade="all, delete-orphan"
    )


class MembroComite(Base):
    __tablename__ = "membro_comite"

    id: Mapped[int] = mapped_column(primary_key=True)
    comite_id: Mapped[int] = mapped_column(ForeignKey("comite_crise.id"))
    pessoa_id: Mapped[int] = mapped_column(ForeignKey("pessoa.id"))
    papel: Mapped[str] = mapped_column(String(120))  # coordenador, porta-voz, operações, etc.
    contato_24_7: Mapped[Optional[str]] = mapped_column(String(200))
    ordem: Mapped[int] = mapped_column(Integer, default=0)

    comite: Mapped[ComiteCrise] = relationship(back_populates="membros")
    pessoa: Mapped[Pessoa] = relationship()


# ---------------------------------------------------------------------------
# Cenário de crise
# ---------------------------------------------------------------------------


class CenarioCrise(Base):
    __tablename__ = "cenario_crise"

    id: Mapped[int] = mapped_column(primary_key=True)
    codigo: Mapped[str] = mapped_column(String(40), unique=True)
    nome: Mapped[str] = mapped_column(String(300))
    descricao: Mapped[Optional[str]] = mapped_column(Text)
    categoria: Mapped[Optional[str]] = mapped_column(String(80))
    # operacional | ambiental | reputacional | financeiro | cyber | seguranca | regulatorio
    severidade: Mapped[Optional[int]] = mapped_column(Integer)  # 1-5
    probabilidade: Mapped[Optional[int]] = mapped_column(Integer)  # 1-5
    risco_id: Mapped[Optional[int]] = mapped_column(ForeignKey("risco.id"))
    comite_id: Mapped[Optional[int]] = mapped_column(ForeignKey("comite_crise.id"))
    coordenador_id: Mapped[Optional[int]] = mapped_column(ForeignKey("pessoa.id"))
    status: Mapped[str] = mapped_column(String(40), default="mapeado")
    # mapeado | em_revisao | aprovado | obsoleto
    ultima_revisao: Mapped[Optional[date]] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    risco: Mapped[Optional[Risco]] = relationship()
    comite: Mapped[Optional[ComiteCrise]] = relationship()
    coordenador: Mapped[Optional[Pessoa]] = relationship()
    acionamentos: Mapped[list["AcionamentoStep"]] = relationship(
        back_populates="cenario", cascade="all, delete-orphan", order_by="AcionamentoStep.ordem"
    )
    runbooks: Mapped[list["Runbook"]] = relationship(
        back_populates="cenario", cascade="all, delete-orphan"
    )
    simulados: Mapped[list["Simulado"]] = relationship(
        back_populates="cenario", cascade="all, delete-orphan"
    )
    licoes: Mapped[list["LicaoAprendida"]] = relationship(
        back_populates="cenario", cascade="all, delete-orphan"
    )


class AcionamentoStep(Base):
    __tablename__ = "acionamento_step"

    id: Mapped[int] = mapped_column(primary_key=True)
    cenario_id: Mapped[int] = mapped_column(ForeignKey("cenario_crise.id"))
    ordem: Mapped[int] = mapped_column(Integer, default=0)
    pessoa_id: Mapped[Optional[int]] = mapped_column(ForeignKey("pessoa.id"))
    papel: Mapped[str] = mapped_column(String(120))
    criterio: Mapped[Optional[str]] = mapped_column(Text)
    tempo_resposta_min: Mapped[Optional[int]] = mapped_column(Integer)
    contato: Mapped[Optional[str]] = mapped_column(String(200))

    cenario: Mapped[CenarioCrise] = relationship(back_populates="acionamentos")
    pessoa: Mapped[Optional[Pessoa]] = relationship()


# ---------------------------------------------------------------------------
# Runbook
# ---------------------------------------------------------------------------


class Runbook(Base):
    __tablename__ = "runbook"

    id: Mapped[int] = mapped_column(primary_key=True)
    cenario_id: Mapped[int] = mapped_column(ForeignKey("cenario_crise.id"))
    titulo: Mapped[str] = mapped_column(String(300))
    versao: Mapped[int] = mapped_column(Integer, default=1)
    descricao: Mapped[Optional[str]] = mapped_column(Text)
    data_revisao: Mapped[Optional[date]] = mapped_column(Date)
    aprovador_id: Mapped[Optional[int]] = mapped_column(ForeignKey("pessoa.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    cenario: Mapped[CenarioCrise] = relationship(back_populates="runbooks")
    aprovador: Mapped[Optional[Pessoa]] = relationship()
    steps: Mapped[list["RunbookStep"]] = relationship(
        back_populates="runbook", cascade="all, delete-orphan", order_by="RunbookStep.ordem"
    )


class RunbookStep(Base):
    __tablename__ = "runbook_step"

    id: Mapped[int] = mapped_column(primary_key=True)
    runbook_id: Mapped[int] = mapped_column(ForeignKey("runbook.id"))
    ordem: Mapped[int] = mapped_column(Integer, default=0)
    descricao: Mapped[str] = mapped_column(Text)
    responsavel_id: Mapped[Optional[int]] = mapped_column(ForeignKey("pessoa.id"))
    tempo_estimado_min: Mapped[Optional[int]] = mapped_column(Integer)
    recursos_necessarios: Mapped[Optional[str]] = mapped_column(Text)
    depende_de_step_id: Mapped[Optional[int]] = mapped_column(Integer)
    checklist: Mapped[Optional[str]] = mapped_column(Text)  # JSON opcional

    runbook: Mapped[Runbook] = relationship(back_populates="steps")
    responsavel: Mapped[Optional[Pessoa]] = relationship()


# ---------------------------------------------------------------------------
# Simulado
# ---------------------------------------------------------------------------


class Simulado(Base):
    __tablename__ = "simulado"

    id: Mapped[int] = mapped_column(primary_key=True)
    cenario_id: Mapped[int] = mapped_column(ForeignKey("cenario_crise.id"))
    titulo: Mapped[str] = mapped_column(String(300))
    tipo: Mapped[str] = mapped_column(String(40))  # tabletop | funcional | full_scale
    data_prevista: Mapped[Optional[date]] = mapped_column(Date)
    data_realizacao: Mapped[Optional[date]] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(40), default="planejado")
    # planejado | em_execucao | concluido | cancelado
    facilitador_id: Mapped[Optional[int]] = mapped_column(ForeignKey("pessoa.id"))
    participantes: Mapped[Optional[str]] = mapped_column(Text)
    objetivos: Mapped[Optional[str]] = mapped_column(Text)
    resultado: Mapped[Optional[str]] = mapped_column(Text)
    gaps_identificados: Mapped[Optional[str]] = mapped_column(Text)
    nota_performance: Mapped[Optional[int]] = mapped_column(Integer)  # 1-5
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    cenario: Mapped[CenarioCrise] = relationship(back_populates="simulados")
    facilitador: Mapped[Optional[Pessoa]] = relationship()


class LicaoAprendida(Base):
    __tablename__ = "licao_aprendida"

    id: Mapped[int] = mapped_column(primary_key=True)
    cenario_id: Mapped[int] = mapped_column(ForeignKey("cenario_crise.id"))
    simulado_id: Mapped[Optional[int]] = mapped_column(ForeignKey("simulado.id"))
    data: Mapped[date] = mapped_column(Date)
    descricao: Mapped[str] = mapped_column(Text)
    melhoria_proposta: Mapped[Optional[str]] = mapped_column(Text)
    responsavel_id: Mapped[Optional[int]] = mapped_column(ForeignKey("pessoa.id"))
    status: Mapped[str] = mapped_column(String(40), default="aberta")
    # aberta | em_implementacao | concluida

    cenario: Mapped[CenarioCrise] = relationship(back_populates="licoes")
    responsavel: Mapped[Optional[Pessoa]] = relationship()


# ---------------------------------------------------------------------------
# BCP (ISO 22301) — Business Impact Analysis + Planos de Recuperação
# ---------------------------------------------------------------------------


class ProcessoCritico(Base):
    __tablename__ = "processo_critico"

    id: Mapped[int] = mapped_column(primary_key=True)
    codigo: Mapped[str] = mapped_column(String(40), unique=True)
    nome: Mapped[str] = mapped_column(String(300))
    descricao: Mapped[Optional[str]] = mapped_column(Text)
    area: Mapped[Optional[str]] = mapped_column(String(200))
    responsavel_id: Mapped[Optional[int]] = mapped_column(ForeignKey("pessoa.id"))
    elo_cadeia_valor_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("elo_cadeia_valor.id")
    )
    prioridade: Mapped[int] = mapped_column(Integer, default=3)  # 1-5 (5 = mais crítico)
    rto_horas: Mapped[Optional[float]] = mapped_column(Float)  # Recovery Time Objective
    rpo_horas: Mapped[Optional[float]] = mapped_column(Float)  # Recovery Point Objective
    mtd_horas: Mapped[Optional[float]] = mapped_column(Float)  # Max Tolerable Downtime
    impacto_financeiro_hora: Mapped[Optional[float]] = mapped_column(Float)
    dependencias: Mapped[Optional[str]] = mapped_column(Text)  # JSON
    recursos_minimos: Mapped[Optional[str]] = mapped_column(Text)  # JSON
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    responsavel: Mapped[Optional[Pessoa]] = relationship()
    planos: Mapped[list["PlanoRecuperacao"]] = relationship(
        back_populates="processo", cascade="all, delete-orphan"
    )


class PlanoRecuperacao(Base):
    __tablename__ = "plano_recuperacao"

    id: Mapped[int] = mapped_column(primary_key=True)
    processo_id: Mapped[int] = mapped_column(ForeignKey("processo_critico.id"))
    titulo: Mapped[str] = mapped_column(String(300))
    versao: Mapped[int] = mapped_column(Integer, default=1)
    descricao: Mapped[Optional[str]] = mapped_column(Text)
    data_revisao: Mapped[Optional[date]] = mapped_column(Date)
    aprovador_id: Mapped[Optional[int]] = mapped_column(ForeignKey("pessoa.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    processo: Mapped[ProcessoCritico] = relationship(back_populates="planos")
    aprovador: Mapped[Optional[Pessoa]] = relationship()
    steps: Mapped[list["PlanoRecuperacaoStep"]] = relationship(
        back_populates="plano",
        cascade="all, delete-orphan",
        order_by="PlanoRecuperacaoStep.ordem",
    )
    testes: Mapped[list["TestePlano"]] = relationship(
        back_populates="plano", cascade="all, delete-orphan"
    )


class PlanoRecuperacaoStep(Base):
    __tablename__ = "plano_recuperacao_step"

    id: Mapped[int] = mapped_column(primary_key=True)
    plano_id: Mapped[int] = mapped_column(ForeignKey("plano_recuperacao.id"))
    ordem: Mapped[int] = mapped_column(Integer, default=0)
    descricao: Mapped[str] = mapped_column(Text)
    responsavel_id: Mapped[Optional[int]] = mapped_column(ForeignKey("pessoa.id"))
    tempo_estimado_min: Mapped[Optional[int]] = mapped_column(Integer)
    recursos: Mapped[Optional[str]] = mapped_column(Text)

    plano: Mapped[PlanoRecuperacao] = relationship(back_populates="steps")
    responsavel: Mapped[Optional[Pessoa]] = relationship()


class TestePlano(Base):
    __tablename__ = "teste_plano"

    id: Mapped[int] = mapped_column(primary_key=True)
    plano_id: Mapped[int] = mapped_column(ForeignKey("plano_recuperacao.id"))
    data: Mapped[date] = mapped_column(Date)
    tipo: Mapped[str] = mapped_column(String(40))
    # tabletop | walkthrough | simulacao | full_test
    status: Mapped[str] = mapped_column(String(40), default="planejado")
    # planejado | aprovado | aprovado_com_ressalvas | reprovado
    gaps_identificados: Mapped[Optional[str]] = mapped_column(Text)
    aprovador_id: Mapped[Optional[int]] = mapped_column(ForeignKey("pessoa.id"))
    observacoes: Mapped[Optional[str]] = mapped_column(Text)

    plano: Mapped[PlanoRecuperacao] = relationship(back_populates="testes")
    aprovador: Mapped[Optional[Pessoa]] = relationship()
