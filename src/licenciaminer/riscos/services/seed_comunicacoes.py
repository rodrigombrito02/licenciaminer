"""Seed de Comunicações — stakeholders, canais, templates, RACI e envios de exemplo."""

from __future__ import annotations

from datetime import date, timedelta

from sqlalchemy.orm import Session

from licenciaminer.riscos.models_comunicacoes import (
    Canal,
    EnvioComunicacao,
    MatrizRACIComunicacao,
    Stakeholder,
    TemplateComunicacao,
)
from licenciaminer.riscos.models_crises import CenarioCrise
from licenciaminer.riscos.models import Risco


STAKEHOLDERS = [
    # --- Governo / Regulatório ---
    ("ANM (Agência Nacional de Mineração)", "governamental", "ANM", "Regulador",
     "Órgão regulador da atividade minerária", "fiscalizacao@anm.gov.br", "+55 61 3312-6666", 5),
    ("SEMAD MG (Secretaria Meio Ambiente)", "governamental", "SEMAD-MG", "Licenciamento",
     "Órgão licenciador ambiental em Minas Gerais", "atendimento@meioambiente.mg.gov.br", "+55 31 3915-1000", 5),
    ("IBAMA", "governamental", "IBAMA", "Fiscalização ambiental",
     "Órgão federal de fiscalização ambiental", "linhaverde@ibama.gov.br", "0800 618080", 5),
    ("Defesa Civil de MG", "governamental", "CEDEC-MG", "Emergência",
     "Canal de acionamento em emergências com impacto na população", None, "199", 5),
    ("Ministério Público Estadual (MPMG)", "governamental", "MPMG", "Tutela ambiental",
     "Promotorias que acompanham atividades minerárias e comunidades", "imprensa@mpmg.mp.br", "+55 31 3330-8100", 4),
    # --- Comunidades ---
    ("Lideranças Comunidade A", "comunidade", "Comunidade A", "Liderança local",
     "Ponto focal na comunidade do entorno da mina", None, "+55 31 99000-1111", 4),
    ("Lideranças Comunidade B", "comunidade", "Comunidade B", "Liderança local",
     "Ponto focal na comunidade mais próxima do mineroduto", None, "+55 31 99000-2222", 4),
    ("Associação de Pescadores Rio Manso", "comunidade", "Associação local", "Presidente",
     "Representação dos pescadores da bacia afetada pelo mineroduto", None, "+55 31 99000-3333", 3),
    # --- Imprensa ---
    ("Imprensa local (Jornal Diário MG)", "imprensa", "Jornal Diário MG", "Editoria de economia",
     "Canal de imprensa regional", "redacao@diariomg.com.br", "+55 31 3030-4000", 3),
    ("Imprensa nacional (Valor/Estadão)", "imprensa", "Valor Econômico", "Editoria setorial",
     "Cobertura nacional do setor de mineração", "industria@valor.com.br", "+55 11 3000-3000", 3),
    # --- Internos ---
    ("CEO", "interno", "MUSA", "Chief Executive Officer",
     "Presidente executivo", "ceo@musa.fake", "+55 31 99000-9999", 5),
    ("Diretoria SSMA", "interno", "MUSA", "Diretoria",
     "Diretoria de Saúde, Segurança, Meio Ambiente", "ssma@musa.fake", "+55 31 99000-0101", 5),
    ("Diretoria Operações", "interno", "MUSA", "Diretoria",
     "Diretoria de Operações e Engenharia", "operacoes@musa.fake", "+55 31 99000-0102", 5),
    ("Colaboradores (intranet + e-mail interno)", "interno", "MUSA", "Base de funcionários",
     "Broadcast para toda a base de colaboradores", "interno@musa.fake", None, 3),
    ("Acionistas / Conselho", "interno", "MUSA", "Conselho de Administração",
     "Reporte ao conselho em eventos estratégicos", "ri@musa.fake", None, 5),
    # --- Financeiro / Cliente ---
    ("Agentes financiadores (BNDES)", "financeiro", "BNDES", "Gestor de contrato",
     "Banco financiador do Projeto Compactos", "ri@bndes.gov.br", "+55 21 2172-7447", 4),
    ("Clientes principais (siderúrgicas)", "cliente", "Siderúrgicas", "Supply chain",
     "Clientes diretos que dependem do produto", None, None, 4),
    ("Seguradora", "fornecedor", "Marsh / JLT", "Account manager",
     "Corretora e seguradora em caso de sinistro", "claims@marsh.com", "+55 11 3000-0000", 4),
]


