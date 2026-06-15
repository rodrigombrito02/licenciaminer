"""SQLite isolado do Radar de Condicionantes (data/condicionantes.db)."""

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

DB_PATH = Path(__file__).resolve().parents[3] / "data" / "condicionantes.db"
DB_URL = f"sqlite:///{DB_PATH.as_posix()}"

engine = create_engine(DB_URL, connect_args={"check_same_thread": False}, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


class Base(DeclarativeBase):
    pass


TIPOS_LICENCA = ["LP", "LI", "LO", "LAS", "LAC", "AAF", "Outra"]
# Categoria do registro monitorado: ambiental (licença) ou anm (direito minerário)
CATEGORIAS = ["ambiental", "anm"]
# Tipo de prazo da condicionante/obrigação
PRAZO_TIPOS = ["data", "dias_publicacao", "recorrente", "vigencia"]
RECORRENCIAS = ["mensal", "trimestral", "semestral", "anual"]
STATUS_COND = ["pendente", "em_andamento", "cumprida", "atrasada", "nao_aplicavel"]


class Licenca(Base):
    """Licenca ambiental — cabeca do radar. Carrega ACL (modulo 0.2)."""

    __tablename__ = "cd_licencas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    # ambiental = licença + condicionantes; anm = direito minerário + prazos (TAH, exigências)
    categoria: Mapped[str] = mapped_column(String(15), default="ambiental", nullable=False)
    empreendimento: Mapped[str] = mapped_column(String(250), nullable=False)
    cnpj: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    orgao: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)  # SEMAD, IBAMA, ANM...
    processo: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    numero_licenca: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    tipo: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    data_emissao: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    data_validade: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    municipio: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    uf: Mapped[Optional[str]] = mapped_column(String(2), nullable=True)

    # ACL (modulo 0.2)
    lider_responsavel: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    criado_por: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    acl: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    criado_em: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    condicionantes: Mapped[list["Condicionante"]] = relationship(
        back_populates="licenca", cascade="all, delete-orphan"
    )


class Condicionante(Base):
    """Uma condicionante = uma obrigacao com prazo e status."""

    __tablename__ = "cd_condicionantes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    licenca_id: Mapped[int] = mapped_column(
        ForeignKey("cd_licencas.id", ondelete="CASCADE"), nullable=False
    )
    numero: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    descricao: Mapped[str] = mapped_column(Text, nullable=False)

    # Prazo
    prazo_tipo: Mapped[str] = mapped_column(String(20), default="data", nullable=False)
    prazo_data: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    prazo_dias: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)  # p/ dias_publicacao
    recorrencia: Mapped[Optional[str]] = mapped_column(String(15), nullable=True)

    responsavel: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="pendente", nullable=False)
    evidencia: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    criado_em: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    licenca: Mapped[Licenca] = relationship(back_populates="condicionantes")


def get_session() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    Base.metadata.create_all(engine)
    # Migração leve: adiciona 'categoria' em bases já existentes
    try:
        from sqlalchemy import text
        with engine.begin() as conn:
            cols = [r[1] for r in conn.execute(text("PRAGMA table_info(cd_licencas)"))]
            if "categoria" not in cols:
                conn.execute(text("ALTER TABLE cd_licencas ADD COLUMN categoria VARCHAR(15) DEFAULT 'ambiental'"))
                logger.info("Condicionantes: coluna 'categoria' adicionada")
    except Exception as exc:
        logger.warning("Condicionantes migração categoria: %s", exc)
    logger.info(f"Condicionantes: SQLite pronto em {DB_PATH}")
