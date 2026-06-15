"""Seed do plano de evolucao — popula o modulo com o estado atual do sistema
(funcionalidades no ar + sprints entregues + roadmap). Idempotente: so roda se
a base estiver vazia.

Reflete as decisoes das reunioes de socios e da construcao em andamento.
"""

from __future__ import annotations

import logging

from licenciaminer.evolucao.database import ItemEvolucao, SessionLocal

logger = logging.getLogger(__name__)

# Atalhos de visibilidade
TODOS = ["anonimo", "visitante_free", "visitante_pago", "consultor", "admin"]
LOGADOS = ["visitante_free", "visitante_pago", "consultor", "admin"]
PAGO = ["visitante_pago", "consultor", "admin"]
INTERNO = ["consultor", "admin"]
ADMIN = ["admin"]


# ── Funcionalidades no ar (mapa de funcionalidades) ──
FUNCIONALIDADES = [
    # (modulo, titulo, descricao, visibilidade, telas)
    ("SQ Ambiental", "Análise de Dados Públicos", "Exploração de decisões SEMAD, processos ANM, infrações IBAMA e CFEM com filtros.", INTERNO, ["/explorar"]),
    ("SQ Ambiental", "Análise Preliminar de Licenciamento", "Índice de sucesso do segmento + fatores de atenção, em minutos.", PAGO, ["/viabilidade"]),
    ("SQ Ambiental", "Diligência Ambiental (DD)", "DD em 5 fases automatizada com relatórios HTML/PDF.", INTERNO, ["/due-diligence"]),
    ("SQ Ambiental", "Conformidade de Pilhas", "85 docs, 186 requisitos, GISTM premium, portal público PL 2.519.", INTERNO, ["/pilhas"]),
    ("Ativos Minerários", "Mapa Geoespacial", "Polígonos minerários com camadas de UC, TI e biomas. Default mineral, 1000 polígonos.", TODOS, ["/mapa"]),
    ("Ativos Minerários", "Concessões", "Lista filtrável de processos ANM por estado, substância e fase.", TODOS, ["/concessoes"]),
    ("Ativos Minerários", "Prospecção", "Oportunidades — disponibilidades, baixa sobreposição ambiental.", TODOS, ["/prospeccao"]),
    ("Ativos Minerários", "Mapeamentos", "Teses de busca configuráveis sobre a base de direitos. Ranqueia e promove ao Funil.", INTERNO, ["/mapeamentos"]),
    ("SQ Mineral Intelligence", "Mercado", "PTAX, commodities, Comex Stat, preços.", TODOS, ["/inteligencia-comercial"]),
    ("SQ Mineral Intelligence", "Ranking CFEM", "Top municípios e substâncias por arrecadação.", TODOS, ["/inteligencia-comercial"]),
    ("SQ Mineral Intelligence", "Premium", "Relatórios, alertas e datasets — gated por assinatura.", PAGO, ["/inteligencia-comercial"]),
    ("SQ Soluções", "Segurança Ocupacional", "Indicadores SST, taxas de acidente, NRs.", TODOS, ["/seguranca"]),
    ("SQ Soluções", "Mineradora Modelo (IA)", "Showcase de IA aplicada à operação (dados simulados).", TODOS, ["/mineradora-modelo"]),
    ("Plataforma", "Funil de Oportunidades", "Pipeline 8 etapas, avaliação 9 parâmetros, relatório de viabilidade. Estruturação antes da Captação.", INTERNO, ["/oportunidades"]),
    ("Plataforma", "Plano de Ações", "Upload XLSX/CSV (ClickUp/Trello), Kanban + Gantt + EAP.", INTERNO, ["/planos-de-acao"]),
    ("Plataforma", "Riscos e Crises", "ERM, ISO 31000, BCP, matriz 5x5.", INTERNO, ["/riscos", "/gestao-crises"]),
    ("Plataforma", "Painel Admin", "Tráfego, conversões, gestão de usuários.", ADMIN, ["/admin"]),
    ("Plataforma", "Acesso por 4 níveis + Ver como", "Auth Supabase + seletor de pré-visualização de cada nível.", INTERNO, ["(header)"]),
]

