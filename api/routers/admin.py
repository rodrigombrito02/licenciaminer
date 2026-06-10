"""Endpoints do painel admin — restritos a role=admin no frontend.

Backend nao impede chamada (nao temos verificacao de role no backend ainda
porque a auth e do lado do Supabase no frontend). Mas o middleware Next.js
ja bloqueia /admin pra quem nao for admin.
"""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import (
    DateTime,
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
    sessionmaker,
)
from pathlib import Path

logger = logging.getLogger(__name__)

# Banco proprio pra eventos de tracking
DB_PATH = Path(__file__).resolve().parents[2] / "data" / "admin_events.db"
DB_URL = f"sqlite:///{DB_PATH.as_posix()}"
engine = create_engine(DB_URL, connect_args={"check_same_thread": False}, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


class Base(DeclarativeBase):
    pass


class Evento(Base):
    """Eventos de tracking: pageview, cta_click, lead_capture, etc."""
    __tablename__ = "admin_eventos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tipo: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    rota: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    user_id: Mapped[Optional[str]] = mapped_column(String(120), nullable=True, index=True)
    user_email: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    user_role: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    referrer: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    payload: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON em texto
    em: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False, index=True)


def init_db_admin() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    Base.metadata.create_all(engine)
    logger.info(f"Admin: SQLite pronto em {DB_PATH}")


def get_session_admin():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


router = APIRouter(prefix="/api/admin", tags=["Admin"])


# ── Eventos / Tracking ──

class EventoIn(BaseModel):
    tipo: str
    rota: Optional[str] = None
    user_id: Optional[str] = None
    user_email: Optional[str] = None
    user_role: Optional[str] = None
    referrer: Optional[str] = None
    payload: Optional[str] = None


@router.post("/eventos")
def registrar_evento(payload: EventoIn, db: Session = Depends(get_session_admin)):
    """Endpoint publico — qualquer um (incluindo visitante anonimo) pode registrar evento.

    Usado pelo frontend pra trackear pageview, cta_click, etc.
    """
    e = Evento(
        tipo=payload.tipo[:40],
        rota=payload.rota[:200] if payload.rota else None,
        user_id=payload.user_id[:120] if payload.user_id else None,
        user_email=payload.user_email[:200] if payload.user_email else None,
        user_role=payload.user_role[:30] if payload.user_role else None,
        referrer=payload.referrer[:500] if payload.referrer else None,
        payload=payload.payload,
    )
    db.add(e)
    db.commit()
    return {"ok": True, "id": e.id}


@router.get("/stats")
def stats_admin(
    dias: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_session_admin),
):
    """Dashboard de stats — total e por tipo nos ultimos N dias."""
    from sqlalchemy import func
    from datetime import timedelta

    desde = datetime.utcnow() - timedelta(days=dias)

    eventos_recentes = db.query(Evento).filter(Evento.em >= desde).all()
    total = len(eventos_recentes)

    by_tipo: dict[str, int] = {}
    by_rota: dict[str, int] = {}
    by_role: dict[str, int] = {}
    unicos_usuarios: set[str] = set()
    for e in eventos_recentes:
        by_tipo[e.tipo] = by_tipo.get(e.tipo, 0) + 1
        if e.rota:
            by_rota[e.rota] = by_rota.get(e.rota, 0) + 1
        if e.user_role:
            by_role[e.user_role] = by_role.get(e.user_role, 0) + 1
        if e.user_id:
            unicos_usuarios.add(e.user_id)

    top_rotas = sorted(by_rota.items(), key=lambda x: -x[1])[:15]

    return {
        "periodo_dias": dias,
        "total_eventos": total,
        "usuarios_unicos": len(unicos_usuarios),
        "por_tipo": by_tipo,
        "por_role": by_role,
        "top_rotas": [{"rota": r, "n": n} for r, n in top_rotas],
    }


@router.get("/usuarios")
def listar_usuarios():
    """Lista usuarios do Supabase via admin API.

    Usa SUPABASE_URL e SUPABASE_SERVICE_KEY do ambiente.
    """
    import os
    import json
    import urllib.request

    url = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        return {"erro": "Supabase nao configurado (SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY)"}

    try:
        req = urllib.request.Request(
            f"{url}/auth/v1/admin/users?per_page=100",
            headers={"apikey": key, "Authorization": f"Bearer {key}"},
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        users = data.get("users", [])
        return {
            "total": len(users),
            "usuarios": [
                {
                    "id": u.get("id"),
                    "email": u.get("email"),
                    "ultima_sessao": u.get("last_sign_in_at"),
                    "criado_em": u.get("created_at"),
                    "metadata": u.get("user_metadata", {}),
                }
                for u in users
            ],
        }
    except Exception as e:
        return {"erro": str(e)}
