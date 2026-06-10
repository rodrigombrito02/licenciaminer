"""Endpoints de Risco Corporativo (ERM) + Projetos + Snapshots.

Prefixo: /api/corporativo

Alinhado com COSO ERM 2017 + ISO 31000:2018. Separação entre risco de projeto e
risco corporativo via campo `tipo_escopo` em Risco + FK `projeto_id` para projetos.
"""

from __future__ import annotations

from datetime import date, timedelta
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from licenciaminer.riscos.database import get_session
from licenciaminer.riscos.models import Projeto, Risco
from licenciaminer.riscos.models_monitoramento import RiskAppetite
from licenciaminer.riscos.models_corporativo import (
    CategoriaERM,
    LinhaDefesa,
    ObjetivoEstrategico,
    RiscoObjetivoLink,
    TopRiscoSnapshot,
    TopRiscoSnapshotItem,
)

router = APIRouter(prefix="/corporativo", tags=["Risco Corporativo"])


# ---------------------------------------------------------------------------
# Projetos
# ---------------------------------------------------------------------------


class ProjetoIn(BaseModel):
    codigo: str
    nome: str
    descricao: Optional[str] = None
    status: str = "em_execucao"
    data_inicio: Optional[date] = None
    data_fim: Optional[date] = None
    owner_id: Optional[int] = None
    orcamento: Optional[float] = None
    escopo: Optional[str] = None
    ativo: bool = True


def _serialize_projeto(p: Projeto, db: Session | None = None) -> dict[str, Any]:
    n_riscos = (
        db.query(Risco).filter_by(projeto_id=p.id).count() if db is not None else 0
    )
    return {
        "id": p.id,
        "codigo": p.codigo,
        "nome": p.nome,
        "descricao": p.descricao,
        "status": p.status,
        "data_inicio": p.data_inicio.isoformat() if p.data_inicio else None,
        "data_fim": p.data_fim.isoformat() if p.data_fim else None,
        "owner_id": p.owner_id,
        "owner_nome": p.owner.nome if p.owner else None,
        "orcamento": p.orcamento,
        "escopo": p.escopo,
        "ativo": p.ativo,
        "n_riscos": n_riscos,
    }


@router.get("/projetos")
def list_projetos(db: Session = Depends(get_session)) -> list[dict[str, Any]]:
    return [
        _serialize_projeto(p, db)
        for p in db.query(Projeto).order_by(Projeto.codigo).all()
    ]


@router.get("/projetos/{projeto_id}")
def get_projeto(projeto_id: int, db: Session = Depends(get_session)) -> dict[str, Any]:
    p = db.get(Projeto, projeto_id)
    if not p:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    return _serialize_projeto(p, db)


@router.post("/projetos", status_code=201)
def create_projeto(payload: ProjetoIn, db: Session = Depends(get_session)) -> dict[str, Any]:
    if db.query(Projeto).filter_by(codigo=payload.codigo).first():
        raise HTTPException(status_code=409, detail="Código já existe")
    p = Projeto(**payload.model_dump())
    db.add(p)
    db.commit()
    db.refresh(p)
    return _serialize_projeto(p, db)


@router.put("/projetos/{projeto_id}")
def update_projeto(
    projeto_id: int, payload: ProjetoIn, db: Session = Depends(get_session)
) -> dict[str, Any]:
    p = db.get(Projeto, projeto_id)
    if not p:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(p, k, v)
    db.commit()
    db.refresh(p)
    return _serialize_projeto(p, db)


@router.delete("/projetos/{projeto_id}", status_code=204)
def delete_projeto(projeto_id: int, db: Session = Depends(get_session)) -> None:
    p = db.get(Projeto, projeto_id)
    if not p:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    # Soft delete — marca inativo (preserva riscos vinculados)
    p.ativo = False
    db.commit()


# ---------------------------------------------------------------------------
# Categorias ERM + Linhas de Defesa + Objetivos
# ---------------------------------------------------------------------------


@router.get("/categorias-erm")
def list_categorias_erm(db: Session = Depends(get_session)) -> list[dict[str, Any]]:
    return [
        {
            "id": c.id,
            "codigo": c.codigo,
            "nome": c.nome,
            "descricao": c.descricao,
            "cor": c.cor,
            "ordem": c.ordem,
        }
        for c in db.query(CategoriaERM).order_by(CategoriaERM.ordem).all()
    ]


