"""Endpoints de Due Diligence ambiental."""

from __future__ import annotations

import io
import logging

import fitz  # pymupdf
from fastapi import APIRouter, File, Query, UploadFile
from pydantic import BaseModel

logger = logging.getLogger(__name__)

from app.components.dd_inventory import (
    LICENCA_DESC,
    LICENCA_TIPOS,
    filtrar_documentos,
    filtrar_requisitos,
    load_inventario,
    load_requisitos,
)
from app.components.dd_scoring import (
    CONFORMIDADE_ESCALA,
    calcular_checklist_completude,
    calcular_conformidade,
    gerar_recomendacoes,
)

router = APIRouter()


@router.get("/due-diligence/license-types")
def list_license_types():
    """Lista tipos de licença disponíveis com descrições."""
    return [
        {"code": code, "description": LICENCA_DESC.get(code, code)}
        for code in LICENCA_TIPOS
    ]


@router.get("/due-diligence/scale")
def get_conformidade_scale():
    """Retorna escala de conformidade (labels, cores, faixas)."""
    return CONFORMIDADE_ESCALA


@router.get("/due-diligence/documents")
def get_documents(
    licenca_tipo: str = Query(..., description="Tipo de licença (LAS, LAS-RAS, LAC1, etc.)"),
):
    """Retorna documentos aplicáveis para um tipo de licença."""
    docs = filtrar_documentos(licenca_tipo)
    return {
        "licenca_tipo": licenca_tipo,
        "total": len(docs),
        "documents": docs,
    }


@router.get("/due-diligence/requirements")
def get_requirements(
    documento: str = Query(..., description="Nome do documento"),
):
    """Retorna requisitos de teste para um documento específico."""
    reqs = filtrar_requisitos(documento)
    return {
        "documento": documento,
        "total": len(reqs),
        "requirements": reqs,
    }


class ScoreRequest(BaseModel):
    """Payload para cálculo de conformidade."""
    avaliacoes: dict[str, str]
    pesos: dict[str, float] | None = None
    doc_status: dict[str, str] | None = None


@router.post("/due-diligence/score")
def calculate_score(request: ScoreRequest):
    """Calcula score de conformidade a partir das avaliações.

    Aceita avaliações (requisito_id → "Atende" | "Atende Parcialmente" | "Não Atende" | "Não Aplica")
    e opcionalmente pesos e status de documentos.
    """
    resultado = calcular_conformidade(request.avaliacoes, request.pesos)

    response = {
        "total_requisitos": resultado.total_requisitos,
        "requisitos_aplicaveis": resultado.requisitos_aplicaveis,
        "atende": resultado.atende,
        "atende_parcial": resultado.atende_parcial,
        "nao_atende": resultado.nao_atende,
        "nao_aplica": resultado.nao_aplica,
        "conformidade_nao_ponderada": resultado.conformidade_nao_ponderada,
        "conformidade_ponderada": resultado.conformidade_ponderada,
        "nota_maxima": resultado.nota_maxima,
        "nota_obtida": resultado.nota_obtida,
        "classificacao": resultado.classificacao,
        "cor": resultado.cor,
        "descricao": resultado.descricao,
    }

    # Checklist de documentos (se fornecido)
    if request.doc_status:
        response["checklist"] = calcular_checklist_completude(request.doc_status)

    # Recomendações
    all_reqs = load_requisitos()
    response["recomendacoes"] = gerar_recomendacoes(request.avaliacoes, all_reqs)

    return response


# ── Upload e extração de documentos ──────────────────────────────────────


@router.post("/due-diligence/upload")
async def upload_document(file: UploadFile = File(...)):
    """Faz upload de PDF e extrai texto para análise.

    Retorna metadados do arquivo e texto extraído (sem persistir no disco).
    """
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        return {"error": "Apenas arquivos PDF são aceitos."}

    content = await file.read()
    size_bytes = len(content)

    try:
        doc = fitz.open(stream=content, filetype="pdf")
        pages = len(doc)
        text_parts = []
        for page in doc:
            text_parts.append(page.get_text())
        doc.close()
        full_text = "\n".join(text_parts)
    except Exception as e:
        logger.warning("Erro ao extrair texto do PDF: %s", e)
        return {"error": f"Erro ao processar PDF: {e}"}

    return {
        "filename": file.filename,
        "pages": pages,
        "size_bytes": size_bytes,
        "text_length": len(full_text),
        "text_preview": full_text[:2000] if full_text else "",
        "extracted_text": full_text,
    }


