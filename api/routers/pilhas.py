"""Endpoints do módulo Conformidade de Pilhas de Rejeito/Estéril.

Reaproveita o motor de scoring/recomendações do Due Diligence e adiciona
endpoints específicos para pilhas:

  GET  /api/pilhas/stats                   — estatísticas do inventário
  GET  /api/pilhas/normas                  — 23 normas do arcabouço
  GET  /api/pilhas/etapas                  — lista de etapas do ciclo
  GET  /api/pilhas/modalidades             — modalidades aplicáveis
  GET  /api/pilhas/documents               — documentos aplicáveis (filtros)
  GET  /api/pilhas/requirements            — requisitos de um documento
  GET  /api/pilhas/all-requirements        — todos os requisitos aplicáveis
  POST /api/pilhas/score                   — calcula score de conformidade
  POST /api/pilhas/report/conformidade     — gera relatório HTML
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Query
from pydantic import BaseModel

from app.components.pilhas_inventory import (
    ATIVIDADES_PILHAS,
    ETAPA_DESC,
    ETAPAS,
    ETAPAS_POR_MODO,
    MODALIDADE_DESC,
    MODALIDADE_TIPOS,
    MODO_DESC,
    estatisticas,
    filtrar_documentos,
    filtrar_por_etapa,
    filtrar_por_modo,
    filtrar_requisitos,
    load_normas,
    load_requisitos,
    requisitos_por_modalidade,
    requisitos_por_modo,
)
from app.components.dd_scoring import (
    CONFORMIDADE_ESCALA,
    calcular_conformidade,
    gerar_recomendacoes,
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/pilhas/stats")
def get_stats():
    """Estatísticas do inventário (badges de UI)."""
    return estatisticas()


@router.get("/pilhas/normas")
def get_normas():
    """Lista o arcabouço regulatório — 23 normas em 6 eixos."""
    return load_normas()


@router.get("/pilhas/etapas")
def get_etapas():
    """Etapas do ciclo de vida da pilha."""
    return [
        {"codigo": e, "descricao": ETAPA_DESC.get(e, e)}
        for e in ETAPAS
    ]


@router.get("/pilhas/modalidades")
def get_modalidades():
    """Modalidades de licenciamento aplicáveis."""
    return [
        {"code": m, "description": MODALIDADE_DESC.get(m, m)}
        for m in MODALIDADE_TIPOS
    ]


@router.get("/pilhas/modos")
def get_modos():
    """Modos de uso da ferramenta (Auditoria, Licenciamento, Fechamento)."""
    return [
        {
            "codigo": m,
            "descricao": MODO_DESC[m],
            "etapas": ETAPAS_POR_MODO[m],
        }
        for m in ("AUDITORIA", "LICENCIAMENTO", "FECHAMENTO_MODO")
    ]


@router.get("/pilhas/atividades")
def get_atividades():
    """Atividades DN COPAM 217/2017 relacionadas a pilhas."""
    return [
        {"codigo": c, "descricao": d}
        for c, d in ATIVIDADES_PILHAS.items()
    ]


@router.get("/pilhas/documents")
def get_documents(
    modo: str | None = Query(None, description="Modo de uso (AUDITORIA, LICENCIAMENTO, FECHAMENTO_MODO)"),
    modalidade: str | None = Query(None, description="Modalidade (só para modo LICENCIAMENTO)"),
    incluir_gistm: bool = Query(False, description="Incluir módulo GISTM (governança premium)"),
    etapa: str | None = Query(None, description="Filtrar por etapa (PROJETO, OPERACAO, etc.)"),
):
    """Documentos aplicáveis.

    Filtragem principal:
    - `modo`: se fornecido, filtra por conjunto de etapas do modo
      (AUDITORIA = etapas de ativo existente; LICENCIAMENTO = etapas
      pré-protocolo; FECHAMENTO_MODO = etapas de descomissionamento).
    - `modalidade`: alternativa ao modo, para filtragem por licenciamento.
      Se ambos forem omitidos, padrão é `modo=AUDITORIA`.
    - `etapa`: filtro adicional refinando a lista.
    - `incluir_gistm`: adiciona/permite etapa GOVERNANCA_GISTM.
    """
    if modo:
        docs = filtrar_por_modo(modo.upper(), incluir_gistm=incluir_gistm)
    elif modalidade:
        docs = filtrar_documentos(modalidade, incluir_gistm=incluir_gistm)
    else:
        docs = filtrar_por_modo("AUDITORIA", incluir_gistm=incluir_gistm)
        modo = "AUDITORIA"

    if etapa:
        alvo = etapa.strip().upper()
        docs = [d for d in docs if d.get("etapa", "").strip().upper() == alvo]

    return {
        "modo": modo,
        "modalidade": modalidade,
        "incluir_gistm": incluir_gistm,
        "etapa_filtro": etapa,
        "total": len(docs),
        "documents": docs,
    }


@router.get("/pilhas/requirements")
def get_requirements(
    documento: str = Query(..., description="Nome do documento"),
):
    """Requisitos de um documento específico."""
    reqs = filtrar_requisitos(documento)
    return {"documento": documento, "total": len(reqs), "requirements": reqs}


@router.get("/pilhas/all-requirements")
def get_all_requirements(
    modo: str | None = Query(None),
    modalidade: str | None = Query(None),
    incluir_gistm: bool = Query(False),
):
    """Todos os requisitos aplicáveis ao caso.

    Aceita `modo` (AUDITORIA/LICENCIAMENTO/FECHAMENTO_MODO) OU `modalidade`.
    Padrão: `modo=AUDITORIA`.
    """
    if modo:
        reqs = requisitos_por_modo(modo.upper(), incluir_gistm=incluir_gistm)
    elif modalidade:
        reqs = requisitos_por_modalidade(modalidade, incluir_gistm=incluir_gistm)
    else:
        reqs = requisitos_por_modo("AUDITORIA", incluir_gistm=incluir_gistm)
        modo = "AUDITORIA"
    return {
        "modo": modo,
        "modalidade": modalidade,
        "incluir_gistm": incluir_gistm,
        "total": len(reqs),
        "requirements": reqs,
    }


class DadosPilha(BaseModel):
    """Dados da pilha existente (para Modo Auditoria)."""
    nome: str | None = None
    classe: int | None = None  # 1..6 conforme DN COPAM 217
    tipo: str | None = None  # rejeito / esteril / mista
    metodo_construtivo: str | None = None  # dry_stack / empilhamento_drenado / PDE_convencional
    material: str | None = None  # minerio_ferro / ouro / bauxita / etc.
    altura_m: float | None = None
    volume_m3: float | None = None
    data_inicio: str | None = None  # AAAA-MM-DD
    consequencia: str | None = None  # low/significant/high/very_high/extreme (GISTM)
    municipio: str | None = None
    cnpj: str | None = None


class PilhaScoreRequest(BaseModel):
    modo: str = "AUDITORIA"
    modalidade: str | None = None
    incluir_gistm: bool = False
    avaliacoes: dict[str, str]
    doc_status: dict[str, str] = {}
    dados_pilha: DadosPilha | None = None


@router.post("/pilhas/score")
def score_pilhas(request: PilhaScoreRequest):
    """Calcula score de conformidade (reaproveita motor do DD).

    Entrada: modo + avaliações por requisito + (opcional) dados da pilha.
    Saída: classificação, cor, KPIs, recomendações.
    """
    if request.modo and request.modo.upper() != "LICENCIAMENTO":
        reqs = requisitos_por_modo(
            request.modo.upper(), incluir_gistm=request.incluir_gistm
        )
    elif request.modalidade:
        reqs = requisitos_por_modalidade(
            request.modalidade, incluir_gistm=request.incluir_gistm
        )
    else:
        reqs = requisitos_por_modo("AUDITORIA", incluir_gistm=request.incluir_gistm)
    all_reqs_ids = {r["requisito_id"] for r in reqs}

    # normaliza avaliacoes (remove ids fora do escopo)
    aval_filtrada = {
        k: v for k, v in request.avaliacoes.items() if k in all_reqs_ids
    }

    # pesos por requisito (peso do CSV, coluna "peso")
    pesos: dict[str, float] = {}
    for r in reqs:
        try:
            pesos[r["requisito_id"]] = float(r.get("peso") or 1.0)
        except (TypeError, ValueError):
            pesos[r["requisito_id"]] = 1.0

    resultado = calcular_conformidade(aval_filtrada, pesos)
    recomendacoes = gerar_recomendacoes(
        aval_filtrada, reqs, doc_status=request.doc_status
    )

    # resultado é dataclass/pydantic — converter para dict se necessário
    if hasattr(resultado, "__dict__"):
        resultado_dict = resultado.__dict__
    elif hasattr(resultado, "model_dump"):
        resultado_dict = resultado.model_dump()
    else:
        resultado_dict = dict(resultado)

    return {
        **resultado_dict,
        "recomendacoes": recomendacoes,
        "modo": request.modo,
        "modalidade": request.modalidade,
        "incluir_gistm": request.incluir_gistm,
        "dados_pilha": request.dados_pilha.model_dump() if request.dados_pilha else None,
    }


@router.get("/pilhas/scale")
def get_conformidade_scale():
    """Escala de conformidade (cores e faixas)."""
    return CONFORMIDADE_ESCALA
