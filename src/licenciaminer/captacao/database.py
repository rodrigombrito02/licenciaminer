"""SQLite isolado do módulo Captação (data/captacao.db).

Persiste demandas (leads) + interações. Interno (consultor/admin).
"""

from __future__ import annotations

import logging
from collections.abc import Generator
from datetime import datetime
from pathlib import Path
from typing import Optional

from sqlalchemy import (
    JSON,
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

DB_PATH = Path(__file__).resolve().parents[3] / "data" / "captacao.db"
DB_URL = f"sqlite:///{DB_PATH.as_posix()}"

engine = create_engine(DB_URL, connect_args={"check_same_thread": False}, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


class Base(DeclarativeBase):
    pass


# De onde veio o lead (CTA de qual produto / canal)
ORIGENS = [
    "sq_ambiental",
    "ativos",
    "mineral_intelligence",
    "sq_consultoria",
    "sq_solucoes",
    "site",
    "indicacao",
    "outro",
]

# Frente de negócio que vai atender
FRENTES = [
    "ambiental",
    "ativos",
    "mineral_intelligence",
    "consultoria",
    "solucoes",
]

# Status no funil de captação (pré-Funil de Oportunidades)
STATUS = ["novo", "qualificando", "proposta", "ganho", "perdido"]


class Demanda(Base):
    """Lead/demanda que entra na captação."""

    __tablename__ = "cap_demandas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    titulo: Mapped[str] = mapped_column(String(200), nullable=False)
    descricao: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    origem: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    frente: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="novo", nullable=False)

    # Contato
    contato_nome: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    contato_email: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    contato_telefone: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)
    empresa: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    cnpj: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)

    # Vínculos com o resto do sistema (o que liga captação ↔ funil ↔ ativo)
    oportunidade_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    processo_anm: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # Dossiê do prospect: análise da oportunidade + proposta + links integrados
    # (instâncias DD, notícia, ativos por CNPJ). Torna a captação o ponto de
    # partida com acesso a tudo que produzimos sobre o lead.
    analise: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    proposta_url: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    links: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)  # [{label,url,tipo}]

    responsavel: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    valor_estimado: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    criado_por: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    interacoes: Mapped[list["InteracaoDemanda"]] = relationship(
        back_populates="demanda", cascade="all, delete-orphan"
    )


class InteracaoDemanda(Base):
    """Registro de um toque/contato com a demanda."""

    __tablename__ = "cap_interacoes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    demanda_id: Mapped[int] = mapped_column(
        ForeignKey("cap_demandas.id", ondelete="CASCADE"), nullable=False
    )
    autor: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    texto: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    tipo: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)  # nota|email|ligacao|reuniao
    criado_em: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    demanda: Mapped[Demanda] = relationship(back_populates="interacoes")


def get_session() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _ensure_columns() -> None:
    """Migração leve: adiciona colunas do dossiê a bancos já existentes.

    create_all não altera tabelas pré-existentes; este ADD COLUMN idempotente
    garante analise/proposta_url/links em captacao.db já em produção.
    """
    with engine.begin() as conn:
        existentes = {r[1] for r in conn.exec_driver_sql("PRAGMA table_info(cap_demandas)")}
        for nome, ddl in (("analise", "TEXT"), ("proposta_url", "VARCHAR(300)"), ("links", "TEXT")):
            if nome not in existentes:
                conn.exec_driver_sql(f"ALTER TABLE cap_demandas ADD COLUMN {nome} {ddl}")
                logger.info("Captação: coluna %s adicionada a cap_demandas", nome)


def init_db() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    Base.metadata.create_all(engine)
    _ensure_columns()
    logger.info(f"Captação: SQLite pronto em {DB_PATH}")
