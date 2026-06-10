"""Seed de KRIs, testes históricos de controles e declarações de apetite."""

from __future__ import annotations

import random
from datetime import date, timedelta

from sqlalchemy.orm import Session

from licenciaminer.riscos.models import Categoria, Controle, Pessoa, Risco
from licenciaminer.riscos.models_monitoramento import (
    KRI,
    KRIMedicao,
    RiskAppetite,
    TesteControle,
)


def _classificar_medicao(kri: KRI, valor: float) -> str:
    """Calcula status verde/amarelo/vermelho do valor em função da direção e thresholds."""
    if kri.direcao == "subir_pior":
        if kri.limite_vermelho is not None and valor >= kri.limite_vermelho:
            return "vermelho"
        if kri.limite_amarelo is not None and valor >= kri.limite_amarelo:
            return "amarelo"
        return "verde"
    else:  # descer_pior
        if kri.limite_vermelho is not None and valor <= kri.limite_vermelho:
            return "vermelho"
        if kri.limite_amarelo is not None and valor <= kri.limite_amarelo:
            return "amarelo"
        return "verde"


KRIS_SEMENTE = [
    {
        "codigo": "KRI-01",
        "nome": "Não-conformidades ambientais por mês",
        "descricao": "Número de não-conformidades ambientais identificadas em auditorias e inspeções.",
        "risco_heur": "MAM",
        "categoria_nome": "Ambiental",
        "responsavel": "Beatriz Martins",
        "unidade": "#",
        "formula": "Contagem de NCs classificadas como ambientais nos últimos 30 dias.",
        "direcao": "subir_pior",
        "limite_verde": 0,
        "limite_amarelo": 3,
        "limite_vermelho": 5,
        "periodicidade": "mensal",
        "serie_base": [1, 2, 2, 4, 3, 6, 5, 4, 7, 6, 5, 4],  # últimos 12 meses (mais recente por último)
    },
    {
        "codigo": "KRI-02",
        "nome": "Prazo médio de renovação de licença (dias)",
        "descricao": "Dias médios entre o pedido de renovação e a publicação da licença.",
        "risco_heur": "MAM",
        "categoria_nome": "Ambiental",
        "responsavel": "Marina Magalhães",
        "unidade": "dias",
        "formula": "Média aritmética dos prazos dos últimos 12 meses.",
        "direcao": "subir_pior",
        "limite_verde": 180,
        "limite_amarelo": 300,
        "limite_vermelho": 450,
        "periodicidade": "trimestral",
        "serie_base": [220, 240, 280, 320, 350, 400, 380, 360, 320, 310, 295, 280],
    },
    {
        "codigo": "KRI-03",
        "nome": "Turnover em Operações (%)",
        "descricao": "Taxa de rotatividade anualizada no time operacional.",
        "risco_heur": "RH",
        "categoria_nome": "Governança / RH",
        "responsavel": "Felipe José dos Santos (RH)",
        "unidade": "%",
        "formula": "(Desligamentos últimos 12 meses / Headcount médio) × 100",
        "direcao": "subir_pior",
        "limite_verde": 8,
        "limite_amarelo": 12,
        "limite_vermelho": 18,
        "periodicidade": "mensal",
        "serie_base": [6, 7, 8, 9, 10, 11, 13, 14, 12, 11, 10, 9],
    },
    {
        "codigo": "KRI-04",
        "nome": "Barragens em nível de alerta ≥ 2",
        "descricao": "Número de barragens com instrumentação em nível de alerta 2 ou 3.",
        "risco_heur": "SEG",
        "categoria_nome": "Planta física / Processo",
        "responsavel": "Daniel Oliveira",
        "unidade": "#",
        "formula": "Contagem de barragens com leituras no último mês indicando alerta ≥ 2.",
        "direcao": "subir_pior",
        "limite_verde": 0,
        "limite_amarelo": 1,
        "limite_vermelho": 2,
        "periodicidade": "semanal",
        "serie_base": [0, 0, 0, 1, 1, 0, 0, 1, 0, 0, 0, 1],
    },
    {
        "codigo": "KRI-05",
        "nome": "Taxa de execução do plano de ações (%)",
        "descricao": "Percentual das ações do plano que estão no prazo ou concluídas.",
        "risco_heur": None,
        "categoria_nome": None,
        "responsavel": "Guilherme Melo",
        "unidade": "%",
        "formula": "(Ações concluídas no prazo + em andamento no prazo) / Total planejado",
        "direcao": "descer_pior",
        "limite_verde": 85,
        "limite_amarelo": 70,
        "limite_vermelho": 55,
        "periodicidade": "mensal",
        "serie_base": [70, 72, 68, 65, 60, 62, 66, 72, 75, 78, 80, 82],
    },
    {
        "codigo": "KRI-06",
        "nome": "Ações atrasadas (#)",
        "descricao": "Número absoluto de ações com prazo vencido e não concluídas.",
        "risco_heur": None,
        "categoria_nome": None,
        "responsavel": "Guilherme Melo",
        "unidade": "#",
        "formula": "Contagem de ações com data_fim < hoje e status != concluida.",
        "direcao": "subir_pior",
        "limite_verde": 10,
        "limite_amarelo": 25,
        "limite_vermelho": 40,
        "periodicidade": "mensal",
        "serie_base": [20, 22, 28, 30, 35, 42, 45, 40, 38, 35, 40, 40],
    },
    {
        "codigo": "KRI-07",
        "nome": "Eventos de reação comunitária relatados",
        "descricao": "Número de manifestações, reclamações formais ou bloqueios registrados.",
        "risco_heur": "REC",
        "categoria_nome": "Licenciamento e Comunidades",
        "responsavel": "Marina Magalhães",
        "unidade": "#",
        "formula": "Contagem do CRM de relações com comunidades, últimos 30 dias.",
        "direcao": "subir_pior",
        "limite_verde": 2,
        "limite_amarelo": 5,
        "limite_vermelho": 8,
        "periodicidade": "mensal",
        "serie_base": [3, 4, 3, 5, 6, 7, 9, 8, 6, 5, 4, 6],
    },
    {
        "codigo": "KRI-08",
        "nome": "Disponibilidade do sistema SCADA (%)",
        "descricao": "Tempo de disponibilidade do sistema de controle operacional.",
        "risco_heur": "TI",
        "categoria_nome": "TI / Informação",
        "responsavel": "Luciana Pereira",
        "unidade": "%",
        "formula": "Minutos disponíveis / Minutos totais no mês × 100.",
        "direcao": "descer_pior",
        "limite_verde": 99.5,
        "limite_amarelo": 98.5,
        "limite_vermelho": 97,
        "periodicidade": "mensal",
        "serie_base": [99.8, 99.7, 99.5, 98.9, 99.2, 98.3, 97.8, 99.4, 99.6, 99.7, 99.8, 99.6],
    },
    {
        "codigo": "KRI-09",
        "nome": "Desvios de cronograma do Projeto Compactos (dias)",
        "descricao": "Aderência cumulativa do cronograma em relação à baseline.",
        "risco_heur": "ENG",
        "categoria_nome": "Implantação e CapEx",
        "responsavel": "Paulo Bandeira",
        "unidade": "dias",
        "formula": "Somatório dos atrasos acumulados nos marcos principais.",
        "direcao": "subir_pior",
        "limite_verde": 15,
        "limite_amarelo": 45,
        "limite_vermelho": 90,
        "periodicidade": "mensal",
        "serie_base": [10, 15, 20, 25, 30, 40, 55, 60, 65, 70, 75, 80],
    },
    {
        "codigo": "KRI-10",
        "nome": "TRIR — Total Recordable Incident Rate",
        "descricao": "Taxa de incidentes registráveis por milhão de horas trabalhadas.",
        "risco_heur": "SEG",
        "categoria_nome": "Governança / RH",
        "responsavel": "Ricardo Ferreira",
        "unidade": "TRIR",
        "formula": "(# de incidentes registráveis × 1.000.000) / HHT",
        "direcao": "subir_pior",
        "limite_verde": 1.5,
        "limite_amarelo": 3.0,
        "limite_vermelho": 5.0,
        "periodicidade": "mensal",
        "serie_base": [1.2, 1.4, 1.8, 2.1, 2.0, 2.3, 2.8, 2.5, 2.4, 2.2, 2.0, 1.9],
    },
]


