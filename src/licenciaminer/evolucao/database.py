"""SQLite isolado do modulo Evolucao do Sistema (data/evolucao.db)."""

from __future__ import annotations

import logging
from collections.abc import Generator
from datetime import datetime
from pathlib import Path
from typing import Optional

from sqlalchemy import (
    JSON,
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

DB_PATH = Path(__file__).resolve().parents[3] / "data" / "evolucao.db"
DB_URL = f"sqlite:///{DB_PATH.as_posix()}"

engine = create_engine(DB_URL, connect_args={"check_same_thread": False}, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


class Base(DeclarativeBase):
    pass


# Tipos de item
TIPOS = ["funcionalidade", "sprint", "sugestao", "produto"]

# Modulos do sistema (frentes)
MODULOS = [
    "Plataforma",
    "SQ Ambiental",
    "Ativos Minerários",
    "SQ Mineral Intelligence",
    "SQ Consultoria",
    "SQ Soluções",
    "Captação",
    "Integração de Ferramentas",
]

# Status por tipo (workflow)
STATUS_SPRINT = ["proposta", "aprovada", "em_dev", "entregue", "validada", "recusada"]
# no_ar = funcionalidade publicada | em_sprint = em desenvolvimento |
# em_breve = placeholder estrutural (planejada, ainda nao construida) | ideia = backlog
STATUS_FUNCIONALIDADE = ["no_ar", "em_sprint", "em_breve", "ideia"]
STATUS_SUGESTAO = ["nova", "em_avaliacao", "aprovada", "recusada"]
STATUS_PRODUTO = ["em_avaliacao", "aprovado", "reprovado"]

# Niveis de visibilidade (as 5 visoes) — chaves usadas em ItemEvolucao.visibilidade
NIVEIS_VISIBILIDADE = [
    "anonimo",          # visitante sem login
    "visitante_free",   # visitante logado
    "visitante_pago",   # assinante
    "consultor",        # consultor Summo
    "admin",            # admin/socio
]

# Origens de uma sugestao
ORIGENS = ["reuniao", "claude_local", "cliente", "interno"]


class ItemEvolucao(Base):
    """Item do acervo de evolucao — funcionalidade, sprint ou sugestao."""

    __tablename__ = "ev_itens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tipo: Mapped[str] = mapped_column(String(20), nullable=False)  # funcionalidade|sprint|sugestao
    titulo: Mapped[str] = mapped_column(String(250), nullable=False)
    descricao: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    modulo: Mapped[Optional[str]] = mapped_column(String(60), nullable=True)
    status: Mapped[str] = mapped_column(String(30), nullable=False)
    prioridade: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # alta|media|baixa

    # Em quais das 5 visoes a funcionalidade aparece (lista de NIVEIS_VISIBILIDADE)
    visibilidade: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    # Telas/rotas afetadas
    telas: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)

    # Para sugestoes: de onde veio
    origem: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    origem_detalhe: Mapped[Optional[str]] = mapped_column(String(250), nullable=True)

    # Evidencia de entrega (link, print, descricao)
    evidencia: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    autor: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    fase: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # ex: "0.4"

    criado_em: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    comentarios: Mapped[list["ComentarioEvolucao"]] = relationship(
        back_populates="item", cascade="all, delete-orphan"
    )
    anexos: Mapped[list["AnexoEvolucao"]] = relationship(
        back_populates="item", cascade="all, delete-orphan"
    )


class ComentarioEvolucao(Base):
    """Comentario + voto de um socio sobre um item."""

    __tablename__ = "ev_comentarios"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    item_id: Mapped[int] = mapped_column(
        ForeignKey("ev_itens.id", ondelete="CASCADE"), nullable=False
    )
    autor: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    texto: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    voto: Mapped[Optional[str]] = mapped_column(String(15), nullable=True)  # aprovar|reprovar
    criado_em: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    item: Mapped[ItemEvolucao] = relationship(back_populates="comentarios")


class AnexoEvolucao(Base):
    """Arquivo anexado a um item (ex: Lima sobe planilha/PDF de uma ideia)."""

    __tablename__ = "ev_anexos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    item_id: Mapped[int] = mapped_column(
        ForeignKey("ev_itens.id", ondelete="CASCADE"), nullable=False
    )
    nome_arquivo: Mapped[str] = mapped_column(String(300), nullable=False)
    caminho: Mapped[str] = mapped_column(String(500), nullable=False)
    tamanho: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    enviado_por: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    item: Mapped[ItemEvolucao] = relationship(back_populates="anexos")


def get_session() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    Base.metadata.create_all(engine)
    logger.info(f"Evolucao: SQLite pronto em {DB_PATH}")
