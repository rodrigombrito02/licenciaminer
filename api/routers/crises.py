"""Endpoints do módulo de Gestão de Crises e Continuidade de Negócio (BCP).

Prefixo: /api/crises

Cobre ISO 22361 (crises) e ISO 22301 (continuidade). Reusa a sessão SQLite do
módulo de Riscos e pode vincular Cenarios a Riscos existentes do bowtie.
"""

from __future__ import annotations

from datetime import date
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from licenciaminer.riscos.database import get_session
from licenciaminer.riscos.services.pdf_export import exportar_cenario_pdf
from licenciaminer.riscos.models import Pessoa
from licenciaminer.riscos.models_crises import (
    AcionamentoStep,
    CenarioCrise,
    ComiteCrise,
    LicaoAprendida,
    MembroComite,
    PlanoRecuperacao,
    PlanoRecuperacaoStep,
    ProcessoCritico,
    Runbook,
    RunbookStep,
    Simulado,
    TestePlano,
)

router = APIRouter(prefix="/crises", tags=["Gestão de Crises"])


# ---------------------------------------------------------------------------
# Comitês
# ---------------------------------------------------------------------------


class ComiteIn(BaseModel):
    nome: str
    descricao: Optional[str] = None
    nivel: Optional[str] = None
    ativo: bool = True


class MembroIn(BaseModel):
    pessoa_id: int
    papel: str
    contato_24_7: Optional[str] = None
    ordem: int = 0


def _serialize_comite(c: ComiteCrise) -> dict[str, Any]:
    return {
        "id": c.id,
        "nome": c.nome,
        "descricao": c.descricao,
        "nivel": c.nivel,
        "ativo": c.ativo,
        "membros": [
            {
                "id": m.id,
                "pessoa_id": m.pessoa_id,
                "pessoa_nome": m.pessoa.nome if m.pessoa else None,
                "papel": m.papel,
                "contato_24_7": m.contato_24_7,
                "ordem": m.ordem,
            }
            for m in sorted(c.membros, key=lambda x: x.ordem)
        ],
    }


@router.get("/comites")
def list_comites(db: Session = Depends(get_session)) -> list[dict[str, Any]]:
    return [_serialize_comite(c) for c in db.query(ComiteCrise).order_by(ComiteCrise.nome).all()]


@router.get("/comites/{comite_id}")
def get_comite(comite_id: int, db: Session = Depends(get_session)) -> dict[str, Any]:
    c = db.get(ComiteCrise, comite_id)
    if not c:
        raise HTTPException(status_code=404, detail="Comitê não encontrado")
    return _serialize_comite(c)


@router.post("/comites", status_code=201)
def create_comite(payload: ComiteIn, db: Session = Depends(get_session)) -> dict[str, Any]:
    c = ComiteCrise(**payload.model_dump())
    db.add(c)
    db.commit()
    db.refresh(c)
    return _serialize_comite(c)


@router.put("/comites/{comite_id}")
def update_comite(
    comite_id: int, payload: ComiteIn, db: Session = Depends(get_session)
) -> dict[str, Any]:
    c = db.get(ComiteCrise, comite_id)
    if not c:
        raise HTTPException(status_code=404, detail="Comitê não encontrado")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(c, k, v)
    db.commit()
    db.refresh(c)
    return _serialize_comite(c)


@router.delete("/comites/{comite_id}", status_code=204)
def delete_comite(comite_id: int, db: Session = Depends(get_session)) -> None:
    c = db.get(ComiteCrise, comite_id)
    if not c:
        raise HTTPException(status_code=404, detail="Comitê não encontrado")
    db.delete(c)
    db.commit()


@router.post("/comites/{comite_id}/membros", status_code=201)
def add_membro(
    comite_id: int, payload: MembroIn, db: Session = Depends(get_session)
) -> dict[str, Any]:
    if not db.get(ComiteCrise, comite_id):
        raise HTTPException(status_code=404, detail="Comitê não encontrado")
    m = MembroComite(comite_id=comite_id, **payload.model_dump())
    db.add(m)
    db.commit()
    db.refresh(m)
    return {"id": m.id}


