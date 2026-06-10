"""Modelos de monitoramento: KRIs, TesteControle histórico, RiskAppetite.

Fecha o ciclo ISO 31000: após identificar/avaliar/tratar, a organização precisa
**monitorar** continuamente. Esse módulo cobre:

- KRI (Key Risk Indicator): indicadores quantitativos com thresholds verde/amarelo/vermelho
- KRIMedicao: histórico temporal de cada KRI (viabiliza séries e alertas)
- TesteControle: histórico completo de testes periódicos de controles (além do último_teste já existente)
- RiskAppetite: declaração formal de apetite + tolerância por categoria
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

from licenciaminer.riscos.models import Base, Categoria, Controle, Pessoa, Risco


class KRI(Base):
    __tablename__ = "kri"

    id: Mapped[int] = mapped_column(primary_key=True)
    codigo: Mapped[str] = mapped_column(String(40), unique=True)
    nome: Mapped[str] = mapped_column(String(300))
    descricao: Mapped[Optional[str]] = mapped_column(Text)
    risco_id: Mapped[Optional[int]] = mapped_column(ForeignKey("risco.id"))
    categoria_id: Mapped[Optional[int]] = mapped_column(ForeignKey("categoria.id"))
    responsavel_id: Mapped[Optional[int]] = mapped_column(ForeignKey("pessoa.id"))
    unidade: Mapped[str] = mapped_column(String(40))  # "%", "dias", "#", "R$", "mg/L", etc.
    formula_descricao: Mapped[Optional[str]] = mapped_column(Text)
    # "direcao" define se valor ALTO é ruim ou bom
    direcao: Mapped[str] = mapped_column(String(20), default="subir_pior")
    # subir_pior: quanto maior, pior. descer_pior: quanto menor, pior.
    limite_verde: Mapped[Optional[float]] = mapped_column(Float)
    limite_amarelo: Mapped[Optional[float]] = mapped_column(Float)
    limite_vermelho: Mapped[Optional[float]] = mapped_column(Float)
    periodicidade: Mapped[str] = mapped_column(String(40), default="mensal")
    # diaria | semanal | mensal | trimestral | semestral | anual
    ativo: Mapped[bool] = mapped_column(Boolean, default=True)
    fonte_dados: Mapped[Optional[str]] = mapped_column(String(200))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    risco: Mapped[Optional[Risco]] = relationship()
    categoria: Mapped[Optional[Categoria]] = relationship()
    responsavel: Mapped[Optional[Pessoa]] = relationship()
    medicoes: Mapped[list["KRIMedicao"]] = relationship(
        back_populates="kri",
        cascade="all, delete-orphan",
        order_by="KRIMedicao.data.desc()",
    )


class KRIMedicao(Base):
    __tablename__ = "kri_medicao"

    id: Mapped[int] = mapped_column(primary_key=True)
    kri_id: Mapped[int] = mapped_column(ForeignKey("kri.id"))
    data: Mapped[date] = mapped_column(Date)
    valor: Mapped[float] = mapped_column(Float)
    status: Mapped[Optional[str]] = mapped_column(String(10))  # verde | amarelo | vermelho
    observacao: Mapped[Optional[str]] = mapped_column(Text)
    registrado_por_id: Mapped[Optional[int]] = mapped_column(ForeignKey("pessoa.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    kri: Mapped[KRI] = relationship(back_populates="medicoes")
    registrado_por: Mapped[Optional[Pessoa]] = relationship()


class TesteControle(Base):
    __tablename__ = "teste_controle"

    id: Mapped[int] = mapped_column(primary_key=True)
    controle_id: Mapped[int] = mapped_column(ForeignKey("controle.id"))
    data_teste: Mapped[date] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(30))  # aprovado | parcial | reprovado
    metodologia: Mapped[Optional[str]] = mapped_column(String(200))
    evidencia: Mapped[Optional[str]] = mapped_column(Text)
    # Texto livre: link, descrição, hash de evidência, base64 pequeno
    gaps_identificados: Mapped[Optional[str]] = mapped_column(Text)
    plano_acao_remediacao: Mapped[Optional[str]] = mapped_column(Text)
    executor_id: Mapped[Optional[int]] = mapped_column(ForeignKey("pessoa.id"))
    aprovador_id: Mapped[Optional[int]] = mapped_column(ForeignKey("pessoa.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    controle: Mapped[Controle] = relationship()
    executor: Mapped[Optional[Pessoa]] = relationship(foreign_keys=[executor_id])
    aprovador: Mapped[Optional[Pessoa]] = relationship(foreign_keys=[aprovador_id])


class RiskAppetite(Base):
    __tablename__ = "risk_appetite"

    id: Mapped[int] = mapped_column(primary_key=True)
    categoria_id: Mapped[Optional[int]] = mapped_column(ForeignKey("categoria.id"))
    categoria_erm_id: Mapped[Optional[int]] = mapped_column(ForeignKey("categoria_erm.id"))
    escopo: Mapped[str] = mapped_column(String(120), default="global")
    # global | por_categoria | por_estagio
    apetite_nivel: Mapped[int] = mapped_column(Integer, default=3)
    # 1 = muito avesso / 5 = muito agressivo
    tolerancia_max_classificacao: Mapped[str] = mapped_column(String(4), default="MS")
    # Máxima classificação aceita antes de escalation (PS/S/MS/C)
    descricao: Mapped[Optional[str]] = mapped_column(Text)
    trigger_escalation: Mapped[Optional[str]] = mapped_column(Text)
    # Ex: "Se qualquer risco desta categoria chegar em C, notificar CEO"
    data_aprovacao: Mapped[Optional[date]] = mapped_column(Date)
    aprovador_id: Mapped[Optional[int]] = mapped_column(ForeignKey("pessoa.id"))
    ativo: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    categoria: Mapped[Optional[Categoria]] = relationship()
    aprovador: Mapped[Optional[Pessoa]] = relationship()
