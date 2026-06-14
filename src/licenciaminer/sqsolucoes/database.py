"""SQLite isolado do módulo SQ Soluções (data/sqsolucoes.db).

Cliente de serviço + Implantação (projeto) + Dispositivo (frota) + Negócio (pipeline SST).
Interno. Separado do Funil de ativos minerários (dor diferente: SST vs direito minerário).
"""

from __future__ import annotations

import logging
from collections.abc import Generator
from datetime import datetime
from pathlib import Path
from typing import Optional

from sqlalchemy import (
    JSON, DateTime, Float, ForeignKey, Integer, String, Text, create_engine,
)
from sqlalchemy.orm import (
    DeclarativeBase, Mapped, Session, mapped_column, relationship, sessionmaker,
)

logger = logging.getLogger(__name__)

DB_PATH = Path(__file__).resolve().parents[3] / "data" / "sqsolucoes.db"
DB_URL = f"sqlite:///{DB_PATH.as_posix()}"

engine = create_engine(DB_URL, connect_args={"check_same_thread": False}, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


class Base(DeclarativeBase):
    pass


# 5 modalidades de receita
MODALIDADES = {
    "1_comissao": "Comissão padrão",
    "2_comissao_majorada": "Comissão majorada (video analytics)",
    "3_equity": "Equity por serviço comercial",
    "4_reseller": "Reseller (USD→BRL)",
    "5_in_loco": "Serviços técnicos in loco (CLT)",
}

# 10 fases do funil comercial SQS (spec do Leo) + probabilidade
FASES_PIPELINE = {
    "lead": 5, "qualificado": 15, "diagnostico": 30, "poc": 50,
    "proposta": 65, "negociacao": 80, "contrato": 95,
    "faturando": 100, "recorrente": 100, "descartado": 0,
}

# Fases de um projeto de implantação/operação
FASES_PROJETO = ["diagnostico", "instalacao", "comissionamento", "operacao"]
STATUS_IMPLANTACAO = ["planejada", "em_andamento", "operando", "encerrada"]

# Tipos de equipamento (por produto)
TIPOS_DISPOSITIVO = ["cracha_lora", "tag_rombit", "banda_slatesafety", "isafe_dersalis", "gateway", "robo_unitree"]
STATUS_DISPOSITIVO = ["ativo", "inativo", "manutencao", "offline"]


class ClienteServico(Base):
    """Cliente de prestação de serviço (implantação/operação de soluções)."""
    __tablename__ = "sol_clientes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nome: Mapped[str] = mapped_column(String(200), nullable=False)
    cnpj: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    setor: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    unidades: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)  # lista de sites
    contato_nome: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    contato_email: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    responsavel: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    implantacoes: Mapped[list["Implantacao"]] = relationship(back_populates="cliente", cascade="all, delete-orphan")
    dispositivos: Mapped[list["Dispositivo"]] = relationship(back_populates="cliente", cascade="all, delete-orphan")


class Implantacao(Base):
    """Projeto de implantação + operação de uma solução num cliente (PM Suite adaptado)."""
    __tablename__ = "sol_implantacoes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    cliente_id: Mapped[int] = mapped_column(ForeignKey("sol_clientes.id", ondelete="CASCADE"), nullable=False)
    titulo: Mapped[str] = mapped_column(String(200), nullable=False)
    parceiro: Mapped[Optional[str]] = mapped_column(String(60), nullable=True)  # rombit, kofre, ...
    solucao: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    caso_uso: Mapped[Optional[str]] = mapped_column(String(60), nullable=True)
    modalidade: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    fase: Mapped[str] = mapped_column(String(30), default="diagnostico", nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="planejada", nullable=False)
    site: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    # CS / adoção
    adocao_pct: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    health: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)  # verde|amarelo|vermelho
    notas: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    cliente: Mapped[ClienteServico] = relationship(back_populates="implantacoes")


class Dispositivo(Base):
    """Equipamento implantado (frota) — o 'monitorar equipamentos'."""
    __tablename__ = "sol_dispositivos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    cliente_id: Mapped[int] = mapped_column(ForeignKey("sol_clientes.id", ondelete="CASCADE"), nullable=False)
    tipo: Mapped[str] = mapped_column(String(40), nullable=False)
    serial: Mapped[Optional[str]] = mapped_column(String(60), nullable=True)
    unidade: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="ativo", nullable=False)
    bateria: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)  # %
    ultima_comunicacao: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    cliente: Mapped[ClienteServico] = relationship(back_populates="dispositivos")


class NegocioSQS(Base):
    """Oportunidade no pipeline comercial SQS (SST) — separado do Funil de ativos."""
    __tablename__ = "sol_negocios"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    conta: Mapped[str] = mapped_column(String(200), nullable=False)
    parceiro: Mapped[Optional[str]] = mapped_column(String(60), nullable=True)
    modalidade: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    caso_uso: Mapped[Optional[str]] = mapped_column(String(60), nullable=True)
    setor: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    fase: Mapped[str] = mapped_column(String(30), default="lead", nullable=False)
    ticket_min: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    ticket_max: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    mrr: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    responsavel: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    proximo_passo: Mapped[Optional[str]] = mapped_column(String(250), nullable=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    atualizado_em: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


def get_session() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    Base.metadata.create_all(engine)
    logger.info(f"SQ Soluções: SQLite pronto em {DB_PATH}")
