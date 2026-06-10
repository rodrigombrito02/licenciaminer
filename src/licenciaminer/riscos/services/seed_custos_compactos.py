"""Seed do breakdown orçamentário + snapshots EVM históricos do Compactos."""

from __future__ import annotations

from datetime import date

from sqlalchemy.orm import Session

from licenciaminer.riscos.models import Projeto
from licenciaminer.riscos.models_pmsuite import CostCategory, EarnedValueSnapshot


# BAC total: R$ 1,8 bilhão (1,5 base + 300M contingência)
# Breakdown típico de planta greenfield de mineração
CATEGORIAS = [
    # (codigo, nome, tipo, cor, ordem, orc_planejado, comprometido, realizado)
    ("ENG", "Engenharia (básica + detalhadas + gerenciadora)", "CAPEX", "#0ea5e9", 1, 330_000_000, 280_000_000, 165_000_000),
    ("LIC", "Licenças e Autorizações", "CAPEX", "#16a34a", 2, 35_000_000, 20_000_000, 15_000_000),
    ("CIVIL", "Obras Civis (construção C)", "CAPEX", "#f59e0b", 3, 320_000_000, 80_000_000, 45_000_000),
    ("EQUIP_PROC", "Equipamentos de Processo (britagem/moagem/flotação)", "CAPEX", "#dc2626", 4, 600_000_000, 380_000_000, 180_000_000),
    ("EQUIP_AUX", "Equipamentos Auxiliares (filtragem, manuseio)", "CAPEX", "#a855f7", 5, 100_000_000, 40_000_000, 15_000_000),
    ("ELETRIC", "Infra Elétrica (SE + LT + eletrocentros)", "CAPEX", "#8b5cf6", 6, 200_000_000, 120_000_000, 30_000_000),
    ("AUTOM", "Automação e Controle", "CAPEX", "#0891b2", 7, 60_000_000, 20_000_000, 8_000_000),
    ("MONT", "Montagem Eletromecânica (M)", "CAPEX", "#f97316", 8, 240_000_000, 0, 0),
    ("PILHA", "Pilha Curtume e Rejeitos", "CAPEX", "#84cc16", 9, 95_000_000, 35_000_000, 18_000_000),
    ("UTIL", "Utilidades (água, ar, diesel, drenagem)", "CAPEX", "#64748b", 10, 50_000_000, 12_000_000, 5_000_000),
    ("AUX_EDIF", "Sistemas Auxiliares e Edificações", "CAPEX", "#94a3b8", 11, 70_000_000, 18_000_000, 7_000_000),
    ("COMISS", "Comissionamento e Start-up", "CAPEX", "#eab308", 12, 40_000_000, 0, 0),
    ("CONT_ESCOPO", "Contingência de Escopo (10%)", "CONTINGENCIA", "#dc2626", 13, 180_000_000, 0, 0),
    ("CONT_GESTAO", "Contingência de Gestão (Reserve)", "CONTINGENCIA", "#991b1b", 14, 120_000_000, 0, 0),
]

# Snapshots EVM históricos — simulando execução realista do Compactos
# Projeto iniciou Jun/2023, então temos dados de 2023-Q3 a 2026-Q1
SNAPSHOTS = [
    # (data, periodo, pv_acumulado_milhoes, ev_acumulado_milhoes, ac_acumulado_milhoes, observ)
    (date(2023, 12, 31), "2023-Q4", 80, 70, 85, "Engenharia básica em andamento. PV>EV por atraso inicial na mobilização."),
    (date(2024, 6, 30), "2024-Q2", 180, 160, 175, "FEL3 em fase final. Pedido antecipado do Moinho SAG (LOA)."),
    (date(2024, 12, 31), "2024-Q4", 300, 265, 290, "Contratação da gerenciadora. Início das engenharias detalhadas."),
    (date(2025, 6, 30), "2025-Q2", 420, 370, 395, "Eng. detalhadas em ritmo pleno. LP emitida. Negociação LT em curso."),
    (date(2025, 12, 31), "2025-Q4", 555, 480, 510, "Aprovação Board postergada de Fev/2026 para Fev/2027 (efeito em SPI)."),
    (date(2026, 3, 31), "2026-Q1", 650, 555, 595, "Eng detalhada ~75%. CAPEX comprometido em equipamentos chegando em 40%."),
]


def seed_custos_compactos(db: Session) -> dict[str, int]:
    proj = db.query(Projeto).filter_by(codigo="PROJ-COMPACTOS").first()
    if not proj:
        return {"categorias": 0, "snapshots": 0}

    n_cat = 0
    if db.query(CostCategory).filter_by(projeto_id=proj.id).count() == 0:
        for cod, nome, tipo, cor, ordem, plan, comp, real in CATEGORIAS:
            db.add(
                CostCategory(
                    projeto_id=proj.id,
                    codigo=cod,
                    nome=nome,
                    tipo=tipo,
                    cor=cor,
                    ordem=ordem,
                    orcamento_planejado=float(plan),
                    orcamento_comprometido=float(comp),
                    valor_realizado=float(real),
                )
            )
            n_cat += 1

    n_snap = 0
    bac = 1_800_000_000.0
    if db.query(EarnedValueSnapshot).filter_by(projeto_id=proj.id).count() == 0:
        for data, periodo, pv_mi, ev_mi, ac_mi, obs in SNAPSHOTS:
            pv = pv_mi * 1_000_000
            ev = ev_mi * 1_000_000
            ac = ac_mi * 1_000_000
            sv = ev - pv
            cv = ev - ac
            spi = (ev / pv) if pv else None
            cpi = (ev / ac) if ac else None
            eac = (bac / cpi) if cpi else None
            etc = (eac - ac) if eac else None
            vac = (bac - eac) if eac else None
            db.add(
                EarnedValueSnapshot(
                    projeto_id=proj.id,
                    data_snapshot=data,
                    periodo=periodo,
                    bac=bac,
                    pv=pv,
                    ev=ev,
                    ac=ac,
                    sv=sv,
                    cv=cv,
                    spi=spi,
                    cpi=cpi,
                    eac=eac,
                    etc=etc,
                    vac=vac,
                    observacoes=obs,
                )
            )
            n_snap += 1
    db.commit()
    return {"categorias": n_cat, "snapshots": n_snap}
