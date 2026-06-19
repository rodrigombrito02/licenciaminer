"""SQLite isolado do módulo Due Diligence editável (data/dd.db).

Hierarquia: Template (régua-mestre versionada) → Documento → Critério.
Instância = snapshot congelado do template para um cliente/escopo, com avaliação
por critério. Auditoria registra quem mudou o quê.

Espelha o padrão de src/licenciaminer/sqsolucoes/database.py.
"""

from __future__ import annotations

import logging
from collections.abc import Generator
from datetime import datetime
from pathlib import Path
from typing import Optional

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    create_engine,
)
from sqlalchemy.orm import (
    DeclarativeBase,
    Mapped,
    Session,
    mapped_column,
    relationship,
    sessionmaker,
)

logger = logging.getLogger(__name__)

DB_PATH = Path(__file__).resolve().parents[3] / "data" / "dd.db"
DB_URL = f"sqlite:///{DB_PATH.as_posix()}"

engine = create_engine(DB_URL, connect_args={"check_same_thread": False}, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


class Base(DeclarativeBase):
    pass


# ── Vocabulário ──
PROVENIENCIA = ["normativo", "consultor"]
OBRIGATORIEDADE = ["obrigatorio", "desejavel"]
OBJETO_TIPO = ["licenca_ambiental", "anuencia", "regularizacao_fundiaria"]
INSTANCIA_STATUS = ["rascunho", "em_avaliacao", "concluida", "arquivada"]
# Mesma escala de app/components/dd_scoring.AVALIACOES (Não Aplica = fora do cálculo)
AVALIACAO_VALORES = {
    "Atende": 1.0,
    "Atende Parcialmente": 0.5,
    "Não Atende": 0.0,
    "Não Aplica": None,
}


# ════════════════════════════════════════════════════════════════════
#  TEMPLATE (régua-mestre) → DOCUMENTO → CRITÉRIO
# ════════════════════════════════════════════════════════════════════
class DDTemplate(Base):
    __tablename__ = "dd_templates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    objeto_tipo: Mapped[str] = mapped_column(String(40), default="licenca_ambiental")
    licenca_codigo: Mapped[str] = mapped_column(String(40))
    nome: Mapped[str] = mapped_column(String(200))
    descricao: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    versao: Mapped[int] = mapped_column(Integer, default=1)
    norma_origem: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    ativo: Mapped[bool] = mapped_column(Boolean, default=True)
    criado_por: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    documentos: Mapped[list["DDDocumento"]] = relationship(
        back_populates="template", cascade="all, delete-orphan"
    )


class DDDocumento(Base):
    __tablename__ = "dd_documentos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    template_id: Mapped[int] = mapped_column(ForeignKey("dd_templates.id", ondelete="CASCADE"))
    doc_id: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    nome: Mapped[str] = mapped_column(String(250))
    descricao: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    modulo: Mapped[Optional[str]] = mapped_column(String(160), nullable=True)
    norma_referencia: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    obrigatorio: Mapped[bool] = mapped_column(Boolean, default=True)
    ordem: Mapped[int] = mapped_column(Integer, default=0)

    template: Mapped[DDTemplate] = relationship(back_populates="documentos")
    criterios: Mapped[list["DDCriterio"]] = relationship(
        back_populates="documento", cascade="all, delete-orphan"
    )


class DDCriterio(Base):
    __tablename__ = "dd_criterios"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    documento_id: Mapped[int] = mapped_column(ForeignKey("dd_documentos.id", ondelete="CASCADE"))
    requisito_id: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)
    topico: Mapped[Optional[str]] = mapped_column(String(250), nullable=True)
    teste_aderencia: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    evidencia_esperada: Mapped[str] = mapped_column(Text)
    proveniencia: Mapped[str] = mapped_column(String(20), default="normativo")
    obrigatoriedade: Mapped[str] = mapped_column(String(20), default="obrigatorio")
    peso: Mapped[float] = mapped_column(Float, default=1.0)
    impacto: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    norma_origem: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    artigo_referencia: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    ativo: Mapped[bool] = mapped_column(Boolean, default=True)
    ordem: Mapped[int] = mapped_column(Integer, default=0)

    documento: Mapped[DDDocumento] = relationship(back_populates="criterios")


# ════════════════════════════════════════════════════════════════════
#  INSTÂNCIA (snapshot por cliente/escopo) → DOCUMENTO → CRITÉRIO (avaliado)
# ════════════════════════════════════════════════════════════════════
class DDInstancia(Base):
    __tablename__ = "dd_instancias"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    template_id: Mapped[int] = mapped_column(Integer)
    template_versao: Mapped[int] = mapped_column(Integer, default=1)
    objeto_tipo: Mapped[str] = mapped_column(String(40))
    licenca_codigo: Mapped[str] = mapped_column(String(40))
    cliente: Mapped[str] = mapped_column(String(200))
    escopo: Mapped[Optional[str]] = mapped_column(String(250), nullable=True)
    atividade: Mapped[Optional[str]] = mapped_column(String(60), nullable=True)
    classe: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="rascunho")
    responsavel: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    criado_por: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    documentos: Mapped[list["DDInstanciaDocumento"]] = relationship(
        back_populates="instancia", cascade="all, delete-orphan"
    )


