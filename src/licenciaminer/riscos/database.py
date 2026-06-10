"""Engine SQLite + sessão + bootstrap do schema."""

from __future__ import annotations

import logging
from collections.abc import Generator
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

logger = logging.getLogger(__name__)

DB_PATH = Path(__file__).resolve().parents[3] / "data" / "riscos.db"
DB_URL = f"sqlite:///{DB_PATH.as_posix()}"

engine = create_engine(
    DB_URL,
    connect_args={"check_same_thread": False},
    future=True,
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


def get_session() -> Generator[Session, None, None]:
    """Dependency FastAPI: abre sessão, fecha ao final da request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Cria diretório + schema + popula seeds + importa MUSA + atualização se disponíveis."""
    from licenciaminer.riscos.models import Acao, Base, Controle, Metodologia, Risco
    from licenciaminer.riscos.models_comunicacoes import Stakeholder  # noqa: F401
    from licenciaminer.riscos.models_corporativo import CategoriaERM  # noqa: F401
    from licenciaminer.riscos.models_crises import CenarioCrise  # noqa: F401 (registra tabelas)
    from licenciaminer.riscos.models_monitoramento import KRI  # noqa: F401
    from licenciaminer.riscos.models_pmsuite import ProjectCharter, WBSNode  # noqa: F401
    from licenciaminer.riscos.models_planos_acao import ClientePA  # noqa: F401 — registra tabelas pa_*
    from licenciaminer.riscos.models_quality import RequisitoQualidade  # noqa: F401
    from licenciaminer.riscos.models_procurement import Fornecedor  # noqa: F401
    from licenciaminer.riscos.services.importer_atualizacao import (
        DEFAULT_ATUALIZACAO_PATH,
        importar_atualizacao,
    )
    from licenciaminer.riscos.services.importer_musa import DEFAULT_MUSA_PATH, importar_musa
    from licenciaminer.riscos.services.seed_comunicacoes import seed_comunicacoes
    from licenciaminer.riscos.services.seed_corporativo import seed_corporativo
    from licenciaminer.riscos.services.seed_crises import seed_crises
    from licenciaminer.riscos.services.seed_monitoramento import seed_monitoramento
    from licenciaminer.riscos.services.seed_cronograma_compactos import seed_cronograma_compactos
    from licenciaminer.riscos.services.seed_custos_compactos import seed_custos_compactos
    from licenciaminer.riscos.services.seed_pmsuite_compactos import seed_pmsuite_compactos
    from licenciaminer.riscos.services.seed_qualidade_compactos import seed_qualidade_compactos
    from licenciaminer.riscos.services.seed_aquisicoes_compactos import seed_aquisicoes_compactos
    from licenciaminer.riscos.services.cpm import calcular_cpm
    from licenciaminer.riscos.services.seed_ternium import seed_metodologia_ternium
    from licenciaminer.riscos.services.seed_usiminas import seed_usiminas_ficticia

    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    Base.metadata.create_all(engine)

    with SessionLocal() as db:
        if db.query(Metodologia).count() == 0:
            logger.info("Riscos: aplicando seeds (Ternium + Usiminas fictícia)")
            seed_metodologia_ternium(db)
            seed_usiminas_ficticia(db)
            db.commit()

        if db.query(Risco).count() == 0 and DEFAULT_MUSA_PATH.exists():
            logger.info(f"Riscos: importando MUSA de {DEFAULT_MUSA_PATH.name}")
            stats = importar_musa(db)
            logger.info(f"Riscos: MUSA importado — {stats}")

        # Importa a planilha de atualização (substitui Controles/Ações MUSA pela versão detalhada)
        precisa_atualizar = (
            db.query(Risco).count() > 0
            and db.query(Acao).count() < 200  # heurística: atualização tem 276
            and DEFAULT_ATUALIZACAO_PATH.exists()
        )
        if precisa_atualizar:
            logger.info(
                f"Riscos: importando atualização de {DEFAULT_ATUALIZACAO_PATH.name}"
            )
            stats = importar_atualizacao(db)
            logger.info(f"Riscos: atualização importada — {stats}")

        # Seed de gestão de crises (idempotente, roda sempre; só cria se não existir)
        if db.query(CenarioCrise).count() == 0:
            logger.info("Riscos: aplicando seed de Gestão de Crises (cenários, comitês, BCP)")
            stats = seed_crises(db)
            logger.info(f"Riscos: crises seed — {stats}")

        # Seed de monitoramento (KRIs, apetites, testes de controles)
        if db.query(KRI).count() == 0:
            logger.info("Riscos: aplicando seed de Monitoramento (KRIs, apetites, testes)")
            stats = seed_monitoramento(db)
            logger.info(f"Riscos: monitoramento seed — {stats}")

        # Seed de comunicações (stakeholders, templates, RACI)
        if db.query(Stakeholder).count() == 0:
            logger.info("Riscos: aplicando seed de Comunicações")
            stats = seed_comunicacoes(db)
            logger.info(f"Riscos: comunicações seed — {stats}")

        # Seed de Risco Corporativo (COSO ERM + projetos + objetivos)
        if db.query(CategoriaERM).count() == 0:
            logger.info("Riscos: aplicando seed de Risco Corporativo (COSO ERM)")
            stats = seed_corporativo(db)
            logger.info(f"Riscos: corporativo seed — {stats}")

        # Seed do piloto PM Suite — Compactos (Charter + WBS + CRs + Decisões)
        if db.query(ProjectCharter).count() == 0:
            logger.info("Riscos: aplicando seed PM Suite — Projeto Compactos")
            stats = seed_pmsuite_compactos(db)
            logger.info(f"Riscos: pmsuite seed — {stats}")

            # M3 Cronograma: dependências + CPM
            proj = (
                db.query(__import__("licenciaminer.riscos.models", fromlist=["Projeto"]).Projeto)
                .filter_by(codigo="PROJ-COMPACTOS")
                .first()
            )
            if proj:
                deps = seed_cronograma_compactos(db)
                logger.info(f"Riscos: cronograma seed — {deps} dependências")
                cpm_stats = calcular_cpm(db, proj.id)
                logger.info(f"Riscos: CPM calculado — {cpm_stats}")

            # M4 Custos + EVM
            custos = seed_custos_compactos(db)
            logger.info(f"Riscos: custos seed — {custos}")

            # M5 Qualidade (PMBoK §8 + ISO 9001)
            qualidade = seed_qualidade_compactos(db)
            logger.info(f"Riscos: qualidade seed — {qualidade}")

            # M9 Aquisições (PMBoK §12)
            aquisicoes = seed_aquisicoes_compactos(db)
            logger.info(f"Riscos: aquisicoes seed — {aquisicoes}")

        logger.info(
            f"Riscos: {db.query(Risco).count()} riscos, "
            f"{db.query(Controle).count()} controles, {db.query(Acao).count()} ações, "
            f"{db.query(CenarioCrise).count()} cenários de crise"
        )
