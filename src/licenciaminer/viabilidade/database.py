"""SQLite isolado do modulo Viabilidade (data/viabilidade.db).

Persiste historico de analises preliminares feitas — input + resultado +
metadados — para que o consultor possa retomar trabalhos anteriores e
acompanhar conversoes (analise -> proposta -> DD contratada).
"""

from __future__ import annotations

import logging
from collections.abc import Generator
from datetime import datetime
from pathlib import Path
from typing import Optional

from sqlalchemy import JSON, DateTime, Integer, String, Text, create_engine
from sqlalchemy.orm import (
    DeclarativeBase,
    Mapped,
    Session,
    mapped_column,
    sessionmaker,
)

logger = logging.getLogger(__name__)

DB_PATH = Path(__file__).resolve().parents[3] / "data" / "viabilidade.db"
DB_URL = f"sqlite:///{DB_PATH.as_posix()}"

engine = create_engine(
    DB_URL,
    connect_args={"check_same_thread": False},
    future=True,
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


class Base(DeclarativeBase):
    pass


class Analise(Base):
    """Analise de viabilidade salva — snapshot do input + resultado calculado."""

    __tablename__ = "via_analises"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    titulo: Mapped[str] = mapped_column(String(200), nullable=False)
    cnpj: Mapped[Optional[str]] = mapped_column(String(14), nullable=True, index=True)
    razao_social: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    atividade: Mapped[str] = mapped_column(String(20), nullable=False)
    classe: Mapped[int] = mapped_column(Integer, nullable=False)
    regional: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    licenca_tipo: Mapped[str] = mapped_column(String(20), nullable=False)

    # Snapshot completo do resultado retornado pelo /viabilidade/perfil
    resultado: Mapped[dict] = mapped_column(JSON, nullable=False)
    notas: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    criado_em: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )


def get_session() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    Base.metadata.create_all(engine)
    logger.info(f"Viabilidade: SQLite pronto em {DB_PATH}")
