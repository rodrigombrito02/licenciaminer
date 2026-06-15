"""Due Diligence — Inventário de documentos e requisitos.

Carrega os CSVs de referência extraídos do modelo Excel e filtra
documentos e requisitos aplicáveis por tipo de licença e classe.
"""

import csv
from pathlib import Path

_REF_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "reference"


def _load_csv(filename: str) -> list[dict[str, str]]:
    """Carrega CSV de referência como lista de dicts."""
    path = _REF_DIR / filename
    if not path.exists():
        return []
    with open(path, encoding="utf-8") as f:
        return list(csv.DictReader(f))


def load_inventario() -> list[dict[str, str]]:
    """Carrega inventário completo de documentos (119 docs)."""
    return _load_csv("dd_inventario_documentos.csv")


def load_requisitos() -> list[dict[str, str]]:
    """Carrega requisitos de teste completos (1934 testes)."""
    return _load_csv("dd_requisitos_testes.csv")


# ── Mapeamento de licenças para filtro ──
# Cada tipo de licença no sistema mapeia para os valores encontrados
# na coluna "licenca" do inventário.
LICENCA_MAP: dict[str, list[str]] = {
    # Modalidades MG (DN COPAM 217/2017)
    "LAS": ["LAS"],
    "LAS-RAS": ["LAS", "LAS-RAS"],
    "LAC1": ["LAS", "LAS-RAS", "LP", "LI", "LP+ LI", "LP+ LI+ LO"],
    "LAC2": ["LAS", "LAS-RAS", "LP", "LI", "LO", "LP+ LI", "LI + LO", "LP+ LI+ LO"],
    "LP": ["LP", "LP+ LI", "LP+ LI+ LO"],
    "LI": ["LI", "LI + LO", "LP+ LI", "LP+ LI+ LO"],
    "LO": ["LO", "LI + LO", "LP+ LI+ LO"],
    # Modalidades Federais (Lei 15.190/2025 — LGLA)
    "LAU": ["LAU"],
    "LAC_FED": ["LAC_FED"],
    "LAE": ["LAE"],
    "LOC": ["LOC"],
    # Requerimentos ANM (Código de Mineração) — Diligência Regulatória
    "ANM_PESQUISA": ["ANM - Requerimento de Pesquisa"],
    "ANM_RFP": ["ANM - Relatório Final de Pesquisa"],
    "ANM_LAVRA": ["ANM - Requerimento de Lavra"],
}

# Tipos de licença disponíveis no sistema
LICENCA_TIPOS = list(LICENCA_MAP.keys())

# Descrições das licenças
LICENCA_DESC: dict[str, str] = {
    # MG (DN COPAM 217/2017)
    "LAS": "Licenciamento Ambiental Simplificado (MG, Classe 1-2)",
    "LAS-RAS": "LAS com Relatório Ambiental Simplificado (MG, Classe 2-3)",
    "LAC1": "Licenciamento Ambiental Concomitante 1 (MG, Classe 3-4)",
    "LAC2": "Licenciamento Ambiental Concomitante 2 (MG, Classe 3-4)",
    "LP": "Licença Prévia (MG/Federal, Classe 5-6, trifásico)",
    "LI": "Licença de Instalação (MG/Federal, Classe 5-6, trifásico)",
    "LO": "Licença de Operação (MG/Federal, Classe 5-6, trifásico)",
    # Federal (Lei 15.190/2025 — LGLA)
    "LAU": "Licença Ambiental Única (Federal, baixo/médio impacto)",
    "LAC_FED": "Licença por Adesão e Compromisso (Federal, baixo potencial poluidor)",
    "LAE": "Licença Ambiental Especial (Federal, atividades estratégicas)",
    "LOC": "Licença de Operação Corretiva (Federal, regularização)",
    # Requerimentos ANM
    "ANM_PESQUISA": "ANM — Requerimento de Pesquisa (Código de Mineração)",
    "ANM_RFP": "ANM — Relatório Final de Pesquisa",
    "ANM_LAVRA": "ANM — Requerimento de Lavra / Concessão",
}


def filtrar_documentos(
    licenca_tipo: str,
    inventario: list[dict[str, str]] | None = None,
) -> list[dict[str, str]]:
    """Filtra documentos aplicáveis a um tipo de licença.

    Args:
        licenca_tipo: Tipo de licença (LAS, LAS-RAS, LAC1, LAC2, LP, LI, LO).
        inventario: Inventário completo (carregado se None).

    Returns:
        Lista de documentos aplicáveis.
    """
    if inventario is None:
        inventario = load_inventario()

    licencas_validas = LICENCA_MAP.get(licenca_tipo, [licenca_tipo])

    return [
        doc for doc in inventario
        if doc.get("licenca", "").strip() in licencas_validas
        or doc.get("modalidade", "").strip().startswith(licenca_tipo)
    ]


def filtrar_requisitos(
    documento: str,
    requisitos: list[dict[str, str]] | None = None,
) -> list[dict[str, str]]:
    """Filtra requisitos de teste aplicáveis a um documento.

    Args:
        documento: Nome do documento (ex: "EIA", "LAS_RAS", "PRAD").
        requisitos: Requisitos completos (carregados se None).

    Returns:
        Lista de requisitos de teste para o documento.
    """
    if requisitos is None:
        requisitos = load_requisitos()

    doc_norm = documento.strip().upper().replace(" ", "_").replace("-", "_")

    return [
        req for req in requisitos
        if req.get("documento", "").strip().upper().replace(" ", "_").replace("-", "_") == doc_norm
    ]