@router.get("/linhas-defesa")
def list_linhas_defesa(db: Session = Depends(get_session)) -> list[dict[str, Any]]:
    linhas = db.query(LinhaDefesa).order_by(LinhaDefesa.numero).all()
    out = []
    for l in linhas:
        n_riscos = (
            db.query(Risco)
            .filter_by(linha_defesa_id=l.id, tipo_escopo="corporativo")
            .count()
        )
        out.append(
            {
                "id": l.id,
                "numero": l.numero,
                "nome": l.nome,
                "descricao": l.descricao,
                "responsabilidades": l.responsabilidades,
                "responsavel_id": l.responsavel_id,
                "responsavel_nome": l.responsavel.nome if l.responsavel else None,
                "n_riscos": n_riscos,
            }
        )
    return out


class ObjetivoIn(BaseModel):
    codigo: str
    descricao: str
    perspectiva_bsc: str = "financeira"
    horizonte: str = "medio"
    meta: Optional[str] = None
    indicador: Optional[str] = None
    valor_meta: Optional[float] = None
    unidade_meta: Optional[str] = None
    responsavel_id: Optional[int] = None
    ativo: bool = True


def _serialize_objetivo(o: ObjetivoEstrategico, db: Session | None = None) -> dict[str, Any]:
    n_riscos = 0
    if db is not None:
        n_riscos = (
            db.query(RiscoObjetivoLink).filter_by(objetivo_id=o.id).count()
        )
    return {
        "id": o.id,
        "codigo": o.codigo,
        "descricao": o.descricao,
        "perspectiva_bsc": o.perspectiva_bsc,
        "horizonte": o.horizonte,
        "meta": o.meta,
        "indicador": o.indicador,
        "valor_meta": o.valor_meta,
        "unidade_meta": o.unidade_meta,
        "responsavel_id": o.responsavel_id,
        "responsavel_nome": o.responsavel.nome if o.responsavel else None,
        "ativo": o.ativo,
        "n_riscos_ameacando": n_riscos,
    }


@router.get("/objetivos")
def list_objetivos(db: Session = Depends(get_session)) -> list[dict[str, Any]]:
    objs = db.query(ObjetivoEstrategico).filter_by(ativo=True).order_by(ObjetivoEstrategico.codigo).all()
    return [_serialize_objetivo(o, db) for o in objs]


@router.get("/objetivos/{objetivo_id}")
def get_objetivo(objetivo_id: int, db: Session = Depends(get_session)) -> dict[str, Any]:
    o = db.get(ObjetivoEstrategico, objetivo_id)
    if not o:
        raise HTTPException(status_code=404, detail="Objetivo não encontrado")
    out = _serialize_objetivo(o, db)
    # Inclui riscos vinculados
    links = db.query(RiscoObjetivoLink).filter_by(objetivo_id=objetivo_id).all()
    out["riscos_vinculados"] = []
    for l in links:
        r = db.get(Risco, l.risco_id)
        if r:
            out["riscos_vinculados"].append(
                {
                    "id": r.id,
                    "codigo": r.codigo,
                    "nome": r.nome,
                    "tipo_escopo": r.tipo_escopo,
                    "natureza": r.natureza,
                    "classificacao_residual": r.classificacao_residual,
                    "impacto_percebido": l.impacto_percebido,
                }
            )
    return out


@router.post("/objetivos", status_code=201)
def create_objetivo(payload: ObjetivoIn, db: Session = Depends(get_session)) -> dict[str, Any]:
    if db.query(ObjetivoEstrategico).filter_by(codigo=payload.codigo).first():
        raise HTTPException(status_code=409, detail="Código já existe")
    o = ObjetivoEstrategico(**payload.model_dump())
    db.add(o)
    db.commit()
    db.refresh(o)
    return _serialize_objetivo(o, db)


@router.put("/objetivos/{objetivo_id}")
def update_objetivo(
    objetivo_id: int, payload: ObjetivoIn, db: Session = Depends(get_session)
) -> dict[str, Any]:
    o = db.get(ObjetivoEstrategico, objetivo_id)
    if not o:
        raise HTTPException(status_code=404, detail="Objetivo não encontrado")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(o, k, v)
    db.commit()
    db.refresh(o)
    return _serialize_objetivo(o, db)


class LinkIn(BaseModel):
    risco_id: int
    objetivo_id: int
    impacto_percebido: Optional[int] = Field(None, ge=1, le=5)
    observacao: Optional[str] = None


