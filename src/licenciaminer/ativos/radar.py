"""Radar de eventos ANM — mecanismo de snapshot + diff dos microdados SCM.

O SCM é um retrato. Para detectar EVENTOS (novas disponibilidades, caducidades,
mudança de fase, cessão de titularidade) comparamos dois snapshots diários.

Este módulo guarda uma assinatura compacta por processo (não o registro inteiro):
processo_norm → {fase, situacao, regime, cnpj}. O diff entre o snapshot de ontem
e o de hoje produz a lista de eventos. A coleta diária automatizada é a trilha
INT-4 (N8N); aqui está o motor + o baseline.
"""

from __future__ import annotations

import logging
from pathlib import Path

import duckdb

logger = logging.getLogger(__name__)

_DATA = Path(__file__).resolve().parents[3] / "data"
_SCM = _DATA / "processed" / "scm_concessoes.parquet"
_SNAP_DIR = _DATA / "anm_snapshots"

# Eventos detectáveis pelo diff
EVENTOS = {
    "nova_disponibilidade": "Área entrou em disponibilidade",
    "caducidade": "Direito caducou / saiu de vigência",
    "mudanca_fase": "Mudança de fase do processo",
    "cessao": "Cessão de titularidade (mudou o CNPJ)",
    "novo_processo": "Novo processo protocolado",
    "saiu_base": "Processo saiu da base",
}


def snapshot_assinatura(con: duckdb.DuckDBPyConnection | None = None) -> "list[dict]":
    """Lê o SCM e retorna a assinatura compacta por processo."""
    c = con or duckdb.connect()
    rows = c.execute(
        f"""
        SELECT processo_norm,
               COALESCE(fase_atual, '') AS fase,
               COALESCE(situacao, '') AS situacao,
               COALESCE(regime, '') AS regime,
               REGEXP_REPLACE(CAST(COALESCE(cpf_cnpj_do_titular,'') AS VARCHAR), '[^0-9]', '', 'g') AS cnpj
        FROM '{_SCM.as_posix()}'
        WHERE processo_norm IS NOT NULL
        """
    ).fetchall()
    return [{"processo": r[0], "fase": r[1], "situacao": r[2], "regime": r[3], "cnpj": r[4]} for r in rows]


def salvar_snapshot(nome: str, assinatura: "list[dict]") -> Path:
    """Persiste a assinatura como parquet compacto."""
    _SNAP_DIR.mkdir(parents=True, exist_ok=True)
    path = _SNAP_DIR / f"{nome}.parquet"
    con = duckdb.connect()
    con.register("sig", _as_arrow(assinatura))
    con.execute(f"COPY sig TO '{path.as_posix()}' (FORMAT PARQUET)")
    return path


def _as_arrow(rows: "list[dict]"):
    import pyarrow as pa
    if not rows:
        return pa.table({"processo": [], "fase": [], "situacao": [], "regime": [], "cnpj": []})
    cols = {k: [r[k] for r in rows] for k in rows[0]}
    return pa.table(cols)


def carregar_snapshot(nome: str) -> dict:
    """Carrega um snapshot salvo como dict processo→assinatura."""
    path = _SNAP_DIR / f"{nome}.parquet"
    if not path.exists():
        return {}
    con = duckdb.connect()
    rows = con.execute(f"SELECT processo, fase, situacao, regime, cnpj FROM '{path.as_posix()}'").fetchall()
    return {r[0]: {"fase": r[1], "situacao": r[2], "regime": r[3], "cnpj": r[4]} for r in rows}


def diff(antigo: dict, novo: dict, limite: int = 5000) -> "list[dict]":
    """Compara dois snapshots e retorna a lista de eventos detectados."""
    eventos: list[dict] = []
    for proc, n in novo.items():
        a = antigo.get(proc)
        if a is None:
            eventos.append({"processo": proc, "tipo": "novo_processo", "detalhe": n.get("fase")})
            continue
        # disponibilidade
        if "disponib" in (n.get("regime", "") + n.get("fase", "")).lower() and \
           "disponib" not in (a.get("regime", "") + a.get("fase", "")).lower():
            eventos.append({"processo": proc, "tipo": "nova_disponibilidade", "detalhe": n.get("fase")})
        # mudança de fase
        elif a.get("fase") != n.get("fase"):
            eventos.append({"processo": proc, "tipo": "mudanca_fase",
                            "detalhe": f"{a.get('fase')} → {n.get('fase')}"})
        # cessão
        if a.get("cnpj") and n.get("cnpj") and a.get("cnpj") != n.get("cnpj"):
            eventos.append({"processo": proc, "tipo": "cessao",
                            "detalhe": f"{a.get('cnpj')} → {n.get('cnpj')}"})
        if len(eventos) >= limite:
            break
    # saídas da base
    for proc in antigo:
        if proc not in novo:
            eventos.append({"processo": proc, "tipo": "saiu_base", "detalhe": "caducidade/encerramento"})
            if len(eventos) >= limite:
                break
    return eventos