# ── Sprints entregues ──
SPRINTS_FEITOS = [
    ("Ativos Minerários", "Módulo Mapeamentos (motor de teses)", "Backend + frontend: teses configuráveis sobre base local MG, ranqueamento, triagem.", "2.1", INTERNO),
    ("Ativos Minerários", "Promoção Mapeamento → Funil", "Resultado vira card no Funil herdando o snapshot.", "2.4", INTERNO),
    ("Plataforma", "Funil — reordenar etapas", "Estruturação Técnica antes da Captação de Investidor.", "2.4", ADMIN),
    ("Plataforma", "Seletor 'Ver como'", "Admin/consultor pré-visualizam cada nível de acesso.", "0.2", INTERNO),
    ("Plataforma", "Sidebar limpa", "Produtos expostos; ferramentas internas sem duplo accordion.", "0.1", LOGADOS),
    ("Ativos Minerários", "Mapa rápido (default mineral, 1000)", "Filtros pré-aplicados para carregar rápido.", "0.6", TODOS),
    ("SQ Ambiental", "Rebrand SQ Ambiental", "Padronização de nome do módulo ambiental.", "0.1", TODOS),
    ("Plataforma", "Módulo Evolução do Sistema", "Este módulo: mapa de funcionalidades + monitor de sprints + sugestões.", "0.4", INTERNO),
    ("Plataforma", "Plano cadastrado no sistema", "O plano de evolução vive aqui dentro para os sócios avaliarem.", "0.5", INTERNO),
]

# ── Roadmap (sprints propostos) ──
SPRINTS_ROADMAP = [
    ("Plataforma", "Permissões/ACL nos cards", "Líder-responsável + ACL por card (interno). Visível na próxima rodada.", "0.2", INTERNO),
    ("Plataforma", "Home 'Olá, [nome]' com minhas tarefas", "Agrega ações atribuídas a mim em todos os módulos.", "0.3", INTERNO),
    ("Plataforma", "Bugs: EAP, Kanban, matriz de risco", "Correções pontuais reportadas em reunião.", "0.6", INTERNO),
    ("Ativos Minerários", "Radar de eventos ANM (local)", "Diff diário de caducidades/disponibilidades/cessões — interno.", "1.x", INTERNO),
    ("SQ Ambiental", "Radar de Condicionantes", "Upload da licença → IA extrai condicionantes → tarefas com prazo. Alvo Jaguar.", "3.2", PAGO),
    ("SQ Ambiental", "Índice de Sucesso (ex-probabilidade)", "Diagnóstico prescritivo do processo, não probabilidade.", "3.3", PAGO),
    ("SQ Mineral Intelligence", "Atlas DR-Grade Brasil", "Inventário de potencial de pellet feed DR (CBAM). Âncora JMendes/Mitsubishi.", "4.2", PAGO),
    ("SQ Consultoria", "Cliente → Escopos (multi-frente)", "Cadastro único de cliente com N escopos (riscos, projetos, etc).", "5.1", INTERNO),
    ("SQ Soluções", "Projetos + parcerias", "Gestão de projetos cliente×parceiro + vitrine de parcerias.", "5.2", TODOS),
    ("Captação", "Inbox de demandas + funis por frente", "CTAs públicos → captação estruturada + dashboard de conversão.", "5.3", INTERNO),
]

# ── Sugestoes (exemplos das reunioes) ──
SUGESTOES = [
    ("Ativos Minerários", "Radar de leilões SOPLE", "9ª rodada ANM (~7.000 áreas) com API JSON pública. Monitorar disponibilidades.", "reuniao", "Reunião sócios"),
    ("Ativos Minerários", "Conceito CUMO — mapa de rede", "Mapear relacionamentos (LinkedIn, universidade, projetos) para abordar donos de DM.", "reuniao", "Maury"),
    ("SQ Mineral Intelligence", "Clipping semanal automatizado", "Brasil Mineral + Notícias de Mineração com resumos + links oficiais.", "reuniao", "Reunião sócios"),
    ("SQ Soluções", "RaaS — Robot as a Service", "3 robôs Petrobras; modelo de operação como serviço.", "reuniao", "Leo"),
]


