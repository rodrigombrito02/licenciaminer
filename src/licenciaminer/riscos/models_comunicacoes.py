"""Modelos de Fluxo de Comunicações (ISO 31000 §6.2).

- Stakeholder: pessoas/entidades que precisam ser comunicadas (interno, externo,
  governo, comunidade, imprensa)
- Canal: meios de comunicação com características (formal, latência)
- TemplateComunicacao: rascunhos padronizados por categoria/cenário
- MatrizRACIComunicacao: quem é Responsável/Aprovador/Consultado/Informado para
  cada risco ou cenário, em cada momento (detecção, resolução, pós-evento)
- EnvioComunicacao: log das comunicações efetivamente emitidas
"""

from __future__ import annotations

from datetime import date, datetime
from typing import Optional

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from licenciaminer.riscos.models import Base


class Stakeholder(Base):
    __tablename__ = "stakeholder"

    id: Mapped[int] = mapped_column(primary_key=True)
    nome: Mapped[str] = mapped_column(String(200), unique=True)
    tipo: Mapped[str] = mapped_column(String(40))
    # interno | externo | governamental | comunidade | imprensa | cliente | fornecedor | financeiro
    organizacao: Mapped[Optional[str]] = mapped_column(String(200))
    cargo: Mapped[Optional[str]] = mapped_column(String(200))
    descricao: Mapped[Optional[str]] = mapped_column(Text)
    contato_email: Mapped[Optional[str]] = mapped_column(String(200))
    contato_telefone: Mapped[Optional[str]] = mapped_column(String(60))
    contato_outros: Mapped[Optional[str]] = mapped_column(Text)  # texto livre para rádio/alias/etc
    criticidade: Mapped[int] = mapped_column(Integer, default=3)  # 1-5
    ativo: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class Canal(Base):
    __tablename__ = "canal_comunicacao"

    id: Mapped[int] = mapped_column(primary_key=True)
    nome: Mapped[str] = mapped_column(String(80), unique=True)
    tipo: Mapped[str] = mapped_column(String(40))
    # email | telefone | whatsapp | sms | radio | oficio | reuniao | intranet | imprensa
    formal: Mapped[bool] = mapped_column(Boolean, default=False)
    latencia_min: Mapped[Optional[int]] = mapped_column(Integer)
    descricao: Mapped[Optional[str]] = mapped_column(Text)


class TemplateComunicacao(Base):
    __tablename__ = "template_comunicacao"

    id: Mapped[int] = mapped_column(primary_key=True)
    codigo: Mapped[str] = mapped_column(String(40), unique=True)
    titulo: Mapped[str] = mapped_column(String(300))
    categoria: Mapped[Optional[str]] = mapped_column(String(80))
    # deteccao | resolucao | pos_evento | rotina | crise | regulatorio | comunidades
    corpo: Mapped[str] = mapped_column(Text)  # suporta markdown simples / placeholders {nome_risco}, {data}, etc.
    canal_sugerido: Mapped[Optional[str]] = mapped_column(String(80))
    publicos_sugeridos: Mapped[Optional[str]] = mapped_column(Text)
    # Lista descritiva dos públicos (ex: "Defesa Civil, Bombeiros, ANM")
    risco_id: Mapped[Optional[int]] = mapped_column(ForeignKey("risco.id"))
    cenario_id: Mapped[Optional[int]] = mapped_column(ForeignKey("cenario_crise.id"))
    aprovacao_juridica: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )


class MatrizRACIComunicacao(Base):
    __tablename__ = "raci_comunicacao"

    id: Mapped[int] = mapped_column(primary_key=True)
    entidade_tipo: Mapped[str] = mapped_column(String(20))  # risco | cenario | bcp
    entidade_id: Mapped[int] = mapped_column(Integer)
    stakeholder_id: Mapped[int] = mapped_column(ForeignKey("stakeholder.id"))
    papel: Mapped[str] = mapped_column(String(20))
    # responsavel (R) | aprovador (A) | consultado (C) | informado (I)
    momento: Mapped[str] = mapped_column(String(40), default="deteccao")
    # deteccao | resolucao | pos_evento | continuo
    canal_preferido: Mapped[Optional[str]] = mapped_column(String(80))
    prazo_max_min: Mapped[Optional[int]] = mapped_column(Integer)
    observacao: Mapped[Optional[str]] = mapped_column(Text)
    obrigatorio: Mapped[bool] = mapped_column(Boolean, default=True)

    stakeholder: Mapped[Stakeholder] = relationship()


class EnvioComunicacao(Base):
    __tablename__ = "envio_comunicacao"

    id: Mapped[int] = mapped_column(primary_key=True)
    data_envio: Mapped[date] = mapped_column(Date)
    template_id: Mapped[Optional[int]] = mapped_column(ForeignKey("template_comunicacao.id"))
    stakeholder_id: Mapped[Optional[int]] = mapped_column(ForeignKey("stakeholder.id"))
    canal: Mapped[str] = mapped_column(String(80))
    assunto: Mapped[Optional[str]] = mapped_column(String(300))
    conteudo: Mapped[Optional[str]] = mapped_column(Text)
    entidade_tipo: Mapped[Optional[str]] = mapped_column(String(20))
    entidade_id: Mapped[Optional[int]] = mapped_column(Integer)
    enviado_por: Mapped[Optional[str]] = mapped_column(String(200))
    resultado: Mapped[Optional[str]] = mapped_column(String(40))
    # enviado | confirmado | falha | aguardando
    observacao: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    stakeholder: Mapped[Optional[Stakeholder]] = relationship()
    template: Mapped[Optional[TemplateComunicacao]] = relationship()
