"""SQLite isolado riscos_v2 — Cliente -> Projeto -> Risco (matriz)."""

from __future__ import annotations

import logging
from collections.abc import Generator
from datetime import date, datetime
from pathlib import Path
from typing import Optional

from sqlalchemy import (
    JSON,
    Date,
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

DB_PATH = Path(__file__).resolve().parents[3] / "data" / "riscos_v2.db"
DB_URL = f"sqlite:///{DB_PATH.as_posix()}"

engine = create_engine(DB_URL, connect_args={"check_same_thread": False}, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


class Base(DeclarativeBase):
    pass


class ClienteRV(Base):
    __tablename__ = "rv_clientes"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nome: Mapped[str] = mapped_column(String(200), unique=True, nullable=False)
    descricao: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    projetos: Mapped[list["ProjetoRV"]] = relationship(back_populates="cliente", cascade="all, delete-orphan")


class ProjetoRV(Base):
    __tablename__ = "rv_projetos"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    cliente_id: Mapped[int] = mapped_column(ForeignKey("rv_clientes.id", ondelete="CASCADE"), nullable=False)
    nome: Mapped[str] = mapped_column(String(200), nullable=False)
    descricao: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # 'erm' (corporativo) | 'projeto' (ISO 31000) | 'crise'
    tipo: Mapped[str] = mapped_column(String(20), default="projeto", nullable=False)
    status: Mapped[str] = mapped_column(String(40), default="ativo", nullable=False)
    criado_em: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    cliente: Mapped[ClienteRV] = relationship(back_populates="projetos")
    riscos: Mapped[list["RiscoRV"]] = relationship(back_populates="projeto", cascade="all, delete-orphan")


class RiscoRV(Base):
    __tablename__ = "rv_riscos"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    projeto_id: Mapped[int] = mapped_column(ForeignKey("rv_projetos.id", ondelete="CASCADE"), nullable=False)

    codigo: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    titulo: Mapped[str] = mapped_column(String(300), nullable=False)
    descricao: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    categoria: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    causa: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    consequencia: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Avaliacao (matriz 5x5 padrao)
    probabilidade: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)  # 1-5
    impacto: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)  # 1-5
    severidade: Mapped[Optional[float]] = mapped_column(Float, nullable=True)  # P * I

    nivel: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # baixo/moderado/alto/critico

    # Tratamento
    estrategia: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # mitigar/aceitar/transferir/evitar
    responsavel: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    prazo: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(String(40), default="identificado", nullable=False)

    raw_extra: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    projeto: Mapped[ProjetoRV] = relationship(back_populates="riscos")


def get_session() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    Base.metadata.create_all(engine)
    logger.info(f"Riscos v2: SQLite pronto em {DB_PATH}")