@router.delete("/membros/{membro_id}", status_code=204)
def delete_membro(membro_id: int, db: Session = Depends(get_session)) -> None:
    m = db.get(MembroComite, membro_id)
    if not m:
        raise HTTPException(status_code=404, detail="Membro não encontrado")
    db.delete(m)
    db.commit()


# ---------------------------------------------------------------------------
# Cenários
# ---------------------------------------------------------------------------


class CenarioIn(BaseModel):
    codigo: str
    nome: str
    descricao: Optional[str] = None
    categoria: Optional[str] = None
    severidade: Optional[int] = Field(None, ge=1, le=5)
    probabilidade: Optional[int] = Field(None, ge=1, le=5)
    risco_id: Optional[int] = None
    comite_id: Optional[int] = None
    coordenador_id: Optional[int] = None
    status: str = "mapeado"
    ultima_revisao: Optional[date] = None


class CenarioPatch(BaseModel):
    codigo: Optional[str] = None
    nome: Optional[str] = None
    descricao: Optional[str] = None
    categoria: Optional[str] = None
    severidade: Optional[int] = Field(None, ge=1, le=5)
    probabilidade: Optional[int] = Field(None, ge=1, le=5)
    risco_id: Optional[int] = None
    comite_id: Optional[int] = None
    coordenador_id: Optional[int] = None
    status: Optional[str] = None
    ultima_revisao: Optional[date] = None


def _serialize_cenario(c: CenarioCrise) -> dict[str, Any]:
    return {
        "id": c.id,
        "codigo": c.codigo,
        "nome": c.nome,
        "descricao": c.descricao,
        "categoria": c.categoria,
        "severidade": c.severidade,
        "probabilidade": c.probabilidade,
        "risco_id": c.risco_id,
        "risco_codigo": c.risco.codigo if c.risco else None,
        "risco_nome": c.risco.nome if c.risco else None,
        "comite_id": c.comite_id,
        "comite_nome": c.comite.nome if c.comite else None,
        "coordenador_id": c.coordenador_id,
        "coordenador_nome": c.coordenador.nome if c.coordenador else None,
        "status": c.status,
        "ultima_revisao": c.ultima_revisao.isoformat() if c.ultima_revisao else None,
        "n_acionamentos": len(c.acionamentos),
        "n_runbooks": len(c.runbooks),
        "n_simulados": len(c.simulados),
        "n_licoes": len(c.licoes),
        "created_at": c.created_at,
        "updated_at": c.updated_at,
    }


@router.get("/cenarios")
def list_cenarios(
    categoria: Optional[str] = None,
    severidade_min: Optional[int] = None,
    db: Session = Depends(get_session),
) -> list[dict[str, Any]]:
    q = db.query(CenarioCrise)
    if categoria:
        q = q.filter(CenarioCrise.categoria == categoria)
    if severidade_min is not None:
        q = q.filter(CenarioCrise.severidade >= severidade_min)
    return [_serialize_cenario(c) for c in q.order_by(CenarioCrise.codigo).all()]


