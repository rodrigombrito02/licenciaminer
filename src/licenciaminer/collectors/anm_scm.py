"""Coletor dos CSVs do Sistema de Cadastro Mineiro (SCM) da ANM.

Baixa os 13 CSVs publicados em https://app.anm.gov.br/dadosabertos/SCM/,
cobrindo todas as fases do ciclo de vida do processo minerário:

Fases de pesquisa:
- Requerimento_de_Pesquisa.csv
- Alvara_de_Pesquisa.csv
- Relatorio_de_Pesquisa_Aprovado.csv

Fases de lavra:
- Requerimento_de_Lavra.csv
- Portaria_de_Lavra.csv

Licenciamento e PLG:
- Requerimento_de_Licenciamento.csv
- Licenciamento.csv
- Requerimento_de_PLG.csv
- PLG.csv

Outros:
- Registro_de_Extracao_Publicado.csv
- Requerimento_de_Registro_de_Extracao_Protocolizado.csv
- Guia_de_Utilizacao_Autorizada.csv
- Cessoes_de_Direitos.csv (transferências de titularidade)

Todos têm o mesmo schema de 10 colunas. Filtro por UF via campo Município(s).
Atualização diária pela ANM.
"""

import io
import logging
from pathlib import Path

import httpx
import pandas as pd
from tenacity import (
    before_sleep_log,
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from licenciaminer.config import (
    HTTP_TIMEOUT,
    RETRY_ATTEMPTS,
    RETRY_MAX_WAIT,
    RETRY_MIN_WAIT,
    SCM_BASE_URL,
)
from licenciaminer.processors.normalize import (
    add_metadata,
    atomic_parquet_write,
    normalize_cnpj,
    normalize_columns,
    normalize_processo,
)

logger = logging.getLogger(__name__)

SCM_FILES: dict[str, str] = {
    # Fases de pesquisa
    "requerimento_pesquisa": "Requerimento_de_Pesquisa.csv",
    "alvara_pesquisa": "Alvara_de_Pesquisa.csv",
    "relatorio_pesquisa": "Relatorio_de_Pesquisa_Aprovado.csv",
    # Fases de lavra
    "requerimento_lavra": "Requerimento_de_Lavra.csv",
    "portaria_lavra": "Portaria_de_Lavra.csv",
    # Licenciamento e PLG
    "requerimento_licenciamento": "Requerimento_de_Licenciamento.csv",
    "licenciamento": "Licenciamento.csv",
    "requerimento_plg": "Requerimento_de_PLG.csv",
    "plg": "PLG.csv",
    # Outros
    "registro_extracao": "Registro_de_Extracao_Publicado.csv",
    "requerimento_registro_extracao": "Requerimento_de_Registro_de_Extracao_Protocolizado.csv",
    "guia_utilizacao": "Guia_de_Utilizacao_Autorizada.csv",
    "cessao_direitos": "Cessoes_de_Direitos.csv",
}

# Colunas esperadas nos CSVs do SCM (após normalização)
SCM_EXPECTED_COLUMNS = {
    "processo",
    "fase_atual",
    "titular",
}


@retry(
    stop=stop_after_attempt(RETRY_ATTEMPTS),
    wait=wait_exponential(multiplier=1, min=RETRY_MIN_WAIT, max=RETRY_MAX_WAIT),
    retry=retry_if_exception_type(
        (httpx.HTTPStatusError, httpx.ConnectError, httpx.ReadTimeout)
    ),
    before_sleep=before_sleep_log(logger, logging.WARNING),
    reraise=True,
)
def _download_csv(url: str) -> bytes:
    """Baixa arquivo CSV."""
    logger.info("Baixando %s", url)
    with httpx.Client(timeout=HTTP_TIMEOUT) as client:
        response = client.get(url)
        response.raise_for_status()
        return response.content


def _parse_csv(csv_bytes: bytes) -> pd.DataFrame:
    """Parseia CSV do SCM, tentando separadores e encodings comuns.

    Os CSVs do ANM usam vírgula como separador e aspas para campos
    com vírgulas internas. Algumas linhas malformadas são descartadas.
    """
    for sep in (",", ";"):
        for encoding in ("latin-1", "utf-8", "cp1252"):
            try:
                df = pd.read_csv(
                    io.BytesIO(csv_bytes),
                    sep=sep,
                    encoding=encoding,
                    dtype=str,
                    na_values=["", "N/A"],
                    quotechar='"',
                    on_bad_lines="skip",
                )
                # Validar: se só tem 1 coluna, provavelmente o separador está errado
                if len(df.columns) > 1:
                    return df
            except (UnicodeDecodeError, pd.errors.ParserError):
                continue
    # Fallback
    return pd.read_csv(
        io.BytesIO(csv_bytes),
        sep=",",
        encoding="latin-1",
        dtype=str,
        na_values=["", "N/A"],
        on_bad_lines="skip",
    )


def _extract_uf(municipio_str: str) -> str | None:
    """Extrai UF do campo Município(s) no formato 'CIDADE - UF'."""
    if pd.isna(municipio_str):
        return None
    parts = str(municipio_str).split(" - ")
    if len(parts) >= 2:
        return parts[-1].strip()[:2]
    return None


def collect_scm(
    data_dir: Path,
    uf_filter: str | None = None,
) -> Path:
    """Coleta dados do SCM da ANM (Cadastro Mineiro completo).

    Baixa os 13 CSVs cobrindo todas as fases do ciclo de vida minerário,
    filtra opcionalmente por UF, unifica e salva como parquet.
    Sem filtro de UF, coleta ~100-150k registros do Brasil inteiro.
    """
    frames: list[pd.DataFrame] = []

    for regime, filename in SCM_FILES.items():
        url = f"{SCM_BASE_URL}/{filename}"
        try:
            csv_bytes = _download_csv(url)
        except Exception:
            logger.error("Falha ao baixar %s", url)
            raise

        df = _parse_csv(csv_bytes)
        logger.info("SCM %s: %d registros brutos", regime, len(df))

        # Normalizar colunas
        df = normalize_columns(df)

        # Validar colunas esperadas
        missing = SCM_EXPECTED_COLUMNS - set(df.columns)
        if missing:
            logger.warning(
                "SCM %s: colunas faltando: %s. Colunas encontradas: %s",
                regime,
                missing,
                list(df.columns),
            )

        # Adicionar coluna de regime
        df["regime"] = regime

        # Filtrar por UF via campo municipio(s)
        if uf_filter:
            mun_col = next(
                (c for c in df.columns if "municipio" in c.lower()),
                None,
            )
            if mun_col:
                df = df[
                    df[mun_col].str.contains(f"- {uf_filter}", na=False)
                ].copy()
                logger.info(
                    "SCM %s: %d registros para UF=%s", regime, len(df), uf_filter
                )

        frames.append(df)

    if not frames:
        logger.warning("SCM: nenhum dado coletado")
        unified = pd.DataFrame()
    else:
        unified = pd.concat(frames, ignore_index=True)

    # Normalizar número de processo
    if "processo" in unified.columns:
        unified["processo_norm"] = unified["processo"].apply(normalize_processo)

    # Normalizar CNPJ
    cnpj_col = next(
        (c for c in unified.columns if "cpf" in c.lower() or "cnpj" in c.lower()),
        None,
    )
    if cnpj_col:
        unified[cnpj_col] = unified[cnpj_col].apply(
            lambda x: normalize_cnpj(str(x)) if pd.notna(x) else None
        )

    # Extrair substância principal e município principal
    subs_col = next(
        (c for c in unified.columns if "substancia" in c.lower()),
        None,
    )
    if subs_col:
        unified["substancia_principal"] = (
            unified[subs_col]
            .str.split(",")
            .str[0]
            .str.strip()
        )

    mun_col = next(
        (c for c in unified.columns if "municipio" in c.lower()),
        None,
    )
    if mun_col:
        unified["municipio_principal"] = (
            unified[mun_col]
            .str.split(",")
            .str[0]
            .str.strip()
        )

    # URL de auditoria
    unified["_source_url"] = f"{SCM_BASE_URL}/"

    unified = add_metadata(unified, source="anm_scm")

    output_path = data_dir / "processed" / "scm_concessoes.parquet"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    atomic_parquet_write(unified, output_path)

    from licenciaminer.collectors.metadata import save_collection_metadata
    save_collection_metadata(data_dir, "anm_scm", len(unified))

    logger.info("SCM: dados salvos em %s (%d registros)", output_path, len(unified))
    return output_path