# ── Criticidade ──────────────────────────────────────────────────────────


class CriticalityRequest(BaseModel):
    """Payload para análise de criticidade."""
    avaliacoes: dict[str, str]


@router.post("/due-diligence/criticality")
def analyze_criticality(request: CriticalityRequest):
    """Calcula matrix de criticidade e aderência por tema.

    Retorna: itens não-conformes com impacto/complexidade + aderência por tópico.
    """
    all_reqs = load_requisitos()

    # Mapear requisito_id → detalhes
    req_map = {r["requisito_id"]: r for r in all_reqs}

    # Itens não-conformes (para a matrix de criticidade)
    non_conformes = []
    for req_id, avaliacao in request.avaliacoes.items():
        if avaliacao in ("Não Atende", "Atende Parcialmente"):
            req = req_map.get(req_id, {})
            impacto_raw = req.get("impacto", "")
            peso_raw = req.get("peso", "")
            # Converter impacto/peso em score numérico (1-5)
            try:
                impacto = float(impacto_raw) if impacto_raw else 3.0
            except (ValueError, TypeError):
                impacto = 3.0
            try:
                complexidade = float(peso_raw) if peso_raw else 2.0
            except (ValueError, TypeError):
                complexidade = 2.0
            # Quadrante
            if impacto >= 3 and complexidade >= 3:
                quadrante = "Ação Imediata (alta complexidade)"
            elif impacto >= 3:
                quadrante = "Ação Imediata (simples)"
            elif complexidade >= 3:
                quadrante = "Ações Secundárias"
            else:
                quadrante = "Baixa Prioridade"

            non_conformes.append({
                "requisito_id": req_id,
                "documento": req.get("documento", ""),
                "topico": req.get("topico", ""),
                "teste": req.get("teste_aderencia", ""),
                "avaliacao": avaliacao,
                "impacto": impacto,
                "complexidade": complexidade,
                "quadrante": quadrante,
            })

    # Aderência por tópico
    topicos: dict[str, dict] = {}
    for req_id, avaliacao in request.avaliacoes.items():
        if avaliacao == "Não Aplica":
            continue
        req = req_map.get(req_id, {})
        topico = req.get("topico", "Sem tópico")
        if topico not in topicos:
            topicos[topico] = {"topico": topico, "total": 0, "atende": 0, "parcial": 0, "nao_atende": 0}
        topicos[topico]["total"] += 1
        if avaliacao == "Atende":
            topicos[topico]["atende"] += 1
        elif avaliacao == "Atende Parcialmente":
            topicos[topico]["parcial"] += 1
        elif avaliacao == "Não Atende":
            topicos[topico]["nao_atende"] += 1

    por_tema = []
    for t in topicos.values():
        if t["total"] > 0:
            t["taxa_aderencia"] = round(100.0 * (t["atende"] + 0.5 * t["parcial"]) / t["total"], 1)
        else:
            t["taxa_aderencia"] = 0
        por_tema.append(t)

    por_tema.sort(key=lambda x: x["taxa_aderencia"])

    # Gargalos (3 temas com menor aderência)
    gargalos = [t["topico"] for t in por_tema[:3] if t["taxa_aderencia"] < 80]

    return {
        "non_conformes": non_conformes,
        "total_non_conformes": len(non_conformes),
        "por_tema": por_tema,
        "gargalos": gargalos,
        "quadrantes": {
            "acao_imediata_complexa": sum(1 for n in non_conformes if "alta complexidade" in n["quadrante"]),
            "acao_imediata_simples": sum(1 for n in non_conformes if "simples" in n["quadrante"]),
            "acoes_secundarias": sum(1 for n in non_conformes if "Secundárias" in n["quadrante"]),
            "baixa_prioridade": sum(1 for n in non_conformes if "Baixa" in n["quadrante"]),
        },
    }