class DDInstanciaDocumento(Base):
    __tablename__ = "dd_instancia_documentos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    instancia_id: Mapped[int] = mapped_column(ForeignKey("dd_instancias.id", ondelete="CASCADE"))
    doc_id: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    nome: Mapped[str] = mapped_column(String(250))
    modulo: Mapped[Optional[str]] = mapped_column(String(160), nullable=True)
    norma_referencia: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    obrigatorio: Mapped[bool] = mapped_column(Boolean, default=True)
    status_doc: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    arquivo_ref: Mapped[Optional[str]] = mapped_column(String(250), nullable=True)
    ordem: Mapped[int] = mapped_column(Integer, default=0)

    instancia: Mapped[DDInstancia] = relationship(back_populates="documentos")
    criterios: Mapped[list["DDInstanciaCriterio"]] = relationship(
        back_populates="documento", cascade="all, delete-orphan"
    )


class DDInstanciaCriterio(Base):
    __tablename__ = "dd_instancia_criterios"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    inst_documento_id: Mapped[int] = mapped_column(
        ForeignKey("dd_instancia_documentos.id", ondelete="CASCADE")
    )
    criterio_origem_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    requisito_id: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)
    topico: Mapped[Optional[str]] = mapped_column(String(250), nullable=True)
    teste_aderencia: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    evidencia_esperada: Mapped[str] = mapped_column(Text)
    proveniencia: Mapped[str] = mapped_column(String(20), default="normativo")
    obrigatoriedade: Mapped[str] = mapped_column(String(20), default="obrigatorio")
    peso: Mapped[float] = mapped_column(Float, default=1.0)
    # avaliação do consultor
    avaliacao: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    observacao: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    evidencia_encontrada: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    fonte_avaliacao: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    ordem: Mapped[int] = mapped_column(Integer, default=0)

    documento: Mapped[DDInstanciaDocumento] = relationship(back_populates="criterios")


class DDAuditoria(Base):
    __tablename__ = "dd_auditoria"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    entidade: Mapped[str] = mapped_column(String(30))
    entidade_id: Mapped[int] = mapped_column(Integer)
    acao: Mapped[str] = mapped_column(String(30))
    autor: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    justificativa: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    diff: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


# ════════════════════════════════════════════════════════════════════
#  Helpers
# ════════════════════════════════════════════════════════════════════
def registrar_auditoria(
    db: Session,
    entidade: str,
    entidade_id: int,
    acao: str,
    autor: str | None = None,
    justificativa: str | None = None,
    diff: dict | None = None,
) -> None:
    db.add(
        DDAuditoria(
            entidade=entidade,
            entidade_id=entidade_id,
            acao=acao,
            autor=autor,
            justificativa=justificativa,
            diff=diff,
        )
    )


def criar_instancia_snapshot(
    db: Session,
    template: DDTemplate,
    cliente: str,
    escopo: str | None = None,
    atividade: str | None = None,
    classe: int | None = None,
    responsavel: str | None = None,
    criado_por: str | None = None,
    status: str = "rascunho",
) -> DDInstancia:
    """Congela o template (na versão atual) numa instância para um cliente.

    Reutilizado pelo router (POST /instancias) e pelo seed (instâncias Jaguar).
    """
    inst = DDInstancia(
        template_id=template.id,
        template_versao=template.versao,
        objeto_tipo=template.objeto_tipo,
        licenca_codigo=template.licenca_codigo,
        cliente=cliente,
        escopo=escopo,
        atividade=atividade,
        classe=classe,
        responsavel=responsavel,
        criado_por=criado_por,
        status=status,
    )
    db.add(inst)
    db.flush()

    for doc in sorted(template.documentos, key=lambda d: d.ordem):
        idoc = DDInstanciaDocumento(
            instancia_id=inst.id,
            doc_id=doc.doc_id,
            nome=doc.nome,
            modulo=doc.modulo,
            norma_referencia=doc.norma_referencia,
            obrigatorio=doc.obrigatorio,
            ordem=doc.ordem,
        )
        db.add(idoc)
        db.flush()
        for crit in sorted(doc.criterios, key=lambda c: c.ordem):
            if not crit.ativo:
                continue
            db.add(
                DDInstanciaCriterio(
                    inst_documento_id=idoc.id,
                    criterio_origem_id=crit.id,
                    requisito_id=crit.requisito_id,
                    topico=crit.topico,
                    teste_aderencia=crit.teste_aderencia,
                    evidencia_esperada=crit.evidencia_esperada,
                    proveniencia=crit.proveniencia,
                    obrigatoriedade=crit.obrigatoriedade,
                    peso=crit.peso,
                    ordem=crit.ordem,
                )
            )

    registrar_auditoria(
        db, "instancia", inst.id, "snapshot",
        autor=criado_por,
        justificativa=f"Snapshot do template {template.licenca_codigo} v{template.versao}",
    )
    return inst


def get_session() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    Base.metadata.create_all(engine)
    logger.info(f"Due Diligence (editável): SQLite pronto em {DB_PATH}")
