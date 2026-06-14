"""SQLite isolado do módulo SQ Consultoria (data/consultoria.db).

Cliente (cadastro único) + Escopo (N por cliente, multi-frente). Interno.
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

DB_PATH = Path(__file__).resolve().parents[3] / "data" / "consultoria.db"
DB_URL = f"sqlite:///{DB_PATH.as_posix()}"

engine = create_engine(DB_URL, connect_args={"check_same_thread": False}, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


class Base(DeclarativeBase):
    pass


STATUS_CLIENTE = ["prospect", "ativo", "inativo"]

# Tipo do escopo = frente de consultoria
TIPOS_ESCOPO = ["diagnostico", "riscos_crises", "projetos", "governanca", "ambiental", "outro"]
STATUS_ESCOPO = ["proposto", "em_andamento", "concluido", "pausado"]

# Módulos internos que um escopo pode referenciar (label + rota)
MODULOS_VINCULAVEIS = {
    "riscos": {"label": "Gestão de Riscos", "href": "/gestao-riscos"},
    "crises": {"label": "Gestão de Crises", "href": "/gestao-crises"},
    "projetos": {"label": "Projetos", "href": "/projetos"},
    "planos_acao": {"label": "Plano de Ações", "href": "/planos-de-acao"},
    "comunicacoes": {"label": "Comunicações", "href": "/comunicacoes"},
    "ambiental": {"label": "SQ Ambiental", "href": "/ambiental"},
}


class Cliente(Base):
    """Cadastro único de cliente da consultoria."""

    __tablename__ = "cons_clientes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nome: Mapped[str] = mapped_column(String(200), nullable=False)
    cnpj: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    setor: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="prospect", nullable=False)

    contato_nome: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    contato_email: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    contato_telefone: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)

    responsavel: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    notas: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    criado_por: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    escopos: Mapped[list["Escopo"]] = relationship(
        back_populates="cliente", cascade="all, delete-orphan"
    )


class Escopo(Base):
    """Escopo de trabalho (engagement) de um cliente. N por cliente, multi-frente."""

    __tablename__ = "cons_escopos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    cliente_id: Mapped[int] = mapped_column(
        ForeignKey("cons_clientes.id", ondelete="CASCADE"), nullable=False
    )
    titulo: Mapped[str] = mapped_column(String(200), nullable=False)
    tipo: Mapped[str] = mapped_column(String(30), default="diagnostico", nullable=False)
    descricao: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="proposto", nullable=False)
    responsavel: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    valor: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Links para módulos internos: lista de {modulo, label, href}
    vinculos: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)

    criado_em: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    cliente: Mapped[Cliente] = relationship(back_populates="escopos")


def get_session() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    Base.metadata.create_all(engine)
    logger.info(f"SQ Consultoria: SQLite pronto em {DB_PATH}")
