"""Seed de Gestão de Crises — cenários, comitês e processos críticos fictícios."""

from __future__ import annotations

from datetime import date, timedelta

from sqlalchemy.orm import Session

from licenciaminer.riscos.models import EloCadeiaValor, Pessoa, Risco
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

COMITE_PRINCIPAL = {
    "nome": "Comitê Estratégico de Crise",
    "descricao": "Nível executivo — toma decisões estratégicas e autoriza comunicação externa",
    "nivel": "estrategico",
    "membros": [
        ("Marina Magalhães", "Coordenadora de Crise", "+55 31 99000-0001"),
        ("Antônio Neves", "Diretor de Operações", "+55 31 99000-0002"),
        ("Marcelo Barreiro", "Diretor Financeiro", "+55 31 99000-0003"),
        ("Paulo Bandeira", "Diretor Jurídico", "+55 31 99000-0004"),
        ("Glauco Sabatini", "Diretor de Relações Institucionais", "+55 31 99000-0005"),
    ],
}

COMITE_TATICO = {
    "nome": "Comitê Tático de Resposta",
    "descricao": "Nível gerencial — execução das ações operacionais e monitoramento",
    "nivel": "tatico",
    "membros": [
        ("Guilherme Melo", "Líder Tático", "+55 31 99000-0010"),
        ("Pedro Mesa", "Ponto Focal Operações", "+55 31 99000-0011"),
        ("Beatriz Martins", "Meio Ambiente", "+55 31 99000-0012"),
        ("Daniel Oliveira", "Gestão de Barragens", "+55 31 99000-0013"),
    ],
}