@router.post("/links-risco-objetivo", status_code=201)
def create_link(payload: LinkIn, db: Session = Depends(get_session)) -> dict[str, Any]:
    existente = (
        db.query(RiscoObjetivoLink)
        .filter_by(risco_id=payload.risco_id, objetivo_id=payload.objetivo_id)
        .first()
    )
    if existente:
        raise HTTPException(status_code=409, detail="Link já existe")
    l = RiscoObjetivoLink(**payload.model_dump())
    db.add(l)
    db.commit()
    db.refresh(l)
    return {"id": l.id}


@router.delete("/links-risco-objetivo/{link_id}", status_code=204)
def delete_link(link_id: int, db: Session = Depends(get_session)) -> None:
    l = db.get(RiscoObjetivoLink, link_id)
    if not l:
        raise HTTPException(status_code=404, detail="Link não encontrado")
    db.delete(l)
    db.commit()


# ---------------------------------------------------------------------------
# Snapshots trimestrais
# ---------------------------------------------------------------------------


class SnapshotIn(BaseModel):
    titulo: str
    periodo: Optional[str] = None
    tipo_escopo: str = "corporativo"
    observacoes: Optional[str] = None
    gerado_por: Optional[str] = None
    top_n: int = 10


def _serialize_snapshot(s: TopRiscoSnapshot, include_items: bool = True, db: Session | None = None) -> dict[str, Any]:
    data: dict[str, Any] = {
        "id": s.id,
        "data_snapshot": s.data_snapshot.isoformat(),
        "titulo": s.titulo,
        "periodo": s.periodo,
        "tipo_escopo": s.tipo_escopo,
        "gerado_por": s.gerado_por,
        "observacoes": s.observacoes,
        "n_itens": len(s.itens),
    }
    if include_items:
        data["itens"] = []
        for it in sorted(s.itens, key=lambda x: x.posicao):
            r = it.risco
            data["itens"].append(
                {
                    "posicao": it.posicao,
                    "risco_id": it.risco_id,
                    "risco_codigo": r.codigo if r else None,
                    "risco_nome": r.nome if r else None,
                    "classificacao_residual": it.classificacao_residual,
                    "prob_residual": it.prob_residual,
                    "impacto_residual": it.impacto_residual,
                    "score": it.score,
                    "acoes_abertas": it.acoes_abertas,
                    "acoes_atrasadas": it.acoes_atrasadas,
                }
            )
    return data


@router.get("/snapshots")
def list_snapshots(
    tipo_escopo: str = "corporativo",
    db: Session = Depends(get_session),
) -> list[dict[str, Any]]:
    snaps = (
        db.query(TopRiscoSnapshot)
        .filter_by(tipo_escopo=tipo_escopo)
        .order_by(TopRiscoSnapshot.data_snapshot.desc())
        .all()
    )
    return [_serialize_snapshot(s, include_items=False) for s in snaps]


@router.get("/snapshots/{snapshot_id}")
def get_snapshot(snapshot_id: int, db: Session = Depends(get_session)) -> dict[str, Any]:
    s = db.get(TopRiscoSnapshot, snapshot_id)
    if not s:
        raise HTTPException(status_code=404, detail="Snapshot não encontrado")
    return _serialize_snapshot(s, include_items=True)


@router.post("/snapshots", status_code=201)
def criar_snapshot(payload: SnapshotIn, db: Session = Depends(get_session)) -> dict[str, Any]:
    """Gera snapshot atual dos top-N riscos do escopo."""
    from datetime import date as _date
    from licenciaminer.riscos.models import Acao

    # Captura riscos do escopo
    q = db.query(Risco).filter_by(tipo_escopo=payload.tipo_escopo)
    riscos = q.all()
    ranked = sorted(
        riscos,
        key=lambda r: (r.prob_residual or 0) * (r.impacto_residual or 0),
        reverse=True,
    )[: payload.top_n]

    snap = TopRiscoSnapshot(
        data_snapshot=_date.today(),
        titulo=payload.titulo,
        periodo=payload.periodo,
        tipo_escopo=payload.tipo_escopo,
        gerado_por=payload.gerado_por,
        observacoes=payload.observacoes,
    )
    db.add(snap)
    db.flush()

    today = _date.today()
    for pos, r in enumerate(ranked, start=1):
        acoes = db.query(Acao).filter_by(risco_id=r.id).all()
        abertas = sum(1 for a in acoes if a.status != "concluida")
        atrasadas = sum(
            1 for a in acoes if a.prazo and a.prazo < today and a.status != "concluida"
        )
        db.add(
            TopRiscoSnapshotItem(
                snapshot_id=snap.id,
                risco_id=r.id,
                posicao=pos,
                classificacao_residual=r.classificacao_residual,
                prob_residual=r.prob_residual,
                impacto_residual=r.impacto_residual,
                score=(r.prob_residual or 0) * (r.impacto_residual or 0),
                acoes_abertas=abertas,
                acoes_atrasadas=atrasadas,
            )
        )
    db.commit()
    db.refresh(snap)
    return _serialize_snapshot(snap, include_items=True)


