"""Endpoints de monitoramento: KRIs, TesteControle histórico, RiskAppetite.

Prefixo: /api/monitoramento
"""

from __future__ import annotations

from datetime import date
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from licenciaminer.riscos.database import get_session
from licenciaminer.riscos.models import Acao, Categoria, Controle, Risco
from licenciaminer.riscos.models_monitoramento import (
    KRI,
    KRIMedicao,
    RiskAppetite,
    TesteControle,
)

router = APIRouter(prefix="/monitoramento", tags=["Monitoramento"])


# ---------------------------------------------------------------------------
# KRIs
# ---------------------------------------------------------------------------


class KRIIn(BaseModel):
    codigo: str
    nome: str
    descricao: Optional[str] = None
    risco_id: Optional[int] = None
    categoria_id: Optional[int] = None
    responsavel_id: Optional[int] = None
    unidade: str
    formula_descricao: Optional[str] = None
    direcao: str = Field("subir_pior", pattern="^(subir_pior|descer_pior)$")
    limite_verde: Optional[float] = None
    limite_amarelo: Optional[float] = None
    limite_vermelho: Optional[float] = None
    periodicidade: str = "mensal"
    fonte_dados: Optional[str] = None
    ativo: bool = True


class MedicaoIn(BaseModel):
    data: date
    valor: float
    observacao: Optional[str] = None
    registrado_por_id: Optional[int] = None


def _classificar(kri: KRI, valor: float) -> str:
    if kri.direcao == "subir_pior":
        if kri.limite_vermelho is not None and valor >= kri.limite_vermelho:
            return "vermelho"
        if kri.limite_amarelo is not None and valor >= kri.limite_amarelo:
            return "amarelo"
        return "verde"
    else:
        if kri.limite_vermelho is not None and valor <= kri.limite_vermelho:
            return "vermelho"
        if kri.limite_amarelo is not None and valor <= kri.limite_amarelo:
            return "amarelo"
        return "verde"


def _serialize_kri(k: KRI, com_medicoes: bool = False) -> dict[str, Any]:
    medicoes_sorted = sorted(k.medicoes, key=lambda m: m.data)
    ultima = medicoes_sorted[-1] if medicoes_sorted else None
    anterior = medicoes_sorted[-2] if len(medicoes_sorted) >= 2 else None
    data: dict[str, Any] = {
        "id": k.id,
        "codigo": k.codigo,
        "nome": k.nome,
        "descricao": k.descricao,
        "risco_id": k.risco_id,
        "risco_codigo": k.risco.codigo if k.risco else None,
        "categoria_id": k.categoria_id,
        "categoria_nome": k.categoria.nome if k.categoria else None,
        "responsavel_id": k.responsavel_id,
        "responsavel_nome": k.responsavel.nome if k.responsavel else None,
        "unidade": k.unidade,
        "formula_descricao": k.formula_descricao,
        "direcao": k.direcao,
        "limite_verde": k.limite_verde,
        "limite_amarelo": k.limite_amarelo,
        "limite_vermelho": k.limite_vermelho,
        "periodicidade": k.periodicidade,
        "fonte_dados": k.fonte_dados,
        "ativo": k.ativo,
        "n_medicoes": len(medicoes_sorted),
        "ultimo_valor": ultima.valor if ultima else None,
        "ultimo_status": ultima.status if ultima else None,
        "ultima_data": ultima.data.isoformat() if ultima else None,
        "valor_anterior": anterior.valor if anterior else None,
        "tendencia": (
            None
            if not (ultima and anterior)
            else (
                "subindo"
                if ultima.valor > anterior.valor
                else "descendo"
                if ultima.valor < anterior.valor
                else "estavel"
            )
        ),
    }
    if com_medicoes:
        data["medicoes"] = [
            {
                "id": m.id,
                "data": m.data.isoformat(),
                "valor": m.valor,
                "status": m.status,
                "observacao": m.observacao,
            }
            for m in medicoes_sorted
        ]
    return data


@router.get("/kris")
def list_kris(
    status: Optional[str] = None,
    db: Session = Depends(get_session),
) -> list[dict[str, Any]]:
    kris = db.query(KRI).order_by(KRI.codigo).all()
    out = [_serialize_kri(k) for k in kris]
    if status:
        out = [x for x in out if x["ultimo_status"] == status]
    return out