CENARIOS = [
    {
        "codigo": "CC-01",
        "nome": "Rompimento de barragem de rejeitos",
        "descricao": "Rompimento parcial ou total de estrutura de contenção com vertimento de rejeitos para jusante.",
        "categoria": "seguranca",
        "severidade": 5,
        "probabilidade": 2,
        "risco_codigo_heur": "SEG",
        "comite": "Comitê Estratégico de Crise",
        "coordenador": "Daniel Oliveira",
        "acionamento": [
            ("Operador sala de controle", "Detecção de alarme de movimento ou saturação", 0, "Rádio + sistema SCADA"),
            ("Gerente de Barragens", "Confirma ocorrência e aciona sirene", 5, "+55 31 99000-0013"),
            ("Líder Tático (Guilherme Melo)", "Convoca comitê tático e brigada", 10, "+55 31 99000-0010"),
            ("Coordenadora de Crise (Marina)", "Aciona comitê estratégico + comunicação externa", 15, "+55 31 99000-0001"),
            ("Defesa Civil + ANM", "Notificação oficial", 30, "Canal 199 / ANM-SIGBM"),
        ],
        "runbook": {
            "titulo": "Resposta a rompimento de barragem — versão 3",
            "steps": [
                ("Acionar sirene e iniciar evacuação da ZAS (Zona de Autossalvamento)", 0, "Brigada + alto-falantes + carros de som"),
                ("Confirmar contagem de pessoas evacuadas nos pontos de encontro", 30, "Planilha de headcount + rádio"),
                ("Isolar acessos e suspender operações a jusante", 15, "Viaturas + barreiras"),
                ("Notificar autoridades (ANM, SEMAD, Defesa Civil, Bombeiros)", 30, "Contatos oficiais + ofício assinado"),
                ("Ativar plano de continuidade logística", 60, "Plano BCP processo crítico PC-03"),
                ("Montar sala de crise e iniciar briefing", 45, "Sala de situação + videoconferência"),
                ("Emitir nota oficial de comunicação externa", 120, "Aprovação jurídica + porta-voz"),
                ("Acionar seguros e avaliar danos iniciais", 240, "Corretor + auditor"),
            ],
        },
        "simulado": {
            "titulo": "Simulado tabletop rompimento Dique B — 2026 Q1",
            "tipo": "tabletop",
            "data": "2026-02-15",
            "objetivos": "Validar cadeia de acionamento em até 30 min; testar comunicação com Defesa Civil.",
            "nota": 4,
        },
    },
    {
        "codigo": "CC-02",
        "nome": "Fatalidade em operação de lavra",
        "descricao": "Acidente fatal durante operação de mina a céu aberto envolvendo equipamento móvel ou desmonte.",
        "categoria": "seguranca",
        "severidade": 5,
        "probabilidade": 2,
        "risco_codigo_heur": "SEG",
        "comite": "Comitê Estratégico de Crise",
        "coordenador": "Ricardo Ferreira",
        "acionamento": [
            ("Supervisor turno", "Primeira resposta no local", 0, "Rádio"),
            ("Equipe de resgate + brigada HSE", "Atendimento pré-hospitalar", 5, "Base HSE"),
            ("Gerente de Saúde e Segurança", "Parada da frente e isolamento", 10, "+55 31 99000-0020"),
            ("Diretor de Operações", "Decisão de parar operação da mina", 15, "+55 31 99000-0002"),
            ("Coordenadora de Crise + Comunicação", "Acionamento familiar, ANM e imprensa", 20, "+55 31 99000-0001"),
        ],
        "runbook": {
            "titulo": "Protocolo de fatalidade operacional — versão 2",
            "steps": [
                ("Prestar primeiros socorros e acionar SAMU", 0, "Brigada + ambulância on-site"),
                ("Isolar área e preservar cena", 10, "Viaturas + fita HSE"),
                ("Parar operação na frente e apurar causa inicial", 30, "Comitê HSE"),
                ("Notificar família com apoio psicológico", 60, "RH + psicólogo clínico"),
                ("Notificar ANM (SIGBM) e MTE", 120, "Ofícios oficiais"),
                ("Preparar comunicação interna (colaboradores) e externa", 180, "Porta-voz + jurídico"),
                ("Investigação formal (CIPA + externa)", 1440, "Processo de CAT e apuração"),
            ],
        },
        "simulado": {
            "titulo": "Exercício funcional — resposta a fatalidade na frente 12",
            "tipo": "funcional",
            "data": "2026-05-20",
            "objetivos": "Validar integração HSE + RH + Jurídico nas primeiras 4 horas.",
            "nota": None,
        },
    },
    {
        "codigo": "CC-03",
        "nome": "Perda/suspensão de licença ambiental crítica",
        "descricao": "Revogação, suspensão liminar ou não renovação de licença ambiental que paralise operação.",
        "categoria": "regulatorio",
        "severidade": 5,
        "probabilidade": 3,
        "risco_codigo_heur": "MAM",
        "comite": "Comitê Estratégico de Crise",
        "coordenador": "Marina Magalhães",
        "acionamento": [
            ("Gerência Meio Ambiente", "Detecção de notificação oficial", 0, "SEMAD / IBAMA / ANM"),
            ("Jurídico corporativo", "Avaliação jurídica imediata", 60, "+55 31 99000-0004"),
            ("Diretoria Meio Ambiente + Operações", "Decisão de ajustes ou recursos", 120, ""),
            ("Comitê Estratégico", "Sessão extraordinária", 240, ""),
        ],
        "runbook": {
            "titulo": "Gestão de suspensão de licença — versão 2",
            "steps": [
                ("Analisar notificação e identificar fundamento legal", 60, "Jurídico + Meio Ambiente"),
                ("Preparar recurso/resposta formal com prazo <5 dias", 2880, "Jurídico"),
                ("Ativar plano de contingência operacional", 120, "BCP processo crítico PC-01"),
                ("Negociar com órgão ambiental (SEMAD, IBAMA, MPE)", 1440, "Meio Ambiente + Relações Inst."),
                ("Comunicar stakeholders internos e externos", 240, "Comunicação + Porta-voz"),
                ("Preparar plano de adequação 30/60/90 dias", 10080, "Equipe multidisciplinar"),
            ],
        },
        "simulado": {
            "titulo": "Tabletop — cenário de suspensão LO via liminar MPE",
            "tipo": "tabletop",
            "data": "2026-03-10",
            "objetivos": "Validar articulação jurídica + ambiental + comunicação.",
            "nota": 3,
        },
    },
    {
        "codigo": "CC-04",
        "nome": "Ataque cibernético aos sistemas operacionais",
        "descricao": "Ransomware ou invasão afetando sistemas SCADA, ERP ou rede operacional.",
        "categoria": "cyber",
        "severidade": 4,
        "probabilidade": 3,
        "risco_codigo_heur": "TI",
        "comite": "Comitê Tático de Resposta",
        "coordenador": "Luciana Pereira",
        "acionamento": [
            ("SOC/Monitoramento TI 24x7", "Detecção de anomalia", 0, "SIEM + alertas automáticos"),
            ("CISO / Líder de Segurança TI", "Contenção inicial", 15, "+55 31 99000-0030"),
            ("Equipe de Resposta a Incidentes", "Isolamento e preservação forense", 30, "Team cyber-IR"),
            ("Comitê Tático + Jurídico + LGPD", "Avaliação de impacto e notificação", 60, ""),
            ("Diretoria + Comunicação", "Se vazamento confirmado, notificação ANPD em até 72h", 180, ""),
        ],
        "runbook": {
            "titulo": "Resposta a incidente cyber — versão 1",
            "steps": [
                ("Isolar sistemas afetados da rede", 15, "Firewall + segmentação"),
                ("Preservar logs e imagens forenses", 30, "Ferramenta forense + storage dedicado"),
                ("Avaliar escopo e tipo de ataque (ransomware/exfiltração)", 120, "Equipe IR"),
                ("Ativar backups imutáveis e testar restauração", 240, "Backup team"),
                ("Decisão sobre pagamento (não recomendado) ou restore", 480, "Comitê + Jurídico"),
                ("Notificação ANPD (se dados pessoais)", 4320, "DPO + Jurídico"),
                ("Comunicação interna e possível comunicação externa", 720, "Comunicação"),
                ("Post-incident review + melhorias de hardening", 10080, "Segurança TI"),
            ],
        },
        "simulado": {
            "titulo": "Ransomware tabletop — cenário de paralisação do ERP",
            "tipo": "tabletop",
            "data": "2026-06-05",
            "objetivos": "Validar tempo de isolamento e procedimento de restauração.",
            "nota": None,
        },
    },
    {
        "codigo": "CC-05",
        "nome": "Crise de relacionamento com comunidades",
        "descricao": "Manifestação organizada de comunidades, bloqueio de acessos, incidente ambiental percebido.",
        "categoria": "reputacional",
        "severidade": 4,
        "probabilidade": 4,
        "risco_codigo_heur": "REC",
        "comite": "Comitê Tático de Resposta",
        "coordenador": "Marina Magalhães",
        "acionamento": [
            ("Equipe de Relações com Comunidades", "Diálogo inicial no campo", 0, "Equipe RC"),
            ("Gerência de Comunidades", "Acionamento e apoio logístico", 30, ""),
            ("Jurídico + Segurança Patrimonial", "Se houver bloqueio ou vandalismo", 60, ""),
            ("Porta-voz + Diretoria RI", "Comunicação pública", 180, ""),
        ],
        "runbook": {
            "titulo": "Diálogo com comunidades em crise — versão 2",
            "steps": [
                ("Estabelecer canal de diálogo com lideranças locais", 60, "Equipe RC + intérprete cultural"),
                ("Avaliar demandas e preparar resposta preliminar", 240, "RC + Jurídico"),
                ("Acionar mediação (Ministério Público, CEEs, ONGs)", 1440, "Jurídico + RC"),
                ("Preparar comunicação pública e imprensa local", 360, "Comunicação"),
                ("Se bloqueio: contato com PM + Segurança Patrimonial", 60, "Sec. Patrimonial"),
                ("Acompanhamento 24h + relatório de evolução", 1440, "RC"),
            ],
        },
        "simulado": {
            "titulo": "Exercício tabletop — bloqueio de acesso por comunidade",
            "tipo": "tabletop",
            "data": "2026-04-18",
            "objetivos": "Testar articulação RC + Segurança + Comunicação.",
            "nota": 4,
        },
    },
]