CANAIS = [
    ("E-mail corporativo", "email", True, 15, "Canal padrão para comunicações formais documentadas"),
    ("WhatsApp grupos de crise", "whatsapp", False, 2, "Grupos dedicados para acionamento rápido"),
    ("SMS / Push alarme", "sms", False, 1, "Para alertas críticos (barragens, emergência)"),
    ("Telefone direto", "telefone", False, 1, "Contato direto 24×7 via números pré-cadastrados"),
    ("Rádio de operação", "radio", False, 0, "Comunicação interna entre turnos e CCO"),
    ("Ofício físico/digital", "oficio", True, 1440, "Comunicação formal com órgãos públicos"),
    ("Reunião presencial/virtual", "reuniao", True, 60, "Convocação de comitês e briefings"),
    ("Intranet corporativa", "intranet", False, 30, "Comunicados internos aos colaboradores"),
    ("Nota à imprensa", "imprensa", True, 120, "Comunicação pública oficial com aprovação jurídica"),
]


TEMPLATES = [
    {
        "codigo": "TPL-001",
        "titulo": "Notificação inicial à Defesa Civil — rompimento de barragem",
        "categoria": "deteccao",
        "canal": "Telefone direto",
        "cenario_codigo": "CC-01",
        "aprovacao_juridica": False,
        "publicos": "Defesa Civil, Bombeiros, ANM",
        "corpo": (
            "A MUSA, CNPJ XX.XXX.XXX/0001-XX, notifica oficialmente a ocorrência de "
            "ALERTA em estrutura de barragem {nome_barragem}, nível {nivel_alerta}, "
            "às {hora_ocorrencia} do dia {data}.\n\n"
            "Ações já executadas:\n- Sirene e evacuação da ZAS ativadas\n- Sala de crise montada\n"
            "- Notificação à ANM pelo SIGBM\n\n"
            "Solicitamos apoio de {recursos_solicitados}.\n\n"
            "Ponto focal: {coordenador_crise} — {telefone_coordenador}."
        ),
    },
    {
        "codigo": "TPL-002",
        "titulo": "Comunicado interno aos colaboradores — emergência operacional",
        "categoria": "resolucao",
        "canal": "Intranet corporativa",
        "cenario_codigo": "CC-01",
        "aprovacao_juridica": False,
        "publicos": "Colaboradores MUSA",
        "corpo": (
            "Prezados colaboradores,\n\n"
            "Informamos que às {hora_ocorrencia} de hoje foi acionado o protocolo de "
            "emergência do Comitê de Crise em função de {descricao_evento}. "
            "A equipe está plenamente mobilizada e todas as pessoas em áreas de risco "
            "foram evacuadas com segurança.\n\n"
            "Orientações:\n- Equipes não operacionais: trabalho remoto até nova orientação\n"
            "- Brigada e emergência: ponto de encontro no CCO\n\n"
            "Próximo briefing às {proximo_briefing}.\n"
            "Em caso de dúvida, acionar {ponto_focal_rh}."
        ),
    },
    {
        "codigo": "TPL-003",
        "titulo": "Nota oficial à imprensa — evento operacional",
        "categoria": "pos_evento",
        "canal": "Nota à imprensa",
        "cenario_codigo": "CC-01",
        "aprovacao_juridica": True,
        "publicos": "Imprensa local e nacional",
        "corpo": (
            "NOTA OFICIAL — {data}\n\n"
            "A MUSA informa que na data de hoje ocorreu {descricao_objetiva} em "
            "{local}. Todas as medidas de segurança previstas no plano de emergência "
            "foram imediatamente acionadas. Não há registro de vítimas.\n\n"
            "A Companhia está em contato com as autoridades competentes (ANM, SEMAD-MG, "
            "Defesa Civil) e fornecerá atualizações por este canal oficial.\n\n"
            "A MUSA reafirma seu compromisso com a segurança de pessoas, comunidades "
            "e meio ambiente.\n\nAssessoria de Imprensa — imprensa@musa.fake"
        ),
    },
    {
        "codigo": "TPL-004",
        "titulo": "Acionamento do comitê tático — fatalidade",
        "categoria": "deteccao",
        "canal": "WhatsApp grupos de crise",
        "cenario_codigo": "CC-02",
        "aprovacao_juridica": False,
        "publicos": "Comitê Tático de Resposta",
        "corpo": (
            "🚨 ACIONAMENTO DE EMERGÊNCIA — COMITÊ TÁTICO\n\n"
            "Evento: {descricao_evento}\n"
            "Local: {local}\n"
            "Horário: {hora}\n"
            "Equipe de resgate: {status_resgate}\n\n"
            "Reunião imediata em {local_reuniao}.\n"
            "Responsável pela atualização: {lider_tatico}."
        ),
    },
    {
        "codigo": "TPL-005",
        "titulo": "Comunicação à família — fatalidade",
        "categoria": "resolucao",
        "canal": "Reunião presencial/virtual",
        "cenario_codigo": "CC-02",
        "aprovacao_juridica": True,
        "publicos": "Família do colaborador",
        "corpo": (
            "Comunicação presencial com apoio psicológico e jurídico.\n\n"
            "Pontos obrigatórios:\n"
            "1. Presença de gerente HSE + RH + apoio psicológico\n"
            "2. Oferta de suporte imediato (transporte, acompanhamento)\n"
            "3. Informações claras sobre próximos passos legais\n"
            "4. Contato direto 24×7 do ponto focal: {responsavel_rh}\n"
            "5. Garantir privacidade e respeito ao luto\n\n"
            "Nenhuma comunicação à imprensa ANTES da família ser notificada."
        ),
    },
    {
        "codigo": "TPL-006",
        "titulo": "Diálogo com liderança comunitária — manifestação",
        "categoria": "resolucao",
        "canal": "Reunião presencial/virtual",
        "cenario_codigo": "CC-05",
        "aprovacao_juridica": False,
        "publicos": "Lideranças das comunidades impactadas",
        "corpo": (
            "Reunião de alinhamento com liderança {nome_lideranca}, comunidade {comunidade}.\n\n"
            "Pauta:\n"
            "1. Escutar demandas e percepções\n"
            "2. Apresentar fatos técnicos sobre o evento/tema\n"
            "3. Discutir caminhos de resolução\n"
            "4. Definir canais permanentes de diálogo\n\n"
            "Presença obrigatória: Marina Magalhães (GG Comunidades), "
            "representante jurídico, representante técnico da disciplina afetada.\n"
            "Ata formal ao final."
        ),
    },
    {
        "codigo": "TPL-007",
        "titulo": "Recurso formal à ANM — suspensão liminar",
        "categoria": "resolucao",
        "canal": "Ofício físico/digital",
        "cenario_codigo": "CC-03",
        "aprovacao_juridica": True,
        "publicos": "ANM, SEMAD, MPMG",
        "corpo": (
            "OFÍCIO Nº {numero}\nAssunto: Recurso à decisão de suspensão — {numero_processo}\n\n"
            "Exmos. Sr(a),\n\n"
            "A MUSA vem, respeitosamente, apresentar recurso à decisão de "
            "{descricao_decisao}, com fundamento em {base_legal}.\n\n"
            "Fatos:\n{fatos}\n\nFundamentação técnica:\n{fundamentacao}\n\n"
            "Pedido:\n{pedido}\n\n"
            "Anexos:\n- Estudos técnicos complementares\n- Pareceres jurídicos\n- "
            "Comprovação de regularidade das condicionantes\n\n"
            "Respeitosamente,\n{nome_diretoria} — Diretoria Meio Ambiente"
        ),
    },
    {
        "codigo": "TPL-008",
        "titulo": "Alerta SOC — incidente cibernético em progresso",
        "categoria": "deteccao",
        "canal": "SMS / Push alarme",
        "cenario_codigo": "CC-04",
        "aprovacao_juridica": False,
        "publicos": "CISO + Equipe IR + Diretoria TI",
        "corpo": (
            "🔴 ALERTA CRÍTICO SOC — {hora}\n"
            "Evento: {tipo_ataque}\n"
            "Sistemas afetados: {sistemas}\n"
            "Contenção em curso: {status_contencao}\n"
            "Plano acionado: Runbook {runbook_id}\n\n"
            "Sala de crise virtual: {link_sala}\n"
            "Ponto focal: {nome_ciso} — {tel_ciso}"
        ),
    },
    {
        "codigo": "TPL-009",
        "titulo": "Notificação à ANPD — vazamento de dados pessoais",
        "categoria": "pos_evento",
        "canal": "Ofício físico/digital",
        "cenario_codigo": "CC-04",
        "aprovacao_juridica": True,
        "publicos": "ANPD (Autoridade Nacional de Proteção de Dados)",
        "corpo": (
            "COMUNICAÇÃO DE INCIDENTE DE SEGURANÇA — LGPD Art. 48\n\n"
            "Controlador: MUSA — CNPJ XX.XXX.XXX/0001-XX\n"
            "DPO: {nome_dpo} — {email_dpo}\n\n"
            "Data do incidente: {data_incidente}\n"
            "Data da detecção: {data_deteccao}\n"
            "Descrição: {descricao_incidente}\n"
            "Dados potencialmente afetados: {dados_afetados}\n"
            "Número estimado de titulares: {numero_titulares}\n\n"
            "Medidas adotadas:\n{medidas_adotadas}\n\n"
            "Medidas em andamento:\n{medidas_em_andamento}"
        ),
    },
    {
        "codigo": "TPL-010",
        "titulo": "Reporte mensal ao conselho — situação de riscos",
        "categoria": "rotina",
        "canal": "Reunião presencial/virtual",
        "cenario_codigo": None,
        "aprovacao_juridica": False,
        "publicos": "Conselho de Administração",
        "corpo": (
            "REPORTE MENSAL DE RISCOS — {mes}/{ano}\n\n"
            "Mapa de riscos atualizado (ver anexo):\n"
            "- {total_riscos} riscos cadastrados\n"
            "- {criticos} classificados como Críticos\n"
            "- {em_breach} em breach de apetite\n\n"
            "KRIs em vermelho: {kris_vermelhos}\n"
            "Ações atrasadas: {acoes_atrasadas}\n"
            "Controles pendentes de teste: {controles_pendentes}\n\n"
            "Cenários de crise revisados no mês: {cenarios_revisados}\n\n"
            "Recomendações / deliberações solicitadas:\n{recomendacoes}"
        ),
    },
]


