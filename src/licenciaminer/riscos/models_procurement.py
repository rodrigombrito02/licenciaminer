"""Modelos do M9 — Gestão das Aquisições (PMBoK §12 + ISO 21502 §7.11).

Cobre o ciclo EPCM de suprimentos do projeto (150d padrão):
ET (Especificação Técnica) → RFP → Alinhamento → Proposta Técnica → Comercial → Contrato → Mobilização (45d)

Escopo:
- Fornecedor: cadastro qualificado (homologação, classificação)
- RFP (Request For Proposal): processo licitatório com marcos e prazos
- Contrato: execução (preço, prazo, status, aditivos)
- OrdemCompra: pedidos (POs) emitidos, parciais ou totais
- Marco de suprimentos: marco crítico do ciclo (LOA, RTE, chegada)

Integrações:
- Contrato.wbs_node_id → liga a pacote WBS
- RFP.wbs_node_id → pacote a contratar
- Fornecedor referenciado em Contrato e NC (módulo M5)
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

from licenciaminer.riscos.models import Base, Pessoa, Projeto


class Fornecedor(Base):
    """Fornecedor qualificado (pré-homologação exigida em aquisições críticas)."""

    __tablename__ = "fornecedor"

    id: Mapped[int] = mapped_column(primary_key=True)
    codigo: Mapped[str] = mapped_column(String(40))
    razao_social: Mapped[str] = mapped_column(String(300))
    cnpj: Mapped[Optional[str]] = mapped_column(String(20))
    pais: Mapped[str] = mapped_column(String(60), default="Brasil")

    categoria: Mapped[str] = mapped_column(String(40), default="equipamento")
    # equipamento | servico_engenharia | servico_construcao | servico_montagem | material | utilidade | logistica

    disciplina_epcm: Mapped[Optional[str]] = mapped_column(String(10))
    # E | P | C | M (modalidade que atende)

    porte: Mapped[str] = mapped_column(String(20), default="medio")
    # micro | pequeno | medio | grande
    tipo_contratacao: Mapped[str] = mapped_column(String(30), default="direta")
    # direta | concorrencia | pregao | inexigibilidade | emergencial

    status_homologacao: Mapped[str] = mapped_column(String(30), default="em_analise")
    # em_analise | homologado | condicional | suspenso | reprovado | bloqueado
    data_homologacao: Mapped[Optional[date]] = mapped_column(Date)
    validade_homologacao: Mapped[Optional[date]] = mapped_column(Date)

    rating_tecnico: Mapped[Optional[int]] = mapped_column(Integer)       # 1-5
    rating_comercial: Mapped[Optional[int]] = mapped_column(Integer)     # 1-5
    rating_sustentabilidade: Mapped[Optional[int]] = mapped_column(Integer)  # 1-5 (ESG)
    observacoes: Mapped[Optional[str]] = mapped_column(Text)

    contato_nome: Mapped[Optional[str]] = mapped_column(String(200))
    contato_email: Mapped[Optional[str]] = mapped_column(String(200))

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )


class RFP(Base):
    """RFP (Request For Proposal) — processo licitatório.

    Representa o ciclo ET → Proposta → Comercial → Contrato (~150d default neste projeto).
    """

    __tablename__ = "rfp"

    id: Mapped[int] = mapped_column(primary_key=True)
    projeto_id: Mapped[int] = mapped_column(ForeignKey("projeto.id"))
    wbs_node_id: Mapped[Optional[int]] = mapped_column(ForeignKey("wbs_node.id"))

    codigo: Mapped[str] = mapped_column(String(40))
    titulo: Mapped[str] = mapped_column(String(300))
    descricao: Mapped[Optional[str]] = mapped_column(Text)

    categoria: Mapped[str] = mapped_column(String(40), default="equipamento")
    disciplina_epcm: Mapped[Optional[str]] = mapped_column(String(10))

    # Ciclo real (permite medir vs. ciclo padrão 150d)
    data_et_emitida: Mapped[Optional[date]] = mapped_column(Date)
    # Dia da ET (Especificação Técnica) liberada
    data_rfp_publicada: Mapped[Optional[date]] = mapped_column(Date)
    data_propostas_recebidas: Mapped[Optional[date]] = mapped_column(Date)
    data_analise_tecnica_ok: Mapped[Optional[date]] = mapped_column(Date)
    data_negociacao_comercial_ok: Mapped[Optional[date]] = mapped_column(Date)
    data_adjudicacao: Mapped[Optional[date]] = mapped_column(Date)
    data_contrato_assinado: Mapped[Optional[date]] = mapped_column(Date)
    prazo_padrao_dias: Mapped[int] = mapped_column(Integer, default=150)

    # Convidados e propostas
    fornecedores_convidados: Mapped[int] = mapped_column(Integer, default=0)
    propostas_recebidas: Mapped[int] = mapped_column(Integer, default=0)
    propostas_validas: Mapped[int] = mapped_column(Integer, default=0)
    vencedor_id: Mapped[Optional[int]] = mapped_column(ForeignKey("fornecedor.id"))

    valor_estimado: Mapped[Optional[float]] = mapped_column(Float)
    valor_adjudicado: Mapped[Optional[float]] = mapped_column(Float)
    moeda: Mapped[str] = mapped_column(String(10), default="BRL")

    status: Mapped[str] = mapped_column(String(40), default="em_preparacao")
    # em_preparacao | publicada | analise_tecnica | negociacao | adjudicada | contratada | cancelada | suspensa
    observacoes: Mapped[Optional[str]] = mapped_column(Text)

    responsavel_id: Mapped[Optional[int]] = mapped_column(ForeignKey("pessoa.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    projeto: Mapped[Projeto] = relationship()
    vencedor: Mapped[Optional[Fornecedor]] = relationship()
    responsavel: Mapped[Optional[Pessoa]] = relationship()


class Contrato(Base):
    """Contrato com fornecedor — execução e acompanhamento."""

    __tablename__ = "contrato"

    id: Mapped[int] = mapped_column(primary_key=True)
    projeto_id: Mapped[int] = mapped_column(ForeignKey("projeto.id"))
    wbs_node_id: Mapped[Optional[int]] = mapped_column(ForeignKey("wbs_node.id"))
    rfp_id: Mapped[Optional[int]] = mapped_column(ForeignKey("rfp.id"))
    fornecedor_id: Mapped[int] = mapped_column(ForeignKey("fornecedor.id"))

    codigo: Mapped[str] = mapped_column(String(40))
    titulo: Mapped[str] = mapped_column(String(300))
    escopo: Mapped[Optional[str]] = mapped_column(Text)

    tipo: Mapped[str] = mapped_column(String(30), default="preco_unitario")
    # preco_fixo | preco_unitario | tempo_material | cost_plus | turn_key | eps
    modalidade: Mapped[Optional[str]] = mapped_column(String(20))
    # compra | servico | fornecimento_montagem

    data_assinatura: Mapped[Optional[date]] = mapped_column(Date)
    data_inicio: Mapped[Optional[date]] = mapped_column(Date)
    data_termino_prevista: Mapped[Optional[date]] = mapped_column(Date)
    data_termino_real: Mapped[Optional[date]] = mapped_column(Date)
    prazo_mobilizacao_dias: Mapped[int] = mapped_column(Integer, default=45)

    valor_original: Mapped[float] = mapped_column(Float, default=0.0)
    valor_aditivos: Mapped[float] = mapped_column(Float, default=0.0)
    valor_realizado: Mapped[float] = mapped_column(Float, default=0.0)
    moeda: Mapped[str] = mapped_column(String(10), default="BRL")
    garantias: Mapped[Optional[str]] = mapped_column(Text)
    # Ex: "Fiança bancária 10% + performance bond"

    status: Mapped[str] = mapped_column(String(40), default="vigente")
    # vigente | em_mobilizacao | em_execucao | concluido | rescindido | suspenso
    percentual_executado: Mapped[int] = mapped_column(Integer, default=0)
    qtd_aditivos: Mapped[int] = mapped_column(Integer, default=0)

    gestor_id: Mapped[Optional[int]] = mapped_column(ForeignKey("pessoa.id"))
    fiscal_id: Mapped[Optional[int]] = mapped_column(ForeignKey("pessoa.id"))
    observacoes: Mapped[Optional[str]] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    projeto: Mapped[Projeto] = relationship()
    fornecedor: Mapped[Fornecedor] = relationship()
    rfp: Mapped[Optional[RFP]] = relationship()
    gestor: Mapped[Optional[Pessoa]] = relationship(foreign_keys=[gestor_id])
    fiscal: Mapped[Optional[Pessoa]] = relationship(foreign_keys=[fiscal_id])


class OrdemCompra(Base):
    """Ordem de Compra (PO) — emitida dentro de um contrato-guarda-chuva ou standalone."""

    __tablename__ = "ordem_compra"

    id: Mapped[int] = mapped_column(primary_key=True)
    projeto_id: Mapped[int] = mapped_column(ForeignKey("projeto.id"))
    contrato_id: Mapped[Optional[int]] = mapped_column(ForeignKey("contrato.id"))
    wbs_node_id: Mapped[Optional[int]] = mapped_column(ForeignKey("wbs_node.id"))
    fornecedor_id: Mapped[int] = mapped_column(ForeignKey("fornecedor.id"))

    codigo: Mapped[str] = mapped_column(String(40))
    descricao: Mapped[Optional[str]] = mapped_column(Text)

    data_emissao: Mapped[date] = mapped_column(Date)
    data_entrega_prevista: Mapped[Optional[date]] = mapped_column(Date)
    data_entrega_real: Mapped[Optional[date]] = mapped_column(Date)

    quantidade: Mapped[Optional[float]] = mapped_column(Float)
    unidade: Mapped[Optional[str]] = mapped_column(String(20))
    valor_total: Mapped[float] = mapped_column(Float, default=0.0)
    moeda: Mapped[str] = mapped_column(String(10), default="BRL")

    status: Mapped[str] = mapped_column(String(40), default="emitida")
    # emitida | em_fabricacao | em_transporte | entregue | faturada | paga | cancelada
    e_long_lead: Mapped[bool] = mapped_column(Boolean, default=False)

    observacoes: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    projeto: Mapped[Projeto] = relationship()
    contrato: Mapped[Optional[Contrato]] = relationship()
    fornecedor: Mapped[Fornecedor] = relationship()


class MarcoSuprimentos(Base):
    """Marco crítico do ciclo de suprimentos — LOA antecipada, RTE, chegada no site."""

    __tablename__ = "marco_suprimentos"

    id: Mapped[int] = mapped_column(primary_key=True)
    projeto_id: Mapped[int] = mapped_column(ForeignKey("projeto.id"))
    wbs_node_id: Mapped[Optional[int]] = mapped_column(ForeignKey("wbs_node.id"))
    contrato_id: Mapped[Optional[int]] = mapped_column(ForeignKey("contrato.id"))

    codigo: Mapped[str] = mapped_column(String(40))
    titulo: Mapped[str] = mapped_column(String(300))
    tipo: Mapped[str] = mapped_column(String(40), default="generico")
    # loa_antecipada | rte | adjudicacao | mobilizacao | entrega_site | comissionamento_fornecedor | generico

    data_planejada: Mapped[Optional[date]] = mapped_column(Date)
    data_real: Mapped[Optional[date]] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(30), default="pendente")
    # pendente | atingido | atrasado | em_risco
    observacoes: Mapped[Optional[str]] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    projeto: Mapped[Projeto] = relationship()