@router.get("/cenarios/{cenario_id}")
def get_cenario(cenario_id: int, db: Session = Depends(get_session)) -> dict[str, Any]:
    c = db.get(CenarioCrise, cenario_id)
    if not c:
        raise HTTPException(status_code=404, detail="Cenário não encontrado")
    data = _serialize_cenario(c)
    data["acionamentos"] = [
        {
            "id": a.id,
            "ordem": a.ordem,
            "papel": a.papel,
            "pessoa_id": a.pessoa_id,
            "pessoa_nome": a.pessoa.nome if a.pessoa else None,
            "criterio": a.criterio,
            "tempo_resposta_min": a.tempo_resposta_min,
            "contato": a.contato,
        }
        for a in c.acionamentos
    ]
    data["runbooks"] = [
        {
            "id": r.id,
            "titulo": r.titulo,
            "versao": r.versao,
            "descricao": r.descricao,
            "data_revisao": r.data_revisao.isoformat() if r.data_revisao else None,
            "aprovador_nome": r.aprovador.nome if r.aprovador else None,
            "steps": [
                {
                    "id": s.id,
                    "ordem": s.ordem,
                    "descricao": s.descricao,
                    "tempo_estimado_min": s.tempo_estimado_min,
                    "recursos_necessarios": s.recursos_necessarios,
                    "responsavel_nome": s.responsavel.nome if s.responsavel else None,
                }
                for s in r.steps
            ],
        }
        for r in c.runbooks
    ]
    data["simulados"] = [
        {
            "id": s.id,
            "titulo": s.titulo,
            "tipo": s.tipo,
            "data_prevista": s.data_prevista.isoformat() if s.data_prevista else None,
            "data_realizacao": s.data_realizacao.isoformat() if s.data_realizacao else None,
            "status": s.status,
            "facilitador_nome": s.facilitador.nome if s.facilitador else None,
            "objetivos": s.objetivos,
            "resultado": s.resultado,
            "gaps_identificados": s.gaps_identificados,
            "nota_performance": s.nota_performance,
        }
        for s in sorted(
            c.simulados,
            key=lambda x: (x.data_prevista or date.max),
            reverse=True,
        )
    ]
    data["licoes"] = [
        {
            "id": l.id,
            "data": l.data.isoformat() if l.data else None,
            "descricao": l.descricao,
            "melhoria_proposta": l.melhoria_proposta,
            "responsavel_nome": l.responsavel.nome if l.responsavel else None,
            "status": l.status,
        }
        for l in c.licoes
    ]
    return data


@router.post("/cenarios", status_code=201)
def create_cenario(payload: CenarioIn, db: Session = Depends(get_session)) -> dict[str, Any]:
    if db.query(CenarioCrise).filter_by(codigo=payload.codigo).first():
        raise HTTPException(status_code=409, detail=f"Código {payload.codigo} já existe")
    c = CenarioCrise(**payload.model_dump())
    db.add(c)
    db.commit()
    db.refresh(c)
    return _serialize_cenario(c)


@router.put("/cenarios/{cenario_id}")
def update_cenario(
    cenario_id: int, payload: CenarioPatch, db: Session = Depends(get_session)
) -> dict[str, Any]:
    c = db.get(CenarioCrise, cenario_id)
    if not c:
        raise HTTPException(status_code=404, detail="Cenário não encontrado")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(c, k, v)
    db.commit()
    db.refresh(c)
    return _serialize_cenario(c)


@router.delete("/cenarios/{cenario_id}", status_code=204)
def delete_cenario(cenario_id: int, db: Session = Depends(get_session)) -> None:
    c = db.get(CenarioCrise, cenario_id)
    if not c:
        raise HTTPException(status_code=404, detail="Cenário não encontrado")
    db.delete(c)
    db.commit()


# ---------------------------------------------------------------------------
# Simulados globais
# ---------------------------------------------------------------------------


@router.get("/simulados")
def list_simulados(
    status: Optional[str] = None,
    db: Session = Depends(get_session),
) -> list[dict[str, Any]]:
    q = db.query(Simulado)
    if status:
        q = q.filter(Simulado.status == status)
    out = []
    for s in q.order_by(Simulado.data_prevista).all():
        cenario = db.get(CenarioCrise, s.cenario_id)
        out.append(
            {
                "id": s.id,
                "cenario_id": s.cenario_id,
                "cenario_codigo": cenario.codigo if cenario else None,
                "cenario_nome": cenario.nome if cenario else None,
                "titulo": s.titulo,
                "tipo": s.tipo,
                "data_prevista": s.data_prevista.isoformat() if s.data_prevista else None,
                "data_realizacao": s.data_realizacao.isoformat() if s.data_realizacao else None,
                "status": s.status,
                "facilitador_nome": s.facilitador.nome if s.facilitador else None,
                "nota_performance": s.nota_performance,
                "objetivos": s.objetivos,
            }
        )
    return out


# ---------------------------------------------------------------------------
# Processos Críticos (BIA) + Planos de Recuperação (BCP)
# ---------------------------------------------------------------------------