PROCESSOS_CRITICOS = [
    {
        "codigo": "PC-01",
        "nome": "Licenciamento ambiental e renovações",
        "descricao": "Processo de manutenção de licenças operacionais e renovações junto aos órgãos ambientais.",
        "area": "Meio Ambiente e Licenciamento",
        "prioridade": 5,
        "rto_horas": 72,
        "rpo_horas": 24,
        "mtd_horas": 168,
        "impacto_financeiro_hora": 250000,
        "responsavel": "Marina Magalhães",
        "elo": "Meio Ambiente e Licenciamento",
        "dependencias": "SEMAD, IBAMA, ANM, sistema GEO, consultorias ambientais, pareceres técnicos",
        "recursos_minimos": "2 analistas ambientais + 1 jurídico + acesso aos sistemas dos órgãos",
    },
    {
        "codigo": "PC-02",
        "nome": "Lavra e sequenciamento de mina",
        "descricao": "Execução do plano de lavra conforme sequenciamento aprovado e qualidade especificada.",
        "area": "Operações",
        "prioridade": 5,
        "rto_horas": 8,
        "rpo_horas": 4,
        "mtd_horas": 48,
        "impacto_financeiro_hora": 180000,
        "responsavel": "Ricardo Ferreira",
        "elo": "Lavra",
        "dependencias": "Equipamentos móveis, sistema de dispatch, planejamento curto prazo, energia",
        "recursos_minimos": "Equipe operacional mínima (30 pessoas) + 5 escavadeiras + 15 caminhões",
    },
    {
        "codigo": "PC-03",
        "nome": "Logística de escoamento de produção",
        "descricao": "Transporte do produto do site até porto para embarque, via mineroduto + ferrovia + rodovia.",
        "area": "Comercial e Logística",
        "prioridade": 5,
        "rto_horas": 24,
        "rpo_horas": 12,
        "mtd_horas": 72,
        "impacto_financeiro_hora": 320000,
        "responsavel": "Rafael Torres",
        "elo": "Logística e Escoamento",
        "dependencias": "Concessionária ferroviária, porto, contratos de transporte rodoviário, estoque pulmão",
        "recursos_minimos": "Equipe logística + ao menos 1 modal alternativo operacional",
    },
    {
        "codigo": "PC-04",
        "nome": "Tesouraria e pagamentos críticos",
        "descricao": "Pagamento de fornecedores críticos (energia, diesel, folha) e gestão de liquidez.",
        "area": "Financeiro",
        "prioridade": 4,
        "rto_horas": 24,
        "rpo_horas": 4,
        "mtd_horas": 120,
        "impacto_financeiro_hora": 150000,
        "responsavel": "Marcelo Barreiro",
        "elo": "Financeiro e Controladoria",
        "dependencias": "Sistemas ERP, bancos, certificados digitais, aprovadores",
        "recursos_minimos": "Tesoureiro + backup de acesso bancário + ERP disponível",
    },
    {
        "codigo": "PC-05",
        "nome": "Monitoramento de barragens e geotecnia",
        "descricao": "Monitoramento contínuo de instrumentação e gestão de estabilidade das barragens.",
        "area": "SSMA",
        "prioridade": 5,
        "rto_horas": 2,
        "rpo_horas": 1,
        "mtd_horas": 8,
        "impacto_financeiro_hora": 500000,
        "responsavel": "Daniel Oliveira",
        "elo": "Gestão de Barragens",
        "dependencias": "Piezômetros, inclinômetros, satélite InSAR, equipes de inspeção, ANM-SIGBM",
        "recursos_minimos": "Técnicos 24x7 + sistema de monitoramento com backup",
    },
]