# ── Produtos de Mineral Intelligence para o Lima avaliar (tipo=produto) ──
# Cada um traz: o que é · minha ideia · decisões que tomei e por quê · dados · comprador · Pessotti.
PRODUTOS_MI = [
    {
        "titulo": "A · Atlas DR-Grade Brasil (âncora)",
        "descricao": (
            "**O que é:** inventário do potencial brasileiro de pellet feed DR-grade (Fe≥67%, sílica/alumina baixas), "
            "depósito a depósito, com curva de oferta e ranking de projetos.\n\n"
            "**Minha ideia:** o CBAM entrou em vigor em 01/2026 e há déficit projetado de HBI; ninguém — nem a EPE — "
            "publicou esse mapa. É a interseção exata CBAM × Brasil, e casa com o caso JMendes/Mitsubishi.\n\n"
            "**Decisões que tomei e por quê:**\n"
            "• Começar com dado local (RAL/CFEM/geologia) em vez de esperar dado pago → já valida 70% e dá entregável agora "
            "(testei: 76 produtores de Fe ativos em MG via CFEM).\n"
            "• Não comprar CRU pra v1 → o benchmark de preço global é enriquecimento posterior (parceria), não bloqueia.\n"
            "• Priorizá-lo como âncora → conecta 2 frentes já vivas (Mitsubishi + CBAM).\n\n"
            "**Dados:** públicos (RAL, CFEM, geologia CPRM) + classificação/opinião SQ. Pago (CRU) opcional, fase 2.\n"
            "**Comprador:** traders (Mitsubishi), siderúrgicas Oriente Médio/Europa, juniors, bancos.\n"
            "**Pessotti:** valida specs DR-grade e conecta o potencial à vantagem CBAM (minério BR + matriz limpa)."
        ),
    },
    {
        "titulo": "B · Monitor CFEM trimestral",
        "descricao": (
            "**O que é:** arrecadação de CFEM como proxy de produção/preço realizado por substância/município, "
            "com defasagem menor que o Anuário Mineral. Assinatura recorrente.\n\n"
            "**Minha ideia:** a própria AMIG reclamou (mai/2026) que falta acesso a dado estratégico da ANM. "
            "Há dor real e ninguém entrega análise recorrente do CFEM.\n\n"
            "**Decisões e por quê:** produto 100% local (só CFEM) → receita previsível sem dependência externa; "
            "formato assinatura (não jornalismo) → preenche a faixa vazia R$ 3-15 mil/ano analítica.\n\n"
            "**Dados:** CFEM (público) + análise SQ. **Comprador:** mineradoras, fornecedores, bancos, prefeituras."
        ),
    },
    {
        "titulo": "C · Due Diligence de Ativo (padrão internacional, preço Brasil)",
        "descricao": (
            "**O que é:** relatório por ativo (título ANM + RAL + CFEM + passivos + geologia), assinado por sênior — "
            "no padrão do asset report da WoodMac (US$ 2.250), mas cobrindo a cauda longa brasileira a R$ 5-20 mil.\n\n"
            "**Minha ideia:** WoodMac cobre ~30 ativos BR; o RAL permite estimar custo/receita de centenas de operações médias.\n\n"
            "**Decisões e por quê:** usar a senioridade Summo como selo (QP/Pessoa Competente) → diferencial vs software puro; "
            "ticket alto sob demanda → casa com M&A/captação.\n\n"
            "**Dados:** ANM/RAL/CFEM/espacial (público) + assinatura SQ. **Comprador:** M&A, fundos, investidores.\n"
            "**Pessotti:** camada de risco-carbono (exposição CBAM do ativo) — ninguém oferece."
        ),
    },
    {
        "titulo": "D · Radar de Minerais Estratégicos",
        "descricao": (
            "**O que é:** quem requereu o quê em lítio/ETR/nióbio/grafita, onde, em que fase — boletim trimestral.\n\n"
            "**Minha ideia:** o SIGMINE bruto não conta a história; CRU não desce ao grão municipal. Inteligência competitiva "
            "que fundos e juniors pagam.\n\n"
            "**Decisões e por quê:** surfar o tema quente (transição energética) com dado que já temos; trimestral → recorrência.\n\n"
            "**Dados:** SIGMINE (público) + leitura SQ. **Comprador:** juniors, fundos, trade agencies."
        ),
    },
    {
        "titulo": "E · Green Iron / CBAM Brazil Brief (em inglês)",
        "descricao": (
            "**O que é:** pipeline brasileiro de HBI/briquete/DR pellet (Vale, Centaurus, Brazil Iron…) + ângulo CBAM, bilíngue.\n\n"
            "**Minha ideia:** é o CBAM do Lima em formato vendável. Ticket em USD, custo em R$; canal Mitsubishi já existe.\n\n"
            "**Decisões e por quê:** formato 'pergunta respondida' replicável; em inglês → mesa de compras internacional.\n\n"
            "**Dados:** público (pipeline) + contexto + opinião SQ. **Comprador:** siderúrgicas EU/Ásia, traders.\n"
            "**Pessotti:** É o dono técnico — metodologia de carbono, precificação ETS/CBAM, demanda de aço verde. "
            "Sem ele, raso. (Esta frente espera a conversa com ele.)"
        ),
    },
    {
        "titulo": "F · Clipping / Inteligência setorial (isca freemium)",
        "descricao": (
            "**O que é:** resumo semanal (Brasil Mineral, Notícias de Mineração) com 1 gráfico proprietário SQ por edição.\n\n"
            "**Minha ideia:** não se vende — assina-se com e-mail corporativo. Cada edição carrega um dado da base SQ → "
            "máquina de leads que alimenta os produtos pagos.\n\n"
            "**Decisão e por quê:** tratá-lo como **isca**, não produto-fim → é o funil, não conta entre os 5.\n\n"
            "**Dados:** notícias (resumo + link oficial, compliance) + base SQ. **Comprador:** gera lead pra todos os outros."
        ),
    },
    {
        "titulo": "G · Auditoria independente de CFEM (municípios)",
        "descricao": (
            "**O que é:** recolhido (CFEM) vs. produção declarada (RAL) — verificador independente para prefeituras.\n\n"
            "**Minha ideia:** a plataforma Minera Brasil é da própria ANM/Serpro; há espaço para um auditor independente. B2G.\n\n"
            "**Decisão e por quê:** nicho separado (setor público) → avaliar se vale o esforço comercial distinto do B2B.\n\n"
            "**Dados:** CFEM + RAL (público). **Comprador:** prefeituras/AMIG."
        ),
    },
    {
        "titulo": "H · Radar de Consolidação / M&A",
        "descricao": (
            "**O que é:** quem está **acumulando direitos minerários** — movimentos de consolidação por titular (CNPJ), "
            "sobreposições e oportunidades de M&A.\n\n"
            "**Minha ideia:** já temos o portfólio por CNPJ da Onda B — **22.371 titulares com mais de um direito**, "
            "220.893 processos sob multi-direito. Ninguém entrega esse mapa de movimentação.\n\n"
            "**Decisão e por quê:** nasce de graça do que já está no sistema (agrupamento por cpf_cnpj_do_titular, limpo). "
            "Diferencia de WoodMac/CRU, que não descem ao grão do titular brasileiro.\n\n"
            "**Dados:** SCM/SIGMINE (público) + leitura SQ. **Comprador:** fundos, M&A, juniors, traders."
        ),
    },
    {
        "titulo": "I · Índice de Logística Mineral",
        "descricao": (
            "**O que é:** competitividade de **escoamento** por ativo/região — distância a rodovia, ferrovia e porto, "
            "com índice de custo logístico.\n\n"
            "**Minha ideia:** ingerimos ferrovias (MInfra) e portos na Onda B; cruzando com a localização do direito, "
            "dá pra ranquear ativos por viabilidade logística — fator decisivo que o mercado hoje estima no olho.\n\n"
            "**Decisão e por quê:** reusa o motor de enriquecimento (logística multimodal + destinação) que já existe.\n\n"
            "**Dados:** ANTT/MInfra + ANTAQ + SIGMINE (público) + cálculo SQ. **Comprador:** traders, investidores, mineradoras."
        ),
    },
]