APETITES = [
    {
        "escopo": "por_categoria",
        "categoria_nome": "Ambiental",
        "apetite_nivel": 2,
        "tolerancia_max_classificacao": "S",
        "descricao": (
            "A organização é **avessa** a riscos ambientais. Nenhum risco ambiental "
            "pode permanecer classificado como Muito Significativo ou Crítico — "
            "tratamento imediato obrigatório."
        ),
        "trigger_escalation": "Qualquer risco ambiental em MS/C → notificação imediata à Diretoria SSMA e CEO.",
        "data_aprovacao": date(2024, 9, 1),
        "aprovador": "Marina Magalhães",
    },
    {
        "escopo": "por_categoria",
        "categoria_nome": "Licenciamento e Comunidades",
        "apetite_nivel": 2,
        "tolerancia_max_classificacao": "S",
        "descricao": (
            "Impactos em licenças operacionais ou relação com comunidades são "
            "inaceitáveis em níveis altos. Priorizamos diálogo preventivo."
        ),
        "trigger_escalation": "Classificação residual em MS/C → Diretoria de Comunidades + CEO em 24h.",
        "data_aprovacao": date(2024, 9, 1),
        "aprovador": "Marina Magalhães",
    },
    {
        "escopo": "por_categoria",
        "categoria_nome": "Governança / RH",
        "apetite_nivel": 3,
        "tolerancia_max_classificacao": "MS",
        "descricao": (
            "Risco operacional em segurança do trabalho é tratado como Visão Zero. "
            "Tolerância ZERO para fatalidades. Incidentes pequenos são analisados."
        ),
        "trigger_escalation": "Fatalidade → acionamento imediato do Comitê Estratégico de Crise.",
        "data_aprovacao": date(2024, 9, 1),
        "aprovador": "Ricardo Ferreira",
    },
    {
        "escopo": "por_categoria",
        "categoria_nome": "Planta física / Processo",
        "apetite_nivel": 2,
        "tolerancia_max_classificacao": "S",
        "descricao": (
            "Riscos estruturais em barragens e estruturas críticas têm apetite "
            "muito baixo. Monitoramento 24×7."
        ),
        "trigger_escalation": "Qualquer barragem em nível de alerta ≥ 2 → Comitê de Crise.",
        "data_aprovacao": date(2024, 9, 1),
        "aprovador": "Daniel Oliveira",
    },
    {
        "escopo": "por_categoria",
        "categoria_nome": "Financeiro",
        "apetite_nivel": 4,
        "tolerancia_max_classificacao": "MS",
        "descricao": (
            "Exposição cambial, crédito e mercado são inerentes ao negócio. "
            "Tolerância moderada, com hedge estruturado."
        ),
        "trigger_escalation": "Perda de liquidez > 30 dias → Comitê Financeiro.",
        "data_aprovacao": date(2024, 9, 1),
        "aprovador": "Marcelo Barreiro",
    },
    {
        "escopo": "por_categoria",
        "categoria_nome": "Implantação e CapEx",
        "apetite_nivel": 3,
        "tolerancia_max_classificacao": "MS",
        "descricao": (
            "Desvios moderados de cronograma e orçamento são aceitos desde que "
            "contingenciados. Estouro > 20% requer aprovação do Comitê Estratégico."
        ),
        "trigger_escalation": "Desvio de cronograma > 90 dias → review com acionistas.",
        "data_aprovacao": date(2024, 9, 1),
        "aprovador": "Paulo Bandeira",
    },
    {
        "escopo": "por_categoria",
        "categoria_nome": "Estratégia e Mercados",
        "apetite_nivel": 4,
        "tolerancia_max_classificacao": "MS",
        "descricao": (
            "Estratégia de crescimento em mercado volátil exige tolerância "
            "maior. Revisão trimestral."
        ),
        "trigger_escalation": "Queda > 30% no preço do minério por trimestre → revisão estratégica.",
        "data_aprovacao": date(2024, 9, 1),
        "aprovador": "Glauco Sabatini",
    },
    {
        "escopo": "por_categoria",
        "categoria_nome": "TI / Informação",
        "apetite_nivel": 2,
        "tolerancia_max_classificacao": "S",
        "descricao": (
            "Cibersegurança tem apetite muito baixo. Disponibilidade de SCADA é "
            "crítica — parada > 2h é inaceitável."
        ),
        "trigger_escalation": "Indisponibilidade SCADA > 2h ou vazamento de dados → comitê TI + jurídico.",
        "data_aprovacao": date(2024, 9, 1),
        "aprovador": "Luciana Pereira",
    },
]