# RACI por cenário: quem é R/A/C/I em cada momento
RACI_POR_CENARIO = {
    "CC-01": [
        # (stakeholder_nome, papel, momento, canal_preferido, prazo_min, obrigatorio)
        ("Diretoria SSMA", "responsavel", "deteccao", "Telefone direto", 5, True),
        ("CEO", "aprovador", "resolucao", "Telefone direto", 15, True),
        ("Defesa Civil de MG", "informado", "deteccao", "Telefone direto", 30, True),
        ("ANM (Agência Nacional de Mineração)", "informado", "deteccao", "Ofício físico/digital", 60, True),
        ("Lideranças Comunidade A", "informado", "resolucao", "Reunião presencial/virtual", 120, True),
        ("Lideranças Comunidade B", "informado", "resolucao", "Reunião presencial/virtual", 120, True),
        ("Colaboradores (intranet + e-mail interno)", "informado", "resolucao", "Intranet corporativa", 60, True),
        ("Imprensa local (Jornal Diário MG)", "informado", "pos_evento", "Nota à imprensa", 240, True),
        ("Imprensa nacional (Valor/Estadão)", "informado", "pos_evento", "Nota à imprensa", 240, True),
        ("Seguradora", "consultado", "pos_evento", "E-mail corporativo", 240, True),
        ("Acionistas / Conselho", "informado", "pos_evento", "E-mail corporativo", 120, True),
    ],
    "CC-02": [
        ("Diretoria SSMA", "responsavel", "deteccao", "Telefone direto", 5, True),
        ("Diretoria Operações", "aprovador", "deteccao", "Telefone direto", 10, True),
        ("CEO", "informado", "deteccao", "Telefone direto", 30, True),
        ("ANM (Agência Nacional de Mineração)", "informado", "resolucao", "Ofício físico/digital", 240, True),
        ("Colaboradores (intranet + e-mail interno)", "informado", "resolucao", "Intranet corporativa", 180, True),
        ("Imprensa local (Jornal Diário MG)", "informado", "pos_evento", "Nota à imprensa", 360, True),
    ],
    "CC-03": [
        ("Diretoria SSMA", "responsavel", "deteccao", "E-mail corporativo", 60, True),
        ("Ministério Público Estadual (MPMG)", "informado", "resolucao", "Ofício físico/digital", 1440, True),
        ("SEMAD MG (Secretaria Meio Ambiente)", "consultado", "resolucao", "Ofício físico/digital", 1440, True),
        ("CEO", "aprovador", "resolucao", "Reunião presencial/virtual", 240, True),
        ("Acionistas / Conselho", "informado", "pos_evento", "E-mail corporativo", 2880, True),
    ],
    "CC-04": [
        ("Diretoria Operações", "responsavel", "deteccao", "WhatsApp grupos de crise", 15, True),
        ("Diretoria SSMA", "informado", "resolucao", "E-mail corporativo", 120, False),
        ("CEO", "aprovador", "resolucao", "Telefone direto", 60, True),
        ("Acionistas / Conselho", "informado", "pos_evento", "E-mail corporativo", 4320, True),
    ],
    "CC-05": [
        ("Lideranças Comunidade A", "consultado", "continuo", "Reunião presencial/virtual", 1440, True),
        ("Lideranças Comunidade B", "consultado", "continuo", "Reunião presencial/virtual", 1440, True),
        ("Associação de Pescadores Rio Manso", "consultado", "continuo", "Reunião presencial/virtual", 2880, False),
        ("Diretoria SSMA", "responsavel", "deteccao", "Telefone direto", 30, True),
        ("Ministério Público Estadual (MPMG)", "informado", "resolucao", "Ofício físico/digital", 1440, False),
        ("Imprensa local (Jornal Diário MG)", "informado", "pos_evento", "Nota à imprensa", 720, True),
    ],
}