def seed_produtos_mi(force: bool = False) -> dict:
    """Cadastra os 7 produtos de Mineral Intelligence para o Lima avaliar."""
    db = SessionLocal()
    try:
        existing = db.query(ItemEvolucao).filter(ItemEvolucao.tipo == "produto").count()
        if existing > 0 and not force:
            return {"seeded": False, "existing": existing}
        n = 0
        for p in PRODUTOS_MI:
            db.add(ItemEvolucao(
                tipo="produto", titulo=p["titulo"], descricao=p["descricao"],
                modulo="SQ Mineral Intelligence", status="em_avaliacao",
                origem="claude_local", origem_detalhe="Proposta Claude para avaliação do Lima",
                autor="Claude",
            ))
            n += 1
        db.commit()
        logger.info(f"Evolucao: {n} produtos MI seedados")
        return {"seeded": True, "criados": n}
    finally:
        db.close()


def seed_mapa_sprints() -> dict:
    """Adiciona ao plano as sprints do Mapa Multi-camadas + ingestão de bases."""
    db = SessionLocal()
    try:
        titulo_chave = "Mapa Multi-camadas"
        existe = db.query(ItemEvolucao).filter(ItemEvolucao.titulo.like(f"%{titulo_chave}%")).count()
        if existe > 0:
            return {"seeded": False}
        itens = [
            ("Ativos Minerários", "Mapa Multi-camadas — abas DMs/Hídricos/Energia/Logística/Ambiental/Geologia",
             "Expandir o /mapa com camadas toggláveis. Mesma base que alimenta os scores do Funil (uma ingestão, duas vistas). "
             "Camada visual no mapa + score quantificado no Funil.", "2.6", INTERNO),
            ("Ativos Minerários", "Ingestão local de bases (ANA, ANEEL/SIGEL, CPRM, DNIT/ANTT)",
             "Baixar shapefiles públicos (sem API ao vivo) que alimentam mapa e enriquecimento do Funil. "
             "Água (ANA), energia (ANEEL/SIGEL), geologia (CPRM), logística (DNIT/ANTT).", "1.4", INTERNO),
        ]
        for modulo, titulo, desc, fase, vis in itens:
            db.add(ItemEvolucao(
                tipo="sprint", titulo=titulo, descricao=desc, modulo=modulo,
                status="proposta", fase=fase, visibilidade=vis,
            ))
        db.commit()
        logger.info("Evolucao: sprints do Mapa Multi-camadas seedadas")
        return {"seeded": True, "criados": len(itens)}
    finally:
        db.close()