@router.get("/kris/dashboard")
def dashboard_kris(db: Session = Depends(get_session)) -> dict[str, Any]:
    kris = db.query(KRI).all()
    serializados = [_serialize_kri(k) for k in kris]
    status_count = {"verde": 0, "amarelo": 0, "vermelho": 0, "sem_dados": 0}
    for s in serializados:
        key = s["ultimo_status"] or "sem_dados"
        status_count[key] = status_count.get(key, 0) + 1
    por_categoria: dict[str, dict[str, int]] = {}
    for s in serializados:
        cat = s["categoria_nome"] or "(sem categoria)"
        por_categoria.setdefault(cat, {"verde": 0, "amarelo": 0, "vermelho": 0})
        if s["ultimo_status"]:
            por_categoria[cat][s["ultimo_status"]] = (
                por_categoria[cat].get(s["ultimo_status"], 0) + 1
            )
    vermelhos = sorted(
        [s for s in serializados if s["ultimo_status"] == "vermelho"],
        key=lambda x: x["codigo"],
    )
    amarelos = sorted(
        [s for s in serializados if s["ultimo_status"] == "amarelo"],
        key=lambda x: x["codigo"],
    )
    return {
        "total": len(serializados),
        "status_count": status_count,
        "por_categoria": por_categoria,
        "vermelhos": vermelhos,
        "amarelos": amarelos,
    }


@router.get("/kris/{kri_id}")
def get_kri(kri_id: int, db: Session = Depends(get_session)) -> dict[str, Any]:
    k = db.get(KRI, kri_id)
    if not k:
        raise HTTPException(status_code=404, detail="KRI não encontrado")
    return _serialize_kri(k, com_medicoes=True)


@router.post("/kris", status_code=201)
def create_kri(payload: KRIIn, db: Session = Depends(get_session)) -> dict[str, Any]:
    if db.query(KRI).filter_by(codigo=payload.codigo).first():
        raise HTTPException(status_code=409, detail=f"Código {payload.codigo} já existe")
    k = KRI(**payload.model_dump())
    db.add(k)
    db.commit()
    db.refresh(k)
    return _serialize_kri(k)


@router.put("/kris/{kri_id}")
def update_kri(
    kri_id: int, payload: KRIIn, db: Session = Depends(get_session)
) -> dict[str, Any]:
    k = db.get(KRI, kri_id)
    if not k:
        raise HTTPException(status_code=404, detail="KRI não encontrado")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(k, key, value)
    db.commit()
    db.refresh(k)
    return _serialize_kri(k)


@router.delete("/kris/{kri_id}", status_code=204)
def delete_kri(kri_id: int, db: Session = Depends(get_session)) -> None:
    k = db.get(KRI, kri_id)
    if not k:
        raise HTTPException(status_code=404, detail="KRI não encontrado")
    db.delete(k)
    db.commit()


@router.post("/kris/{kri_id}/medicoes", status_code=201)
def add_medicao(
    kri_id: int, payload: MedicaoIn, db: Session = Depends(get_session)
) -> dict[str, Any]:
    k = db.get(KRI, kri_id)
    if not k:
        raise HTTPException(status_code=404, detail="KRI não encontrado")
    status = _classificar(k, payload.valor)
    m = KRIMedicao(
        kri_id=kri_id,
        data=payload.data,
        valor=payload.valor,
        status=status,
        observacao=payload.observacao,
        registrado_por_id=payload.registrado_por_id,
    )
    db.add(m)
    db.commit()
    db.refresh(m)
    return {
        "id": m.id,
        "data": m.data.isoformat(),
        "valor": m.valor,
        "status": m.status,
    }


@router.delete("/medicoes/{medicao_id}", status_code=204)
def delete_medicao(medicao_id: int, db: Session = Depends(get_session)) -> None:
    m = db.get(KRIMedicao, medicao_id)
    if not m:
        raise HTTPException(status_code=404, detail="Medição não encontrada")
    db.delete(m)
    db.commit()


# ---------------------------------------------------------------------------
# Testes periódicos de controles
# ---------------------------------------------------------------------------


class TesteControleIn(BaseModel):
    data_teste: date
    status: str = Field(..., pattern="^(aprovado|parcial|reprovado)$")
    metodologia: Optional[str] = None
    evidencia: Optional[str] = None
    gaps_identificados: Optional[str] = None
    plano_acao_remediacao: Optional[str] = None
    executor_id: Optional[int] = None
    aprovador_id: Optional[int] = None


