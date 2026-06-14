"""Ativos Minerários — painel único do ativo (identidade + trilha + portfólio).

Lê das views ANM (v_scm nacional / v_concessoes MG enriquecido) e aplica o motor
de regras da trilha. O portfólio agrupa direitos pelo cpf_cnpj_do_titular (campo
limpo: 14 dígitos zero-padded; 77% preenchido; chave de agrupamento confiável).
"""

import logging

from fastapi import APIRouter, HTTPException, Query

from pydantic import BaseModel

from api.services.database import run_query
from licenciaminer.ativos.trilha import montar_trilha
from licenciaminer.oportunidades.database import (
    Oportunidade,
    SessionLocal as OportunidadeSession,
)

logger = logging.getLogger(__name__)

router = APIRouter()

# Colunas pesadas a evitar
_HEAVY = {"texto_documentos", "documentos_pdf", "documents_str"}


def _resolve_view() -> str:
    """v_scm (nacional, maior) preferida; fallback v_concessoes."""
    try:
        r = run_query("SELECT COUNT(*) AS n FROM v_scm LIMIT 1")
        if r and r[0]["n"] > 0:
            return "v_scm"
    except Exception:
        pass
    try:
        r = run_query("SELECT COUNT(*) AS n FROM v_concessoes LIMIT 1")
        if r and r[0]["n"] > 0:
            return "v_concessoes"
    except Exception:
        pass
    raise HTTPException(status_code=503, detail="Dataset de ativos não disponível")


def _cols(view: str) -> list[str]:
    desc = run_query(f"DESCRIBE {view}")
    return [r["column_name"] for r in desc if r["column_name"] not in _HEAVY]


def _digits(s: str | None) -> str:
    return "".join(ch for ch in (s or "") if ch.isdigit())


def _uf_de_municipio(municipio: str | None) -> str | None:
    """Extrai UF de 'FEIRA DE SANTANA - BA' → 'BA'."""
    if not municipio or " - " not in municipio:
        return None
    uf = municipio.rsplit(" - ", 1)[-1].strip()
    return uf if len(uf) == 2 else None


def _fetch_registro(processo: str) -> dict:
    """Busca a linha do ativo por processo_norm/processo na view disponível."""
    view = _resolve_view()
    cols = _cols(view)
    select_sql = ", ".join(cols)
    rows = run_query(
        f"SELECT {select_sql} FROM {view} WHERE processo_norm = ? OR processo = ? LIMIT 1",
        [processo, processo],
    )
    if not rows:
        raise HTTPException(status_code=404, detail="Ativo não encontrado")
    return rows[0]


@router.get("/ativos/detail")
def ativo_detail(processo: str = Query(..., min_length=3, max_length=40)):
    """Painel do ativo: identidade + trilha (regras) + resumo do portfólio do titular.

    Usa query param porque processo_norm contém '/' (ex: '000994/1940').
    """
    view = _resolve_view()
    reg = _fetch_registro(processo)

    trilha = montar_trilha(reg)

    # Resumo do portfólio do titular (mesmo CNPJ/CPF)
    cnpj = _digits(reg.get("cpf_cnpj_do_titular"))
    portfolio_resumo = None
    if len(cnpj) >= 11:
        pr = run_query(
            f"SELECT COUNT(*) AS n FROM {view} "
            "WHERE REGEXP_REPLACE(CAST(cpf_cnpj_do_titular AS VARCHAR), '[^0-9]', '', 'g') = ?",
            [cnpj],
        )
        total_titular = pr[0]["n"] if pr else 0
        portfolio_resumo = {
            "cpf_cnpj": cnpj,
            "titular": reg.get("titular"),
            "total_direitos": total_titular,
            "outros_direitos": max(0, total_titular - 1),
        }

    identidade = {
        "processo": reg.get("processo"),
        "processo_norm": reg.get("processo_norm"),
        "titular": reg.get("titular"),
        "cpf_cnpj": reg.get("cpf_cnpj_do_titular"),
        "substancia": reg.get("substancia_principal") or reg.get("substancia") or reg.get("SUBS"),
        "municipio": reg.get("municipio_principal") or reg.get("municipio_s"),
        "fase_atual": reg.get("fase_atual") or reg.get("FASE"),
        "regime": reg.get("regime"),
        "area_ha": reg.get("AREA_HA"),
        "situacao": reg.get("situacao"),
        "ult_evento": reg.get("ULT_EVENTO"),
    }

    return {
        "view": view,
        "identidade": identidade,
        "trilha": trilha,
        "portfolio": portfolio_resumo,
        "scm_url": "https://sistemas.anm.gov.br/SCM/Extra/site/admin/pesquisarProcessos.aspx",
    }