PLANOS_RECUPERACAO = {
    "PC-03": {
        "titulo": "Plano de contingência logística — escoamento",
        "versao": 2,
        "descricao": "Ativação de modais alternativos quando houver falha no modal principal.",
        "steps": [
            ("Ativar rota rodoviária alternativa", 60, "Motoristas cadastrados + frota terceirizada"),
            ("Negociar capacidade adicional ferroviária", 1440, "Contratos existentes"),
            ("Liberar estoque pulmão do porto", 120, "Comunicação com operador portuário"),
            ("Ajustar ritmo de produção conforme capacidade logística", 240, "Comunicação com operações"),
        ],
    },
    "PC-01": {
        "titulo": "Plano de contingência de licenciamento",
        "versao": 1,
        "descricao": "Ativação de regime operacional mínimo quando houver suspensão de licença.",
        "steps": [
            ("Identificar escopo exato da restrição", 60, "Jurídico + Meio Ambiente"),
            ("Parar frentes/atividades não licenciadas", 120, "Operações"),
            ("Redirecionar produção para áreas com licença válida", 240, "Planejamento de mina"),
            ("Negociar regime provisório com órgãos", 4320, "Meio Ambiente"),
        ],
    },
    "PC-05": {
        "titulo": "Plano de resposta a alerta de barragem",
        "versao": 3,
        "descricao": "Procedimento para nível de alerta 1, 2 e 3 em barragens.",
        "steps": [
            ("Nível 1: aumentar frequência de leituras + notificar", 30, "Gestão barragens"),
            ("Nível 2: reduzir nível do reservatório + evacuar ZAS parcial", 240, "Operações + Emergência"),
            ("Nível 3: evacuação total ZAS + acionamento Defesa Civil", 60, "Comitê de Crise"),
            ("Post-evento: laudo técnico independente", 10080, "Consultoria externa"),
        ],
    },
}


