"""Utilitários de normalização compartilhados entre coletores."""

from __future__ import annotations

import os
import re
import tempfile
import unicodedata
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import pandas as pd


def normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Normaliza nomes de colunas para snake_case sem acentos.

    Exemplos:
        'Código de Atividade' → 'codigo_de_atividade'
        'CNPJ/CPF' → 'cnpj_cpf'
        'desTipoLicenca' → 'des_tipo_licenca'
    """

    def _clean(col: str) -> str:
        # Remove acentos
        col = unicodedata.normalize("NFKD", col)
        col = col.encode("ascii", "ignore").decode("ascii")
        # CamelCase → snake_case
        col = re.sub(r"([a-z])([A-Z])", r"\1_\2", col)
        # Substituir caracteres especiais por underscore
        col = re.sub(r"[^\w\s]", "_", col)
        col = re.sub(r"\s+", "_", col.strip())
        # Remover underscores duplicados
        col = re.sub(r"_+", "_", col)
        return col.lower().strip("_")

    df = df.copy()
    df.columns = pd.Index([_clean(c) for c in df.columns])
    return df


def normalize_processo(processo: str) -> str:
    """Normaliza número de processo ANM para formato NNNNNN/YYYY.

    Trata: '005.370/1964', '5370/1964', '005370/1964', '830.836/1997'
    """
    clean = re.sub(r"[.\s]", "", str(processo).strip())
    match = re.match(r"(\d+)/(\d{4})", clean)
    if match:
        return f"{int(match.group(1)):06d}/{match.group(2)}"
    return clean


def normalize_cnpj(value: str) -> str:
    """Remove pontuação de CNPJ/CPF, mantendo apenas dígitos.

    Valida tamanho: 14 dígitos para CNPJ, 11 para CPF.
    Retorna string vazia se inválido.
    """
    digits = re.sub(r"\D", "", value)
    if len(digits) in (11, 14):
        return digits
    return ""


def parse_date_br(series: pd.Series[Any]) -> pd.Series[Any]:
    """Parseia datas no formato brasileiro DD/MM/YYYY."""
    return pd.to_datetime(series, format="%d/%m/%Y", errors="coerce", dayfirst=True)


def parse_date_epoch_ms(series: pd.Series[Any]) -> pd.Series[Any]:
    """Converte datas de epoch milliseconds para datetime."""
    return pd.to_datetime(series, unit="ms", errors="coerce")


def has_content(series: pd.Series[Any]) -> pd.Series[Any]:
    """Verifica se uma série tem conteúdo real (não NaN, não vazio, não 'nan')."""
    as_str = series.astype(str).str.strip()
    return series.notna() & (as_str != "") & (as_str.str.lower() != "nan")


def add_metadata(df: pd.DataFrame, source: str) -> pd.DataFrame:
    """Adiciona colunas de metadados ao DataFrame."""
    df = df.copy()
    df["_source"] = source
    df["_collected_at"] = datetime.now(tz=UTC).isoformat()
    return df


def atomic_parquet_write(df: pd.DataFrame, path: Path) -> None:
    """Escreve DataFrame como parquet de forma atômica (temp → rename)."""
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp_fd, tmp_path_str = tempfile.mkstemp(
        suffix=".parquet", dir=str(path.parent)
    )
    os.close(tmp_fd)  # Close fd immediately — Windows locks open fds
    tmp_path = Path(tmp_path_str)
    try:
        df.to_parquet(tmp_path, engine="pyarrow", index=False)
        if path.exists():
            path.unlink()
        tmp_path.rename(path)
    except Exception:
        tmp_path.unlink(missing_ok=True)
        raise
