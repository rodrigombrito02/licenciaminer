"""Pilhas de rejeito/estéril — Inventário de documentos e requisitos.

Carrega os CSVs de referência do módulo Pilhas e filtra documentos e
requisitos por etapa do ciclo de vida (projeto, implantação, operação,
emergência, aproveitamento, fechamento, transparência, governança GISTM,
TR SEMAD) e por modalidade de licenciamento.

Espelha a interface de `dd_inventory.py` para reaproveitar o motor de
scoring sem modificação.
"""

from __future__ import annotations

import csv
from pathlib import Path

_REF_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "reference"


def _load_csv(filename: str) -> list[dict[str, str]]:
    path = _REF_DIR / filename
    if not path.exists():
        return []
    with open(path, encoding="utf-8") as f:
        return list(csv.DictReader(f))


def load_inventario() -> list[dict[str, str]]:
    """Carrega inventário de 85 documentos aplicáveis a pilhas."""
    return _load_csv("pilhas_inventario_documentos.csv")


def load_requisitos() -> list[dict[str, str]]:
    """Carrega 74 requisitos/testes de aderência para pilhas."""
    return _load_csv("pilhas_requisitos_testes.csv")


def load_normas() -> list[dict[str, str]]:
    """Carrega 23 normas do arcabouço regulatório."""
    return _load_csv("pilhas_normas.csv")


# ── Etapas do ciclo de vida ──
ETAPAS = [
    "PROJETO",
    "IMPLANTACAO",
    "OPERACAO",
    "EMERGENCIA",
    "APROVEITAMENTO",
    "FECHAMENTO",
    "TRANSPARENCIA",
    "GOVERNANCA_GISTM",
    "TR_SEMAD",
]

ETAPA_DESC: dict[str, str] = {
    "PROJETO": "Planejamento e Projeto (concepção, estudos, dimensionamento)",
    "IMPLANTACAO": "Implantação e Construção (QA/QC, as-built, ensaios)",
    "OPERACAO": "Operação e Monitoramento (instrumentação, boletins, DCE)",
    "EMERGENCIA": "Emergência (PAEPRE, PAE, ZAS/ZSS, simulados)",
    "APROVEITAMENTO": "Aproveitamento (PARE Res. ANM 189/2024)",
    "FECHAMENTO": "Fechamento e pós-operação",
    "TRANSPARENCIA": "Transparência e cadastro público (PL 2.519/2024 MG)",
    "GOVERNANCA_GISTM": "Governança GISTM (premium — empresas ICMM)",
    "TR_SEMAD": "Termos de Referência SEMAD/FEAM",
}


# ── Modalidades aplicáveis em MG (DN COPAM 217/2017) ──
MODALIDADE_MAP: dict[str, list[str]] = {
    "LAS RAS": ["LAS RAS"],
    "LAC1": ["LP/LI/LO|LAC1|LAC2", "LAS RAS"],
    "LAC2": ["LP/LI/LO|LAC1|LAC2", "LAS RAS"],
    "LP": ["LP/LI/LO|LAC1|LAC2"],
    "LI": ["LP/LI/LO|LAC1|LAC2", "LI"],
    "LO": ["LP/LI/LO|LAC1|LAC2", "LO|LAC1|LAC2"],
}

MODALIDADE_TIPOS = list(MODALIDADE_MAP.keys())

MODALIDADE_DESC: dict[str, str] = {
    "LAS RAS": "LAS com Relatório Ambiental Simplificado (Classe 2-3)",
    "LAC1": "Licenciamento Ambiental Concomitante 1 (Classe 3-4)",
    "LAC2": "Licenciamento Ambiental Concomitante 2 (Classe 3-4)",
    "LP": "Licença Prévia (Classe 5-6, trifásico)",
    "LI": "Licença de Instalação (Classe 5-6, trifásico)",
    "LO": "Licença de Operação (Classe 5-6, trifásico)",
}