@router.get("/ativos/portfolio")
def ativo_portfolio(
    cnpj: str = Query(..., min_length=11, max_length=20),
    limit: int = Query(200, ge=1, le=1000),
):
    """Portfólio de um titular: todos os direitos do mesmo CNPJ/CPF + agregados."""
    view = _resolve_view()
    digits = _digits(cnpj)
    if len(digits) < 11:
        raise HTTPException(status_code=400, detail="CNPJ/CPF inválido")

    norm_expr = "REGEXP_REPLACE(CAST(cpf_cnpj_do_titular AS VARCHAR), '[^0-9]', '', 'g')"

    base = run_query(
        f"SELECT processo_norm, processo, titular, fase_atual, regime, "
        f"substancia_principal, municipio_principal "
        f"FROM {view} WHERE {norm_expr} = ? ORDER BY fase_atual LIMIT ?",
        [digits, limit],
    )
    if not base:
        raise HTTPException(status_code=404, detail="Nenhum direito encontrado para este titular")

    titular = base[0].get("titular")

    def _agg(field: str) -> dict:
        rows = run_query(
            f"SELECT {field} AS k, COUNT(*) AS n FROM {view} "
            f"WHERE {norm_expr} = ? AND {field} IS NOT NULL "
            "GROUP BY 1 ORDER BY n DESC",
            [digits],
        )
        return {r["k"]: r["n"] for r in rows}

    total_r = run_query(f"SELECT COUNT(*) AS n FROM {view} WHERE {norm_expr} = ?", [digits])
    total = total_r[0]["n"] if total_r else len(base)

    return {
        "view": view,
        "cpf_cnpj": digits,
        "titular": titular,
        "total_direitos": total,
        "por_fase": _agg("fase_atual"),
        "por_substancia": _agg("substancia_principal"),
        "direitos": base,
    }


@router.get("/ativos/contexto")
def ativo_contexto(processo: str = Query(..., min_length=3, max_length=40)):
    """Camadas territoriais cruzadas do ativo (distâncias água/energia/logística +
    contexto geológico). Reusa o motor de enriquecimento do Funil. Premium na UI.
    """
    reg = _fetch_registro(processo)
    proc = reg.get("processo_norm") or reg.get("processo") or processo
    municipio = reg.get("municipio_principal") or reg.get("municipio_s")
    substancia = reg.get("substancia_principal") or reg.get("substancia") or reg.get("SUBS")
    categoria = reg.get("categoria")

    # Import tardio: geopandas é pesado, só carrega quando alguém pede contexto.
    from licenciaminer.enriquecimento.service import enriquecer

    full = enriquecer(
        processo=proc, municipio=municipio, substancia=substancia, categoria=categoria,
    )
    chaves = ["agua", "energia", "logistica", "destinacao", "geologico"]
    camadas = {k: full[k] for k in chaves if k in full}
    return {"processo": proc, "municipio": municipio, "camadas": camadas}


@router.get("/ativos/radar")
def radar_eventos(limite: int = Query(200, ge=1, le=2000)):
    """Radar de eventos ANM — diff entre o snapshot baseline e o de hoje (se existir).

    Mecanismo + baseline prontos; a coleta diária que gera o snapshot 'hoje' é a
    trilha INT-4 (N8N). Sem o feed diário, retorna o status do baseline.
    """
    from licenciaminer.ativos import radar as _radar

    base = _radar.carregar_snapshot("baseline")
    hoje = _radar.carregar_snapshot("hoje")
    if not base:
        return {"status": "sem_baseline", "eventos": [], "catalogo": _radar.EVENTOS}
    if not hoje:
        return {
            "status": "baseline_pronto",
            "processos_baseline": len(base),
            "eventos": [],
            "catalogo": _radar.EVENTOS,
            "nota": "Aguardando o feed diário (INT-4) gerar o snapshot de hoje para o diff.",
        }
    eventos = _radar.diff(base, hoje, limite=limite)
    por_tipo: dict = {}
    for e in eventos:
        por_tipo[e["tipo"]] = por_tipo.get(e["tipo"], 0) + 1
    return {"status": "ativo", "total": len(eventos), "por_tipo": por_tipo,
            "eventos": eventos[:limite], "catalogo": _radar.EVENTOS}


class PromoverIn(BaseModel):
    processo: str
    criado_por: str | None = None


@router.post("/ativos/promover")
def promover_ao_funil(payload: PromoverIn):
    """Cria uma oportunidade no Funil a partir do ativo (idempotente por processo).

    Liga a Trilha (ciclo regulatório, factual) ao Funil (pipeline comercial) pelo
    ativo — opção B: dois processos distintos, ancorados no mesmo direito.
    """
    reg = _fetch_registro(payload.processo)
    processo = reg.get("processo_norm") or reg.get("processo") or payload.processo
    substancia = reg.get("substancia_principal") or reg.get("substancia") or reg.get("SUBS")
    municipio = reg.get("municipio_principal") or reg.get("municipio_s")
    fase = reg.get("fase_atual") or reg.get("FASE")

    db = OportunidadeSession()
    try:
        existente = db.query(Oportunidade).filter(
            Oportunidade.processo_anm == processo
        ).first()
        if existente:
            return {"oportunidade_id": existente.id, "criado": False,
                    "etapa": existente.etapa, "titulo": existente.titulo}

        titulo = f"{substancia or 'Ativo'} — {municipio or processo}"
        op = Oportunidade(
            titulo=titulo,
            descricao=f"Promovido da Trilha do Ativo (processo {processo}).",
            etapa="prospect",
            processo_anm=processo,
            substancia=substancia,
            fase_anm=fase,
            area_ha=reg.get("AREA_HA"),
            municipio=municipio,
            uf=_uf_de_municipio(municipio),
            criado_por=payload.criado_por,
        )
        db.add(op)
        db.commit()
        db.refresh(op)
        return {"oportunidade_id": op.id, "criado": True,
                "etapa": op.etapa, "titulo": op.titulo}
    finally:
        db.close()
