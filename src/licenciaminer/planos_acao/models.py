"""Schema do módulo Plano de Ações — upload heterogêneo de planos.

Estrutura: Cliente → ProjetoEstrategico (opcional) → Plano → Tarefa.
Suporta colunas extras flexíveis via campo JSON `raw_extra` em Tarefa.
"""

from __future__ import annotations

from datetime import date, datetime
from typing import Optional

from sqlalchemy import (
    JSON,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from licenciaminer.planos_acao.database import Base


class ClientePA(Base):
    """Cliente (titular do plano). Ex: MUSA, Vale, CSN."""

    __tablename__ = "pa_clientes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nome: Mapped[str] = mapped_column(String(200), unique=True, nullable=False)
    descricao: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    projetos: Mapped[list["ProjetoEstrategico"]] = relationship(
        back_populates="cliente", cascade="all, delete-orphan"
    )
    planos: Mapped[list["Plano"]] = relationship(
        back_populates="cliente", cascade="all, delete-orphan"
    )


class ProjetoEstrategico(Base):
    """Guarda-chuva de planos. Ex: "Projetos Estratégicos MUSA"."""

    __tablename__ = "pa_projetos_estrategicos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    cliente_id: Mapped[int] = mapped_column(
        ForeignKey("pa_clientes.id", ondelete="CASCADE"), nullable=False
    )
    nome: Mapped[str] = mapped_column(String(200), nullable=False)
    descricao: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="ativo", nullable=False)
    data_inicio: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    data_fim: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    cliente: Mapped[ClientePA] = relationship(back_populates="projetos")
    planos: Mapped[list["Plano"]] = relationship(
        back_populates="projeto_estrategico", cascade="all, delete-orphan"
    )


class Plano(Base):
    """Plano importado de um arquivo (XLSX/CSV). Filho de Cliente, opcionalmente de Projeto."""

    __tablename__ = "pa_planos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    cliente_id: Mapped[int] = mapped_column(
        ForeignKey("pa_clientes.id", ondelete="CASCADE"), nullable=False
    )
    projeto_estrategico_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("pa_projetos_estrategicos.id", ondelete="SET NULL"), nullable=True
    )
    nome: Mapped[str] = mapped_column(String(200), nullable=False)
    descricao: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    arquivo_origem: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    # Mapeamento {campo_canonico: nome_coluna_original} resolvido no upload
    coluna_mapping: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    # Estatisticas do import (linhas/colunas/inferencias automaticas vs manuais)
    import_stats: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    versao: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    criado_em: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    cliente: Mapped[ClientePA] = relationship(back_populates="planos")
    projeto_estrategico: Mapped[Optional[ProjetoEstrategico]] = relationship(back_populates="planos")
    tarefas: Mapped[list["TarefaPA"]] = relationship(
        back_populates="plano", cascade="all, delete-orphan"
    )


class TarefaPA(Base):
    """Tarefa/ação importada de um plano. Schema canônico + raw_extra flexível."""

    __tablename__ = "pa_tarefas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    plano_id: Mapped[int] = mapped_column(
        ForeignKey("pa_planos.id", ondelete="CASCADE"), nullable=False
    )
    ordem: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Campos canônicos
    descricao: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    data_inicio: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    data_fim: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    responsavel_pessoa: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    area_responsavel: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    status: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    classificacao: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    eap_codigo: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    eap_nivel: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    parent_eap: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    pct_concluido: Mapped[Optional[float]] = mapped_column(nullable=True)

    # Tudo o que não bateu com campos canônicos
    raw_extra: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    criado_em: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    plano: Mapped[Plano] = relationship(back_populates="tarefas")