# ── Modos de uso da ferramenta ──
# A ferramenta atende 3 casos de uso distintos, cada um com conjunto
# proprio de etapas aplicaveis.
MODO_DESC: dict[str, str] = {
    "AUDITORIA": "Auditoria de ativo existente (pilha em operação)",
    "LICENCIAMENTO": "Licenciamento ambiental (pré-protocolo ou renovação)",
    "FECHAMENTO_MODO": "Descomissionamento / fechamento de pilha",
}

# Quais etapas do ciclo de vida cada modo considera
ETAPAS_POR_MODO: dict[str, list[str]] = {
    "AUDITORIA": [
        "OPERACAO",
        "EMERGENCIA",
        "APROVEITAMENTO",
        "TRANSPARENCIA",
        "GOVERNANCA_GISTM",
    ],
    "LICENCIAMENTO": [
        "PROJETO",
        "IMPLANTACAO",
        "TR_SEMAD",
    ],
    "FECHAMENTO_MODO": [
        "FECHAMENTO",
        "APROVEITAMENTO",
        "TRANSPARENCIA",
    ],
}


# ── Atividades DN COPAM 217 relacionadas a pilhas ──
ATIVIDADES_PILHAS: dict[str, str] = {
    "A-05-03-7": "Barragem de contenção de resíduos ou rejeitos da mineração",
    "A-05-04-5": "(DN74) Pilhas de rejeito/estéril",
    "A-05-04-7": "Pilhas de rejeito/estéril - Minério de ferro",
    "A-05-06-2": "Disposição em cava de mina (inerte/não inerte)",
    "A-05-08-4": "Reaproveitamento de bens minerais em pilha de estéril ou rejeito",
}


# ══════════════════════════════════════════════════════════════════
# Filtros
# ══════════════════════════════════════════════════════════════════

def filtrar_por_etapa(
    etapa: str,
    inventario: list[dict[str, str]] | None = None,
) -> list[dict[str, str]]:
    """Filtra documentos por etapa do ciclo de vida."""
    if inventario is None:
        inventario = load_inventario()
    etapa_norm = etapa.strip().upper()
    return [d for d in inventario if d.get("etapa", "").strip().upper() == etapa_norm]


def filtrar_por_modalidade(
    modalidade: str,
    inventario: list[dict[str, str]] | None = None,
) -> list[dict[str, str]]:
    """Filtra documentos por modalidade de licenciamento.

    O campo `modalidade` nos CSVs pode vir com tokens separados por `|`
    (ex: "LP/LI/LO|LAC1|LAC2" ou "LO|LAC1|LAC2"). Considera aplicável
    se algum token bate com a modalidade pedida.
    """
    if inventario is None:
        inventario = load_inventario()
    alvo = modalidade.strip().upper()
    out = []
    for d in inventario:
        tokens = [
            t.strip().upper()
            for bloco in d.get("modalidade", "").split("|")
            for t in bloco.split("/")
        ]
        if alvo in tokens:
            out.append(d)
    return out


def filtrar_documentos(
    modalidade: str,
    classe: int | None = None,
    incluir_gistm: bool = False,
    inventario: list[dict[str, str]] | None = None,
) -> list[dict[str, str]]:
    """Filtro principal: documentos aplicáveis ao caso.

    Args:
        modalidade: LAS RAS, LAC1, LAC2, LP, LI, LO
        classe: 1 a 6 (DN COPAM 217). None = não filtra por classe.
        incluir_gistm: incluir módulo premium de governança internacional.
        inventario: inventário pré-carregado (opcional).

    Returns:
        Lista de documentos aplicáveis.
    """
    if inventario is None:
        inventario = load_inventario()
    out = filtrar_por_modalidade(modalidade, inventario)
    if not incluir_gistm:
        out = [d for d in out if d.get("etapa", "") != "GOVERNANCA_GISTM"]
    return out


