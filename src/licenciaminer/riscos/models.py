"""Modelo de dados do módulo de Riscos (SQLAlchemy 2.0)."""

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
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    """Base declarativa comum."""


# ---------------------------------------------------------------------------
# Metodologia (escalas e matriz P×I)
# ---------------------------------------------------------------------------


class Metodologia(Base):
    __tablename__ = "metodologia"

    id: Mapped[int] = mapped_column(primary_key=True)
    nome: Mapped[str] = mapped_column(String(120), unique=True)
    descricao: Mapped[Optional[str]] = mapped_column(Text)
    ativa: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    escalas_prob: Mapped[list["EscalaProbabilidade"]] = relationship(
        back_populates="metodologia", cascade="all, delete-orphan"
    )
    escalas_impacto: Mapped[list["EscalaImpacto"]] = relationship(
        back_populates="metodologia", cascade="all, delete-orphan"
    )
    matriz: Mapped[list["MatrizClassificacao"]] = relationship(
        back_populates="metodologia", cascade="all, delete-orphan"
    )


class EscalaProbabilidade(Base):
    __tablename__ = "escala_probabilidade"
    __table_args__ = (UniqueConstraint("metodologia_id", "nivel"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    metodologia_id: Mapped[int] = mapped_column(ForeignKey("metodologia.id"))
    nivel: Mapped[int] = mapped_column(Integer)
    label: Mapped[str] = mapped_column(String(60))
    descricao: Mapped[Optional[str]] = mapped_column(Text)
    frequencia_anual_min: Mapped[Optional[float]] = mapped_column(Float)
    frequencia_anual_max: Mapped[Optional[float]] = mapped_column(Float)

    metodologia: Mapped[Metodologia] = relationship(back_populates="escalas_prob")


class EscalaImpacto(Base):
    __tablename__ = "escala_impacto"
    __table_args__ = (UniqueConstraint("metodologia_id", "nivel", "categoria"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    metodologia_id: Mapped[int] = mapped_column(ForeignKey("metodologia.id"))
    nivel: Mapped[int] = mapped_column(Integer)
    label: Mapped[str] = mapped_column(String(60))
    categoria: Mapped[str] = mapped_column(String(40))
    descricao: Mapped[Optional[str]] = mapped_column(Text)

    metodologia: Mapped[Metodologia] = relationship(back_populates="escalas_impacto")


class MatrizClassificacao(Base):
    __tablename__ = "matriz_classificacao"
    __table_args__ = (UniqueConstraint("metodologia_id", "prob", "impacto"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    metodologia_id: Mapped[int] = mapped_column(ForeignKey("metodologia.id"))
    prob: Mapped[int] = mapped_column(Integer)
    impacto: Mapped[int] = mapped_column(Integer)
    classificacao: Mapped[str] = mapped_column(String(4))

    metodologia: Mapped[Metodologia] = relationship(back_populates="matriz")


# ---------------------------------------------------------------------------
# Contexto organizacional
# ---------------------------------------------------------------------------


class Categoria(Base):
    __tablename__ = "categoria"

    id: Mapped[int] = mapped_column(primary_key=True)
    nome: Mapped[str] = mapped_column(String(120), unique=True)
    descricao: Mapped[Optional[str]] = mapped_column(Text)
    cor: Mapped[Optional[str]] = mapped_column(String(20))


class Pessoa(Base):
    __tablename__ = "pessoa"

    id: Mapped[int] = mapped_column(primary_key=True)
    nome: Mapped[str] = mapped_column(String(160))
    email: Mapped[Optional[str]] = mapped_column(String(160))
    area: Mapped[Optional[str]] = mapped_column(String(120))
    cargo: Mapped[Optional[str]] = mapped_column(String(120))


class UnidadeOrg(Base):
    __tablename__ = "unidade_org"

    id: Mapped[int] = mapped_column(primary_key=True)
    nome: Mapped[str] = mapped_column(String(160))
    parent_id: Mapped[Optional[int]] = mapped_column(ForeignKey("unidade_org.id"))
    nivel: Mapped[int] = mapped_column(Integer, default=0)
    tipo: Mapped[Optional[str]] = mapped_column(String(60))

    parent: Mapped[Optional["UnidadeOrg"]] = relationship(
        remote_side="UnidadeOrg.id", back_populates="children"
    )
    children: Mapped[list["UnidadeOrg"]] = relationship(back_populates="parent")


class EloCadeiaValor(Base):
    __tablename__ = "elo_cadeia_valor"

    id: Mapped[int] = mapped_column(primary_key=True)
    nome: Mapped[str] = mapped_column(String(160), unique=True)
    descricao: Mapped[Optional[str]] = mapped_column(Text)
    ordem: Mapped[int] = mapped_column(Integer, default=0)
    tipo: Mapped[str] = mapped_column(String(20))  # primario | apoio


# ---------------------------------------------------------------------------
# Risco
# ---------------------------------------------------------------------------


class Projeto(Base):
    """Projeto ou iniciativa que contém riscos de projeto (vs corporativos)."""

    __tablename__ = "projeto"

    id: Mapped[int] = mapped_column(primary_key=True)
    codigo: Mapped[str] = mapped_column(String(40), unique=True)
    nome: Mapped[str] = mapped_column(String(200))
    descricao: Mapped[Optional[str]] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(40), default="em_execucao")
    # planejamento | em_execucao | concluido | suspenso | cancelado
    data_inicio: Mapped[Optional[date]] = mapped_column(Date)
    data_fim: Mapped[Optional[date]] = mapped_column(Date)
    owner_id: Mapped[Optional[int]] = mapped_column(ForeignKey("pessoa.id"))
    orcamento: Mapped[Optional[float]] = mapped_column(Float)
    escopo: Mapped[Optional[str]] = mapped_column(Text)
    ativo: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    owner: Mapped[Optional["Pessoa"]] = relationship()


class Risco(Base):
    __tablename__ = "risco"

    id: Mapped[int] = mapped_column(primary_key=True)
    codigo: Mapped[str] = mapped_column(String(40), unique=True)
    nome: Mapped[str] = mapped_column(String(300))
    descricao: Mapped[Optional[str]] = mapped_column(Text)
    estagio: Mapped[Optional[str]] = mapped_column(String(40))
    categoria_id: Mapped[Optional[int]] = mapped_column(ForeignKey("categoria.id"))
    responsavel_id: Mapped[Optional[int]] = mapped_column(ForeignKey("pessoa.id"))
    unidade_org_id: Mapped[Optional[int]] = mapped_column(ForeignKey("unidade_org.id"))
    elo_cadeia_valor_id: Mapped[Optional[int]] = mapped_column(ForeignKey("elo_cadeia_valor.id"))

    # Escopo do risco (projeto × corporativo) — ISO 31000 §5.2 + COSO ERM 2017
    tipo_escopo: Mapped[str] = mapped_column(String(20), default="projeto")
    # projeto | corporativo
    projeto_id: Mapped[Optional[int]] = mapped_column(ForeignKey("projeto.id"))
    # WBS node (PMBoK M2 — Scope)
    wbs_node_id: Mapped[Optional[int]] = mapped_column(ForeignKey("wbs_node.id"))
    # Corporativo (COSO ERM)
    categoria_erm_id: Mapped[Optional[int]] = mapped_column(ForeignKey("categoria_erm.id"))
    linha_defesa_id: Mapped[Optional[int]] = mapped_column(ForeignKey("linha_defesa.id"))
    tipo_tratamento_estrategico: Mapped[Optional[str]] = mapped_column(String(20))
    # aceitar | mitigar | transferir | evitar | explorar (oportunidades)
    horizonte: Mapped[Optional[str]] = mapped_column(String(20))
    # curto (0-1a) | medio (1-3a) | longo (3-10a)
    natureza: Mapped[str] = mapped_column(String(20), default="ameaca")
    # ameaca | oportunidade

    prob_pura: Mapped[Optional[int]] = mapped_column(Integer)
    impacto_pura: Mapped[Optional[int]] = mapped_column(Integer)
    classificacao_pura: Mapped[Optional[str]] = mapped_column(String(4))
    prob_residual: Mapped[Optional[int]] = mapped_column(Integer)
    impacto_residual: Mapped[Optional[int]] = mapped_column(Integer)
    classificacao_residual: Mapped[Optional[str]] = mapped_column(String(4))

    metadados_json: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    projeto: Mapped[Optional["Projeto"]] = relationship()

    categoria: Mapped[Optional[Categoria]] = relationship()
    responsavel: Mapped[Optional[Pessoa]] = relationship()
    unidade_org: Mapped[Optional[UnidadeOrg]] = relationship()
    elo_cadeia_valor: Mapped[Optional[EloCadeiaValor]] = relationship()

    bowties: Mapped[list["Bowtie"]] = relationship(
        back_populates="risco", cascade="all, delete-orphan"
    )
    acoes: Mapped[list["Acao"]] = relationship(
        back_populates="risco", cascade="all, delete-orphan"
    )
    controles: Mapped[list["Controle"]] = relationship(
        back_populates="risco", cascade="all, delete-orphan"
    )


# ---------------------------------------------------------------------------
# Bowtie
# ---------------------------------------------------------------------------


class Bowtie(Base):
    __tablename__ = "bowtie"

    id: Mapped[int] = mapped_column(primary_key=True)
    risco_id: Mapped[int] = mapped_column(ForeignKey("risco.id"))
    versao: Mapped[int] = mapped_column(Integer, default=1)
    top_event: Mapped[Optional[str]] = mapped_column(Text)
    hazard: Mapped[Optional[str]] = mapped_column(Text)
    canvas_json: Mapped[Optional[str]] = mapped_column(Text)
    frequencia_pura: Mapped[Optional[int]] = mapped_column(Integer)
    frequencia_residual: Mapped[Optional[int]] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    risco: Mapped[Risco] = relationship(back_populates="bowties")
    causas: Mapped[list["Causa"]] = relationship(
        back_populates="bowtie", cascade="all, delete-orphan", order_by="Causa.ordem"
    )
    consequencias: Mapped[list["Consequencia"]] = relationship(
        back_populates="bowtie", cascade="all, delete-orphan", order_by="Consequencia.ordem"
    )
    fatores: Mapped[list["FatorEscalonamento"]] = relationship(
        back_populates="bowtie", cascade="all, delete-orphan"
    )


class Causa(Base):
    __tablename__ = "causa"

    id: Mapped[int] = mapped_column(primary_key=True)
    bowtie_id: Mapped[int] = mapped_column(ForeignKey("bowtie.id"))
    codigo: Mapped[str] = mapped_column(String(20))
    descricao: Mapped[str] = mapped_column(Text)
    ordem: Mapped[int] = mapped_column(Integer, default=0)
    critica: Mapped[bool] = mapped_column(Boolean, default=False)

    bowtie: Mapped[Bowtie] = relationship(back_populates="causas")
    barreiras: Mapped[list["BarreiraPreventiva"]] = relationship(
        back_populates="causa", cascade="all, delete-orphan", order_by="BarreiraPreventiva.ordem"
    )


class Consequencia(Base):
    __tablename__ = "consequencia"

    id: Mapped[int] = mapped_column(primary_key=True)
    bowtie_id: Mapped[int] = mapped_column(ForeignKey("bowtie.id"))
    codigo: Mapped[str] = mapped_column(String(20))
    descricao: Mapped[str] = mapped_column(Text)
    ordem: Mapped[int] = mapped_column(Integer, default=0)
    critica: Mapped[bool] = mapped_column(Boolean, default=False)

    bowtie: Mapped[Bowtie] = relationship(back_populates="consequencias")
    barreiras: Mapped[list["BarreiraCorretiva"]] = relationship(
        back_populates="consequencia",
        cascade="all, delete-orphan",
        order_by="BarreiraCorretiva.ordem",
    )


class BarreiraPreventiva(Base):
    __tablename__ = "barreira_preventiva"

    id: Mapped[int] = mapped_column(primary_key=True)
    causa_id: Mapped[int] = mapped_column(ForeignKey("causa.id"))
    descricao: Mapped[str] = mapped_column(Text)
    efetividade: Mapped[Optional[int]] = mapped_column(Integer)
    ordem: Mapped[int] = mapped_column(Integer, default=0)
    controle_id: Mapped[Optional[int]] = mapped_column(ForeignKey("controle.id"))

    causa: Mapped[Causa] = relationship(back_populates="barreiras")


class BarreiraCorretiva(Base):
    __tablename__ = "barreira_corretiva"

    id: Mapped[int] = mapped_column(primary_key=True)
    consequencia_id: Mapped[int] = mapped_column(ForeignKey("consequencia.id"))
    descricao: Mapped[str] = mapped_column(Text)
    efetividade: Mapped[Optional[int]] = mapped_column(Integer)
    ordem: Mapped[int] = mapped_column(Integer, default=0)
    controle_id: Mapped[Optional[int]] = mapped_column(ForeignKey("controle.id"))

    consequencia: Mapped[Consequencia] = relationship(back_populates="barreiras")


class FatorEscalonamento(Base):
    __tablename__ = "fator_escalonamento"

    id: Mapped[int] = mapped_column(primary_key=True)
    bowtie_id: Mapped[int] = mapped_column(ForeignKey("bowtie.id"))
    descricao: Mapped[str] = mapped_column(Text)
    lado: Mapped[str] = mapped_column(String(20))  # preventivo | corretivo
    barreira_alvo_id: Mapped[Optional[int]] = mapped_column(Integer)

    bowtie: Mapped[Bowtie] = relationship(back_populates="fatores")


# ---------------------------------------------------------------------------
# Ações e Controles
# ---------------------------------------------------------------------------


class Acao(Base):
    __tablename__ = "acao"

    id: Mapped[int] = mapped_column(primary_key=True)
    risco_id: Mapped[int] = mapped_column(ForeignKey("risco.id"))
    bowtie_id: Mapped[Optional[int]] = mapped_column(ForeignKey("bowtie.id"))
    wbs_node_id: Mapped[Optional[int]] = mapped_column(ForeignKey("wbs_node.id"))
    codigo: Mapped[Optional[str]] = mapped_column(String(20))
    descricao: Mapped[str] = mapped_column(Text)
    tipo: Mapped[str] = mapped_column(String(20))  # preventiva | corretiva
    responsavel_id: Mapped[Optional[int]] = mapped_column(ForeignKey("pessoa.id"))
    dono_risco_id: Mapped[Optional[int]] = mapped_column(ForeignKey("pessoa.id"))
    area: Mapped[Optional[str]] = mapped_column(String(200))
    categoria: Mapped[Optional[str]] = mapped_column(String(200))
    subrisco: Mapped[Optional[str]] = mapped_column(Text)
    grupo_trabalho: Mapped[Optional[str]] = mapped_column(String(200))
    tema_relacionado: Mapped[Optional[str]] = mapped_column(String(200))
    prazo: Mapped[Optional[date]] = mapped_column(Date)
    data_inicio: Mapped[Optional[date]] = mapped_column(Date)
    data_fim: Mapped[Optional[date]] = mapped_column(Date)
    inicio_texto: Mapped[Optional[str]] = mapped_column(Text)
    conclusao_texto: Mapped[Optional[str]] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(60), default="nao_iniciada")
    percentual: Mapped[int] = mapped_column(Integer, default=0)
    detalhamento: Mapped[Optional[str]] = mapped_column(Text)
    valor_estimado: Mapped[Optional[float]] = mapped_column(Float)
    evidencias: Mapped[Optional[str]] = mapped_column(Text)
    comentario: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    risco: Mapped[Risco] = relationship(back_populates="acoes")
    responsavel: Mapped[Optional[Pessoa]] = relationship(foreign_keys=[responsavel_id])
    dono_risco: Mapped[Optional[Pessoa]] = relationship(foreign_keys=[dono_risco_id])


class Controle(Base):
    __tablename__ = "controle"

    id: Mapped[int] = mapped_column(primary_key=True)
    risco_id: Mapped[int] = mapped_column(ForeignKey("risco.id"))
    bowtie_id: Mapped[Optional[int]] = mapped_column(ForeignKey("bowtie.id"))
    descricao: Mapped[str] = mapped_column(Text)
    tipo: Mapped[str] = mapped_column(String(20))  # preventivo | corretivo
    responsavel_id: Mapped[Optional[int]] = mapped_column(ForeignKey("pessoa.id"))
    categoria: Mapped[Optional[str]] = mapped_column(String(200))
    comentarios: Mapped[Optional[str]] = mapped_column(Text)
    periodicidade_teste: Mapped[Optional[str]] = mapped_column(String(40))
    ultimo_teste: Mapped[Optional[date]] = mapped_column(Date)
    status_teste: Mapped[Optional[str]] = mapped_column(String(30))
    efetividade: Mapped[Optional[int]] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    risco: Mapped[Risco] = relationship(back_populates="controles")
    responsavel: Mapped[Optional[Pessoa]] = relationship()


class Comentario(Base):
    __tablename__ = "comentario"

    id: Mapped[int] = mapped_column(primary_key=True)
    entidade_tipo: Mapped[str] = mapped_column(String(40))
    entidade_id: Mapped[int] = mapped_column(Integer)
    autor: Mapped[Optional[str]] = mapped_column(String(160))
    texto: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
