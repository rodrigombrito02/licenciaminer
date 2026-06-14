"""SQ Soluções — integradora SST + Customer Success (cockpit do Bernardo + vitrine).

Referência estática (parceiros, concorrentes, casos de uso) + dados operacionais
(clientes, implantações, frota, pipeline SST). Interno + vitrine pública.
"""

import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from licenciaminer.sqsolucoes.database import (
    ClienteServico, Implantacao, Dispositivo, NegocioSQS, ContratoRaaS,
    MODALIDADES, FASES_PIPELINE, FASES_PROJETO, TIPOS_DISPOSITIVO,
    MODELOS_CONTRATO, STATUS_CONTRATO, get_session,
)

# KPIs de Customer Success por caso de uso (o que medir no relatório de impacto)
CS_KPIS = {
    "antifadiga": ["Alertas de fadiga por turno", "% de adoção dos vestíveis",
                   "Incidentes evitados", "Ganho de produtividade (+caminhão/dia)"],
    "estresse_termico": ["Alertas térmicos por turno", "Intermações evitadas",
                         "Afastamentos por calor", "% de adoção"],
    "inspecao_robotica": ["Inspeções/mês", "Custo vs inspeção humana", "NTE evitada",
                          "Cobertura de pontos críticos"],
    "seguranca_hm": ["Alertas de colisão", "Near-misses registrados",
                     "Man-down atendidos", "% de adoção das tags"],
    "localizacao_acesso": ["Tempo de headcount em emergência", "Acessos negados",
                           "Tempo de evacuação", "% de cobertura da equipe"],
    "servico_tecnico": ["Disponibilidade do serviço", "Chamados atendidos no SLA",
                        "Horas alocadas"],
}

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/sqsolucoes", tags=["SQ Soluções"])

# ── Referência estática (vitrine + inteligência) ──
CASOS_USO = [
    {"slug": "antifadiga", "nome": "Antifadiga em equipamento pesado",
     "dor": "Operador fadigado = risco de incidente; pausa passiva agrava.",
     "solucao": "Vestível mede HR/HRV/temperatura e antecipa o alerta antes do incidente.",
     "resultado": "Vale: −50% tempo de risco; antecipação de 40 min vs câmera; +1 caminhão/dia.",
     "parceiros": ["slatesafety", "dersalis"], "icon": "Activity"},
    {"slug": "estresse_termico", "nome": "Estresse térmico (oceano azul)",
     "dor": "IBUTG ambiental não captura o indivíduo; intermação é súbita.",
     "solucao": "Temperatura corporal individual + alerta antecipado (mineração subterrânea + alimentício).",
     "resultado": "Pouca concorrência ativa no Brasil — referência cross-setor.",
     "parceiros": ["slatesafety", "dersalis"], "icon": "Thermometer"},
    {"slug": "inspecao_robotica", "nome": "Inspeção robótica",
     "dor": "Inspeção humana é cara, lenta e expõe a risco.",
     "solucao": "Robô-cão Unitree + visão computacional + central remota. RaaS sem CAPEX.",
     "resultado": "Até −50% custo de inspeção; zero exposição humana; dado para preditivo.",
     "parceiros": ["robotdog"], "icon": "Bot"},
    {"slug": "seguranca_hm", "nome": "Segurança homem×máquina",
     "dor": "Colisões pessoa-máquina e máquina-máquina em pátios e galerias.",
     "solucao": "Tag com 3 zonas (verde/amarelo/vermelho), anticolisão, detecção de queda, man-down.",
     "resultado": "Alerta em tempo real ao motorista e ao trabalhador.",
     "parceiros": ["rombit"], "icon": "Radar"},
    {"slug": "localizacao_acesso", "nome": "Localização & controle de acesso",
     "dor": "Onde está a equipe numa emergência? Quem entrou em área restrita?",
     "solucao": "Crachá LoRa: localização indoor/outdoor, SOS, evacuação/headcount, acesso.",
     "resultado": "Headcount em segundos; rastreabilidade de acesso; à prova de explosão.",
     "parceiros": ["kofre"], "icon": "MapPin"},
]