# ══════════════════════════════════════════════════════════════════════
#  ESQUELETO v2 — features FUTURAS (placeholders "em_breve") + reestruturação
#  Sem lógica nova: apenas declara onde o plano chega, por módulo e visão.
# ══════════════════════════════════════════════════════════════════════

# (modulo, titulo, descricao, visibilidade, telas)
FUNCIONALIDADES_FUTURAS = [
    # ── Ativos Minerários (ex-Direitos): a coluna vertebral / trilha ──
    ("Ativos Minerários", "Trilha do Ativo (ciclo de vida)", "Linha do tempo do direito minerário: requerimento → pesquisa → RFP → lavra → operação, com o investidor entrando como evento em cada etapa.", INTERNO, ["/direitos"]),
    ("Ativos Minerários", "Portfólio por titular (CNPJ)", "Agrupa múltiplos direitos de um mesmo titular — quem concentra ativos, sobreposições e prazos.", INTERNO, ["/direitos"]),
    ("Ativos Minerários", "Radar de prazos ANM", "Caducidades, vencimentos de pesquisa e disponibilidades como alertas datados sobre o ativo.", INTERNO, ["/direitos"]),
    ("Ativos Minerários", "Camada Logística (ferrovia/porto)", "ANTT (ferrovias) + ANTAQ (portos) no mapa multi-camadas, com destinação do produto.", INTERNO, ["/mapa"]),
    ("Ativos Minerários", "Camada Geológica (CPRM)", "Ocorrências e cartografia geológica como camada de contexto na prospecção.", TODOS, ["/mapa"]),

    # ── SQ Ambiental ──
    ("SQ Ambiental", "Radar de Condicionantes (ambiental)", "Upload da licença → IA extrai condicionantes → tarefas com prazo. Alvo Jaguar/Partecal.", PAGO, ["/condicionantes"]),
    ("SQ Ambiental", "Monitoramento de ativos ANM (compliance)", "Prazos e exigências ANM no mesmo Radar de Compliance, ao lado das condicionantes ambientais.", INTERNO, ["/condicionantes"]),
    ("SQ Ambiental", "Índice de Sucesso (diagnóstico)", "Diagnóstico prescritivo do processo (substitui 'probabilidade').", PAGO, ["/viabilidade"]),

    # ── SQ Mineral Intelligence (produtos do Lima, pós-avaliação) ──
    ("SQ Mineral Intelligence", "Atlas DR-Grade Brasil", "Inventário do potencial de pellet feed DR (ângulo CBAM). Âncora JMendes/Mitsubishi.", PAGO, ["/inteligencia-comercial"]),
    ("SQ Mineral Intelligence", "Monitor CFEM trimestral", "Arrecadação CFEM como proxy de produção/preço, por assinatura.", PAGO, ["/inteligencia-comercial"]),
    ("SQ Mineral Intelligence", "Clipping setorial (isca freemium)", "Resumo semanal + 1 gráfico proprietário SQ por edição — máquina de leads.", LOGADOS, ["/inteligencia-comercial"]),

    # ── SQ Consultoria (vitrine pública + cockpit interno) ──
    ("SQ Consultoria", "Vitrine de serviços", "Página pública apresentando diagnóstico, riscos & crises, gestão de projetos e corporativa.", TODOS, ["/sq-consultoria"]),
    ("SQ Consultoria", "Cliente → Escopos (multi-frente)", "Cadastro único de cliente com N escopos (riscos, projetos, comunicação).", INTERNO, ["/ferramentas-internas"]),

    # ── SQ Soluções ──
    ("SQ Soluções", "Projetos + parcerias tecnológicas", "Gestão de projetos cliente×parceiro + vitrine de parcerias.", TODOS, ["/sq-solutions"]),
    ("SQ Soluções", "RaaS — Robot as a Service", "Operação robótica como serviço (caso Petrobras/Leo).", TODOS, ["/sq-solutions"]),

    # ── Captação ──
    ("Captação", "Inbox de demandas", "CTAs públicos dos produtos caem numa caixa única de captação.", INTERNO, ["/captacao"]),
    ("Captação", "Funis por frente + conversão", "Pipeline por frente de negócio com dashboard de conversão.", INTERNO, ["/captacao"]),

    # ── Plataforma / Integração de Ferramentas ──
    ("Plataforma", "Home 'Olá, [nome]' com minhas tarefas", "Agrega ações atribuídas ao usuário em todos os módulos.", INTERNO, ["/"]),
    ("Plataforma", "ACL por card (líder-responsável)", "Permissões finas por card, replicadas nos módulos internos.", INTERNO, ["(todos)"]),
    ("Integração de Ferramentas", "Conectores de IA (Bernardo)", "Integração dos motores de IA entre módulos (extração, scoring, clipping).", INTERNO, ["(backend)"]),
]


