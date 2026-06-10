"""FastAPI backend para Summo Quartile.

Wrapper HTTP fino sobre o pacote licenciaminer existente.
Toda lógica de negócio permanece em src/licenciaminer/ e app/components/.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routers import (
    chat,
    concessoes,
    copam,
    decisions,
    due_diligence,
    empresa,
    explorer,
    geospatial,
    intelligence,
    overview,
    admin,
    oportunidades,
    pilhas,
    planos_acao,
    riscos_v2,
    prospeccao,
    reports,
    simulator,
    viabilidade,
)
from api.services.database import close_connection, get_connection
from licenciaminer.planos_acao.database import init_db as init_planos_acao_db
from licenciaminer.viabilidade.database import init_db as init_viabilidade_db
from licenciaminer.oportunidades.database import init_db as init_oportunidades_db
from licenciaminer.riscos_v2.database import init_db as init_riscos_v2_db

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def _background_init():
    """Init pesado roda em background — nao bloqueia healthcheck."""
    import asyncio
    try:
        logger.info("[bg] Inicializando DuckDB...")
        await asyncio.to_thread(get_connection)
        logger.info("[bg] Inicializando SQLite (Plano de Acoes)...")
        await asyncio.to_thread(init_planos_acao_db)
        logger.info("[bg] Inicializando SQLite (Viabilidade)...")
        await asyncio.to_thread(init_viabilidade_db)
        logger.info("[bg] Inicializando SQLite (Oportunidades)...")
        await asyncio.to_thread(init_oportunidades_db)
        logger.info("[bg] Inicializando SQLite (Riscos v2)...")
        await asyncio.to_thread(init_riscos_v2_db)
        from api.routers.admin import init_db_admin
        logger.info("[bg] Inicializando SQLite (Admin events)...")
        await asyncio.to_thread(init_db_admin)
        from api.routers.intelligence import start_briefing_scheduler
        await asyncio.to_thread(start_briefing_scheduler)
        logger.info("[bg] API totalmente pronta")
    except Exception as exc:
        logger.exception(f"[bg] Falha no init em background: {exc}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan rapido — dispara init pesado em background para healthcheck
    responder imediatamente (necessario em Railway/Render onde o
    healthcheck e parte do gating de Production)."""
    import asyncio
    logger.info("Startup: agendando init em background")
    task = asyncio.create_task(_background_init())
    yield
    logger.info("Shutdown: aguardando init terminar se ainda rodando")
    if not task.done():
        task.cancel()
    close_connection()


app = FastAPI(
    title="Summo Quartile API",
    description="API de inteligência ambiental para licenciamento minerário",
    version="0.1.0",
    lifespan=lifespan,
)

import os

# CORS configurável via env var (separa por vírgula). Defaults cobrem dev local
# + as URLs de producao ja conhecidas (Vercel + Railway).
_default_origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3004",
    "http://127.0.0.1:3004",
    "https://summo-quartile.vercel.app",
    "https://licenciaminer-production.up.railway.app",
]
_env_origins = [
    o.strip()
    for o in (os.getenv("CORS_ORIGINS", "") or "").split(",")
    if o.strip()
]
_cors_origins = list({*_default_origins, *_env_origins})

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    # Aceita qualquer subdomínio Vercel do projeto (preview deploys, branches)
    allow_origin_regex=r"https://(summo-quartile|summoquartile|licenciaminer)[a-z0-9-]*\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(overview.router, prefix="/api", tags=["Visão Geral"])
app.include_router(decisions.router, prefix="/api", tags=["Decisões"])
app.include_router(empresa.router, prefix="/api", tags=["Empresa"])
app.include_router(explorer.router, prefix="/api", tags=["Explorador"])
app.include_router(concessoes.router, prefix="/api", tags=["Concessões"])
app.include_router(geospatial.router, prefix="/api", tags=["Geoespacial"])
app.include_router(prospeccao.router, prefix="/api", tags=["Prospecção"])
app.include_router(intelligence.router, prefix="/api", tags=["Inteligência Comercial"])
app.include_router(simulator.router, prefix="/api", tags=["Mineradora Modelo"])
app.include_router(reports.router, prefix="/api", tags=["Relatórios"])
app.include_router(due_diligence.router, prefix="/api", tags=["Due Diligence"])
app.include_router(copam.router, prefix="/api", tags=["COPAM"])
app.include_router(chat.router, prefix="/api", tags=["Chat"])
app.include_router(viabilidade.router, prefix="/api", tags=["Viabilidade"])
app.include_router(pilhas.router, prefix="/api", tags=["Pilhas"])
app.include_router(planos_acao.router)  # ja tem prefix /api/planos-acao
app.include_router(oportunidades.router)  # ja tem prefix /api/oportunidades
app.include_router(riscos_v2.router)  # ja tem prefix /api/riscos-v2
app.include_router(admin.router)  # ja tem prefix /api/admin


@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "ok"}
