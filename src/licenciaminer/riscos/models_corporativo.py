"""Modelos de Risco Corporativo (ERM) — 100% aderente às normas.

Referências:
- ISO 31000:2018 (princípios, processo, contexto)
- COSO ERM 2017 (Enterprise Risk Management Integrated with Strategy and Performance)
- ISO 37301 (compliance management)
- IBGC Código de Melhores Práticas de Governança
- TCFD / IFRS S1-S2 (riscos climáticos e divulgação ESG)

Entidades:
- CategoriaERM: 5 categorias COSO (Estratégico, Operacional, Financeiro, Reportes, Conformidade)
- LinhaDefesa: 3 Linhas de Defesa (1ª operação, 2ª riscos/compliance, 3ª auditoria interna)
- ObjetivoEstrategico: objetivo corporativo com perspectiva BSC + meta + indicador
- RiscoObjetivoLink: M:N entre risco e objetivo estratégico ameaçado/favorecido
- TopRiscoSnapshot: fotografia trimestral dos top-N riscos para acompanhar evolução
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

from licenciaminer.riscos.models import Base, Pessoa, Risco


class CategoriaERM(Base):
    """Taxonomia de risco COSO ERM 2017. 5 categorias clássicas."""

    __tablename__ = "categoria_erm"

    id: Mapped[int] = mapped_column(primary_key=True)
    codigo: Mapped[str] = mapped_column(String(20), unique=True)
    # EST | OPE | FIN | REP | CON
    nome: Mapped[str] = mapped_column(String(120), unique=True)
    descricao: Mapped[Optional[str]] = mapped_column(Text)
    cor: Mapped[Optional[str]] = mapped_column(String(20))
    ordem: Mapped[int] = mapped_column(Integer, default=0)


class LinhaDefesa(Base):
    """3 Lines of Defense (IIA / ISO 31000 §5.2.4)."""

    __tablename__ = "linha_defesa"

    id: Mapped[int] = mapped_column(primary_key=True)
    numero: Mapped[int] = mapped_column(Integer)  # 1, 2, 3
    nome: Mapped[str] = mapped_column(String(120))
    descricao: Mapped[Optional[str]] = mapped_column(Text)
    responsabilidades: Mapped[Optional[str]] = mapped_column(Text)
    responsavel_id: Mapped[Optional[int]] = mapped_column(ForeignKey("pessoa.id"))

    responsavel: Mapped[Optional[Pessoa]] = relationship()


class ObjetivoEstrategico(Base):
    """Objetivo estratégico corporativo (BSC / OKR).

    Central no COSO ERM: riscos são mapeados para os objetivos que ameaçam ou
    favorecem (oportunidades).
    """

    __tablename__ = "objetivo_estrategico"

    id: Mapped[int] = mapped_column(primary_key=True)
    codigo: Mapped[str] = mapped_column(String(20), unique=True)
    descricao: Mapped[str] = mapped_column(Text)
    perspectiva_bsc: Mapped[str] = mapped_column(String(40))
    # financeira | cliente | processos_internos | aprendizado | esg
    horizonte: Mapped[str] = mapped_column(String(20), default="medio")
    # curto (0-1a) | medio (1-3a) | longo (3-10a)
    meta: Mapped[Optional[str]] = mapped_column(Text)
    indicador: Mapped[Optional[str]] = mapped_column(String(200))
    valor_meta: Mapped[Optional[float]] = mapped_column(Float)
    unidade_meta: Mapped[Optional[str]] = mapped_column(String(40))
    responsavel_id: Mapped[Optional[int]] = mapped_column(ForeignKey("pessoa.id"))
    ativo: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    responsavel: Mapped[Optional[Pessoa]] = relationship()


class RiscoObjetivoLink(Base):
    """M:N entre risco e objetivo estratégico.

    Um risco pode ameaçar (ou favorecer, se oportunidade) múltiplos objetivos.
    Percepção de impacto específica para esse par é registrada.
    """

    __tablename__ = "risco_objetivo_link"
    __table_args__ = (UniqueConstraint("risco_id", "objetivo_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    risco_id: Mapped[int] = mapped_column(ForeignKey("risco.id"))
    objetivo_id: Mapped[int] = mapped_column(ForeignKey("objetivo_estrategico.id"))
    impacto_percebido: Mapped[Optional[int]] = mapped_column(Integer)
    # 1-5 — quanto este risco afeta/favorece este objetivo
    observacao: Mapped[Optional[str]] = mapped_column(Text)

    risco: Mapped[Risco] = relationship()
    objetivo: Mapped[ObjetivoEstrategico] = relationship()


class TopRiscoSnapshot(Base):
    """Fotografia trimestral dos top-N riscos para acompanhar evolução.

    Gerado manualmente pelo botão no dashboard corporativo. Permite
    comparar posição de cada risco ao longo dos trimestres.
    """

    __tablename__ = "top_risco_snapshot"

    id: Mapped[int] = mapped_column(primary_key=True)
    data_snapshot: Mapped[date] = mapped_column(Date)
    titulo: Mapped[str] = mapped_column(String(200))
    # ex: "Snapshot trimestral 2026 Q2"
    periodo: Mapped[Optional[str]] = mapped_column(String(40))
    # Q1-2026, Q2-2026, 2026-04, etc.
    tipo_escopo: Mapped[str] = mapped_column(String(20), default="corporativo")
    # corporativo | projeto
    gerado_por: Mapped[Optional[str]] = mapped_column(String(200))
    observacoes: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    itens: Mapped[list["TopRiscoSnapshotItem"]] = relationship(
        back_populates="snapshot", cascade="all, delete-orphan", order_by="TopRiscoSnapshotItem.posicao"
    )


class TopRiscoSnapshotItem(Base):
    """Item individual do snapshot — captura estado do risco naquele momento."""

    __tablename__ = "top_risco_snapshot_item"

    id: Mapped[int] = mapped_column(primary_key=True)
    snapshot_id: Mapped[int] = mapped_column(ForeignKey("top_risco_snapshot.id"))
    risco_id: Mapped[int] = mapped_column(ForeignKey("risco.id"))
    posicao: Mapped[int] = mapped_column(Integer)
    # 1 = mais crítico
    classificacao_residual: Mapped[Optional[str]] = mapped_column(String(4))
    prob_residual: Mapped[Optional[int]] = mapped_column(Integer)
    impacto_residual: Mapped[Optional[int]] = mapped_column(Integer)
    score: Mapped[Optional[int]] = mapped_column(Integer)
    # prob × impacto no momento
    acoes_abertas: Mapped[int] = mapped_column(Integer, default=0)
    acoes_atrasadas: Mapped[int] = mapped_column(Integer, default=0)

    snapshot: Mapped[TopRiscoSnapshot] = relationship(back_populates="itens")
    risco: Mapped[Risco] = relationship()
