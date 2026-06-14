"""Endpoints do modulo Mapeamentos — prospeccao multi-tese de direitos.

Restrito a consultor/admin Summo. Etapa 1: roda sobre a base LOCAL
(v_concessoes, MG enriquecido) via DuckDB — sem chamadas a API ANM.
A varredura roda sob demanda; o snapshot fica salvo para triagem.
"""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from api.services.database import safe_query
from licenciaminer.mapeamentos.database import (
    Mapeamento,
    ResultadoMapeamento,
    STATUS_RESULTADO,
    get_session,
)
from licenciaminer.mapeamentos.search import (
    PESOS_DEFAULT,
    TEMPLATES,
    build_search_sql,
    derive_motivos,
    potencial_tier,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/mapeamentos", tags=["Mapeamentos"])

MAX_RESULTADOS = 200


# ══════════════════════════════════════════════════════════════════
# Schemas
# ══════════════════════════════════════════════════════════════════

class MapeamentoIn(BaseModel):
    nome: str
    descricao: Optional[str] = None
    objetivo: str = "livre"
    criterios: Optional[dict] = None
    pesos: Optional[dict] = None
    lider_responsavel: Optional[str] = None
    criado_por: Optional[str] = None
    acl: Optional[dict] = None


class MapeamentoUpdate(BaseModel):
    nome: Optional[str] = None
    descricao: Optional[str] = None
    objetivo: Optional[str] = None
    criterios: Optional[dict] = None
    pesos: Optional[dict] = None
    lider_responsavel: Optional[str] = None
    acl: Optional[dict] = None


class PreviewIn(BaseModel):
    """Roda a busca sem salvar — preview ao configurar a tese."""
    criterios: Optional[dict] = None
    pesos: Optional[dict] = None
    limit: int = 50


class ResultadoUpdate(BaseModel):
    status: Optional[str] = None
    nota: Optional[str] = None


# ══════════════════════════════════════════════════════════════════
# Serializacao
# ══════════════════════════════════════════════════════════════════

def _map_out(m: Mapeamento) -> dict:
    return {
        "id": m.id,
        "nome": m.nome,
        "descricao": m.descricao,
        "objetivo": m.objetivo,
        "criterios": m.criterios,
        "pesos": m.pesos,
        "lider_responsavel": m.lider_responsavel,
        "criado_por": m.criado_por,
        "acl": m.acl,
        "n_resultados": m.n_resultados,
        "ultima_varredura_em": m.ultima_varredura_em.isoformat() if m.ultima_varredura_em else None,
        "criado_em": m.criado_em.isoformat() if m.criado_em else None,
        "atualizado_em": m.atualizado_em.isoformat() if m.atualizado_em else None,
    }


def _res_out(r: ResultadoMapeamento) -> dict:
    return {
        "id": r.id,
        "mapeamento_id": r.mapeamento_id,
        "processo": r.processo,
        "titular": r.titular,
        "cpf_cnpj": r.cpf_cnpj,
        "substancia": r.substancia,
        "categoria": r.categoria,
        "municipio": r.municipio,
        "uf": r.uf,
        "fase": r.fase,
        "area_ha": r.area_ha,
        "ativo_cfem": r.ativo_cfem,
        "cfem_total": r.cfem_total,
        "ult_evento": r.ult_evento,
        "score": r.score,
        "potencial": potencial_tier(r.score),
        "motivos": r.motivos,
        "status": r.status,
        "nota": r.nota,
        "promovido_oportunidade_id": r.promovido_oportunidade_id,
    }


def _executar_busca(criterios: dict | None, pesos: dict | None, limit: int) -> list[dict]:
    """Roda a varredura na base local e devolve linhas + motivos derivados."""
    sql = build_search_sql(criterios, pesos, limit=limit)
    rows = safe_query(sql)
    for row in rows:
        row["motivos"] = derive_motivos(row)
        row["potencial"] = potencial_tier(row.get("score"))
        # uf derivada do municipio ("CIDADE - MG")
        mun = row.get("municipio") or ""
        row["uf"] = mun.split("-")[-1].strip()[:2] if "-" in mun else None
    return rows


# ══════════════════════════════════════════════════════════════════
# Endpoints
# ══════════════════════════════════════════════════════════════════

@router.get("/templates")
def listar_templates() -> dict:
    """Presets de tese (pontos de partida) + pesos default."""
    return {"templates": TEMPLATES, "pesos_default": PESOS_DEFAULT}


@router.get("")
def listar_mapeamentos(db: Session = Depends(get_session)) -> list[dict]:
    itens = db.query(Mapeamento).order_by(Mapeamento.atualizado_em.desc()).all()
    return [_map_out(m) for m in itens]


@router.post("", status_code=201)
def criar_mapeamento(payload: MapeamentoIn, db: Session = Depends(get_session)) -> dict:
    m = Mapeamento(
        nome=payload.nome,
        descricao=payload.descricao,
        objetivo=payload.objetivo,
        criterios=payload.criterios,
        pesos=payload.pesos or dict(PESOS_DEFAULT),
        lider_responsavel=payload.lider_responsavel,
        criado_por=payload.criado_por,
        acl=payload.acl,
    )
    db.add(m)
    db.commit()
    db.refresh(m)
    return _map_out(m)


@router.post("/preview")
def preview_busca(payload: PreviewIn) -> dict:
    """Roda a busca sem salvar — para ajustar criterios/pesos ao vivo."""
    limit = max(1, min(payload.limit, 100))
    rows = _executar_busca(payload.criterios, payload.pesos, limit)
    return {"total": len(rows), "resultados": rows}


@router.get("/{map_id}")
def obter_mapeamento(map_id: int, db: Session = Depends(get_session)) -> dict:
    m = db.get(Mapeamento, map_id)
    if not m:
        raise HTTPException(404, "Mapeamento nao encontrado")
    out = _map_out(m)
    resultados = (
        db.query(ResultadoMapeamento)
        .filter(ResultadoMapeamento.mapeamento_id == map_id)
        .order_by(ResultadoMapeamento.score.desc())
        .all()
    )
    out["resultados"] = [_res_out(r) for r in resultados]
    return out


@router.put("/{map_id}")
def atualizar_mapeamento(
    map_id: int, payload: MapeamentoUpdate, db: Session = Depends(get_session)
) -> dict:
    m = db.get(Mapeamento, map_id)
    if not m:
        raise HTTPException(404, "Mapeamento nao encontrado")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(m, field, value)
    db.commit()
    db.refresh(m)
    return _map_out(m)


@router.delete("/{map_id}", status_code=204)
def deletar_mapeamento(map_id: int, db: Session = Depends(get_session)) -> None:
    m = db.get(Mapeamento, map_id)
    if not m:
        raise HTTPException(404, "Mapeamento nao encontrado")
    db.delete(m)
    db.commit()


@router.post("/{map_id}/varredura")
def rodar_varredura(map_id: int, db: Session = Depends(get_session)) -> dict:
    """Roda a tese sobre a base local e salva o snapshot de resultados.

    Substitui o snapshot anterior (re-rodar atualiza). Nao se atualiza sozinho:
    reflete os dados locais no momento da rodada.
    """
    m = db.get(Mapeamento, map_id)
    if not m:
        raise HTTPException(404, "Mapeamento nao encontrado")

    rows = _executar_busca(m.criterios, m.pesos, MAX_RESULTADOS)

    # Preserva triagem (status/nota) de resultados ja existentes pelo processo
    anteriores = {
        r.processo: r
        for r in db.query(ResultadoMapeamento)
        .filter(ResultadoMapeamento.mapeamento_id == map_id)
        .all()
    }

    # Limpa snapshot anterior
    db.query(ResultadoMapeamento).filter(
        ResultadoMapeamento.mapeamento_id == map_id
    ).delete()

    for row in rows:
        prev = anteriores.get(row.get("processo"))
        db.add(
            ResultadoMapeamento(
                mapeamento_id=map_id,
                processo=row.get("processo"),
                titular=row.get("titular"),
                cpf_cnpj=str(row.get("cpf_cnpj")) if row.get("cpf_cnpj") is not None else None,
                substancia=row.get("substancia"),
                categoria=row.get("categoria"),
                municipio=row.get("municipio"),
                uf=row.get("uf"),
                fase=row.get("fase"),
                area_ha=row.get("area_ha"),
                ativo_cfem=row.get("ativo_cfem"),
                cfem_total=row.get("cfem_total"),
                ult_evento=row.get("ult_evento"),
                score=row.get("score"),
                motivos=row.get("motivos"),
                # Mantem triagem humana entre rodadas
                status=prev.status if prev else "triagem",
                nota=prev.nota if prev else None,
                promovido_oportunidade_id=prev.promovido_oportunidade_id if prev else None,
            )
        )

    m.n_resultados = len(rows)
    m.ultima_varredura_em = datetime.utcnow()
    db.commit()
    return {"map_id": map_id, "n_resultados": len(rows), "ultima_varredura_em": m.ultima_varredura_em.isoformat()}


@router.patch("/resultados/{res_id}")
def atualizar_resultado(
    res_id: int, payload: ResultadoUpdate, db: Session = Depends(get_session)
) -> dict:
    r = db.get(ResultadoMapeamento, res_id)
    if not r:
        raise HTTPException(404, "Resultado nao encontrado")
    if payload.status is not None:
        if payload.status not in STATUS_RESULTADO:
            raise HTTPException(422, f"Status invalido. Use: {STATUS_RESULTADO}")
        r.status = payload.status
    if payload.nota is not None:
        r.nota = payload.nota
    db.commit()
    db.refresh(r)
    return _res_out(r)


@router.post("/resultados/{res_id}/promover")
def promover_para_funil(res_id: int, db: Session = Depends(get_session)) -> dict:
    """Promove um resultado para o Funil de Oportunidades, herdando o snapshot.

    O card nasce na etapa 'prospect' ja com processo/substancia/area/municipio.
    Os 9 scores ficam vazios para o consultor refinar (enriquecimento fino vem
    na etapa de avaliacao do funil).
    """
    r = db.get(ResultadoMapeamento, res_id)
    if not r:
        raise HTTPException(404, "Resultado nao encontrado")
    if r.promovido_oportunidade_id:
        raise HTTPException(409, "Resultado ja promovido ao funil")

    # Import tardio para nao acoplar os modulos no import-time
    from licenciaminer.oportunidades.database import Oportunidade
    from licenciaminer.oportunidades.database import SessionLocal as OpSession

    op_db = OpSession()
    try:
        op = Oportunidade(
            titulo=f"{r.substancia or 'Direito'} — {r.municipio or ''}".strip(" —"),
            descricao=f"Promovido do mapeamento #{r.mapeamento_id}. Motivos: "
            + ", ".join(r.motivos or []),
            etapa="prospect",
            processo_anm=r.processo,
            substancia=r.substancia,
            fase_anm=r.fase,
            area_ha=r.area_ha,
            municipio=r.municipio,
            uf=r.uf,
        )
        op_db.add(op)
        op_db.commit()
        op_db.refresh(op)
        op_id = op.id
    finally:
        op_db.close()

    r.status = "promovido"
    r.promovido_oportunidade_id = op_id
    db.commit()
    db.refresh(r)
    return {"resultado": _res_out(r), "oportunidade_id": op_id}


# ══════════════════════════════════════════════════════════════════
# Relatório de Mapeamento (2.5) — HTML estilo Summo
# ══════════════════════════════════════════════════════════════════

_POTENCIAL_LABEL = {"alto": "Alto", "medio": "Médio", "baixo": "Baixo"}
_POTENCIAL_COR = {"alto": "#27AE60", "medio": "#F39C12", "baixo": "#9CA3AF"}

_CRIT_LABEL = {
    "categorias": "Categorias",
    "substancias": "Substâncias",
    "fases": "Fases",
    "cfem_status": "Status CFEM",
    "titular_tipo": "Tipo de titular",
    "area_min": "Área mínima (ha)",
    "area_max": "Área máxima (ha)",
    "apenas_estrategico": "Apenas estratégicas",
    "sem_sobreposicao": "Sem sobreposição UC/TI",
}


@router.get("/{map_id}/relatorio", response_class=HTMLResponse)
def relatorio_mapeamento(map_id: int, top: int = 10, db: Session = Depends(get_session)) -> str:
    """Relatório HTML (estilo Summo) da tese + top N oportunidades."""
    m = db.get(Mapeamento, map_id)
    if not m:
        raise HTTPException(404, "Mapeamento nao encontrado")

    resultados = (
        db.query(ResultadoMapeamento)
        .filter(ResultadoMapeamento.mapeamento_id == map_id)
        .filter(ResultadoMapeamento.status != "descartado")
        .order_by(ResultadoMapeamento.score.desc())
        .limit(max(1, min(top, 100)))
        .all()
    )

    # Resumo de criterios
    crit = m.criterios or {}
    crit_rows = ""
    for k, label in _CRIT_LABEL.items():
        v = crit.get(k)
        if v in (None, "", [], False, "qualquer"):
            continue
        if isinstance(v, list):
            v = ", ".join(str(x) for x in v)
        elif isinstance(v, bool):
            v = "Sim"
        crit_rows += f"<tr><td class='k'>{label}</td><td>{v}</td></tr>"
    if not crit_rows:
        crit_rows = "<tr><td colspan='2' style='color:#888'>Sem filtros — varredura ampla</td></tr>"

    linhas = ""
    for i, r in enumerate(resultados, 1):
        pot = potencial_tier(r.score)
        motivos = " · ".join(r.motivos or [])
        linhas += f"""
        <tr>
          <td style='text-align:center;color:#888'>{i}</td>
          <td><strong>{r.substancia or '—'}</strong><br><span style='font-size:11px;color:#888'>ANM {r.processo or ''}</span></td>
          <td>{r.municipio or '—'}</td>
          <td style='text-align:right'>{(r.area_ha or 0):.0f} ha</td>
          <td style='text-align:center'><span style='display:inline-block;background:{_POTENCIAL_COR[pot]};color:#fff;font-size:11px;font-weight:700;padding:2px 8px;border-radius:10px'>{_POTENCIAL_LABEL[pot]}</span><br><span style='font-size:10px;color:#888'>{(r.score or 0):.0f} pts</span></td>
          <td style='font-size:11px;color:#555'>{motivos}</td>
        </tr>"""

    return f"""<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
<title>Relatório de Mapeamento — {m.nome}</title>
<style>
  body {{ font-family: 'Segoe UI', system-ui, sans-serif; color:#1a1a1a; margin:0; background:#fff; }}
  .hero {{ background:linear-gradient(135deg,#0A2540,#156082); color:#fff; padding:36px 40px; }}
  .hero .tag {{ font-size:11px; text-transform:uppercase; letter-spacing:2px; color:#FFC000; }}
  .hero h1 {{ font-size:26px; margin:6px 0 4px; }}
  .hero p {{ color:rgba(255,255,255,.7); font-size:13px; margin:0; }}
  .wrap {{ padding:32px 40px; max-width:1000px; }}
  h2 {{ font-size:15px; color:#0A2540; border-left:4px solid #FFC000; padding-left:10px; margin:24px 0 12px; }}
  table {{ width:100%; border-collapse:collapse; font-size:13px; }}
  .crit td {{ padding:5px 10px; border-bottom:1px solid #f0f0f0; }}
  .crit td.k {{ color:#888; width:200px; font-size:12px; text-transform:uppercase; letter-spacing:.5px; }}
  .res th {{ background:#0A2540; color:#fff; font-size:11px; text-transform:uppercase; letter-spacing:.5px; padding:8px 10px; text-align:left; }}
  .res td {{ padding:8px 10px; border-bottom:1px solid #f0f0f0; vertical-align:top; }}
  .res tr:hover td {{ background:#f8f9fb; }}
  .footer {{ color:#888; font-size:11px; padding:20px 40px; border-top:1px solid #eee; }}
  .footer strong {{ color:#156082; }}
  .note {{ background:#FFF8E6; border-left:3px solid #FFC000; padding:10px 14px; font-size:12px; color:#7a5b00; margin:16px 0; border-radius:4px; }}
</style></head><body>
<div class="hero">
  <div class="tag">Summo Quartile · Mapeamento de Direitos</div>
  <h1>{m.nome}</h1>
  <p>{m.descricao or ''}</p>
</div>
<div class="wrap">
  <h2>Critérios da tese</h2>
  <table class="crit">{crit_rows}</table>

  <h2>Oportunidades priorizadas (top {len(resultados)})</h2>
  <table class="res">
    <thead><tr><th>#</th><th>Direito</th><th>Município</th><th>Área</th><th>Potencial</th><th>Sinais</th></tr></thead>
    <tbody>{linhas}</tbody>
  </table>

  <div class="note">
    Triagem automática sobre base pública local (ANM/SCM + sobreposição espacial UC/TI/bioma).
    O <strong>potencial</strong> é um score de êxito para priorizar abordagem — a avaliação
    final (água, energia, logística, viabilidade) é feita caso a caso no Funil de Oportunidades.
  </div>
</div>
<div class="footer">
  <strong>Summo Quartile</strong> · Relatório gerado a partir do módulo de Mapeamentos ·
  Documento interno de prospecção
</div>
</body></html>"""
