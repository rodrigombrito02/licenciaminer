"""Endpoints do módulo de Gestão de Riscos e Crises.

Prefixo: /api/riscos

Cobre o ciclo ISO 31000: identificação, análise, avaliação, tratamento e monitoramento.
Persiste em SQLite isolado (data/riscos.db), separado dos parquets analíticos.
"""

from __future__ import annotations

import logging
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from licenciaminer.riscos.database import get_session
from pydantic import BaseModel, Field

from datetime import date as _date

from licenciaminer.riscos.models import (
    Acao,
    BarreiraCorretiva,
    BarreiraPreventiva,
    Bowtie,
    Categoria,
    Causa,
    Consequencia,
    Controle,
    EloCadeiaValor,
    EscalaImpacto,
    EscalaProbabilidade,
    FatorEscalonamento,
    MatrizClassificacao,
    Metodologia,
    Pessoa,
    Risco,
    UnidadeOrg,
)
from licenciaminer.riscos.schemas import (
    DashboardKpis,
    PessoaIn,
    RiscoIn,
    RiscoPatch,
)
from fastapi.responses import Response

from licenciaminer.riscos.services.exporter_musa import exportar_bowtie_excel
from licenciaminer.riscos.services.pdf_export import (
    exportar_cenario_pdf,
    exportar_executivo_pdf,
    exportar_risco_pdf,
)
from licenciaminer.riscos.services.importer_atualizacao import (
    DEFAULT_ATUALIZACAO_PATH,
    importar_atualizacao,
)
from licenciaminer.riscos.services.importer_musa import (
    DEFAULT_MUSA_PATH,
    importar_musa,
)
from licenciaminer.riscos.services.bowtie import (
    proximo_codigo_causa,
    proximo_codigo_consequencia,
    serialize_bowtie,
    serialize_causa,
    serialize_consequencia,
    serialize_fator,
)
from licenciaminer.riscos.services.riscos import (
    CLASSIFICACAO_LABELS,
    contar_dashboard_kpis,
    recalcular_classificacoes,
    serialize,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/riscos", tags=["Gestão de Riscos"])


# ---------------------------------------------------------------------------
# Metodologia
# ---------------------------------------------------------------------------


@router.get("/metodologia/ativa")
def metodologia_ativa(db: Session = Depends(get_session)) -> dict[str, Any]:
    """Retorna a metodologia ativa com escalas (P, I) e matriz 5×5."""
    met = db.query(Metodologia).filter_by(ativa=True).first()
    if not met:
        raise HTTPException(status_code=404, detail="Nenhuma metodologia ativa")

    probs = (
        db.query(EscalaProbabilidade)
        .filter_by(metodologia_id=met.id)
        .order_by(EscalaProbabilidade.nivel)
        .all()
    )
    impactos = (
        db.query(EscalaImpacto)
        .filter_by(metodologia_id=met.id)
        .order_by(EscalaImpacto.categoria, EscalaImpacto.nivel)
        .all()
    )
    matriz = db.query(MatrizClassificacao).filter_by(metodologia_id=met.id).all()

    return {
        "id": met.id,
        "nome": met.nome,
        "descricao": met.descricao,
        "classificacao_labels": CLASSIFICACAO_LABELS,
        "probabilidade": [
            {
                "nivel": p.nivel,
                "label": p.label,
                "descricao": p.descricao,
                "frequencia_anual_min": p.frequencia_anual_min,
                "frequencia_anual_max": p.frequencia_anual_max,
            }
            for p in probs
        ],
        "impacto": [
            {
                "nivel": i.nivel,
                "label": i.label,
                "categoria": i.categoria,
                "descricao": i.descricao,
            }
            for i in impactos
        ],
        "matriz": [
            {"prob": m.prob, "impacto": m.impacto, "classificacao": m.classificacao}
            for m in matriz
        ],
    }


@router.get("/metodologias")
def list_metodologias(db: Session = Depends(get_session)) -> list[dict[str, Any]]:
    mets = db.query(Metodologia).order_by(Metodologia.nome).all()
    return [
        {"id": m.id, "nome": m.nome, "descricao": m.descricao, "ativa": m.ativa}
        for m in mets
    ]


# ---------------------------------------------------------------------------
# Contexto organizacional
# ---------------------------------------------------------------------------


@router.get("/categorias")
def list_categorias(db: Session = Depends(get_session)) -> list[dict[str, Any]]:
    return [
        {"id": c.id, "nome": c.nome, "descricao": c.descricao, "cor": c.cor}
        for c in db.query(Categoria).order_by(Categoria.nome).all()
    ]


@router.get("/pessoas")
def list_pessoas(db: Session = Depends(get_session)) -> list[dict[str, Any]]:
    return [
        {"id": p.id, "nome": p.nome, "email": p.email, "area": p.area, "cargo": p.cargo}
        for p in db.query(Pessoa).order_by(Pessoa.nome).all()
    ]


@router.post("/pessoas", status_code=201)
def create_pessoa(payload: PessoaIn, db: Session = Depends(get_session)) -> dict[str, Any]:
    p = Pessoa(**payload.model_dump())
    db.add(p)
    db.commit()
    db.refresh(p)
    return {"id": p.id, "nome": p.nome, "email": p.email, "area": p.area, "cargo": p.cargo}


@router.get("/unidades-org")
def list_unidades_org(db: Session = Depends(get_session)) -> list[dict[str, Any]]:
    return [
        {
            "id": u.id,
            "nome": u.nome,
            "parent_id": u.parent_id,
            "nivel": u.nivel,
            "tipo": u.tipo,
        }
        for u in db.query(UnidadeOrg).order_by(UnidadeOrg.nivel, UnidadeOrg.nome).all()
    ]


@router.get("/cadeia-valor")
def list_cadeia_valor(db: Session = Depends(get_session)) -> list[dict[str, Any]]:
    return [
        {
            "id": e.id,
            "nome": e.nome,
            "descricao": e.descricao,
            "ordem": e.ordem,
            "tipo": e.tipo,
        }
        for e in db.query(EloCadeiaValor)
        .order_by(EloCadeiaValor.tipo, EloCadeiaValor.ordem)
        .all()
    ]


# ---------------------------------------------------------------------------
# Riscos CRUD
# ---------------------------------------------------------------------------


@router.get("/riscos")
def list_riscos(
    estagio: Optional[str] = Query(None),
    categoria_id: Optional[int] = Query(None),
    classificacao: Optional[str] = Query(None, description="Filtra por classificacao_residual"),
    responsavel_id: Optional[int] = Query(None),
    unidade_org_id: Optional[int] = Query(None),
    elo_cadeia_valor_id: Optional[int] = Query(None),
    tipo_escopo: Optional[str] = Query(None, description="projeto | corporativo"),
    projeto_id: Optional[int] = Query(None),
    categoria_erm_id: Optional[int] = Query(None),
    natureza: Optional[str] = Query(None, description="ameaca | oportunidade"),
    horizonte: Optional[str] = Query(None),
    db: Session = Depends(get_session),
) -> list[dict[str, Any]]:
    q = db.query(Risco)
    if estagio:
        q = q.filter(Risco.estagio == estagio)
    if categoria_id:
        q = q.filter(Risco.categoria_id == categoria_id)
    if classificacao:
        q = q.filter(Risco.classificacao_residual == classificacao)
    if responsavel_id:
        q = q.filter(Risco.responsavel_id == responsavel_id)
    if unidade_org_id:
        q = q.filter(Risco.unidade_org_id == unidade_org_id)
    if elo_cadeia_valor_id:
        q = q.filter(Risco.elo_cadeia_valor_id == elo_cadeia_valor_id)
    if tipo_escopo:
        q = q.filter(Risco.tipo_escopo == tipo_escopo)
    if projeto_id:
        q = q.filter(Risco.projeto_id == projeto_id)
    if categoria_erm_id:
        q = q.filter(Risco.categoria_erm_id == categoria_erm_id)
    if natureza:
        q = q.filter(Risco.natureza == natureza)
    if horizonte:
        q = q.filter(Risco.horizonte == horizonte)
    q = q.order_by(Risco.codigo)
    return [serialize(r) for r in q.all()]


@router.get("/riscos/matriz")
def matriz_riscos(
    base: str = Query("residual", pattern="^(pura|residual)$"),
    db: Session = Depends(get_session),
) -> list[dict[str, Any]]:
    """Matriz 5×5 agregada: lista células com os riscos em cada uma."""
    met = db.query(Metodologia).filter_by(ativa=True).first()
    if not met:
        raise HTTPException(status_code=404, detail="Nenhuma metodologia ativa")

    celulas = db.query(MatrizClassificacao).filter_by(metodologia_id=met.id).all()
    riscos = db.query(Risco).all()

    def key(r: Risco) -> tuple[int | None, int | None]:
        if base == "pura":
            return (r.prob_pura, r.impacto_pura)
        return (r.prob_residual, r.impacto_residual)

    bucket: dict[tuple[int, int], list[Risco]] = {}
    for r in riscos:
        p, i = key(r)
        if p and i:
            bucket.setdefault((p, i), []).append(r)

    return [
        {
            "prob": c.prob,
            "impacto": c.impacto,
            "classificacao": c.classificacao,
            "riscos": [serialize(r) for r in bucket.get((c.prob, c.impacto), [])],
        }
        for c in celulas
    ]


@router.get("/riscos/por-organograma")
def riscos_por_organograma(
    base: str = Query("residual", pattern="^(pura|residual)$"),
    db: Session = Depends(get_session),
) -> list[dict[str, Any]]:
    """Para cada unidade do organograma: count e distribuição por classificação."""
    unidades = db.query(UnidadeOrg).order_by(UnidadeOrg.nivel, UnidadeOrg.nome).all()
    riscos = db.query(Risco).all()
    field = "classificacao_pura" if base == "pura" else "classificacao_residual"

    by_unit: dict[int, list[Risco]] = {}
    for r in riscos:
        if r.unidade_org_id is not None:
            by_unit.setdefault(r.unidade_org_id, []).append(r)

    out = []
    for u in unidades:
        items = by_unit.get(u.id, [])
        dist: dict[str, int] = {}
        for r in items:
            c = getattr(r, field)
            if c:
                dist[c] = dist.get(c, 0) + 1
        out.append(
            {
                "id": u.id,
                "nome": u.nome,
                "parent_id": u.parent_id,
                "nivel": u.nivel,
                "tipo": u.tipo,
                "total_riscos": len(items),
                "distribuicao": dist,
            }
        )
    return out


@router.get("/riscos/por-cadeia-valor")
def riscos_por_cadeia_valor(
    base: str = Query("residual", pattern="^(pura|residual)$"),
    db: Session = Depends(get_session),
) -> list[dict[str, Any]]:
    elos = db.query(EloCadeiaValor).order_by(EloCadeiaValor.tipo, EloCadeiaValor.ordem).all()
    riscos = db.query(Risco).all()
    field = "classificacao_pura" if base == "pura" else "classificacao_residual"

    by_elo: dict[int, list[Risco]] = {}
    for r in riscos:
        if r.elo_cadeia_valor_id is not None:
            by_elo.setdefault(r.elo_cadeia_valor_id, []).append(r)

    out = []
    for e in elos:
        items = by_elo.get(e.id, [])
        dist: dict[str, int] = {}
        for r in items:
            c = getattr(r, field)
            if c:
                dist[c] = dist.get(c, 0) + 1
        out.append(
            {
                "id": e.id,
                "nome": e.nome,
                "descricao": e.descricao,
                "ordem": e.ordem,
                "tipo": e.tipo,
                "total_riscos": len(items),
                "distribuicao": dist,
            }
        )
    return out


@router.get("/riscos/{risco_id}")
def get_risco(risco_id: int, db: Session = Depends(get_session)) -> dict[str, Any]:
    r = db.get(Risco, risco_id)
    if not r:
        raise HTTPException(status_code=404, detail="Risco não encontrado")
    return serialize(r)


@router.post("/riscos", status_code=201)
def create_risco(payload: RiscoIn, db: Session = Depends(get_session)) -> dict[str, Any]:
    if db.query(Risco).filter_by(codigo=payload.codigo).first():
        raise HTTPException(status_code=409, detail=f"Código {payload.codigo} já existe")
    r = Risco(**payload.model_dump())
    recalcular_classificacoes(db, r)
    db.add(r)
    db.commit()
    db.refresh(r)
    return serialize(r)


@router.put("/riscos/{risco_id}")
def update_risco(
    risco_id: int, payload: RiscoPatch, db: Session = Depends(get_session)
) -> dict[str, Any]:
    r = db.get(Risco, risco_id)
    if not r:
        raise HTTPException(status_code=404, detail="Risco não encontrado")
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(r, k, v)
    recalcular_classificacoes(db, r)
    db.commit()
    db.refresh(r)
    return serialize(r)


@router.delete("/riscos/{risco_id}", status_code=204)
def delete_risco(risco_id: int, db: Session = Depends(get_session)) -> None:
    r = db.get(Risco, risco_id)
    if not r:
        raise HTTPException(status_code=404, detail="Risco não encontrado")
    db.delete(r)
    db.commit()


@router.post("/riscos/{risco_id}/avaliar")
def reavaliar_risco(risco_id: int, db: Session = Depends(get_session)) -> dict[str, Any]:
    r = db.get(Risco, risco_id)
    if not r:
        raise HTTPException(status_code=404, detail="Risco não encontrado")
    recalcular_classificacoes(db, r)
    db.commit()
    db.refresh(r)
    return serialize(r)


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------


@router.get("/dashboard/kpis", response_model=DashboardKpis)
def dashboard_kpis(db: Session = Depends(get_session)) -> dict[str, Any]:
    return contar_dashboard_kpis(db)


# ---------------------------------------------------------------------------
# Bowtie
# ---------------------------------------------------------------------------


class BowtieIn(BaseModel):
    top_event: Optional[str] = None
    hazard: Optional[str] = None
    frequencia_pura: Optional[int] = Field(None, ge=1, le=5)
    frequencia_residual: Optional[int] = Field(None, ge=1, le=5)
    canvas_json: Optional[str] = None


class CausaIn(BaseModel):
    codigo: Optional[str] = None
    descricao: Optional[str] = None
    ordem: Optional[int] = None
    critica: Optional[bool] = None


class ConsequenciaIn(BaseModel):
    codigo: Optional[str] = None
    descricao: Optional[str] = None
    ordem: Optional[int] = None
    critica: Optional[bool] = None


class BarreiraIn(BaseModel):
    descricao: str
    efetividade: Optional[int] = Field(None, ge=1, le=5)
    ordem: Optional[int] = None
    controle_id: Optional[int] = None


class FatorIn(BaseModel):
    descricao: str
    lado: str = Field(..., pattern="^(preventivo|corretivo)$")
    barreira_alvo_id: Optional[int] = None


@router.get("/bowties/por-risco/{risco_id}")
def get_bowtie_por_risco(risco_id: int, db: Session = Depends(get_session)) -> dict[str, Any]:
    risco = db.get(Risco, risco_id)
    if not risco:
        raise HTTPException(status_code=404, detail="Risco não encontrado")
    bowtie = (
        db.query(Bowtie)
        .filter_by(risco_id=risco_id)
        .order_by(Bowtie.versao.desc())
        .first()
    )
    if not bowtie:
        return {"exists": False, "risco_id": risco_id}
    return {"exists": True, **serialize_bowtie(bowtie)}


@router.post("/bowties/por-risco/{risco_id}", status_code=201)
def criar_bowtie(
    risco_id: int, payload: BowtieIn, db: Session = Depends(get_session)
) -> dict[str, Any]:
    risco = db.get(Risco, risco_id)
    if not risco:
        raise HTTPException(status_code=404, detail="Risco não encontrado")
    if db.query(Bowtie).filter_by(risco_id=risco_id).first():
        raise HTTPException(status_code=409, detail="Bowtie já existe — use PUT")
    bowtie = Bowtie(
        risco_id=risco_id,
        top_event=payload.top_event or risco.nome,
        hazard=payload.hazard,
        frequencia_pura=payload.frequencia_pura or risco.prob_pura,
        frequencia_residual=payload.frequencia_residual or risco.prob_residual,
        canvas_json=payload.canvas_json,
    )
    db.add(bowtie)
    db.commit()
    db.refresh(bowtie)
    return serialize_bowtie(bowtie)


@router.put("/bowties/{bowtie_id}")
def atualizar_bowtie(
    bowtie_id: int, payload: BowtieIn, db: Session = Depends(get_session)
) -> dict[str, Any]:
    b = db.get(Bowtie, bowtie_id)
    if not b:
        raise HTTPException(status_code=404, detail="Bowtie não encontrado")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(b, k, v)
    db.commit()
    db.refresh(b)
    return serialize_bowtie(b)


@router.post("/bowties/{bowtie_id}/causas", status_code=201)
def adicionar_causa(
    bowtie_id: int, payload: CausaIn, db: Session = Depends(get_session)
) -> dict[str, Any]:
    if not db.get(Bowtie, bowtie_id):
        raise HTTPException(status_code=404, detail="Bowtie não encontrado")
    codigo = payload.codigo or proximo_codigo_causa(db, bowtie_id)
    ordem = payload.ordem
    if ordem is None:
        ordem = db.query(Causa).filter_by(bowtie_id=bowtie_id).count()
    c = Causa(bowtie_id=bowtie_id, codigo=codigo, descricao=payload.descricao, ordem=ordem)
    db.add(c)
    db.commit()
    db.refresh(c)
    return serialize_causa(c)


@router.put("/causas/{causa_id}")
def atualizar_causa(
    causa_id: int, payload: CausaIn, db: Session = Depends(get_session)
) -> dict[str, Any]:
    c = db.get(Causa, causa_id)
    if not c:
        raise HTTPException(status_code=404, detail="Causa não encontrada")
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(c, k, v)
    db.commit()
    db.refresh(c)
    return serialize_causa(c)


@router.delete("/causas/{causa_id}", status_code=204)
def excluir_causa(causa_id: int, db: Session = Depends(get_session)) -> None:
    c = db.get(Causa, causa_id)
    if not c:
        raise HTTPException(status_code=404, detail="Causa não encontrada")
    db.delete(c)
    db.commit()


@router.post("/bowties/{bowtie_id}/consequencias", status_code=201)
def adicionar_consequencia(
    bowtie_id: int, payload: ConsequenciaIn, db: Session = Depends(get_session)
) -> dict[str, Any]:
    if not db.get(Bowtie, bowtie_id):
        raise HTTPException(status_code=404, detail="Bowtie não encontrado")
    codigo = payload.codigo or proximo_codigo_consequencia(db, bowtie_id)
    ordem = payload.ordem
    if ordem is None:
        ordem = db.query(Consequencia).filter_by(bowtie_id=bowtie_id).count()
    q = Consequencia(
        bowtie_id=bowtie_id, codigo=codigo, descricao=payload.descricao, ordem=ordem
    )
    db.add(q)
    db.commit()
    db.refresh(q)
    return serialize_consequencia(q)


@router.put("/consequencias/{consequencia_id}")
def atualizar_consequencia(
    consequencia_id: int, payload: ConsequenciaIn, db: Session = Depends(get_session)
) -> dict[str, Any]:
    q = db.get(Consequencia, consequencia_id)
    if not q:
        raise HTTPException(status_code=404, detail="Consequência não encontrada")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(q, k, v)
    db.commit()
    db.refresh(q)
    return serialize_consequencia(q)


@router.delete("/consequencias/{consequencia_id}", status_code=204)
def excluir_consequencia(
    consequencia_id: int, db: Session = Depends(get_session)
) -> None:
    q = db.get(Consequencia, consequencia_id)
    if not q:
        raise HTTPException(status_code=404, detail="Consequência não encontrada")
    db.delete(q)
    db.commit()


@router.post("/causas/{causa_id}/barreiras", status_code=201)
def adicionar_barreira_preventiva(
    causa_id: int, payload: BarreiraIn, db: Session = Depends(get_session)
) -> dict[str, Any]:
    if not db.get(Causa, causa_id):
        raise HTTPException(status_code=404, detail="Causa não encontrada")
    ordem = payload.ordem
    if ordem is None:
        ordem = db.query(BarreiraPreventiva).filter_by(causa_id=causa_id).count()
    b = BarreiraPreventiva(
        causa_id=causa_id,
        descricao=payload.descricao,
        efetividade=payload.efetividade,
        ordem=ordem,
        controle_id=payload.controle_id,
    )
    db.add(b)
    db.commit()
    db.refresh(b)
    return {
        "id": b.id,
        "causa_id": b.causa_id,
        "descricao": b.descricao,
        "efetividade": b.efetividade,
        "ordem": b.ordem,
        "controle_id": b.controle_id,
    }


@router.put("/barreiras-preventivas/{bp_id}")
def atualizar_barreira_preventiva(
    bp_id: int, payload: BarreiraIn, db: Session = Depends(get_session)
) -> dict[str, Any]:
    b = db.get(BarreiraPreventiva, bp_id)
    if not b:
        raise HTTPException(status_code=404, detail="Barreira não encontrada")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(b, k, v)
    db.commit()
    db.refresh(b)
    return {
        "id": b.id,
        "causa_id": b.causa_id,
        "descricao": b.descricao,
        "efetividade": b.efetividade,
        "ordem": b.ordem,
        "controle_id": b.controle_id,
    }


@router.delete("/barreiras-preventivas/{bp_id}", status_code=204)
def excluir_barreira_preventiva(bp_id: int, db: Session = Depends(get_session)) -> None:
    b = db.get(BarreiraPreventiva, bp_id)
    if not b:
        raise HTTPException(status_code=404, detail="Barreira não encontrada")
    db.delete(b)
    db.commit()


@router.post("/consequencias/{consequencia_id}/barreiras", status_code=201)
def adicionar_barreira_corretiva(
    consequencia_id: int, payload: BarreiraIn, db: Session = Depends(get_session)
) -> dict[str, Any]:
    if not db.get(Consequencia, consequencia_id):
        raise HTTPException(status_code=404, detail="Consequência não encontrada")
    ordem = payload.ordem
    if ordem is None:
        ordem = (
            db.query(BarreiraCorretiva).filter_by(consequencia_id=consequencia_id).count()
        )
    b = BarreiraCorretiva(
        consequencia_id=consequencia_id,
        descricao=payload.descricao,
        efetividade=payload.efetividade,
        ordem=ordem,
        controle_id=payload.controle_id,
    )
    db.add(b)
    db.commit()
    db.refresh(b)
    return {
        "id": b.id,
        "consequencia_id": b.consequencia_id,
        "descricao": b.descricao,
        "efetividade": b.efetividade,
        "ordem": b.ordem,
        "controle_id": b.controle_id,
    }


@router.put("/barreiras-corretivas/{bc_id}")
def atualizar_barreira_corretiva(
    bc_id: int, payload: BarreiraIn, db: Session = Depends(get_session)
) -> dict[str, Any]:
    b = db.get(BarreiraCorretiva, bc_id)
    if not b:
        raise HTTPException(status_code=404, detail="Barreira não encontrada")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(b, k, v)
    db.commit()
    db.refresh(b)
    return {
        "id": b.id,
        "consequencia_id": b.consequencia_id,
        "descricao": b.descricao,
        "efetividade": b.efetividade,
        "ordem": b.ordem,
        "controle_id": b.controle_id,
    }


@router.delete("/barreiras-corretivas/{bc_id}", status_code=204)
def excluir_barreira_corretiva(bc_id: int, db: Session = Depends(get_session)) -> None:
    b = db.get(BarreiraCorretiva, bc_id)
    if not b:
        raise HTTPException(status_code=404, detail="Barreira não encontrada")
    db.delete(b)
    db.commit()


@router.post("/bowties/{bowtie_id}/fatores", status_code=201)
def adicionar_fator(
    bowtie_id: int, payload: FatorIn, db: Session = Depends(get_session)
) -> dict[str, Any]:
    if not db.get(Bowtie, bowtie_id):
        raise HTTPException(status_code=404, detail="Bowtie não encontrado")
    f = FatorEscalonamento(
        bowtie_id=bowtie_id,
        descricao=payload.descricao,
        lado=payload.lado,
        barreira_alvo_id=payload.barreira_alvo_id,
    )
    db.add(f)
    db.commit()
    db.refresh(f)
    return serialize_fator(f)


@router.delete("/fatores/{fator_id}", status_code=204)
def excluir_fator(fator_id: int, db: Session = Depends(get_session)) -> None:
    f = db.get(FatorEscalonamento, fator_id)
    if not f:
        raise HTTPException(status_code=404, detail="Fator não encontrado")
    db.delete(f)
    db.commit()


# ---------------------------------------------------------------------------
# Ações e Controles
# ---------------------------------------------------------------------------


class AcaoIn(BaseModel):
    risco_id: int
    bowtie_id: Optional[int] = None
    descricao: str
    tipo: str = Field(..., pattern="^(preventiva|corretiva)$")
    responsavel_id: Optional[int] = None
    prazo: Optional[_date] = None
    status: str = "nao_iniciada"
    percentual: int = Field(0, ge=0, le=100)
    comentario: Optional[str] = None


class AcaoPatch(BaseModel):
    descricao: Optional[str] = None
    tipo: Optional[str] = Field(None, pattern="^(preventiva|corretiva)$")
    responsavel_id: Optional[int] = None
    prazo: Optional[_date] = None
    status: Optional[str] = None
    percentual: Optional[int] = Field(None, ge=0, le=100)
    comentario: Optional[str] = None


def _serialize_acao(a: Acao) -> dict[str, Any]:
    return {
        "id": a.id,
        "risco_id": a.risco_id,
        "bowtie_id": a.bowtie_id,
        "codigo": a.codigo,
        "descricao": a.descricao,
        "tipo": a.tipo,
        "responsavel_id": a.responsavel_id,
        "responsavel_nome": a.responsavel.nome if a.responsavel else None,
        "dono_risco_id": a.dono_risco_id,
        "dono_risco_nome": a.dono_risco.nome if a.dono_risco else None,
        "area": a.area,
        "categoria": a.categoria,
        "subrisco": a.subrisco,
        "grupo_trabalho": a.grupo_trabalho,
        "tema_relacionado": a.tema_relacionado,
        "prazo": a.prazo.isoformat() if a.prazo else None,
        "data_inicio": a.data_inicio.isoformat() if a.data_inicio else None,
        "data_fim": a.data_fim.isoformat() if a.data_fim else None,
        "inicio_texto": a.inicio_texto,
        "conclusao_texto": a.conclusao_texto,
        "status": a.status,
        "percentual": a.percentual,
        "detalhamento": a.detalhamento,
        "valor_estimado": a.valor_estimado,
        "evidencias": a.evidencias,
        "comentario": a.comentario,
        "created_at": a.created_at,
        "updated_at": a.updated_at,
    }


@router.get("/acoes")
def list_acoes(
    risco_id: Optional[int] = None,
    responsavel_id: Optional[int] = None,
    status: Optional[str] = None,
    tipo: Optional[str] = None,
    atrasadas: bool = False,
    db: Session = Depends(get_session),
) -> list[dict[str, Any]]:
    q = db.query(Acao)
    if risco_id:
        q = q.filter(Acao.risco_id == risco_id)
    if responsavel_id:
        q = q.filter(Acao.responsavel_id == responsavel_id)
    if status:
        q = q.filter(Acao.status == status)
    if tipo:
        q = q.filter(Acao.tipo == tipo)
    if atrasadas:
        today = _date.today()
        q = q.filter(Acao.prazo.isnot(None), Acao.prazo < today, Acao.status != "concluida")
    return [_serialize_acao(a) for a in q.order_by(Acao.prazo.is_(None), Acao.prazo).all()]


@router.post("/acoes", status_code=201)
def create_acao(payload: AcaoIn, db: Session = Depends(get_session)) -> dict[str, Any]:
    if not db.get(Risco, payload.risco_id):
        raise HTTPException(status_code=404, detail="Risco não encontrado")
    a = Acao(**payload.model_dump())
    db.add(a)
    db.commit()
    db.refresh(a)
    return _serialize_acao(a)


@router.put("/acoes/{acao_id}")
def update_acao(
    acao_id: int, payload: AcaoPatch, db: Session = Depends(get_session)
) -> dict[str, Any]:
    a = db.get(Acao, acao_id)
    if not a:
        raise HTTPException(status_code=404, detail="Ação não encontrada")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(a, k, v)
    db.commit()
    db.refresh(a)
    return _serialize_acao(a)


@router.delete("/acoes/{acao_id}", status_code=204)
def delete_acao(acao_id: int, db: Session = Depends(get_session)) -> None:
    a = db.get(Acao, acao_id)
    if not a:
        raise HTTPException(status_code=404, detail="Ação não encontrada")
    db.delete(a)
    db.commit()


@router.get("/acoes/resumo")
def resumo_acoes(db: Session = Depends(get_session)) -> dict[str, Any]:
    today = _date.today()
    acoes = db.query(Acao).all()
    por_status: dict[str, int] = {}
    por_tipo: dict[str, int] = {}
    por_responsavel: dict[str, int] = {}
    atrasadas = 0
    for a in acoes:
        por_status[a.status] = por_status.get(a.status, 0) + 1
        por_tipo[a.tipo] = por_tipo.get(a.tipo, 0) + 1
        nome = a.responsavel.nome if a.responsavel else "(sem responsável)"
        por_responsavel[nome] = por_responsavel.get(nome, 0) + 1
        if a.prazo and a.prazo < today and a.status != "concluida":
            atrasadas += 1
    return {
        "total": len(acoes),
        "atrasadas": atrasadas,
        "por_status": por_status,
        "por_tipo": por_tipo,
        "por_responsavel": por_responsavel,
    }


class ControleIn(BaseModel):
    risco_id: int
    bowtie_id: Optional[int] = None
    descricao: str
    tipo: str = Field(..., pattern="^(preventivo|corretivo)$")
    responsavel_id: Optional[int] = None
    periodicidade_teste: Optional[str] = None
    ultimo_teste: Optional[_date] = None
    status_teste: Optional[str] = None
    efetividade: Optional[int] = Field(None, ge=1, le=5)


class ControlePatch(BaseModel):
    descricao: Optional[str] = None
    tipo: Optional[str] = Field(None, pattern="^(preventivo|corretivo)$")
    responsavel_id: Optional[int] = None
    periodicidade_teste: Optional[str] = None
    ultimo_teste: Optional[_date] = None
    status_teste: Optional[str] = None
    efetividade: Optional[int] = Field(None, ge=1, le=5)


class TesteIn(BaseModel):
    data_teste: _date
    status_teste: str = Field(..., pattern="^(aprovado|reprovado|parcial)$")
    observacao: Optional[str] = None


def _serialize_controle(c: Controle) -> dict[str, Any]:
    return {
        "id": c.id,
        "risco_id": c.risco_id,
        "bowtie_id": c.bowtie_id,
        "descricao": c.descricao,
        "tipo": c.tipo,
        "responsavel_id": c.responsavel_id,
        "responsavel_nome": c.responsavel.nome if c.responsavel else None,
        "categoria": c.categoria,
        "comentarios": c.comentarios,
        "periodicidade_teste": c.periodicidade_teste,
        "ultimo_teste": c.ultimo_teste.isoformat() if c.ultimo_teste else None,
        "status_teste": c.status_teste,
        "efetividade": c.efetividade,
        "created_at": c.created_at,
        "updated_at": c.updated_at,
    }


@router.get("/controles")
def list_controles(
    risco_id: Optional[int] = None,
    tipo: Optional[str] = None,
    responsavel_id: Optional[int] = None,
    db: Session = Depends(get_session),
) -> list[dict[str, Any]]:
    q = db.query(Controle)
    if risco_id:
        q = q.filter(Controle.risco_id == risco_id)
    if tipo:
        q = q.filter(Controle.tipo == tipo)
    if responsavel_id:
        q = q.filter(Controle.responsavel_id == responsavel_id)
    return [_serialize_controle(c) for c in q.order_by(Controle.descricao).all()]


@router.post("/controles", status_code=201)
def create_controle(
    payload: ControleIn, db: Session = Depends(get_session)
) -> dict[str, Any]:
    if not db.get(Risco, payload.risco_id):
        raise HTTPException(status_code=404, detail="Risco não encontrado")
    c = Controle(**payload.model_dump())
    db.add(c)
    db.commit()
    db.refresh(c)
    return _serialize_controle(c)


@router.put("/controles/{controle_id}")
def update_controle(
    controle_id: int, payload: ControlePatch, db: Session = Depends(get_session)
) -> dict[str, Any]:
    c = db.get(Controle, controle_id)
    if not c:
        raise HTTPException(status_code=404, detail="Controle não encontrado")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(c, k, v)
    db.commit()
    db.refresh(c)
    return _serialize_controle(c)


@router.delete("/controles/{controle_id}", status_code=204)
def delete_controle(controle_id: int, db: Session = Depends(get_session)) -> None:
    c = db.get(Controle, controle_id)
    if not c:
        raise HTTPException(status_code=404, detail="Controle não encontrado")
    db.delete(c)
    db.commit()


@router.post("/controles/{controle_id}/teste")
def registrar_teste(
    controle_id: int, payload: TesteIn, db: Session = Depends(get_session)
) -> dict[str, Any]:
    c = db.get(Controle, controle_id)
    if not c:
        raise HTTPException(status_code=404, detail="Controle não encontrado")
    c.ultimo_teste = payload.data_teste
    c.status_teste = payload.status_teste
    db.commit()
    db.refresh(c)
    return _serialize_controle(c)


# ---------------------------------------------------------------------------
# Alertas de criticidade
# ---------------------------------------------------------------------------


def _alertas_do_bowtie(db: Session, bowtie: Bowtie, risco: Risco) -> dict[str, Any]:
    """Para o bowtie ativo do risco: causas/consequências críticas sem tratamento."""
    acoes_prev = (
        db.query(Acao).filter(Acao.risco_id == risco.id, Acao.tipo == "preventiva").count()
    )
    acoes_corr = (
        db.query(Acao).filter(Acao.risco_id == risco.id, Acao.tipo == "corretiva").count()
    )
    causas_sem = []
    for c in bowtie.causas:
        if not c.critica:
            continue
        tem_tratamento = len(c.barreiras) > 0 or acoes_prev > 0
        if not tem_tratamento:
            causas_sem.append(
                {
                    "id": c.id,
                    "codigo": c.codigo,
                    "descricao": c.descricao,
                }
            )
    cons_sem = []
    for q in bowtie.consequencias:
        if not q.critica:
            continue
        tem_tratamento = len(q.barreiras) > 0 or acoes_corr > 0
        if not tem_tratamento:
            cons_sem.append(
                {
                    "id": q.id,
                    "codigo": q.codigo,
                    "descricao": q.descricao,
                }
            )
    return {
        "causas_criticas_sem_tratamento": causas_sem,
        "consequencias_criticas_sem_tratamento": cons_sem,
    }


@router.get("/alertas-criticidade")
def alertas_criticidade_global(
    db: Session = Depends(get_session),
) -> dict[str, Any]:
    """Lista riscos com causas ou consequências críticas sem controle/ação."""
    riscos = db.query(Risco).all()
    alertas_riscos: list[dict[str, Any]] = []
    total_causas_sem = 0
    total_cons_sem = 0
    total_causas_criticas = 0
    total_cons_criticas = 0
    for r in riscos:
        if not r.bowties:
            continue
        bowtie = r.bowties[0]
        total_causas_criticas += sum(1 for c in bowtie.causas if c.critica)
        total_cons_criticas += sum(1 for q in bowtie.consequencias if q.critica)
        alert = _alertas_do_bowtie(db, bowtie, r)
        if alert["causas_criticas_sem_tratamento"] or alert["consequencias_criticas_sem_tratamento"]:
            alertas_riscos.append(
                {
                    "risco_id": r.id,
                    "codigo": r.codigo,
                    "nome": r.nome,
                    "classificacao_residual": r.classificacao_residual,
                    **alert,
                }
            )
            total_causas_sem += len(alert["causas_criticas_sem_tratamento"])
            total_cons_sem += len(alert["consequencias_criticas_sem_tratamento"])
    return {
        "total_causas_criticas": total_causas_criticas,
        "total_consequencias_criticas": total_cons_criticas,
        "total_causas_criticas_sem_tratamento": total_causas_sem,
        "total_consequencias_criticas_sem_tratamento": total_cons_sem,
        "riscos_com_alerta": alertas_riscos,
    }


@router.get("/riscos/{risco_id}/alertas-criticidade")
def alertas_criticidade_risco(
    risco_id: int, db: Session = Depends(get_session)
) -> dict[str, Any]:
    r = db.get(Risco, risco_id)
    if not r:
        raise HTTPException(status_code=404, detail="Risco não encontrado")
    if not r.bowties:
        return {
            "causas_criticas_sem_tratamento": [],
            "consequencias_criticas_sem_tratamento": [],
        }
    return _alertas_do_bowtie(db, r.bowties[0], r)


# ---------------------------------------------------------------------------
# Dashboards detalhados de Ações e Controles
# ---------------------------------------------------------------------------


@router.get("/acoes/dashboard")
def dashboard_acoes(db: Session = Depends(get_session)) -> dict[str, Any]:
    """KPIs e séries para a landing de Plano de Ações."""
    today = _date.today()
    acoes = db.query(Acao).all()
    total = len(acoes)
    por_status: dict[str, int] = {}
    por_tipo: dict[str, int] = {}
    por_responsavel: dict[str, int] = {}
    por_dono_risco: dict[str, int] = {}
    por_area: dict[str, int] = {}
    por_categoria: dict[str, int] = {}
    por_grupo_trabalho: dict[str, int] = {}
    por_risco: dict[str, int] = {}
    status_por_responsavel: dict[str, dict[str, int]] = {}
    atrasadas = 0
    vencendo_30d = 0
    concluidas_pct: list[int] = []
    sem_responsavel = 0
    sem_prazo = 0
    for a in acoes:
        por_status[a.status] = por_status.get(a.status, 0) + 1
        por_tipo[a.tipo] = por_tipo.get(a.tipo, 0) + 1
        resp_nome = a.responsavel.nome if a.responsavel else "(sem responsável)"
        por_responsavel[resp_nome] = por_responsavel.get(resp_nome, 0) + 1
        status_por_responsavel.setdefault(resp_nome, {})
        status_por_responsavel[resp_nome][a.status] = (
            status_por_responsavel[resp_nome].get(a.status, 0) + 1
        )
        dono_nome = a.dono_risco.nome if a.dono_risco else "(sem dono)"
        por_dono_risco[dono_nome] = por_dono_risco.get(dono_nome, 0) + 1
        area = a.area or "(sem área)"
        por_area[area] = por_area.get(area, 0) + 1
        cat = a.categoria or "(sem categoria)"
        por_categoria[cat] = por_categoria.get(cat, 0) + 1
        if a.grupo_trabalho:
            por_grupo_trabalho[a.grupo_trabalho] = (
                por_grupo_trabalho.get(a.grupo_trabalho, 0) + 1
            )
        risco = db.get(Risco, a.risco_id)
        codigo = risco.codigo if risco else f"risco_{a.risco_id}"
        por_risco[codigo] = por_risco.get(codigo, 0) + 1
        if not a.responsavel_id:
            sem_responsavel += 1
        if not a.prazo:
            sem_prazo += 1
        elif a.status != "concluida":
            dias = (a.prazo - today).days
            if dias < 0:
                atrasadas += 1
            elif dias <= 30:
                vencendo_30d += 1
        concluidas_pct.append(a.percentual)
    avg_pct = (
        round(sum(concluidas_pct) / len(concluidas_pct), 1) if concluidas_pct else 0
    )
    return {
        "total": total,
        "atrasadas": atrasadas,
        "vencendo_30d": vencendo_30d,
        "concluidas_pct_medio": avg_pct,
        "sem_responsavel": sem_responsavel,
        "sem_prazo": sem_prazo,
        "por_status": por_status,
        "por_tipo": por_tipo,
        "por_responsavel_top": sorted(
            por_responsavel.items(), key=lambda x: x[1], reverse=True
        )[:15],
        "por_dono_risco_top": sorted(
            por_dono_risco.items(), key=lambda x: x[1], reverse=True
        )[:15],
        "por_area_top": sorted(por_area.items(), key=lambda x: x[1], reverse=True)[:15],
        "por_categoria_top": sorted(
            por_categoria.items(), key=lambda x: x[1], reverse=True
        )[:15],
        "por_grupo_trabalho_top": sorted(
            por_grupo_trabalho.items(), key=lambda x: x[1], reverse=True
        )[:10],
        "por_risco_top": sorted(por_risco.items(), key=lambda x: x[1], reverse=True)[
            :15
        ],
        "status_por_responsavel": {
            k: v
            for k, v in sorted(
                status_por_responsavel.items(),
                key=lambda x: sum(x[1].values()),
                reverse=True,
            )[:10]
        },
    }


@router.get("/acoes/gantt")
def gantt_acoes(
    risco_id: Optional[int] = None,
    responsavel_id: Optional[int] = None,
    db: Session = Depends(get_session),
) -> list[dict[str, Any]]:
    """Retorna ações com data_inicio e data_fim para visualização Gantt."""
    q = db.query(Acao).filter(
        Acao.data_inicio.isnot(None), Acao.data_fim.isnot(None)
    )
    if risco_id:
        q = q.filter(Acao.risco_id == risco_id)
    if responsavel_id:
        q = q.filter(Acao.responsavel_id == responsavel_id)
    out = []
    for a in q.order_by(Acao.data_inicio).all():
        risco = db.get(Risco, a.risco_id)
        out.append(
            {
                "id": a.id,
                "codigo": a.codigo,
                "descricao": a.descricao,
                "tipo": a.tipo,
                "status": a.status,
                "percentual": a.percentual,
                "data_inicio": a.data_inicio.isoformat(),
                "data_fim": a.data_fim.isoformat(),
                "responsavel_nome": a.responsavel.nome if a.responsavel else None,
                "dono_risco_nome": a.dono_risco.nome if a.dono_risco else None,
                "risco_id": a.risco_id,
                "risco_codigo": risco.codigo if risco else None,
                "risco_nome": risco.nome if risco else None,
                "area": a.area,
                "grupo_trabalho": a.grupo_trabalho,
            }
        )
    return out


@router.get("/controles/dashboard")
def dashboard_controles(db: Session = Depends(get_session)) -> dict[str, Any]:
    today = _date.today()
    controles = db.query(Controle).all()
    total = len(controles)
    por_tipo: dict[str, int] = {}
    por_status_teste: dict[str, int] = {}
    por_efetividade: dict[int, int] = {}
    por_periodicidade: dict[str, int] = {}
    por_risco: dict[str, int] = {}
    sem_responsavel = 0
    sem_teste = 0
    testado_ha_mais_6m = 0
    for c in controles:
        por_tipo[c.tipo] = por_tipo.get(c.tipo, 0) + 1
        if c.status_teste:
            por_status_teste[c.status_teste] = por_status_teste.get(c.status_teste, 0) + 1
        if c.efetividade is not None:
            por_efetividade[c.efetividade] = por_efetividade.get(c.efetividade, 0) + 1
        if c.periodicidade_teste:
            por_periodicidade[c.periodicidade_teste] = (
                por_periodicidade.get(c.periodicidade_teste, 0) + 1
            )
        risco = db.get(Risco, c.risco_id)
        codigo = risco.codigo if risco else f"risco_{c.risco_id}"
        por_risco[codigo] = por_risco.get(codigo, 0) + 1
        if not c.responsavel_id:
            sem_responsavel += 1
        if not c.ultimo_teste:
            sem_teste += 1
        elif (today - c.ultimo_teste).days > 180:
            testado_ha_mais_6m += 1
    por_risco_top = sorted(por_risco.items(), key=lambda x: x[1], reverse=True)[:10]
    return {
        "total": total,
        "por_tipo": por_tipo,
        "por_status_teste": por_status_teste,
        "por_efetividade": por_efetividade,
        "por_periodicidade": por_periodicidade,
        "por_risco_top": por_risco_top,
        "sem_responsavel": sem_responsavel,
        "sem_teste": sem_teste,
        "testado_ha_mais_6m": testado_ha_mais_6m,
    }


@router.get("/riscos/{risco_id}/exportar-pdf")
def exportar_risco_pdf_endpoint(risco_id: int, db: Session = Depends(get_session)) -> Response:
    risco = db.get(Risco, risco_id)
    if not risco:
        raise HTTPException(status_code=404, detail="Risco não encontrado")
    blob = exportar_risco_pdf(db, risco_id)
    fname = f"risco_{risco.codigo.replace('/', '_')}.pdf"
    return Response(
        content=blob,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{fname}"'},
    )


@router.get("/exportar-executivo-pdf")
def exportar_executivo_endpoint(db: Session = Depends(get_session)) -> Response:
    blob = exportar_executivo_pdf(db)
    return Response(
        content=blob,
        media_type="application/pdf",
        headers={
            "Content-Disposition": 'attachment; filename="relatorio_executivo_riscos.pdf"'
        },
    )


@router.get("/bowties/{risco_id}/exportar-excel")
def exportar_bowtie(risco_id: int, db: Session = Depends(get_session)) -> Response:
    """Gera .xlsx no formato MUSA simplificado (metadados + bowtie)."""
    risco = db.get(Risco, risco_id)
    if not risco:
        raise HTTPException(status_code=404, detail="Risco não encontrado")
    blob = exportar_bowtie_excel(db, risco_id)
    fname = f"bowtie_{risco.codigo.replace('/', '_')}.xlsx"
    return Response(
        content=blob,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{fname}"'},
    )


@router.post("/importar-musa")
def importar_musa_endpoint(db: Session = Depends(get_session)) -> dict[str, Any]:
    """Dispara importação do Excel MUSA (idempotente: pula riscos já cadastrados)."""
    if not DEFAULT_MUSA_PATH.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Arquivo MUSA não encontrado em {DEFAULT_MUSA_PATH}",
        )
    stats = importar_musa(db)
    return {"arquivo": str(DEFAULT_MUSA_PATH), **stats}


@router.post("/importar-atualizacao")
def importar_atualizacao_endpoint(db: Session = Depends(get_session)) -> dict[str, Any]:
    """Dispara importação da planilha de atualização 2024 (substitui controles/ações)."""
    if not DEFAULT_ATUALIZACAO_PATH.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Arquivo de atualização não encontrado em {DEFAULT_ATUALIZACAO_PATH}",
        )
    stats = importar_atualizacao(db)
    return {"arquivo": str(DEFAULT_ATUALIZACAO_PATH), **stats}


@router.get("/health")
def health(db: Session = Depends(get_session)) -> dict[str, Any]:
    return {
        "metodologias": db.query(Metodologia).count(),
        "categorias": db.query(Categoria).count(),
        "pessoas": db.query(Pessoa).count(),
        "unidades_org": db.query(UnidadeOrg).count(),
        "elos_cadeia_valor": db.query(EloCadeiaValor).count(),
        "riscos": db.query(Risco).count(),
    }