PARCEIROS = [
    {"slug": "rombit", "nome": "Rombit", "modalidade": "1_comissao", "maturidade": "faturando",
     "ancora": "Petrobras (Consórcio Monto Mendes Jr)", "produto": "Tag de Interação Humano×Máquina",
     "demo": True},
    {"slug": "kofre", "nome": "Kofre", "modalidade": "1_comissao", "maturidade": "comissão ativa",
     "ancora": "Petrobras Regap", "produto": "Crachá inteligente LoRa", "demo": True},
    {"slug": "slatesafety", "nome": "SlateSafety", "modalidade": "4_reseller", "maturidade": "faturando",
     "ancora": "Petrobras Regap (Betim)", "produto": "Banda biométrica (HR/HRV/temperatura)", "demo": True},
    {"slug": "robotdog", "nome": "RobotDog", "modalidade": "3_equity", "maturidade": "em negociação",
     "ancora": "funil Hydro/MRN/Portocel", "produto": "Robô-cão Unitree + visão computacional", "demo": True},
    {"slug": "dersalis", "nome": "Dersalis", "modalidade": "1_comissao", "maturidade": "negociação ativa",
     "ancora": "Vale (homologação 5k-20k devices)", "produto": "iSafe Mobile (biomédico EX-cert)", "demo": False},
    {"slug": "uiflou", "nome": "UiFlou", "modalidade": "2_comissao_majorada", "maturidade": "incipiente",
     "ancora": "—", "produto": "Video analytics + IA", "demo": False},
    {"slug": "medme", "nome": "Medme", "modalidade": "1_comissao", "maturidade": "a detalhar",
     "ancora": "—", "produto": "Prevenção de lesões musculoesqueléticas (−30% absenteísmo)", "demo": False},
    {"slug": "sim", "nome": "SIM — Safety Inspection Manager", "modalidade": "1_comissao", "maturidade": "a detalhar",
     "ancora": "—", "produto": "Gestão digital de inspeções e conformidade", "demo": False},
]

CONCORRENTES = [
    {"nome": "Trackfy", "categoria": "RTLS / SST digital amplo",
     "oferta": "Localização via crachá/capacete + sensores de zona.",
     "diferencial_sq": "SQ é integradora multi-parceiro; escolhe o melhor produto por caso."},
    {"nome": "Phygitall", "categoria": "RTLS / segurança ativa",
     "oferta": "Geolocalização em área de risco, abandono de área, SOS (cliente Embraer).",
     "diferencial_sq": "Cobertura multi-caso + Customer Success como pilar."},
    {"nome": "Pronto!", "categoria": "Questionário pré-turno (fadiga)",
     "oferta": "Trabalhador auto-declara sono/disposição; domina o caso pré-turno (cliente Vale).",
     "diferencial_sq": "Sensor MEDE (objetivo/contínuo) vs auto-declaração (subjetivo/pontual)."},
    {"nome": "Trek Fire", "categoria": "Wearable (no Gaslub)",
     "oferta": "Usa iSafe; cobrança de pico abusiva (300 devices por 20 meses).",
     "diferencial_sq": "Modelo comercial justo + integração e CS."},
    {"nome": "Fisto", "categoria": "Wearable (no Gaslub)",
     "oferta": "Problemas de entrega; pressão interna do gerente Petrobras.",
     "diferencial_sq": "Entrega confiável + acompanhamento de adoção."},
]


# ── Schemas ──
class NegocioIn(BaseModel):
    conta: str
    parceiro: Optional[str] = None
    modalidade: Optional[str] = None
    caso_uso: Optional[str] = None
    setor: Optional[str] = None
    fase: Optional[str] = "lead"
    ticket_min: Optional[float] = None
    ticket_max: Optional[float] = None
    mrr: Optional[float] = None
    responsavel: Optional[str] = None
    proximo_passo: Optional[str] = None


class NegocioPatch(BaseModel):
    fase: Optional[str] = None
    proximo_passo: Optional[str] = None
    ticket_min: Optional[float] = None
    ticket_max: Optional[float] = None
    mrr: Optional[float] = None
    responsavel: Optional[str] = None


# ── Referência (pública) ──
@router.get("/meta")
def meta():
    return {
        "casos_uso": CASOS_USO, "parceiros": PARCEIROS, "concorrentes": CONCORRENTES,
        "modalidades": MODALIDADES, "fases_pipeline": FASES_PIPELINE,
        "fases_projeto": FASES_PROJETO, "tipos_dispositivo": TIPOS_DISPOSITIVO,
    }


# ── Pipeline SST ──
@router.get("/negocios")
def listar_negocios(db: Session = Depends(get_session)):
    rows = db.query(NegocioSQS).order_by(NegocioSQS.atualizado_em.desc()).all()
    return [_neg_out(n) for n in rows]


def _neg_out(n: NegocioSQS) -> dict:
    prob = FASES_PIPELINE.get(n.fase, 0)
    base = ((n.ticket_min or 0) + (n.ticket_max or 0)) / 2 if (n.ticket_min or n.ticket_max) else 0
    return {
        "id": n.id, "conta": n.conta, "parceiro": n.parceiro, "modalidade": n.modalidade,
        "caso_uso": n.caso_uso, "setor": n.setor, "fase": n.fase, "probabilidade": prob,
        "ticket_min": n.ticket_min, "ticket_max": n.ticket_max, "ticket_base": base,
        "ponderado": round(base * prob / 100),
        "mrr": n.mrr, "responsavel": n.responsavel, "proximo_passo": n.proximo_passo,
    }


@router.post("/negocios")
def criar_negocio(payload: NegocioIn, db: Session = Depends(get_session)):
    n = NegocioSQS(**payload.model_dump(exclude_none=True))
    db.add(n); db.commit(); db.refresh(n)
    return _neg_out(n)