class ProcessoIn(BaseModel):
    codigo: str
    nome: str
    descricao: Optional[str] = None
    area: Optional[str] = None
    responsavel_id: Optional[int] = None
    elo_cadeia_valor_id: Optional[int] = None
    prioridade: int = Field(3, ge=1, le=5)
    rto_horas: Optional[float] = None
    rpo_horas: Optional[float] = None
    mtd_horas: Optional[float] = None
    impacto_financeiro_hora: Optional[float] = None
    dependencias: Optional[str] = None
    recursos_minimos: Optional[str] = None


def _serialize_processo(p: ProcessoCritico) -> dict[str, Any]:
    return {
        "id": p.id,
        "codigo": p.codigo,
        "nome": p.nome,
        "descricao": p.descricao,
        "area": p.area,
        "responsavel_id": p.responsavel_id,
        "responsavel_nome": p.responsavel.nome if p.responsavel else None,
        "elo_cadeia_valor_id": p.elo_cadeia_valor_id,
        "prioridade": p.prioridade,
        "rto_horas": p.rto_horas,
        "rpo_horas": p.rpo_horas,
        "mtd_horas": p.mtd_horas,
        "impacto_financeiro_hora": p.impacto_financeiro_hora,
        "dependencias": p.dependencias,
        "recursos_minimos": p.recursos_minimos,
        "n_planos": len(p.planos),
    }


@router.get("/processos-criticos")
def list_processos(db: Session = Depends(get_session)) -> list[dict[str, Any]]:
    procs = db.query(ProcessoCritico).order_by(
        ProcessoCritico.prioridade.desc(), ProcessoCritico.codigo
    ).all()
    return [_serialize_processo(p) for p in procs]


@router.get("/processos-criticos/{processo_id}")
def get_processo(processo_id: int, db: Session = Depends(get_session)) -> dict[str, Any]:
    p = db.get(ProcessoCritico, processo_id)
    if not p:
        raise HTTPException(status_code=404, detail="Processo não encontrado")
    out = _serialize_processo(p)
    out["planos"] = [
        {
            "id": pl.id,
            "titulo": pl.titulo,
            "versao": pl.versao,
            "descricao": pl.descricao,
            "data_revisao": pl.data_revisao.isoformat() if pl.data_revisao else None,
            "aprovador_nome": pl.aprovador.nome if pl.aprovador else None,
            "steps": [
                {
                    "id": s.id,
                    "ordem": s.ordem,
                    "descricao": s.descricao,
                    "responsavel_nome": s.responsavel.nome if s.responsavel else None,
                    "tempo_estimado_min": s.tempo_estimado_min,
                    "recursos": s.recursos,
                }
                for s in pl.steps
            ],
            "testes": [
                {
                    "id": t.id,
                    "data": t.data.isoformat() if t.data else None,
                    "tipo": t.tipo,
                    "status": t.status,
                    "gaps_identificados": t.gaps_identificados,
                    "aprovador_nome": t.aprovador.nome if t.aprovador else None,
                    "observacoes": t.observacoes,
                }
                for t in pl.testes
            ],
        }
        for pl in p.planos
    ]
    return out


@router.post("/processos-criticos", status_code=201)
def create_processo(payload: ProcessoIn, db: Session = Depends(get_session)) -> dict[str, Any]:
    if db.query(ProcessoCritico).filter_by(codigo=payload.codigo).first():
        raise HTTPException(status_code=409, detail=f"Código {payload.codigo} já existe")
    p = ProcessoCritico(**payload.model_dump())
    db.add(p)
    db.commit()
    db.refresh(p)
    return _serialize_processo(p)


@router.put("/processos-criticos/{processo_id}")
def update_processo(
    processo_id: int, payload: ProcessoIn, db: Session = Depends(get_session)
) -> dict[str, Any]:
    p = db.get(ProcessoCritico, processo_id)
    if not p:
        raise HTTPException(status_code=404, detail="Processo não encontrado")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(p, k, v)
    db.commit()
    db.refresh(p)
    return _serialize_processo(p)