@router.get("/snapshots/alerta/status")
def snapshot_alerta(
    tipo_escopo: str = "corporativo",
    periodicidade_dias: int = 90,
    db: Session = Depends(get_session),
) -> dict[str, Any]:
    """Alerta se o último snapshot é mais antigo que `periodicidade_dias`."""
    ultimo = (
        db.query(TopRiscoSnapshot)
        .filter_by(tipo_escopo=tipo_escopo)
        .order_by(TopRiscoSnapshot.data_snapshot.desc())
        .first()
    )
    today = date.today()
    if not ultimo:
        return {
            "alerta": True,
            "motivo": "nenhum_snapshot",
            "dias_desde_ultimo": None,
            "data_ultimo": None,
            "periodicidade_dias": periodicidade_dias,
            "data_sugerida_proximo": today.isoformat(),
        }
    dias = (today - ultimo.data_snapshot).days
    vencido = dias > periodicidade_dias
    data_proxima = ultimo.data_snapshot + timedelta(days=periodicidade_dias)
    return {
        "alerta": vencido,
        "motivo": "vencido" if vencido else "dentro_do_prazo",
        "dias_desde_ultimo": dias,
        "data_ultimo": ultimo.data_snapshot.isoformat(),
        "ultimo_snapshot_id": ultimo.id,
        "ultimo_snapshot_titulo": ultimo.titulo,
        "periodicidade_dias": periodicidade_dias,
        "data_sugerida_proximo": data_proxima.isoformat(),
        "dias_restantes": (data_proxima - today).days,
    }


# ---------------------------------------------------------------------------
# Dashboard corporativo
# ---------------------------------------------------------------------------


@router.get("/apetite-coso")
def apetite_coso(db: Session = Depends(get_session)) -> dict[str, Any]:
    """Compara apetite declarado por categoria COSO com exposição real dos riscos corporativos."""
    apts = (
        db.query(RiskAppetite)
        .filter_by(ativo=True, escopo="por_categoria_erm")
        .all()
    )
    riscos = db.query(Risco).filter_by(tipo_escopo="corporativo", natureza="ameaca").all()
    cats = {c.id: c for c in db.query(CategoriaERM).all()}

    class_rank = {"PS": 1, "S": 2, "MS": 3, "C": 4}
    out: list[dict[str, Any]] = []
    breaches_total = 0
    for a in apts:
        cat = cats.get(a.categoria_erm_id or 0)
        if not cat:
            continue
        riscos_cat = [r for r in riscos if r.categoria_erm_id == cat.id]
        tol_rank = class_rank.get(a.tolerancia_max_classificacao, 3)
        em_breach = [
            r for r in riscos_cat
            if r.classificacao_residual
            and class_rank.get(r.classificacao_residual, 0) > tol_rank
        ]
        breaches_total += len(em_breach)
        por_class: dict[str, int] = {}
        for r in riscos_cat:
            c = r.classificacao_residual or "(não avaliado)"
            por_class[c] = por_class.get(c, 0) + 1
        out.append({
            "categoria_erm_id": cat.id,
            "categoria_codigo": cat.codigo,
            "categoria_nome": cat.nome,
            "categoria_cor": cat.cor,
            "apetite_nivel": a.apetite_nivel,
            "tolerancia": a.tolerancia_max_classificacao,
            "descricao": a.descricao,
            "trigger_escalation": a.trigger_escalation,
            "total_riscos": len(riscos_cat),
            "em_breach": len(em_breach),
            "ok": len(riscos_cat) - len(em_breach),
            "por_classificacao": por_class,
            "riscos_em_breach": [
                {"id": r.id, "codigo": r.codigo, "nome": r.nome,
                 "classificacao_residual": r.classificacao_residual}
                for r in em_breach
            ],
        })
    return {
        "total_apetites": len(apts),
        "total_breaches": breaches_total,
        "apetites": sorted(out, key=lambda x: x["em_breach"], reverse=True),
    }


