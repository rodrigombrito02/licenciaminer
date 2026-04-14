"""Due Diligence — Motor de scoring de conformidade.

Calcula scores de conformidade ponderados e não ponderados
com base nas avaliações do usuário, seguindo a metodologia
do modelo Excel (Summo Quartile).
"""

from dataclasses import dataclass, field
from typing import Any

# ── Escala de conformidade ──
CONFORMIDADE_ESCALA = [
    {
        "min": 0.90, "max": 1.00, "label": "Alta aderência",
        "cor": "#27AE60", "descricao": "Processo em conformidade com a legislação",
    },
    {
        "min": 0.80, "max": 0.90, "label": "Sob controle",
        "cor": "#2ECC71", "descricao": "Processo pode melhorar em pontos específicos",
    },
    {
        "min": 0.65, "max": 0.80, "label": "Melhorias pontuais",
        "cor": "#F39C12", "descricao": "Requer ajustes em áreas identificadas",
    },
    {
        "min": 0.50, "max": 0.65, "label": "Melhorias significativas",
        "cor": "#FF5F00", "descricao": "Requer atenção imediata em múltiplas áreas",
    },
    {
        "min": 0.00, "max": 0.50, "label": "Não conforme",
        "cor": "#E74C3C", "descricao": "Ações imediatas necessárias para regularização",
    },
]

# Valores possíveis para avaliação de requisitos
AVALIACOES = {
    "Atende": 1.0,
    "Atende Parcialmente": 0.5,
    "Não Atende": 0.0,
    "Não Aplica": None,  # Excluído do cálculo
}

# Status de documentos
DOC_STATUS = ["Apresentado", "Não Apresentado", "Parcial"]


@dataclass
class ResultadoConformidade:
    """Resultado do cálculo de conformidade."""

    total_requisitos: int = 0
    requisitos_aplicaveis: int = 0
    atende: int = 0
    atende_parcial: int = 0
    nao_atende: int = 0
    nao_aplica: int = 0

    # Scores
    conformidade_nao_ponderada: float = 0.0
    conformidade_ponderada: float = 0.0
    nota_maxima: float = 0.0
    nota_obtida: float = 0.0
    nota_maxima_ponderada: float = 0.0
    nota_obtida_ponderada: float = 0.0

    # Classificação
    classificacao: str = ""
    cor: str = ""
    descricao: str = ""

    # Por documento
    por_documento: dict[str, dict[str, Any]] = field(default_factory=dict)

    # Recomendações
    recomendacoes: list[dict[str, str]] = field(default_factory=list)


def classificar_conformidade(score: float) -> dict[str, str]:
    """Classifica um score de conformidade na escala definida.

    Boundaries: score >= min and score <= max, with higher bands checked first.
    E.g., score=0.90 → "Alta aderência" (first match wins).
    """
    for faixa in CONFORMIDADE_ESCALA:
        if faixa["min"] <= score <= faixa["max"]:
            return {"label": faixa["label"], "cor": faixa["cor"], "descricao": faixa["descricao"]}
    return CONFORMIDADE_ESCALA[-1]


def calcular_conformidade(
    avaliacoes: dict[str, str],
    pesos: dict[str, float] | None = None,
) -> ResultadoConformidade:
    """Calcula score de conformidade a partir das avaliações.

    Args:
        avaliacoes: Dict {requisito_id: avaliação} onde avaliação é
                    "Atende", "Atende Parcialmente", "Não Atende" ou "Não Aplica".
        pesos: Dict opcional {requisito_id: peso} para cálculo ponderado.

    Returns:
        ResultadoConformidade com scores e classificação.
    """
    result = ResultadoConformidade()
    result.total_requisitos = len(avaliacoes)

    nota_sum = 0.0
    nota_max = 0.0
    nota_pond_sum = 0.0
    nota_pond_max = 0.0

    for req_id, avaliacao in avaliacoes.items():
        valor = AVALIACOES.get(avaliacao)
        peso = pesos.get(req_id, 1.0) if pesos else 1.0

        if valor is None:  # Não Aplica
            result.nao_aplica += 1
            continue

        result.requisitos_aplicaveis += 1
        nota_max += 1.0
        nota_pond_max += peso

        if avaliacao == "Atende":
            result.atende += 1
            nota_sum += 1.0
            nota_pond_sum += peso
        elif avaliacao == "Atende Parcialmente":
            result.atende_parcial += 1
            nota_sum += 0.5
            nota_pond_sum += peso * 0.5
        else:  # Não Atende
            result.nao_atende += 1

    # Scores
    result.nota_maxima = nota_max
    result.nota_obtida = nota_sum
    result.nota_maxima_ponderada = nota_pond_max
    result.nota_obtida_ponderada = nota_pond_sum

    if nota_max > 0:
        result.conformidade_nao_ponderada = nota_sum / nota_max
    if nota_pond_max > 0:
        result.conformidade_ponderada = nota_pond_sum / nota_pond_max

    # Classificação (usa score não ponderado como principal)
    cls = classificar_conformidade(result.conformidade_nao_ponderada)
    result.classificacao = cls["label"]
    result.cor = cls["cor"]
    result.descricao = cls["descricao"]

    return result