def _find_pessoa(db: Session, nome: str) -> Pessoa | None:
    return db.query(Pessoa).filter_by(nome=nome).first()


def _find_or_create_pessoa(db: Session, nome: str, area: str | None = None) -> Pessoa:
    p = db.query(Pessoa).filter_by(nome=nome).first()
    if p:
        return p
    p = Pessoa(nome=nome, area=area)
    db.add(p)
    db.flush()
    return p


def _find_risco_por_heuristica(db: Session, substring: str) -> Risco | None:
    return (
        db.query(Risco)
        .filter(Risco.codigo.like(f"%-{substring}-%"))
        .order_by(Risco.id)
        .first()
    )


def _find_elo(db: Session, nome: str) -> EloCadeiaValor | None:
    return db.query(EloCadeiaValor).filter_by(nome=nome).first()


def seed_crises(db: Session) -> dict[str, int]:
    """Popula comitês, cenários, runbooks, simulados, processos críticos e planos de recuperação."""
    # --- Comitês ---
    comites_por_nome: dict[str, ComiteCrise] = {}
    for spec in (COMITE_PRINCIPAL, COMITE_TATICO):
        if db.query(ComiteCrise).filter_by(nome=spec["nome"]).first():
            continue
        comite = ComiteCrise(
            nome=spec["nome"],
            descricao=spec["descricao"],
            nivel=spec["nivel"],
            ativo=True,
        )
        db.add(comite)
        db.flush()
        comites_por_nome[spec["nome"]] = comite
        for ordem, (nome, papel, contato) in enumerate(spec["membros"]):
            pessoa = _find_or_create_pessoa(db, nome)
            db.add(
                MembroComite(
                    comite_id=comite.id,
                    pessoa_id=pessoa.id,
                    papel=papel,
                    contato_24_7=contato,
                    ordem=ordem,
                )
            )

    # Recupera comitês existentes (se seed parcial anterior)
    for c in db.query(ComiteCrise).all():
        comites_por_nome[c.nome] = c

    # --- Cenários ---
    cenarios_created = 0
    runbooks_created = 0
    simulados_created = 0
    for spec in CENARIOS:
        if db.query(CenarioCrise).filter_by(codigo=spec["codigo"]).first():
            continue
        risco = _find_risco_por_heuristica(db, spec["risco_codigo_heur"])
        comite = comites_por_nome.get(spec["comite"])
        coordenador = _find_or_create_pessoa(db, spec["coordenador"])
        cenario = CenarioCrise(
            codigo=spec["codigo"],
            nome=spec["nome"],
            descricao=spec["descricao"],
            categoria=spec["categoria"],
            severidade=spec["severidade"],
            probabilidade=spec["probabilidade"],
            risco_id=risco.id if risco else None,
            comite_id=comite.id if comite else None,
            coordenador_id=coordenador.id,
            status="aprovado",
            ultima_revisao=date.today() - timedelta(days=30),
        )
        db.add(cenario)
        db.flush()
        cenarios_created += 1

        for ordem, (papel, criterio, tempo, contato) in enumerate(spec["acionamento"]):
            pessoa = _find_pessoa(db, spec["coordenador"]) if ordem == 3 else None
            db.add(
                AcionamentoStep(
                    cenario_id=cenario.id,
                    ordem=ordem,
                    papel=papel,
                    criterio=criterio,
                    tempo_resposta_min=tempo,
                    contato=contato,
                    pessoa_id=pessoa.id if pessoa else None,
                )
            )

        if spec.get("runbook"):
            rb_spec = spec["runbook"]
            runbook = Runbook(
                cenario_id=cenario.id,
                titulo=rb_spec["titulo"],
                versao=1,
                data_revisao=date.today() - timedelta(days=15),
                aprovador_id=coordenador.id,
            )
            db.add(runbook)
            db.flush()
            runbooks_created += 1
            for ordem, (descricao, tempo, recursos) in enumerate(rb_spec["steps"]):
                db.add(
                    RunbookStep(
                        runbook_id=runbook.id,
                        ordem=ordem,
                        descricao=descricao,
                        tempo_estimado_min=tempo,
                        recursos_necessarios=recursos,
                    )
                )

        if spec.get("simulado"):
            sim_spec = spec["simulado"]
            try:
                data_val = date.fromisoformat(sim_spec["data"])
            except Exception:
                data_val = None
            sim = Simulado(
                cenario_id=cenario.id,
                titulo=sim_spec["titulo"],
                tipo=sim_spec["tipo"],
                data_prevista=data_val,
                data_realizacao=data_val if sim_spec["nota"] else None,
                status="concluido" if sim_spec["nota"] else "planejado",
                facilitador_id=coordenador.id,
                objetivos=sim_spec["objetivos"],
                nota_performance=sim_spec["nota"],
            )
            db.add(sim)
            simulados_created += 1

    # --- Lições aprendidas (exemplo) ---
    if db.query(LicaoAprendida).count() == 0:
        cen1 = db.query(CenarioCrise).filter_by(codigo="CC-01").first()
        if cen1:
            db.add(
                LicaoAprendida(
                    cenario_id=cen1.id,
                    data=date.today() - timedelta(days=60),
                    descricao="Durante o simulado anterior, o tempo de convocação do comitê tático excedeu o alvo de 10 min.",
                    melhoria_proposta="Criar grupo WhatsApp dedicado ao comitê e testar cadeia mensalmente.",
                    status="em_implementacao",
                )
            )

    # --- Processos críticos ---
    processos_created = 0
    planos_created = 0
    testes_created = 0
    for spec in PROCESSOS_CRITICOS:
        if db.query(ProcessoCritico).filter_by(codigo=spec["codigo"]).first():
            continue
        responsavel = _find_or_create_pessoa(db, spec["responsavel"], area=spec["area"])
        elo = _find_elo(db, spec["elo"])
        proc = ProcessoCritico(
            codigo=spec["codigo"],
            nome=spec["nome"],
            descricao=spec["descricao"],
            area=spec["area"],
            responsavel_id=responsavel.id,
            elo_cadeia_valor_id=elo.id if elo else None,
            prioridade=spec["prioridade"],
            rto_horas=spec["rto_horas"],
            rpo_horas=spec["rpo_horas"],
            mtd_horas=spec["mtd_horas"],
            impacto_financeiro_hora=spec["impacto_financeiro_hora"],
            dependencias=spec["dependencias"],
            recursos_minimos=spec["recursos_minimos"],
        )
        db.add(proc)
        db.flush()
        processos_created += 1

        if spec["codigo"] in PLANOS_RECUPERACAO:
            plano_spec = PLANOS_RECUPERACAO[spec["codigo"]]
            plano = PlanoRecuperacao(
                processo_id=proc.id,
                titulo=plano_spec["titulo"],
                versao=plano_spec["versao"],
                descricao=plano_spec["descricao"],
                data_revisao=date.today() - timedelta(days=45),
                aprovador_id=responsavel.id,
            )
            db.add(plano)
            db.flush()
            planos_created += 1
            for ordem, (descricao, tempo, recursos) in enumerate(plano_spec["steps"]):
                db.add(
                    PlanoRecuperacaoStep(
                        plano_id=plano.id,
                        ordem=ordem,
                        descricao=descricao,
                        tempo_estimado_min=tempo,
                        recursos=recursos,
                        responsavel_id=responsavel.id,
                    )
                )
            # Um teste histórico por plano
            db.add(
                TestePlano(
                    plano_id=plano.id,
                    data=date.today() - timedelta(days=120),
                    tipo="tabletop",
                    status="aprovado_com_ressalvas",
                    gaps_identificados="Comunicação com stakeholders externos precisa de template pré-aprovado.",
                    aprovador_id=responsavel.id,
                    observacoes="Primeiro teste formal; equipe respondeu bem mas houve confusão na matriz de decisão.",
                )
            )
            testes_created += 1

    db.commit()
    return {
        "cenarios": cenarios_created,
        "runbooks": runbooks_created,
        "simulados": simulados_created,
        "processos_criticos": processos_created,
        "planos_recuperacao": planos_created,
        "testes": testes_created,
    }