@router.patch("/negocios/{neg_id}")
def atualizar_negocio(neg_id: int, payload: NegocioPatch, db: Session = Depends(get_session)):
    n = db.query(NegocioSQS).filter(NegocioSQS.id == neg_id).first()
    if not n:
        raise HTTPException(404, "Negócio não encontrado")
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(n, k, v)
    db.commit(); db.refresh(n)
    return _neg_out(n)


# ── Clientes + implantações + frota ──
@router.get("/clientes")
def listar_clientes(db: Session = Depends(get_session)):
    out = []
    for c in db.query(ClienteServico).order_by(ClienteServico.nome).all():
        out.append({
            "id": c.id, "nome": c.nome, "setor": c.setor, "unidades": c.unidades,
            "responsavel": c.responsavel,
            "implantacoes": [
                {"id": i.id, "titulo": i.titulo, "parceiro": i.parceiro, "solucao": i.solucao,
                 "caso_uso": i.caso_uso, "modalidade": i.modalidade, "fase": i.fase,
                 "status": i.status, "site": i.site, "adocao_pct": i.adocao_pct,
                 "health": i.health, "notas": i.notas}
                for i in c.implantacoes
            ],
            "n_dispositivos": len(c.dispositivos),
        })
    return out


@router.get("/frota")
def listar_frota(db: Session = Depends(get_session)):
    rows = db.query(Dispositivo).order_by(Dispositivo.tipo, Dispositivo.serial).all()
    por_status: dict = {}
    for d in rows:
        por_status[d.status] = por_status.get(d.status, 0) + 1
    return {
        "total": len(rows),
        "por_status": por_status,
        "dispositivos": [
            {"id": d.id, "tipo": d.tipo, "serial": d.serial, "unidade": d.unidade,
             "status": d.status, "bateria": d.bateria, "ultima_comunicacao": d.ultima_comunicacao}
            for d in rows
        ],
    }


@router.get("/cs/{implantacao_id}")
def cs_relatorio(implantacao_id: int, db: Session = Depends(get_session)):
    """Relatório de Customer Success (adoção + impacto) de uma implantação."""
    i = db.query(Implantacao).filter(Implantacao.id == implantacao_id).first()
    if not i:
        raise HTTPException(404, "Implantação não encontrada")
    cli = db.query(ClienteServico).filter(ClienteServico.id == i.cliente_id).first()
    kpis = CS_KPIS.get(i.caso_uso or "", ["% de adoção", "Alertas atendidos", "Impacto operacional"])
    return {
        "implantacao_id": i.id,
        "cliente": cli.nome if cli else None,
        "titulo": i.titulo,
        "solucao": i.solucao,
        "site": i.site,
        "fase_projeto": i.fase,
        "adocao_pct": i.adocao_pct,
        "health": i.health,
        "ciclo": ["Diagnóstico", "Plano de adoção", "Acompanhamento", "Relatório de impacto"],
        "kpis_impacto": [{"kpi": k, "baseline": None, "atual": None} for k in kpis],
        "nota": "Baseline/atual preenchidos pelo CS a cada ciclo. Telemetria via INT-B1.",
    }


@router.get("/contratos")
def listar_contratos(db: Session = Depends(get_session)):
    rows = db.query(ContratoRaaS).order_by(ContratoRaaS.status, ContratoRaaS.cliente).all()
    ativos = [c for c in rows if c.status == "ativo"]
    mrr = sum(c.mensalidade or 0 for c in ativos)
    return {
        "total": len(rows),
        "mrr_total": mrr,
        "arr_projetado": mrr * 12,
        "modelos": MODELOS_CONTRATO,
        "contratos": [
            {"id": c.id, "cliente": c.cliente, "solucao": c.solucao, "parceiro": c.parceiro,
             "modelo": c.modelo, "mensalidade": c.mensalidade, "vigencia_meses": c.vigencia_meses,
             "inicio": c.inicio, "status": c.status, "responsavel": c.responsavel, "notas": c.notas}
            for c in rows
        ],
    }


@router.get("/kpis")
def kpis(db: Session = Depends(get_session)):
    negs = db.query(NegocioSQS).all()
    ativos = [n for n in negs if n.fase not in ("descartado",)]
    ponderado = sum(_neg_out(n)["ponderado"] for n in ativos)
    # MRR vem dos contratos recorrentes ativos (RaaS/subscription/in loco)
    mrr = sum(c.mensalidade or 0 for c in db.query(ContratoRaaS).filter(ContratoRaaS.status == "ativo").all())
    faturando = sum(1 for n in negs if n.fase in ("faturando", "recorrente"))
    return {
        "negocios": len(negs),
        "faturando": faturando,
        "pipeline_ponderado": ponderado,
        "mrr": mrr,
        "contratos": db.query(func.count(ContratoRaaS.id)).scalar() or 0,
        "clientes": db.query(func.count(ClienteServico.id)).scalar() or 0,
        "dispositivos": db.query(func.count(Dispositivo.id)).scalar() or 0,
    }