def filtrar_por_modo(
    modo: str,
    incluir_gistm: bool = False,
    inventario: list[dict[str, str]] | None = None,
) -> list[dict[str, str]]:
    """Filtro por modo de uso (AUDITORIA, LICENCIAMENTO, FECHAMENTO_MODO).

    Ignora modalidade de licenciamento — usa apenas etapas do ciclo de vida.
    Para Modo B (AUDITORIA), retorna documentos aplicáveis a ativos em
    operação: monitoramento, emergência, aproveitamento, transparência
    e (opcional) governança GISTM.

    Args:
        modo: "AUDITORIA", "LICENCIAMENTO" ou "FECHAMENTO_MODO".
        incluir_gistm: inclui etapa GOVERNANCA_GISTM se aplicável.
        inventario: inventário pré-carregado (opcional).
    """
    if inventario is None:
        inventario = load_inventario()
    etapas_permitidas = set(ETAPAS_POR_MODO.get(modo, []))
    if not incluir_gistm:
        etapas_permitidas.discard("GOVERNANCA_GISTM")
    return [
        d for d in inventario
        if d.get("etapa", "").strip().upper() in etapas_permitidas
    ]


def _doc_match(nome_req: str, nome_inv: str) -> bool:
    """Match flexível entre nome do doc no requisito e nome no inventário.

    O CSV de requisitos usa nomes abreviados (ex: 'Conexao em tempo real com
    Centros de Controle') enquanto o inventário tem o nome completo normativo
    (ex: 'Conexao em tempo real de instrumentacao com Centros de Controle
    Operacional publico e do empreendedor'). Faz match por:
    - igualdade exata;
    - prefixo (primeiras 30+ chars batem);
    - contains em qualquer direção.
    """
    a = nome_req.strip().lower()
    b = nome_inv.strip().lower()
    if not a or not b:
        return False
    if a == b:
        return True
    if len(a) >= 20 and (a in b or b in a):
        return True
    if len(a) >= 30 and a[:30] == b[:30]:
        return True
    return False


def requisitos_por_modo(
    modo: str,
    incluir_gistm: bool = False,
) -> list[dict[str, str]]:
    """Requisitos aplicáveis a um modo de uso (match flexível)."""
    docs = filtrar_por_modo(modo, incluir_gistm=incluir_gistm)
    doc_names = [d.get("documento", "") for d in docs]
    all_reqs = load_requisitos()
    return [
        r for r in all_reqs
        if any(_doc_match(r.get("documento", ""), d) for d in doc_names)
    ]


def filtrar_requisitos(
    documento: str,
    requisitos: list[dict[str, str]] | None = None,
) -> list[dict[str, str]]:
    """Requisitos de teste aplicáveis a um documento."""
    if requisitos is None:
        requisitos = load_requisitos()
    doc_norm = documento.strip().lower()
    return [
        r for r in requisitos
        if r.get("documento", "").strip().lower() == doc_norm
        or r.get("documento", "").strip().lower().startswith(doc_norm[:30])
    ]


def requisitos_por_modalidade(
    modalidade: str,
    incluir_gistm: bool = False,
) -> list[dict[str, str]]:
    """Todos os requisitos cujos documentos são aplicáveis à modalidade."""
    docs = filtrar_documentos(modalidade, incluir_gistm=incluir_gistm)
    doc_names = {d.get("documento", "").strip().lower() for d in docs}
    all_reqs = load_requisitos()
    return [
        r for r in all_reqs
        if r.get("documento", "").strip().lower() in doc_names
    ]


# ══════════════════════════════════════════════════════════════════
# Helpers para UI
# ══════════════════════════════════════════════════════════════════

def estatisticas() -> dict[str, int]:
    """Totais do inventário para badges de UI."""
    inv = load_inventario()
    reqs = load_requisitos()
    normas = load_normas()
    by_etapa: dict[str, int] = {}
    for d in inv:
        e = d.get("etapa", "").strip()
        by_etapa[e] = by_etapa.get(e, 0) + 1
    return {
        "total_documentos": len(inv),
        "total_requisitos": len(reqs),
        "total_normas": len(normas),
        "por_etapa": by_etapa,
    }