def _serialize_teste(t: TesteControle) -> dict[str, Any]:
    return {
        "id": t.id,
        "controle_id": t.controle_id,
        "data_teste": t.data_teste.isoformat(),
        "status": t.status,
        "metodologia": t.metodologia,
        "evidencia": t.evidencia,
        "gaps_identificados": t.gaps_identificados,
        "plano_acao_remediacao": t.plano_acao_remediacao,
        "executor_id": t.executor_id,
        "executor_nome": t.executor.nome if t.executor else None,
        "aprovador_id": t.aprovador_id,
        "aprovador_nome": t.aprovador.nome if t.aprovador else None,
        "created_at": t.created_at,
    }


@router.get("/controles/{controle_id}/testes")
def list_testes_controle(
    controle_id: int, db: Session = Depends(get_session)
) -> list[dict[str, Any]]:
    if not db.get(Controle, controle_id):
        raise HTTPException(status_code=404, detail="Controle não encontrado")
    testes = (
        db.query(TesteControle)
        .filter_by(controle_id=controle_id)
        .order_by(TesteControle.data_teste.desc())
        .all()
    )
    return [_serialize_teste(t) for t in testes]


@router.post("/controles/{controle_id}/testes", status_code=201)
def create_teste(
    controle_id: int, payload: TesteControleIn, db: Session = Depends(get_session)
) -> dict[str, Any]:
    ctrl = db.get(Controle, controle_id)
    if not ctrl:
        raise HTTPException(status_code=404, detail="Controle não encontrado")
    t = TesteControle(controle_id=controle_id, **payload.model_dump())
    db.add(t)
    # Atualiza campos cached do controle
    if not ctrl.ultimo_teste or payload.data_teste >= ctrl.ultimo_teste:
        ctrl.ultimo_teste = payload.data_teste
        ctrl.status_teste = payload.status
    db.commit()
    db.refresh(t)
    return _serialize_teste(t)


@router.delete("/testes/{teste_id}", status_code=204)
def delete_teste(teste_id: int, db: Session = Depends(get_session)) -> None:
    t = db.get(TesteControle, teste_id)
    if not t:
        raise HTTPException(status_code=404, detail="Teste não encontrado")
    db.delete(t)
    db.commit()


@router.get("/testes/agenda")
def agenda_testes(db: Session = Depends(get_session)) -> list[dict[str, Any]]:
    """Retorna lista de controles com próxima data prevista de teste baseada na periodicidade."""
    controles = db.query(Controle).all()
    today = date.today()
    out = []
    intervalo_dias = {
        "diaria": 1,
        "semanal": 7,
        "mensal": 30,
        "bimestral": 60,
        "trimestral": 90,
        "semestral": 180,
        "anual": 365,
    }
    for c in controles:
        if not c.periodicidade_teste:
            continue
        periodo = c.periodicidade_teste.lower().strip()
        dias = intervalo_dias.get(periodo)
        if not dias:
            continue
        ultimo = c.ultimo_teste
        proxima = (ultimo + __import__("datetime").timedelta(days=dias)) if ultimo else today
        dias_para = (proxima - today).days
        out.append(
            {
                "controle_id": c.id,
                "descricao": c.descricao[:120],
                "tipo": c.tipo,
                "periodicidade": c.periodicidade_teste,
                "ultimo_teste": ultimo.isoformat() if ultimo else None,
                "ultimo_status": c.status_teste,
                "proxima_data": proxima.isoformat(),
                "dias_para_proximo": dias_para,
                "vencido": dias_para < 0,
                "responsavel_nome": c.responsavel.nome if c.responsavel else None,
                "risco_id": c.risco_id,
                "risco_codigo": (
                    db.get(Risco, c.risco_id).codigo if c.risco_id else None
                ),
            }
        )
    return sorted(out, key=lambda x: x["proxima_data"])


# ---------------------------------------------------------------------------
# Risk Appetite
# ---------------------------------------------------------------------------


class AppetiteIn(BaseModel):
    categoria_id: Optional[int] = None
    escopo: str = "por_categoria"
    apetite_nivel: int = Field(3, ge=1, le=5)
    tolerancia_max_classificacao: str = Field("MS", pattern="^(PS|S|MS|C)$")
    descricao: Optional[str] = None
    trigger_escalation: Optional[str] = None
    data_aprovacao: Optional[date] = None
    aprovador_id: Optional[int] = None
    ativo: bool = True