def seed_comunicacoes(db: Session) -> dict[str, int]:
    sh_count = 0
    canal_count = 0
    tpl_count = 0
    raci_count = 0
    env_count = 0

    # --- Stakeholders ---
    for nome, tipo, org, cargo, desc, email, tel, crit in STAKEHOLDERS:
        if db.query(Stakeholder).filter_by(nome=nome).first():
            continue
        db.add(
            Stakeholder(
                nome=nome,
                tipo=tipo,
                organizacao=org,
                cargo=cargo,
                descricao=desc,
                contato_email=email,
                contato_telefone=tel,
                criticidade=crit,
                ativo=True,
            )
        )
        sh_count += 1
    db.flush()

    # --- Canais ---
    for nome, tipo, formal, latencia, desc in CANAIS:
        if db.query(Canal).filter_by(nome=nome).first():
            continue
        db.add(
            Canal(
                nome=nome,
                tipo=tipo,
                formal=formal,
                latencia_min=latencia,
                descricao=desc,
            )
        )
        canal_count += 1
    db.flush()

    # Mapa cenários
    cenarios_map: dict[str, int] = {
        c.codigo: c.id for c in db.query(CenarioCrise).all()
    }
    stakeholders_map: dict[str, Stakeholder] = {
        s.nome: s for s in db.query(Stakeholder).all()
    }

    # --- Templates ---
    for spec in TEMPLATES:
        if db.query(TemplateComunicacao).filter_by(codigo=spec["codigo"]).first():
            continue
        cenario_id = cenarios_map.get(spec.get("cenario_codigo") or "")
        db.add(
            TemplateComunicacao(
                codigo=spec["codigo"],
                titulo=spec["titulo"],
                categoria=spec["categoria"],
                corpo=spec["corpo"],
                canal_sugerido=spec["canal"],
                publicos_sugeridos=spec["publicos"],
                cenario_id=cenario_id,
                aprovacao_juridica=spec["aprovacao_juridica"],
            )
        )
        tpl_count += 1
    db.flush()

    # --- RACI ---
    for cenario_codigo, entries in RACI_POR_CENARIO.items():
        cenario_id = cenarios_map.get(cenario_codigo)
        if not cenario_id:
            continue
        for nome_sh, papel, momento, canal, prazo, obrig in entries:
            sh = stakeholders_map.get(nome_sh)
            if not sh:
                continue
            if (
                db.query(MatrizRACIComunicacao)
                .filter_by(entidade_tipo="cenario", entidade_id=cenario_id, stakeholder_id=sh.id, papel=papel, momento=momento)
                .first()
            ):
                continue
            db.add(
                MatrizRACIComunicacao(
                    entidade_tipo="cenario",
                    entidade_id=cenario_id,
                    stakeholder_id=sh.id,
                    papel=papel,
                    momento=momento,
                    canal_preferido=canal,
                    prazo_max_min=prazo,
                    obrigatorio=obrig,
                )
            )
            raci_count += 1

    # --- Envios de exemplo (2 eventos históricos) ---
    if db.query(EnvioComunicacao).count() == 0:
        # Envio 1: nota à imprensa por tema regulatório (há 45 dias)
        template_rec = db.query(TemplateComunicacao).filter_by(codigo="TPL-010").first()
        if template_rec:
            db.add(
                EnvioComunicacao(
                    data_envio=date.today() - timedelta(days=45),
                    template_id=template_rec.id,
                    stakeholder_id=stakeholders_map["Acionistas / Conselho"].id,
                    canal="E-mail corporativo",
                    assunto="Reporte mensal de riscos — abril",
                    conteudo="Reporte executivo mensal enviado com base no template TPL-010.",
                    entidade_tipo=None,
                    entidade_id=None,
                    enviado_por="Marina Magalhães",
                    resultado="confirmado",
                )
            )
            env_count += 1
        # Envio 2: simulado recente de barragem
        tpl_sim = db.query(TemplateComunicacao).filter_by(codigo="TPL-001").first()
        sh_defesa = stakeholders_map.get("Defesa Civil de MG")
        cc_01 = db.query(CenarioCrise).filter_by(codigo="CC-01").first()
        if tpl_sim and sh_defesa and cc_01:
            db.add(
                EnvioComunicacao(
                    data_envio=date.today() - timedelta(days=20),
                    template_id=tpl_sim.id,
                    stakeholder_id=sh_defesa.id,
                    canal="Telefone direto",
                    assunto="Tabletop Dique B — notificação exercício",
                    conteudo="Comunicação de abertura do simulado tabletop (exercício, sem evento real).",
                    entidade_tipo="cenario",
                    entidade_id=cc_01.id,
                    enviado_por="Daniel Oliveira",
                    resultado="confirmado",
                    observacao="Exercício tabletop — comunicação simulada, não-real.",
                )
            )
            env_count += 1

    db.commit()
    return {
        "stakeholders": sh_count,
        "canais": canal_count,
        "templates": tpl_count,
        "raci": raci_count,
        "envios": env_count,
    }