@router.delete("/processos-criticos/{processo_id}", status_code=204)
def delete_processo(processo_id: int, db: Session = Depends(get_session)) -> None:
    p = db.get(ProcessoCritico, processo_id)
    if not p:
        raise HTTPException(status_code=404, detail="Processo não encontrado")
    db.delete(p)
    db.commit()


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------


@router.get("/cenarios/{cenario_id}/exportar-pdf")
def exportar_cenario_pdf_endpoint(
    cenario_id: int, db: Session = Depends(get_session)
) -> Response:
    cen = db.get(CenarioCrise, cenario_id)
    if not cen:
        raise HTTPException(status_code=404, detail="Cenário não encontrado")
    blob = exportar_cenario_pdf(db, cenario_id)
    fname = f"cenario_{cen.codigo}.pdf"
    return Response(
        content=blob,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{fname}"'},
    )


@router.get("/dashboard")
def dashboard_crises(db: Session = Depends(get_session)) -> dict[str, Any]:
    cenarios = db.query(CenarioCrise).all()
    simulados = db.query(Simulado).all()
    processos = db.query(ProcessoCritico).all()
    hoje = date.today()

    def sev_label(n: int | None) -> str:
        if n is None:
            return "(sem)"
        return {1: "Muito baixa", 2: "Baixa", 3: "Média", 4: "Alta", 5: "Crítica"}.get(n, str(n))

    por_categoria: dict[str, int] = {}
    por_severidade: dict[str, int] = {}
    por_status: dict[str, int] = {}
    for c in cenarios:
        por_categoria[c.categoria or "(sem)"] = por_categoria.get(c.categoria or "(sem)", 0) + 1
        por_severidade[sev_label(c.severidade)] = por_severidade.get(sev_label(c.severidade), 0) + 1
        por_status[c.status] = por_status.get(c.status, 0) + 1

    simulados_realizados = sum(1 for s in simulados if s.status == "concluido")
    simulados_planejados = sum(1 for s in simulados if s.status == "planejado")
    simulados_futuros = [
        s for s in simulados if s.data_prevista and s.data_prevista >= hoje and s.status == "planejado"
    ]
    proximos_simulados = sorted(simulados_futuros, key=lambda x: x.data_prevista)[:5]
    nota_media = None
    notas = [s.nota_performance for s in simulados if s.nota_performance]
    if notas:
        nota_media = round(sum(notas) / len(notas), 1)

    processos_alta_prio = sum(1 for p in processos if p.prioridade >= 4)
    exposicao_hora = sum(
        (p.impacto_financeiro_hora or 0) for p in processos if p.prioridade >= 4
    )

    cenarios_criticos = sorted(
        cenarios, key=lambda c: (c.severidade or 0) * (c.probabilidade or 0), reverse=True
    )[:5]

    return {
        "total_cenarios": len(cenarios),
        "cenarios_aprovados": sum(1 for c in cenarios if c.status == "aprovado"),
        "cenarios_em_revisao": sum(1 for c in cenarios if c.status == "em_revisao"),
        "total_simulados": len(simulados),
        "simulados_realizados": simulados_realizados,
        "simulados_planejados": simulados_planejados,
        "nota_media_simulados": nota_media,
        "total_processos_criticos": len(processos),
        "processos_alta_prioridade": processos_alta_prio,
        "exposicao_financeira_hora": exposicao_hora,
        "por_categoria": por_categoria,
        "por_severidade": por_severidade,
        "por_status": por_status,
        "cenarios_criticos_top": [
            {
                "id": c.id,
                "codigo": c.codigo,
                "nome": c.nome,
                "categoria": c.categoria,
                "severidade": c.severidade,
                "probabilidade": c.probabilidade,
                "score": (c.severidade or 0) * (c.probabilidade or 0),
            }
            for c in cenarios_criticos
        ],
        "proximos_simulados": [
            {
                "id": s.id,
                "titulo": s.titulo,
                "data_prevista": s.data_prevista.isoformat() if s.data_prevista else None,
                "tipo": s.tipo,
                "cenario_id": s.cenario_id,
            }
            for s in proximos_simulados
        ],
    }