def _find_pessoa(db: Session, nome: str) -> Pessoa | None:
    return db.query(Pessoa).filter_by(nome=nome).first()


def _find_or_create_pessoa(db: Session, nome: str) -> Pessoa:
    p = _find_pessoa(db, nome)
    if p:
        return p
    p = Pessoa(nome=nome)
    db.add(p)
    db.flush()
    return p


def _find_categoria(db: Session, nome: str | None) -> Categoria | None:
    if not nome:
        return None
    return db.query(Categoria).filter_by(nome=nome).first()


def _find_risco_por_heuristica(db: Session, substring: str | None) -> Risco | None:
    if not substring:
        return None
    return db.query(Risco).filter(Risco.codigo.like(f"%-{substring}-%")).first()


def seed_monitoramento(db: Session) -> dict[str, int]:
    """Popula KRIs com medições históricas, apetites por categoria e testes de controles."""
    kri_count = 0
    med_count = 0
    apt_count = 0
    teste_count = 0

    today = date.today()

    # --- KRIs ---
    for spec in KRIS_SEMENTE:
        if db.query(KRI).filter_by(codigo=spec["codigo"]).first():
            continue
        responsavel = _find_or_create_pessoa(db, spec["responsavel"])
        risco = _find_risco_por_heuristica(db, spec.get("risco_heur"))
        categoria = _find_categoria(db, spec.get("categoria_nome"))
        kri = KRI(
            codigo=spec["codigo"],
            nome=spec["nome"],
            descricao=spec["descricao"],
            risco_id=risco.id if risco else None,
            categoria_id=categoria.id if categoria else None,
            responsavel_id=responsavel.id,
            unidade=spec["unidade"],
            formula_descricao=spec["formula"],
            direcao=spec["direcao"],
            limite_verde=spec["limite_verde"],
            limite_amarelo=spec["limite_amarelo"],
            limite_vermelho=spec["limite_vermelho"],
            periodicidade=spec["periodicidade"],
            fonte_dados="Interno — sistema de monitoramento",
        )
        db.add(kri)
        db.flush()
        kri_count += 1

        # Determinar intervalo entre medições
        intervalo_dias = {
            "diaria": 1,
            "semanal": 7,
            "mensal": 30,
            "trimestral": 90,
            "semestral": 180,
            "anual": 365,
        }.get(spec["periodicidade"], 30)

        serie = spec["serie_base"]
        n = len(serie)
        for i, valor in enumerate(serie):
            dias_atras = (n - 1 - i) * intervalo_dias
            data_med = today - timedelta(days=dias_atras)
            status = _classificar_medicao(kri, valor)
            db.add(
                KRIMedicao(
                    kri_id=kri.id,
                    data=data_med,
                    valor=valor,
                    status=status,
                    registrado_por_id=responsavel.id,
                )
            )
            med_count += 1

    # --- Apetites ---
    for spec in APETITES:
        if (
            db.query(RiskAppetite)
            .filter_by(
                categoria_id=(
                    _find_categoria(db, spec["categoria_nome"]).id
                    if _find_categoria(db, spec["categoria_nome"])
                    else None
                )
            )
            .first()
        ):
            continue
        aprovador = _find_pessoa(db, spec["aprovador"])
        categoria = _find_categoria(db, spec["categoria_nome"])
        apt = RiskAppetite(
            escopo=spec["escopo"],
            categoria_id=categoria.id if categoria else None,
            apetite_nivel=spec["apetite_nivel"],
            tolerancia_max_classificacao=spec["tolerancia_max_classificacao"],
            descricao=spec["descricao"],
            trigger_escalation=spec["trigger_escalation"],
            data_aprovacao=spec["data_aprovacao"],
            aprovador_id=aprovador.id if aprovador else None,
            ativo=True,
        )
        db.add(apt)
        apt_count += 1

    # --- Testes históricos de controles ---
    # Para controles com efetividade alta, gerar 2 testes passados "aprovado";
    # para média, 1 "aprovado" + 1 "parcial"; para baixa, 1 "parcial".
    # Apenas um sample (30 controles) para não inflar demais.
    if db.query(TesteControle).count() == 0:
        controles = db.query(Controle).limit(30).all()
        random.seed(42)
        for ctrl in controles:
            ef = ctrl.efetividade or 3
            n_testes = 3 if ef >= 4 else 2 if ef >= 3 else 1
            for k in range(n_testes):
                dias_atras = 30 + k * 90 + random.randint(0, 15)
                data_t = today - timedelta(days=dias_atras)
                if ef >= 4:
                    status = "aprovado"
                elif ef >= 3:
                    status = "aprovado" if k == 0 else random.choice(["aprovado", "parcial"])
                else:
                    status = random.choice(["parcial", "reprovado"])
                gaps = None if status == "aprovado" else "Procedimento documentado mas evidência inconsistente."
                db.add(
                    TesteControle(
                        controle_id=ctrl.id,
                        data_teste=data_t,
                        status=status,
                        metodologia="Walkthrough + amostragem de evidências (n=5)",
                        evidencia="Planilha Controle-{} · última revisão documental arquivada em /docs/controles/{}.pdf".format(
                            ctrl.id, ctrl.id
                        ),
                        gaps_identificados=gaps,
                        plano_acao_remediacao=(
                            "Reforço de treinamento + revisão de procedimento em 90 dias."
                            if status != "aprovado"
                            else None
                        ),
                        executor_id=ctrl.responsavel_id,
                    )
                )
                teste_count += 1
            # Atualiza último_teste do controle para a data mais recente criada
            ctrl.ultimo_teste = today - timedelta(days=30)
            ctrl.status_teste = (
                "aprovado" if ef >= 4 else ("parcial" if ef >= 3 else "reprovado")
            )

    db.commit()
    return {
        "kris": kri_count,
        "medicoes": med_count,
        "apetites": apt_count,
        "testes_controles": teste_count,
    }
