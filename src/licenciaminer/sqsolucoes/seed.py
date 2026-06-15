"""Seed do módulo SQ Soluções — dados reais (Monto-Gaslub, parceiros, pipeline)."""

from __future__ import annotations

import logging

from licenciaminer.sqsolucoes.database import (
    SessionLocal, ClienteServico, Implantacao, Dispositivo, NegocioSQS, ContratoRaaS,
)

CONTRATOS = [
    ("Consórcio Monto Mendes Jr", "Eletricista in loco (Petrobras Itaboraí)", None, "in_loco", 19970, 26, "2026-03", "ativo", "Bernardo", "Modalidade 5 · margem R$ 160.102 no contrato"),
    ("Consórcio Monto Mendes Jr", "Wearables Rombit (comodato + comissão)", "rombit", "comodato", 13638, 24, "2026-03", "ativo", "Bernardo", "1ª NF jun/2026 · comissão 5%"),
    ("Petrobras Regap (Betim)", "Banda biométrica SlateSafety", "slatesafety", "subscription", 0, 12, "2026-01", "ativo", "Bernardo", "Aluguéis pontuais → converter em subscription contínua"),
]

logger = logging.getLogger(__name__)

# Pipeline real (subset das 16 contas do funil do Leo)
NEGOCIOS = [
    ("Consórcio Monto Mendes Jr (Petrobras Gaslub)", "rombit", "1_comissao", "seguranca_hm", "construcao_pesada", "faturando", 250000, 350000, None, "Bernardo", "Acompanhar faturamento mar+abr"),
    ("Petrobras Itaboraí — eletricista in loco", "rombit", "5_in_loco", "servico_tecnico", "refino", "negociacao", 533673, 533673, 19970, "Bernardo", "Fechar contrato Mod. 5 (26 meses)"),
    ("Petrobras Regap (Betim) — SlateSafety", "slatesafety", "4_reseller", "estresse_termico", "refino", "faturando", 80000, 200000, None, "Bernardo", "Converter aluguel em subscription"),
    ("Petrobras Regap — Kofre", "kofre", "1_comissao", "localizacao_acesso", "refino", "faturando", None, None, None, "Bernardo", "Acompanhar 2 processos + minuta Alcon"),
    ("Hydro (alumina)", "robotdog", "3_equity", "inspecao_robotica", "mineracao_bauxita", "diagnostico", 480000, 1200000, 60000, "Léo", "Voltar com mini-respostas das 6 oportunidades"),
    ("MRN (bauxita)", "robotdog", "3_equity", "inspecao_robotica", "mineracao_bauxita", "qualificado", 480000, 600000, 50000, "Léo", "Reativar follow-up"),
    ("Vale (antifadiga)", "dersalis", "1_comissao", "antifadiga", "mineracao_ferro", "lead", None, None, None, "Léo", "Homologação corporativa em andamento (5k-20k devices)"),
    ("LHG Corumbá (manganês subterrâneo)", "slatesafety", "4_reseller", "estresse_termico", "mineracao_subterranea", "lead", None, None, None, "Bernardo", "Prospectar — oceano azul térmico"),
]

DISPOSITIVOS = [
    ("tag_rombit", "RMB-0142", "Gaslub / Itaboraí", "ativo", 87, "há 4 min"),
    ("tag_rombit", "RMB-0143", "Gaslub / Itaboraí", "ativo", 64, "há 12 min"),
    ("tag_rombit", "RMB-0151", "Gaslub / Itaboraí", "manutencao", 0, "há 3 dias"),
    ("gateway", "GW-EPC10-01", "Gaslub / EPC-10", "ativo", None, "há 1 min"),
    ("banda_slatesafety", "SLT-2207", "Gaslub / Itaboraí", "ativo", 91, "há 8 min"),
    ("banda_slatesafety", "SLT-2209", "Gaslub / Itaboraí", "offline", 22, "há 1 dia"),
]


def _seed_contratos(db) -> int:
    """Seed idempotente dos contratos recorrentes (RaaS/in loco/subscription)."""
    if db.query(ContratoRaaS).count() > 0:
        return 0
    for cli_, sol, parc, mdl, mens, vig, ini, st, resp, nota in CONTRATOS:
        db.add(ContratoRaaS(cliente=cli_, solucao=sol, parceiro=parc, modelo=mdl,
                            mensalidade=mens, vigencia_meses=vig, inicio=ini,
                            status=st, responsavel=resp, notas=nota))
    db.commit()
    return len(CONTRATOS)


def seed_sqsolucoes(force: bool = False) -> dict:
    db = SessionLocal()
    try:
        # Contratos têm seed próprio idempotente (tabela pode ter sido criada
        # depois que os negócios já foram semeados).
        n_contratos = _seed_contratos(db)

        if db.query(NegocioSQS).count() > 0 and not force:
            return {"seeded": False, "contratos": n_contratos}

        # Cliente-âncora real: Consórcio Monto Mendes Jr (Gaslub)
        cli = ClienteServico(
            nome="Consórcio Monto Mendes Jr",
            setor="Construção pesada / O&G",
            unidades=["Gaslub / Complexo Boaventura (Itaboraí-RJ)"],
            contato_nome="Gerência de Segurança",
            responsavel="Bernardo",
        )
        db.add(cli)
        db.flush()

        db.add(Implantacao(
            cliente_id=cli.id, titulo="Wearables Rombit — Gaslub (EPCs)",
            parceiro="rombit", solucao="Tag de Interação Humano×Máquina",
            caso_uso="seguranca_hm", modalidade="1_comissao",
            fase="operacao", status="operando", site="Gaslub / Itaboraí",
            adocao_pct=78, health="verde",
            notas="1ª NF SQS↔Rombit em jun/2026. Frente ativa nos EPCs.",
        ))
        db.add(Implantacao(
            cliente_id=cli.id, titulo="Eletricista in loco (Mod. 5)",
            parceiro=None, solucao="Serviço técnico CLT",
            caso_uso="servico_tecnico", modalidade="5_in_loco",
            fase="comissionamento", status="em_andamento", site="Petrobras Itaboraí",
            adocao_pct=None, health="amarelo",
            notas="Contrato 26 meses · R$ 19.970/mês · margem R$ 160.102.",
        ))
        for tipo, serial, unid, st, bat, ult in DISPOSITIVOS:
            db.add(Dispositivo(cliente_id=cli.id, tipo=tipo, serial=serial, unidade=unid,
                               status=st, bateria=bat, ultima_comunicacao=ult))

        for conta, parc, mod, caso, setor, fase, tmin, tmax, mrr, resp, passo in NEGOCIOS:
            db.add(NegocioSQS(conta=conta, parceiro=parc, modalidade=mod, caso_uso=caso,
                              setor=setor, fase=fase, ticket_min=tmin, ticket_max=tmax,
                              mrr=mrr, responsavel=resp, proximo_passo=passo))

        db.commit()
        logger.info("SQ Soluções: seed aplicado (Monto-Gaslub + pipeline)")
        return {"seeded": True, "negocios": len(NEGOCIOS), "dispositivos": len(DISPOSITIVOS)}
    finally:
        db.close()
