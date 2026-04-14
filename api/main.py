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
    prospeccao,
    reports,
    simulator,
    viabilidade,
)
from api.services.database import close_connection, get_connection

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Gerencia ciclo de vida: conexão DuckDB no startup, cleanup no shutdown."""
    logger.info("Inicializando DuckDB...")
    get_connection()
    from api.routers.intelligence import start_briefing_scheduler
    start_briefing_scheduler()
    logger.info("API pronta")
    yield
    logger.info("Encerrando...")
    close_connection()


app = FastAPI(
    title="Summo Quartile API",
    description="API de inteligência ambiental para licenciamento minerário",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "https://summo-quartile.vercel.app",
        "https://licenciaminer-production.up.railway.app",
    ],
    allow_origin_regex=r"https://summo-quartile[a-z0-9-]*\.vercel\.app$",
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


@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "ok"}