CLASS_RANK = {"PS": 1, "S": 2, "MS": 3, "C": 4}


def _serialize_appetite(a: RiskAppetite) -> dict[str, Any]:
    return {
        "id": a.id,
        "categoria_id": a.categoria_id,
        "categoria_nome": a.categoria.nome if a.categoria else None,
        "categoria_cor": a.categoria.cor if a.categoria else None,
        "escopo": a.escopo,
        "apetite_nivel": a.apetite_nivel,
        "tolerancia_max_classificacao": a.tolerancia_max_classificacao,
        "descricao": a.descricao,
        "trigger_escalation": a.trigger_escalation,
        "data_aprovacao": a.data_aprovacao.isoformat() if a.data_aprovacao else None,
        "aprovador_id": a.aprovador_id,
        "aprovador_nome": a.aprovador.nome if a.aprovador else None,
        "ativo": a.ativo,
    }


@router.get("/appetite")
def list_appetite(db: Session = Depends(get_session)) -> list[dict[str, Any]]:
    return [
        _serialize_appetite(a)
        for a in db.query(RiskAppetite).filter_by(ativo=True).all()
    ]


@router.post("/appetite", status_code=201)
def create_appetite(
    payload: AppetiteIn, db: Session = Depends(get_session)
) -> dict[str, Any]:
    a = RiskAppetite(**payload.model_dump())
    db.add(a)
    db.commit()
    db.refresh(a)
    return _serialize_appetite(a)


@router.put("/appetite/{appetite_id}")
def update_appetite(
    appetite_id: int, payload: AppetiteIn, db: Session = Depends(get_session)
) -> dict[str, Any]:
    a = db.get(RiskAppetite, appetite_id)
    if not a:
        raise HTTPException(status_code=404, detail="Apetite não encontrado")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(a, k, v)
    db.commit()
    db.refresh(a)
    return _serialize_appetite(a)


@router.delete("/appetite/{appetite_id}", status_code=204)
def delete_appetite(appetite_id: int, db: Session = Depends(get_session)) -> None:
    a = db.get(RiskAppetite, appetite_id)
    if not a:
        raise HTTPException(status_code=404, detail="Apetite não encontrado")
    db.delete(a)
    db.commit()


@router.get("/appetite/dashboard")
def dashboard_appetite(db: Session = Depends(get_session)) -> dict[str, Any]:
    """Compara apetite declarado por categoria com a exposição real dos riscos."""
    apetites = db.query(RiskAppetite).filter_by(ativo=True).all()
    riscos = db.query(Risco).all()
    out: list[dict[str, Any]] = []
    categorias_cobertas = 0
    breaches = 0
    for apt in apetites:
        cat = apt.categoria
        if not cat:
            continue
        categorias_cobertas += 1
        riscos_cat = [r for r in riscos if r.categoria_id == cat.id]
        tolerancia_rank = CLASS_RANK.get(apt.tolerancia_max_classificacao, 3)
        riscos_em_breach = [
            r
            for r in riscos_cat
            if r.classificacao_residual
            and CLASS_RANK.get(r.classificacao_residual, 0) > tolerancia_rank
        ]
        por_class: dict[str, int] = {}
        for r in riscos_cat:
            c = r.classificacao_residual or "(não avaliado)"
            por_class[c] = por_class.get(c, 0) + 1
        breaches += len(riscos_em_breach)
        out.append(
            {
                "categoria_id": cat.id,
                "categoria_nome": cat.nome,
                "categoria_cor": cat.cor,
                "apetite_nivel": apt.apetite_nivel,
                "tolerancia": apt.tolerancia_max_classificacao,
                "descricao": apt.descricao,
                "trigger_escalation": apt.trigger_escalation,
                "total_riscos": len(riscos_cat),
                "em_breach": len(riscos_em_breach),
                "ok": len(riscos_cat) - len(riscos_em_breach),
                "por_classificacao": por_class,
                "riscos_em_breach": [
                    {
                        "id": r.id,
                        "codigo": r.codigo,
                        "nome": r.nome,
                        "classificacao_residual": r.classificacao_residual,
                    }
                    for r in riscos_em_breach
                ],
            }
        )
    return {
        "total_apetites": len(apetites),
        "categorias_cobertas": categorias_cobertas,
        "riscos_em_breach_total": breaches,
        "apetites": sorted(out, key=lambda x: x["em_breach"], reverse=True),
    }
