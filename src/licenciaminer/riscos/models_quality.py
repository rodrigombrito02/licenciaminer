"""Modelos do M5 — Gestão da Qualidade (PMBoK §8 + ISO 21500/21502 + ISO 9001).

Escopo:
- Requisitos de qualidade (specs, normas NBR/ASME/IEC, critérios de aceitação)
- Inspeções (QC) — execuções planejadas e realizadas contra requisitos
- Não conformidades (NCs) com análise de causa raiz 5-Why (+ Ishikawa opcional)
- Auditorias (QA) periódicas — processo, conformidade, follow-up
- Métricas/KPIs de qualidade (FPY, taxa NC, MTTR NC, % auditorias no prazo)

Integrações:
- NC.wbs_node_id → liga a pacote WBS
- NC.risco_id → liga a risco (materialização)
- NC.acao_corretiva_id → aproveita módulo de Ações existente para tratamento formal
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


class RequisitoQualidade(Base):
    """Requisito de qualidade — especificação, norma ou critério de aceitação.

    PMBoK §8.1 Planejar Qualidade / ISO 9001 §7.5 Informação documentada.
    """

    __tablename__ = "requisito_qualidade"

    id: Mapped[int] = mapped_column(primary_key=True)
    projeto_id: Mapped[int] = mapped_column(ForeignKey("projeto.id"))
    wbs_node_id: Mapped[Optional[int]] = mapped_column(ForeignKey("wbs_node.id"))

    codigo: Mapped[str] = mapped_column(String(40))
    titulo: Mapped[str] = mapped_column(String(300))
    descricao: Mapped[Optional[str]] = mapped_column(Text)

    categoria: Mapped[str] = mapped_column(String(40), default="tecnico")
    # tecnico | processo | seguranca | ambiental | contratual | regulatorio

    norma_referencia: Mapped[Optional[str]] = mapped_column(String(200))
    # Ex: "ABNT NBR 13028", "ASME B31.3", "IEC 60204-1"
    criterio_aceitacao: Mapped[Optional[str]] = mapped_column(Text)
    metodo_verificacao: Mapped[Optional[str]] = mapped_column(Text)
    # Ex: "Ensaio ultrassônico", "Inspeção visual", "Teste hidrostático"

    criticidade: Mapped[str] = mapped_column(String(20), default="media")
    # baixa | media | alta | critica
    mandatorio: Mapped[bool] = mapped_column(Boolean, default=True)

    responsavel_id: Mapped[Optional[int]] = mapped_column(ForeignKey("pessoa.id"))
    status: Mapped[str] = mapped_column(String(40), default="ativo")
    # ativo | em_revisao | obsoleto

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    projeto: Mapped[Projeto] = relationship()
    responsavel: Mapped[Optional[Pessoa]] = relationship()


class InspecaoQualidade(Base):
    """Inspeção/teste de QC — execução de verificação contra requisito.

    PMBoK §8.3 Controlar Qualidade.
    """

    __tablename__ = "inspecao_qualidade"

    id: Mapped[int] = mapped_column(primary_key=True)
    projeto_id: Mapped[int] = mapped_column(ForeignKey("projeto.id"))
    requisito_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("requisito_qualidade.id")
    )
    wbs_node_id: Mapped[Optional[int]] = mapped_column(ForeignKey("wbs_node.id"))

    codigo: Mapped[str] = mapped_column(String(40))
    titulo: Mapped[str] = mapped_column(String(300))
    descricao: Mapped[Optional[str]] = mapped_column(Text)

    tipo: Mapped[str] = mapped_column(String(40), default="inspecao")
    # inspecao | ensaio | teste | comissionamento | pre_operacao | hold_point | witness_point
    fase: Mapped[Optional[str]] = mapped_column(String(40))
    # fabricacao | recebimento | montagem | pre_operacao | operacao

    data_planejada: Mapped[Optional[date]] = mapped_column(Date)
    data_execucao: Mapped[Optional[date]] = mapped_column(Date)
    inspetor_id: Mapped[Optional[int]] = mapped_column(ForeignKey("pessoa.id"))

    resultado: Mapped[str] = mapped_column(String(40), default="pendente")
    # pendente | aprovado | aprovado_ressalva | reprovado | cancelado
    observacoes: Mapped[Optional[str]] = mapped_column(Text)
    evidencia_url: Mapped[Optional[str]] = mapped_column(String(500))

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    projeto: Mapped[Projeto] = relationship()
    requisito: Mapped[Optional[RequisitoQualidade]] = relationship()
    inspetor: Mapped[Optional[Pessoa]] = relationship()


class NaoConformidade(Base):
    """Não conformidade (NC) — desvio detectado de requisito de qualidade.

    ISO 9001 §10.2 + PMBoK §8.3. Inclui análise de causa raiz via 5-Why.
    """

    __tablename__ = "nao_conformidade"

    id: Mapped[int] = mapped_column(primary_key=True)
    projeto_id: Mapped[int] = mapped_column(ForeignKey("projeto.id"))
    inspecao_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("inspecao_qualidade.id")
    )
    requisito_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("requisito_qualidade.id")
    )
    wbs_node_id: Mapped[Optional[int]] = mapped_column(ForeignKey("wbs_node.id"))
    risco_id: Mapped[Optional[int]] = mapped_column(ForeignKey("risco.id"))
    # Se NC for materialização de um risco, conecta ao registro

    codigo: Mapped[str] = mapped_column(String(40))
    titulo: Mapped[str] = mapped_column(String(300))
    descricao: Mapped[Optional[str]] = mapped_column(Text)

    severidade: Mapped[str] = mapped_column(String(20), default="media")
    # baixa | media | alta | critica
    tipo: Mapped[str] = mapped_column(String(40), default="produto")
    # produto | processo | sistema | documento | seguranca | ambiental
    origem_deteccao: Mapped[Optional[str]] = mapped_column(String(40))
    # inspecao | auditoria_interna | auditoria_externa | campo | cliente | autoridade

    # Análise de causa raiz — 5-Why
    problema_observado: Mapped[Optional[str]] = mapped_column(Text)
    why_1: Mapped[Optional[str]] = mapped_column(Text)
    why_2: Mapped[Optional[str]] = mapped_column(Text)
    why_3: Mapped[Optional[str]] = mapped_column(Text)
    why_4: Mapped[Optional[str]] = mapped_column(Text)
    why_5: Mapped[Optional[str]] = mapped_column(Text)
    causa_raiz: Mapped[Optional[str]] = mapped_column(Text)
    categoria_causa: Mapped[Optional[str]] = mapped_column(String(40))
    # metodo | maquina | material | mao_de_obra | medicao | meio_ambiente (Ishikawa 6M)

    # Tratamento
    acao_imediata: Mapped[Optional[str]] = mapped_column(Text)
    acao_corretiva_id: Mapped[Optional[int]] = mapped_column(ForeignKey("acao.id"))
    acao_preventiva_id: Mapped[Optional[int]] = mapped_column(ForeignKey("acao.id"))

    # Workflow
    status: Mapped[str] = mapped_column(String(40), default="aberta")
    # aberta | em_analise | em_tratamento | verificacao | encerrada | cancelada
    data_abertura: Mapped[date] = mapped_column(Date)
    data_encerramento: Mapped[Optional[date]] = mapped_column(Date)
    prazo_tratamento: Mapped[Optional[date]] = mapped_column(Date)
    custo_impacto: Mapped[Optional[float]] = mapped_column(Float)

    responsavel_id: Mapped[Optional[int]] = mapped_column(ForeignKey("pessoa.id"))
    aprovador_id: Mapped[Optional[int]] = mapped_column(ForeignKey("pessoa.id"))

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    projeto: Mapped[Projeto] = relationship()
    inspecao: Mapped[Optional[InspecaoQualidade]] = relationship()
    requisito: Mapped[Optional[RequisitoQualidade]] = relationship()
    responsavel: Mapped[Optional[Pessoa]] = relationship(foreign_keys=[responsavel_id])
    aprovador: Mapped[Optional[Pessoa]] = relationship(foreign_keys=[aprovador_id])


class AuditoriaQualidade(Base):
    """Auditoria de qualidade (QA) — interna ou externa, verifica conformidade de processos.

    ISO 9001 §9.2 Auditoria interna / PMBoK §8.2 Gerenciar Qualidade.
    """

    __tablename__ = "auditoria_qualidade"

    id: Mapped[int] = mapped_column(primary_key=True)
    projeto_id: Mapped[int] = mapped_column(ForeignKey("projeto.id"))

    codigo: Mapped[str] = mapped_column(String(40))
    titulo: Mapped[str] = mapped_column(String(300))
    escopo: Mapped[Optional[str]] = mapped_column(Text)
    criterios: Mapped[Optional[str]] = mapped_column(Text)
    # Normas/procedimentos usados como critério

    tipo: Mapped[str] = mapped_column(String(40), default="interna")
    # interna | externa | certificacao | cliente | regulador

    data_planejada: Mapped[Optional[date]] = mapped_column(Date)
    data_execucao_inicio: Mapped[Optional[date]] = mapped_column(Date)
    data_execucao_fim: Mapped[Optional[date]] = mapped_column(Date)
    auditor_lider_id: Mapped[Optional[int]] = mapped_column(ForeignKey("pessoa.id"))
    equipe_auditoria: Mapped[Optional[str]] = mapped_column(Text)
    organizacao_auditora: Mapped[Optional[str]] = mapped_column(String(200))

    status: Mapped[str] = mapped_column(String(40), default="planejada")
    # planejada | em_execucao | em_relatorio | concluida | cancelada
    resultado: Mapped[Optional[str]] = mapped_column(String(40))
    # conforme | conforme_ressalva | nao_conforme
    conformidade_pct: Mapped[Optional[float]] = mapped_column(Float)
    # % de requisitos auditados que estão conformes (0-100)
    ncs_abertas: Mapped[int] = mapped_column(Integer, default=0)
    pontos_melhoria: Mapped[int] = mapped_column(Integer, default=0)

    resumo_executivo: Mapped[Optional[str]] = mapped_column(Text)
    relatorio_url: Mapped[Optional[str]] = mapped_column(String(500))

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    projeto: Mapped[Projeto] = relationship()
    auditor_lider: Mapped[Optional[Pessoa]] = relationship()


class MetricaQualidade(Base):
    """Snapshot periódico de métricas/KPIs de qualidade do projeto.

    Ex: First Pass Yield, taxa de NC, MTTR NC, % de auditorias no prazo.
    """

    __tablename__ = "metrica_qualidade"

    id: Mapped[int] = mapped_column(primary_key=True)
    projeto_id: Mapped[int] = mapped_column(ForeignKey("projeto.id"))
    data_snapshot: Mapped[date] = mapped_column(Date)
    periodo: Mapped[Optional[str]] = mapped_column(String(40))
    # Ex: "2027-Q1"

    inspecoes_planejadas: Mapped[int] = mapped_column(Integer, default=0)
    inspecoes_executadas: Mapped[int] = mapped_column(Integer, default=0)
    inspecoes_aprovadas: Mapped[int] = mapped_column(Integer, default=0)
    # First Pass Yield = inspecoes_aprovadas / inspecoes_executadas

    ncs_abertas: Mapped[int] = mapped_column(Integer, default=0)
    ncs_encerradas: Mapped[int] = mapped_column(Integer, default=0)
    ncs_criticas_abertas: Mapped[int] = mapped_column(Integer, default=0)
    tempo_medio_encerramento_dias: Mapped[Optional[float]] = mapped_column(Float)

    auditorias_planejadas: Mapped[int] = mapped_column(Integer, default=0)
    auditorias_executadas: Mapped[int] = mapped_column(Integer, default=0)
    conformidade_media_pct: Mapped[Optional[float]] = mapped_column(Float)

    custo_nao_qualidade: Mapped[Optional[float]] = mapped_column(Float)
    # Custo de retrabalho + rejeição + atraso por NC

    observacoes: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    projeto: Mapped[Projeto] = relationship()
