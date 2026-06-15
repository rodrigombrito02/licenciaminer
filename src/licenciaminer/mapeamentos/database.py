"""SQLite isolado do modulo Mapeamentos (data/mapeamentos.db).

Persiste teses de busca (criterios + pesos) e snapshots de resultados.
Restrito a consultor/admin Summo.
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

DB_PATH = Path(__file__).resolve().parents[3] / "data" / "mapeamentos.db"
DB_URL = f"sqlite:///{DB_PATH.as_posix()}"

engine = create_engine(DB_URL, connect_args={"check_same_thread": False}, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


class Base(DeclarativeBase):
    pass


# Objetivos / tipos de tese — orientam preset de criterios e pesos
OBJETIVOS = [
    "pf_pequeno",            # pequenos DMs para pessoa fisica (caso Gilmar)
    "investidor_estrangeiro",  # ativos avancados, substancia estrategica, porte
    "projeto_interno",       # criterios proprios Summo
    "consolidacao",          # DMs contiguos da mesma substancia (roll-up)
    "livre",                 # sem preset
]

# Status de cada resultado dentro do mapeamento
STATUS_RESULTADO = ["triagem", "analise", "descartado", "promovido"]


class Mapeamento(Base):
    """Uma tese de busca salva — criterios + pesos + metadados de acesso."""

    __tablename__ = "mp_mapeamentos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nome: Mapped[str] = mapped_column(String(200), nullable=False)
    descricao: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    objetivo: Mapped[str] = mapped_column(String(40), default="livre", nullable=False)

    # Configuracao da tese
    criterios: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    pesos: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    # Controle de acesso (logins internos Summo) — padrao: todos veem/editam
    lider_responsavel: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    criado_por: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    acl: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)  # {pode_ver:[], pode_editar:[]}

    # Estado da ultima varredura
    ultima_varredura_em: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    n_resultados: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    criado_em: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    resultados: Mapped[list["ResultadoMapeamento"]] = relationship(
        back_populates="mapeamento", cascade="all, delete-orphan"
    )


class ResultadoMapeamento(Base):
    """Snapshot de uma oportunidade encontrada pela varredura de um mapeamento.

    Persistido para permitir triagem (status, notas) sem recomputar, e para
    manter historico do que a tese retornou em cada rodada.
    """

    __tablename__ = "mp_resultados"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    mapeamento_id: Mapped[int] = mapped_column(
        ForeignKey("mp_mapeamentos.id", ondelete="CASCADE"), nullable=False
    )

    # Snapshot do direito minerario (da base local)
    processo: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    titular: Mapped[Optional[str]] = mapped_column(String(250), nullable=True)
    cpf_cnpj: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    substancia: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    categoria: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    municipio: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    uf: Mapped[Optional[str]] = mapped_column(String(2), nullable=True)
    fase: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    area_ha: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    ativo_cfem: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    cfem_total: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    ult_evento: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Resultado do ranqueamento
    score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    motivos: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)

    # Triagem humana
    status: Mapped[str] = mapped_column(String(20), default="triagem", nullable=False)
    nota: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    promovido_oportunidade_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    criado_em: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    mapeamento: Mapped[Mapeamento] = relationship(back_populates="resultados")


def get_session() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    Base.metadata.create_all(engine)
    logger.info(f"Mapeamentos: SQLite pronto em {DB_PATH}")
