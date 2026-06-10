"""SQLite isolado do Funil de Oportunidades (data/oportunidades.db).

Persiste prospects + avaliacoes + relatorios de viabilidade. Restrito a
socios/admin.
"""

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

DB_PATH = Path(__file__).resolve().parents[3] / "data" / "oportunidades.db"
DB_URL = f"sqlite:///{DB_PATH.as_posix()}"

engine = create_engine(DB_URL, connect_args={"check_same_thread": False}, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


class Base(DeclarativeBase):
    pass


# Etapas do funil — usadas em Oportunidade.etapa
ETAPAS = [
    "prospect",
    "avaliacao",
    "relatorio",
    "investidores",
    "aprovacao",
    "estruturacao",
    "implantacao",
    "operacao",
]


class Oportunidade(Base):
    """Oportunidade de direito minerario no funil de prospects."""

    __tablename__ = "op_oportunidades"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    titulo: Mapped[str] = mapped_column(String(200), nullable=False)
    descricao: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Etapa atual no funil
    etapa: Mapped[str] = mapped_column(String(30), default="prospect", nullable=False)

    # Dados geograficos / ANM (snapshot do polígono)
    processo_anm: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    substancia: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    fase_anm: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    area_ha: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    municipio: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    uf: Mapped[Optional[str]] = mapped_column(String(2), nullable=True)

    # Avaliacao por parametro (1-10 ou nulo se nao avaliado)
    score_agua: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    score_energia: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    score_logistica: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    score_mao_obra: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    score_licenciamento: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    score_financeiro: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    score_stakeholder: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    score_geologico: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    score_climatico: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Notas livres por parametro (texto curto explicativo)
    notas_avaliacao: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    # Metadados
    responsavel: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    valor_estimado: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    prazo_etapa: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    criado_por: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    historico: Mapped[list["MudancaEtapa"]] = relationship(
        back_populates="oportunidade", cascade="all, delete-orphan"
    )


class MudancaEtapa(Base):
    """Log de mudancas de etapa para auditoria do funil."""

    __tablename__ = "op_mudancas_etapa"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    oportunidade_id: Mapped[int] = mapped_column(
        ForeignKey("op_oportunidades.id", ondelete="CASCADE"), nullable=False
    )
    etapa_anterior: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    etapa_nova: Mapped[str] = mapped_column(String(30), nullable=False)
    nota: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    por: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    em: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    oportunidade: Mapped[Oportunidade] = relationship(back_populates="historico")


def get_session() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    Base.metadata.create_all(engine)
    logger.info(f"Oportunidades: SQLite pronto em {DB_PATH}")