def gerar_recomendacoes(
    avaliacoes: dict[str, str],
    requisitos: list[dict[str, str]],
    doc_status: dict[str, str] | None = None,
) -> list[dict[str, str]]:
    """Gera recomendações a partir de requisitos não atendidos.

    Args:
        avaliacoes: Dict {requisito_id: avaliação}.
        requisitos: Lista de requisitos de referência.
        doc_status: Dict {documento: "Apresentado"|"Parcial"|"Não Apresentado"} (opcional).

    Returns:
        Lista de recomendações com tipo, descrição e prioridade.
    """
    req_map = {r["requisito_id"]: r for r in requisitos}
    # Track which documents are absent
    absent_docs: set[str] = set()
    if doc_status:
        absent_docs = {doc for doc, st in doc_status.items() if st == "Não Apresentado" or not st}

    recomendacoes = []
    # Add document-level recommendations for absent docs (one per absent doc)
    seen_absent = set()

    for req_id, avaliacao in avaliacoes.items():
        if avaliacao in ("Não Atende", "Atende Parcialmente"):
            req = req_map.get(req_id, {})
            doc_name = req.get("documento", "")
            is_absent = doc_name in absent_docs

            if is_absent:
                tipo = "Documento ausente"
                prioridade = "Alta"
                # Add one summary recommendation per absent document
                if doc_name not in seen_absent:
                    seen_absent.add(doc_name)
                    recomendacoes.append({
                        "requisito_id": f"DOC-{doc_name}",
                        "tipo": "Documento ausente",
                        "prioridade": "Alta",
                        "documento": doc_name,
                        "topico": "Elaboração do documento",
                        "teste": f"O documento '{doc_name}' não foi apresentado.",
                        "evidencia": f"Elaborar e submeter o documento '{doc_name}' com todos os requisitos aplicáveis.",
                    })
            else:
                tipo = "Procedimento inconforme" if avaliacao == "Não Atende" else "Ponto de atenção"
                prioridade = "Alta" if avaliacao == "Não Atende" else "Média"

                recomendacoes.append({
                    "requisito_id": req_id,
                    "tipo": tipo,
                    "prioridade": prioridade,
                    "documento": doc_name,
                    "topico": req.get("topico", ""),
                    "teste": req.get("teste_aderencia", ""),
                    "evidencia": req.get("evidencia_esperada", ""),
                })

    # Ordenar: Documento ausente primeiro, depois Alta, depois Média
    priority_order = {"Documento ausente": 0, "Alta": 1, "Média": 2}
    recomendacoes.sort(key=lambda r: (priority_order.get(r["prioridade"], 9), r["requisito_id"]))
    return recomendacoes


def calcular_checklist_completude(
    status_docs: dict[str, str],
) -> dict[str, Any]:
    """Calcula completude do checklist de documentos.

    Args:
        status_docs: Dict {documento: status} onde status é
                     "Apresentado", "Não Apresentado" ou "Parcial".

    Returns:
        Dict com total, apresentados, faltantes, percentual.
    """
    total = len(status_docs)
    apresentados = sum(1 for s in status_docs.values() if s == "Apresentado")
    parciais = sum(1 for s in status_docs.values() if s == "Parcial")
    faltantes = sum(1 for s in status_docs.values() if s == "Não Apresentado")

    return {
        "total": total,
        "apresentados": apresentados,
        "parciais": parciais,
        "faltantes": faltantes,
        "percentual": apresentados / total if total > 0 else 0.0,
        "percentual_com_parciais": (apresentados + parciais * 0.5) / total if total > 0 else 0.0,
    }