@router.get("/board-report-pdf")
def board_report_pdf(db: Session = Depends(get_session)) -> Response:
    """PDF dedicado 'Reporte Trimestral ao Board' (COSO ERM)."""
    from licenciaminer.riscos.services.pdf_export import exportar_board_report_pdf
    blob = exportar_board_report_pdf(db)
    return Response(
        content=blob,
        media_type="application/pdf",
        headers={
            "Content-Disposition": 'attachment; filename="reporte_trimestral_board.pdf"'
        },
    )


@router.get("/dashboard")
def dashboard_corporativo(db: Session = Depends(get_session)) -> dict[str, Any]:
    """KPIs para landing do módulo corporativo."""
    riscos = db.query(Risco).filter_by(tipo_escopo="corporativo").all()
    ameacas = [r for r in riscos if r.natureza == "ameaca"]
    oportunidades = [r for r in riscos if r.natureza == "oportunidade"]

    por_cls: dict[str, int] = {}
    por_categoria_erm: dict[str, dict[str, Any]] = {}
    por_linha_defesa: dict[str, int] = {}
    por_horizonte: dict[str, int] = {}
    por_tratamento: dict[str, int] = {}

    cats_map = {c.id: c for c in db.query(CategoriaERM).all()}
    linhas_map = {l.id: l for l in db.query(LinhaDefesa).all()}

    for r in ameacas:
        cls = r.classificacao_residual or "(não avaliado)"
        por_cls[cls] = por_cls.get(cls, 0) + 1
        if r.categoria_erm_id and r.categoria_erm_id in cats_map:
            cat = cats_map[r.categoria_erm_id]
            key = cat.codigo
            if key not in por_categoria_erm:
                por_categoria_erm[key] = {"nome": cat.nome, "cor": cat.cor, "n": 0, "criticos": 0}
            por_categoria_erm[key]["n"] += 1
            if r.classificacao_residual == "C":
                por_categoria_erm[key]["criticos"] += 1
        if r.linha_defesa_id and r.linha_defesa_id in linhas_map:
            lin = linhas_map[r.linha_defesa_id]
            por_linha_defesa[f"{lin.numero}ª linha"] = (
                por_linha_defesa.get(f"{lin.numero}ª linha", 0) + 1
            )
        if r.horizonte:
            por_horizonte[r.horizonte] = por_horizonte.get(r.horizonte, 0) + 1
        if r.tipo_tratamento_estrategico:
            por_tratamento[r.tipo_tratamento_estrategico] = (
                por_tratamento.get(r.tipo_tratamento_estrategico, 0) + 1
            )

    # Top 10 riscos corporativos
    top10 = sorted(
        ameacas,
        key=lambda r: (r.prob_residual or 0) * (r.impacto_residual or 0),
        reverse=True,
    )[:10]

    # Objetivos + quantos riscos cada um tem vinculado
    objetivos = db.query(ObjetivoEstrategico).filter_by(ativo=True).all()
    obj_coverage = []
    for o in objetivos:
        n = db.query(RiscoObjetivoLink).filter_by(objetivo_id=o.id).count()
        obj_coverage.append(
            {
                "id": o.id,
                "codigo": o.codigo,
                "descricao": o.descricao,
                "perspectiva_bsc": o.perspectiva_bsc,
                "n_riscos": n,
            }
        )

    return {
        "total_corporativos": len(riscos),
        "total_ameacas": len(ameacas),
        "total_oportunidades": len(oportunidades),
        "por_classificacao_residual": por_cls,
        "criticos": por_cls.get("C", 0),
        "muito_significativos": por_cls.get("MS", 0),
        "por_categoria_erm": por_categoria_erm,
        "por_linha_defesa": por_linha_defesa,
        "por_horizonte": por_horizonte,
        "por_tratamento_estrategico": por_tratamento,
        "top_10": [
            {
                "id": r.id,
                "codigo": r.codigo,
                "nome": r.nome,
                "categoria_erm_id": r.categoria_erm_id,
                "classificacao_residual": r.classificacao_residual,
                "prob_residual": r.prob_residual,
                "impacto_residual": r.impacto_residual,
                "score": (r.prob_residual or 0) * (r.impacto_residual or 0),
            }
            for r in top10
        ],
        "cobertura_objetivos": obj_coverage,
    }