def seed_esqueleto(force: bool = False) -> dict:
    """Esqueleto v2: migra terminologia + semeia features futuras (em_breve).

    Idempotente. Sempre roda a migração (rename de módulo + visibilidade do Funil),
    mas só insere as features futuras uma vez.
    """
    db = SessionLocal()
    try:
        migrados = 0
        # 1) Rename de módulo nos itens já existentes
        itens_dir = db.query(ItemEvolucao).filter(
            ItemEvolucao.modulo == "Direitos e Concessões"
        ).all()
        for it in itens_dir:
            it.modulo = "Ativos Minerários"
            migrados += 1

        # 2) Funil liberado para o consultor (era admin-only)
        funil = db.query(ItemEvolucao).filter(
            ItemEvolucao.titulo == "Funil de Oportunidades"
        ).first()
        if funil and funil.visibilidade == ADMIN:
            funil.visibilidade = INTERNO
            migrados += 1

        # 3) Features futuras (em_breve) — só uma vez
        ja_tem = db.query(ItemEvolucao).filter(
            ItemEvolucao.tipo == "funcionalidade",
            ItemEvolucao.status == "em_breve",
        ).count()
        criados = 0
        if ja_tem == 0 or force:
            for modulo, titulo, desc, vis, telas in FUNCIONALIDADES_FUTURAS:
                db.add(ItemEvolucao(
                    tipo="funcionalidade", titulo=titulo, descricao=desc,
                    modulo=modulo, status="em_breve", visibilidade=vis, telas=telas,
                    origem="interno", origem_detalhe="Esqueleto v2",
                ))
                criados += 1

        # 4) Entregas já no ar (flip em_breve → no_ar)
        ENTREGUES = [
            ("Índice de Sucesso (diagnóstico)", "SQ Ambiental", PAGO, ["/viabilidade"],
             "Diagnóstico prescritivo do processo (índice + fatores + plano de ação)."),
            ("Gestão de contrato RaaS", "SQ Soluções", INTERNO, ["/sq-solutions"],
             "Contratos recorrentes (RaaS/subscription/in loco) com MRR e ARR no cockpit."),
        ]
        for titulo, modulo, vis, telas, desc in ENTREGUES:
            it = db.query(ItemEvolucao).filter(ItemEvolucao.titulo == titulo).first()
            if it is None:
                db.add(ItemEvolucao(
                    tipo="funcionalidade", titulo=titulo, descricao=desc,
                    modulo=modulo, status="no_ar", visibilidade=vis, telas=telas,
                    origem="interno", origem_detalhe="Entrega",
                ))
                migrados += 1
            elif it.status != "no_ar":
                it.status = "no_ar"
                it.descricao = desc
                migrados += 1

        db.commit()
        logger.info(f"Evolucao: esqueleto v2 ({migrados} migrados, {criados} futuras)")
        return {"migrados": migrados, "futuras": criados}
    finally:
        db.close()


