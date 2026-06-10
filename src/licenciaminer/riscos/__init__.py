"""Módulo de Gestão de Riscos e Crises do Sistema Summo.

Implementa o ciclo ISO 31000 (identificação → análise → avaliação → tratamento →
monitoramento) sobre uma base SQLite isolada dos parquets do licenciaminer.
"""

from licenciaminer.riscos.database import get_session, init_db

__all__ = ["get_session", "init_db"]