# ══════════════════════════════════════════════════════════════════════
#  Trilha INT — Integração de Ferramentas & IA (dono: Bernardo)
#  Cada sprint carrega um "Como fazer" acionável no corpo da descrição.
# ══════════════════════════════════════════════════════════════════════
INT_SPRINTS = [
    ("INT-1", "Setup do time no GitHub",
     "Forks dos sócios, repo higienizado, colaboração destravada.\n\n"
     "**Como fazer:**\n"
     "1. Cada sócio cria fork do repositório base.\n"
     "2. Trocar default branch para `main`.\n"
     "3. Varredura de segredos no repo público (gitleaks/trufflehog).\n"
     "4. Passo-a-passo 1:1 (já existe no doc da reunião).\n"
     "5. Proteção de branch + revisão de PR.", "A"),
    ("INT-2", "Repositório de contextos/skills compartilhados",
     "Fim do retrabalho e do gasto duplicado de tokens entre as contas.\n\n"
     "**Como fazer:**\n"
     "1. Pasta `contextos/` no repo + `MEMORY_SUMMO.md` (vocabulário, clientes, paleta, regra 'sem consultês' por cliente).\n"
     "2. Skill de **sugestão de melhoria**: o Claude de cada sócio envia card pra API com autor identificado.\n"
     "3. Conectar ao módulo Evolução do Sistema (alimenta as sugestões).", "A"),
    ("INT-3", "Estudo de custos de IA + política de modelos",
     "Entender por que uma conta gasta mais e padronizar uso.\n\n"
     "**Como fazer:**\n"
     "1. Diagnóstico: modelo usado, sessões longas sem limpar, anexos repetidos.\n"
     "2. Guia de boas práticas (contexto limpo > downgrade de modelo).\n"
     "3. Política por tarefa: estratégia=Fable, código=Opus/Sonnet, mecânico=Haiku.", "A"),
    ("INT-4", "N8N operacional",
     "Licença já paga, sem responsável — ativar.\n\n"
     "**Como fazer:**\n"
     "1. Definir responsável (Bernardo).\n"
     "2. Backlog priorizado: clipping semanal, diff ANM em produção, Bluedot→atas, sincronia Gmail.\n"
     "3. Primeiro fluxo real rodando (clipping ou diff ANM).", "A"),
    ("INT-5", "Pipeline de reuniões (Bluedot→atas→tarefas)",
     "Reunião vira ata corrigida e ações atribuídas automaticamente.\n\n"
     "**Como fazer:**\n"
     "1. Bluedot grava → resumo por e-mail.\n"
     "2. Correção de nomes/termos (glossário).\n"
     "3. Ata registrada no sistema → ações viram tarefas (caem no 'Olá, [nome]').", "A"),
    ("INT-6", "Templates & identidade visual",
     "Apresentações e relatórios melhores e padronizados.\n\n"
     "**Como fazer:**\n"
     "1. Paleta oficial.\n"
     "2. Templates (HTML self-standing + Canva).\n"
     "3. Aplicar aos relatórios do sistema.", "A"),
    ("INT-7", "Governança de IA",
     "Revisão de saídas + contingência de tokens + alocação de custo por projeto.\n\n"
     "**Como fazer:**\n"
     "1. Protocolo de revisão (nomes, números, PT-BR — evitar 'pensa em inglês e traduz').\n"
     "2. Plano de contingência quando crédito acaba.\n"
     "3. Alocar custo de IA por projeto/orçamento (ex.: ESDIC).", "A"),
    ("INT-8", "Conexão Claude ↔ Sistema",
     "Cada sócio sugere e consulta o sistema pelo próprio Claude.\n\n"
     "**Como fazer:**\n"
     "1. Endpoint autenticado por sócio para sugestões.\n"
     "2. Depois: consultas dinâmicas ('quais ações estão em aberto?').", "A"),
    # Sub-trilha B — Integração de plataformas de parceiros (SQ Soluções)
    ("INT-B1", "Conectores de plataformas de parceiros",
     "Telemetria ao vivo dos devices nos painéis de Frota e Customer Success.\n\n"
     "**Como fazer:**\n"
     "1. Cadastro de integração por parceiro (NTOPUS/Kofre, Rombit, SlateSafety, iSafe/Dersalis, UiFlou): tipo, credencial, status.\n"
     "2. Adaptador por parceiro que normaliza devices/alertas/adoção num formato comum.\n"
     "3. Nasce mock; vira telemetria real quando houver credencial/API.", "B"),
]


def seed_int(force: bool = False) -> dict:
    """Semeia a trilha INT (Integração de Ferramentas & IA) como cards do plano."""
    db = SessionLocal()
    try:
        existe = db.query(ItemEvolucao).filter(
            ItemEvolucao.modulo == "Integração de Ferramentas",
            ItemEvolucao.tipo == "sprint",
        ).count()
        if existe > 0 and not force:
            return {"seeded": False, "existing": existe}
        n = 0
        for fase, titulo, desc, sub in INT_SPRINTS:
            db.add(ItemEvolucao(
                tipo="sprint", titulo=titulo, descricao=desc,
                modulo="Integração de Ferramentas", status="proposta",
                fase=fase, visibilidade=INTERNO, autor="Bernardo",
                origem="interno", origem_detalhe=f"Trilha INT · sub-trilha {sub}",
            ))
            n += 1
        db.commit()
        logger.info(f"Evolucao: trilha INT seedada ({n} sprints)")
        return {"seeded": True, "criados": n}
    finally:
        db.close()


def seed_plano(force: bool = False) -> dict:
    """Popula o acervo com o plano. Idempotente (so roda se vazio, salvo force)."""
    db = SessionLocal()
    try:
        existing = db.query(ItemEvolucao).count()
        if existing > 0 and not force:
            return {"seeded": False, "existing": existing}

        criados = 0

        for modulo, titulo, desc, vis, telas in FUNCIONALIDADES:
            db.add(ItemEvolucao(
                tipo="funcionalidade", titulo=titulo, descricao=desc,
                modulo=modulo, status="no_ar", visibilidade=vis, telas=telas,
            ))
            criados += 1

        for modulo, titulo, desc, fase, vis in SPRINTS_FEITOS:
            db.add(ItemEvolucao(
                tipo="sprint", titulo=titulo, descricao=desc, modulo=modulo,
                status="entregue", fase=fase, visibilidade=vis, autor="Rodrigo",
            ))
            criados += 1

        for modulo, titulo, desc, fase, vis in SPRINTS_ROADMAP:
            db.add(ItemEvolucao(
                tipo="sprint", titulo=titulo, descricao=desc, modulo=modulo,
                status="proposta", fase=fase, visibilidade=vis,
            ))
            criados += 1

        for modulo, titulo, desc, origem, detalhe in SUGESTOES:
            db.add(ItemEvolucao(
                tipo="sugestao", titulo=titulo, descricao=desc, modulo=modulo,
                status="nova", origem=origem, origem_detalhe=detalhe,
            ))
            criados += 1

        db.commit()
        logger.info(f"Evolucao: plano seedado ({criados} itens)")
        return {"seeded": True, "criados": criados}
    finally:
        db.close()
