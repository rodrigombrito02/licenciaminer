"""Seed do módulo de Risco Corporativo — 100% aderente a COSO ERM 2017 + ISO 31000.

Seeds:
- 5 categorias COSO (EST, OPE, FIN, REP, CON)
- 3 linhas de defesa (IIA)
- 4 projetos (Compactos, Flotação, Pilha Curtume, Samambaia)
- 7 objetivos estratégicos BSC+ESG
- ~15 riscos corporativos (13 ameaças + 2 oportunidades)
- Links risco × objetivo
- 2 snapshots trimestrais históricos
"""

from __future__ import annotations

import json
import logging
from datetime import date, timedelta

from sqlalchemy.orm import Session

from licenciaminer.riscos.models import Categoria, Pessoa, Projeto, Risco
from licenciaminer.riscos.models_corporativo import (
    CategoriaERM,
    LinhaDefesa,
    ObjetivoEstrategico,
    RiscoObjetivoLink,
    TopRiscoSnapshot,
    TopRiscoSnapshotItem,
)

logger = logging.getLogger(__name__)


CATEGORIAS_ERM = [
    ("EST", "Estratégico", "Objetivos de alto nível alinhados com a missão. Ex: mudanças competitivas, M&A, modelo de negócio.", "#dc2626", 1),
    ("OPE", "Operacional", "Uso eficaz e eficiente dos recursos. Ex: processos, pessoas, tecnologia, cadeia de suprimentos.", "#f59e0b", 2),
    ("FIN", "Financeiro", "Exposições financeiras: câmbio, crédito, liquidez, mercado, capital. Integrado com riscos COSO operacionais.", "#eab308", 3),
    ("REP", "Reportes", "Confiabilidade do reporte financeiro, operacional e não-financeiro. Ex: erro material, SOX.", "#8b5cf6", 4),
    ("CON", "Conformidade", "Aderência a leis e regulamentos aplicáveis. Ex: ANM, LGPD, CVM, antitruste, ambiental.", "#0ea5e9", 5),
]


LINHAS_DEFESA = [
    (
        1,
        "Gestão operacional (donos do risco)",
        "Primeira linha: gestores operacionais e donos de processo.",
        "Identificar, avaliar, tratar e monitorar riscos nos processos sob sua gestão. Executar controles diários. Reportar eventos e perdas.",
    ),
    (
        2,
        "Função de Riscos e Compliance",
        "Segunda linha: supervisão da gestão de riscos e conformidade.",
        "Estabelecer políticas e frameworks. Monitorar execução da 1ª linha. Coordenar ciclo ERM. Manter taxonomia e apetite. Reportar ao board.",
    ),
    (
        3,
        "Auditoria Interna",
        "Terceira linha: avaliação independente e objetiva.",
        "Avaliar design e efetividade da governança de riscos. Testar controles. Reportar ao Comitê de Auditoria. Independência de reporte ao Board.",
    ),
]


PROJETOS = [
    (
        "PROJ-COMPACTOS",
        "Projeto Compactos",
        "Implantação de planta de beneficiamento de finos e transporte via mineroduto até o Porto Sudeste. Principal iniciativa de crescimento da MUSA.",
        "em_execucao",
        date(2023, 6, 1),
        date(2027, 12, 31),
        "Antônio Neves",
        1500000000.0,
    ),
    (
        "PROJ-FLOT",
        "Maximização de Flotação",
        "Projeto de aumento de recuperação metalúrgica via otimização do circuito de flotação da planta existente. Upside de 3-5% de recuperação.",
        "em_execucao",
        date(2024, 3, 1),
        date(2026, 6, 30),
        "Juliana Costa",
        85000000.0,
    ),
    (
        "PROJ-CURTUME",
        "Pilha Curtume",
        "Disposição e gestão de rejeitos em pilha seca (stack) alternativa à barragem. Piloto Ternium metodologia.",
        "em_execucao",
        date(2024, 9, 1),
        date(2026, 12, 31),
        "Daniel Oliveira",
        220000000.0,
    ),
    (
        "PROJ-SAMAMBAIA",
        "Projeto Samambaia",
        "Expansão do depósito Samambaia com ampliação de lavra e pilha de estéril. Extensão da vida útil do empreendimento.",
        "planejamento",
        date(2025, 1, 1),
        date(2028, 12, 31),
        "Ricardo Ferreira",
        540000000.0,
    ),
]


OBJETIVOS = [
    # (codigo, descricao, perspectiva, horizonte, meta, indicador, valor, unidade, responsavel)
    ("OBJ-FIN1", "Crescer EBITDA 15% ao ano até 2030", "financeira", "longo",
     "Crescimento orgânico e por eficiência operacional", "EBITDA anual", 15.0, "% a.a.", "Marcelo Barreiro"),
    ("OBJ-FIN2", "Manter alavancagem controlada (Net Debt/EBITDA < 2x)", "financeira", "medio",
     "Disciplina financeira e geração de caixa", "Net Debt / EBITDA", 2.0, "x", "Marcelo Barreiro"),
    ("OBJ-CLI1", "Expandir participação no mercado asiático para 25%", "cliente", "longo",
     "Diversificação geográfica de clientes", "Share mercado asiático", 25.0, "%", "Rafael Torres"),
    ("OBJ-PRO1", "Visão Zero — eliminar fatalidades", "processos_internos", "curto",
     "Zero fatalidades em todas as operações", "TRIR + fatalidades", 0.0, "fatalidades", "Ricardo Ferreira"),
    ("OBJ-PRO2", "Estabilidade geotécnica 100% das barragens", "processos_internos", "curto",
     "Zero barragens em nível de alerta sustentado", "Nº barragens em alerta ≥2", 0.0, "#", "Daniel Oliveira"),
    ("OBJ-APR1", "Reter top 10% de talentos (turnover < 8%)", "aprendizado", "medio",
     "Engajamento e retenção de talentos críticos", "Turnover anualizado", 8.0, "% máx", "Felipe José dos Santos (RH)"),
    ("OBJ-ESG1", "Reduzir Scope 1+2 em 40% até 2030 vs 2020", "esg", "longo",
     "Descarbonização + energia renovável + eletrificação", "Emissões Scope 1+2 (tCO2e)", 40.0, "% redução", "Marina Magalhães"),
]


# Riscos corporativos — distintos dos de projeto MUSA
RISCOS_CORPORATIVOS = [
    # (codigo, nome, descricao, categoria_erm_codigo, horizonte, natureza, tipo_tratamento,
    #  prob_pura, imp_pura, prob_resid, imp_resid, linha_defesa_num, dono_nome, objetivos_codigos)
    ("CORP-001", "Queda sustentada do preço do minério de ferro",
     "Volatilidade severa ou queda estrutural do preço do minério (ex: recessão global, transição siderúrgica asiática).",
     "EST", "longo", "ameaca", "mitigar", 4, 5, 4, 4, 1, "Marcelo Barreiro", ["OBJ-FIN1", "OBJ-FIN2", "OBJ-CLI1"]),
    ("CORP-002", "Transição energética global (descarbonização siderúrgica)",
     "Mudança estrutural na siderurgia global (aço verde, H2 direct reduction) que reduz demanda por finos convencionais.",
     "EST", "longo", "ameaca", "explorar", 3, 5, 3, 4, 2, "Glauco Sabatini", ["OBJ-FIN1", "OBJ-CLI1", "OBJ-ESG1"]),
    ("CORP-003", "Perda de licença social em jurisdição-chave",
     "Oposição organizada de comunidades, ONGs ou MPE que inviabiliza operação em mina-chave.",
     "EST", "medio", "ameaca", "mitigar", 4, 5, 3, 4, 1, "Marina Magalhães", ["OBJ-PRO2"]),
    ("CORP-004", "Falha de governança / fraude corporativa",
     "Fraude interna, conflito de interesses não-identificado, ou falha de controles anti-suborno (CGU/FCPA).",
     "OPE", "curto", "ameaca", "mitigar", 2, 5, 2, 3, 2, "Paulo Bandeira", ["OBJ-FIN2"]),
    ("CORP-005", "Perda de capital humano crítico (sucessão)",
     "Saída de executivos-chave sem plano de sucessão estruturado, perdendo conhecimento crítico.",
     "OPE", "medio", "ameaca", "mitigar", 4, 4, 3, 3, 1, "Felipe José dos Santos (RH)", ["OBJ-APR1"]),
    ("CORP-006", "Ciberataque em sistemas corporativos",
     "Ransomware ou invasão em ERP/DWH/sistemas corporativos com exfiltração de dados ou indisponibilidade prolongada.",
     "OPE", "curto", "ameaca", "mitigar", 4, 4, 3, 3, 2, "Luciana Pereira", ["OBJ-FIN2"]),
    ("CORP-007", "Disruption na cadeia de suprimentos críticos",
     "Ruptura de fornecimento de itens críticos (diesel, energia, explosivos, pneus OTR) por eventos geopolíticos ou logísticos.",
     "OPE", "curto", "ameaca", "mitigar", 3, 4, 3, 3, 1, "Pedro Mesa", ["OBJ-FIN1"]),
    ("CORP-008", "Exposição cambial USD/BRL não protegida",
     "Volatilidade cambial significativa afetando receita (USD) vs custos (BRL) sem hedge adequado.",
     "FIN", "curto", "ameaca", "transferir", 5, 4, 3, 3, 1, "Marcelo Barreiro", ["OBJ-FIN1", "OBJ-FIN2"]),
    ("CORP-009", "Concentração de crédito em poucos clientes siderúrgicos",
     "Dependência de 3 grandes clientes asiáticos. Quebra de pagamento de um deles impacta caixa.",
     "FIN", "medio", "ameaca", "mitigar", 3, 4, 2, 3, 1, "Rafael Torres", ["OBJ-FIN2", "OBJ-CLI1"]),
    ("CORP-010", "Risco de liquidez em cenário de stress",
     "Redução de liquidez disponível em cenário de queda combinada de preço + câmbio adverso + CapEx alto.",
     "FIN", "curto", "ameaca", "mitigar", 3, 5, 2, 4, 2, "Marcelo Barreiro", ["OBJ-FIN2"]),
    ("CORP-011", "Não-conformidade com ANM (barragens, RAL, SIGBM)",
     "Descumprimento das resoluções ANM (4/2019, 95/2022) sobre barragens, relatório anual, declaração de condição.",
     "CON", "curto", "ameaca", "mitigar", 3, 5, 2, 4, 2, "Daniel Oliveira", ["OBJ-PRO2"]),
    ("CORP-012", "Não-conformidade LGPD / ANPD",
     "Vazamento de dados pessoais ou descumprimento de direitos do titular, gerando multa de até 2% do faturamento.",
     "CON", "medio", "ameaca", "mitigar", 3, 4, 2, 3, 2, "Paulo Bandeira", []),
    ("CORP-013", "Não-conformidade CVM / mercado de capitais",
     "Descumprimento de instruções CVM (cia listada). Ex: RI 586 (gestão de riscos), 480 (registro), 552 (reporte).",
     "CON", "curto", "ameaca", "mitigar", 2, 5, 2, 3, 2, "Marcelo Barreiro", ["OBJ-FIN2"]),
    ("CORP-014", "Erro material em demonstrações financeiras",
     "Falha de controles internos sobre reporte financeiro (ICFR) que resulte em restatement.",
     "REP", "curto", "ameaca", "mitigar", 2, 5, 1, 4, 3, "Camila Souza", ["OBJ-FIN2"]),
    ("CORP-015", "Exposição a riscos climáticos físicos (TCFD/IFRS S2)",
     "Eventos climáticos extremos (chuvas intensas, secas prolongadas) afetando operação e estabilidade geotécnica.",
     "EST", "longo", "ameaca", "mitigar", 4, 4, 4, 3, 1, "Daniel Oliveira", ["OBJ-PRO2", "OBJ-ESG1"]),
    # OPORTUNIDADES (ISO 31000 reconhece riscos positivos)
    ("OPOR-001", "Prêmio de carbono em produto low-CO2",
     "OPORTUNIDADE: produzir pellet feed com pegada carbono reduzida pode capturar prêmio de preço em mercado europeu (CBAM).",
     "EST", "longo", "oportunidade", "explorar", 3, 4, 3, 4, 1, "Marina Magalhães", ["OBJ-FIN1", "OBJ-CLI1", "OBJ-ESG1"]),
    ("OPOR-002", "Programa de cultura e engajamento (ESG-S)",
     "OPORTUNIDADE: investimento em cultura e engajamento pode reduzir turnover abaixo da meta, gerando vantagem competitiva.",
     "OPE", "medio", "oportunidade", "explorar", 3, 3, 3, 4, 1, "Felipe José dos Santos (RH)", ["OBJ-APR1"]),
]


def _find_pessoa(db: Session, nome: str) -> Pessoa | None:
    return db.query(Pessoa).filter_by(nome=nome).first()


def _find_or_create_pessoa(db: Session, nome: str, area: str | None = None) -> Pessoa:
    p = _find_pessoa(db, nome)
    if p:
        return p
    p = Pessoa(nome=nome, area=area)
    db.add(p)
    db.flush()
    return p


def _get_categoria_musa(db: Session) -> Categoria | None:
    """Categoria 'Outros' para riscos corporativos que não se encaixam em categorias existentes."""
    cat = db.query(Categoria).filter_by(nome="Outros").first()
    if cat:
        return cat
    return db.query(Categoria).order_by(Categoria.id).first()


def _classificar(prob: int | None, imp: int | None) -> str | None:
    """Classifica P×I usando a matriz Ternium seed (igual ao risco de projeto)."""
    from licenciaminer.riscos.services.seed_ternium import MATRIZ
    if prob is None or imp is None:
        return None
    return MATRIZ.get((prob, imp))


def seed_categorias_erm(db: Session) -> int:
    n = 0
    for codigo, nome, desc, cor, ordem in CATEGORIAS_ERM:
        if db.query(CategoriaERM).filter_by(codigo=codigo).first():
            continue
        db.add(
            CategoriaERM(
                codigo=codigo, nome=nome, descricao=desc, cor=cor, ordem=ordem
            )
        )
        n += 1
    return n


def seed_linhas_defesa(db: Session) -> int:
    n = 0
    responsaveis = {
        1: "Antônio Neves",
        2: "Camila Souza",
        3: "Paulo Bandeira",
    }
    for numero, nome, desc, resp_texto in LINHAS_DEFESA:
        if db.query(LinhaDefesa).filter_by(numero=numero).first():
            continue
        resp = _find_or_create_pessoa(db, responsaveis[numero])
        db.add(
            LinhaDefesa(
                numero=numero,
                nome=nome,
                descricao=desc,
                responsabilidades=resp_texto,
                responsavel_id=resp.id,
            )
        )
        n += 1
    return n


def seed_projetos(db: Session) -> tuple[int, dict[str, Projeto]]:
    n = 0
    por_codigo: dict[str, Projeto] = {}
    for cod, nome, desc, status, ini, fim, owner_nome, orc in PROJETOS:
        existing = db.query(Projeto).filter_by(codigo=cod).first()
        if existing:
            por_codigo[cod] = existing
            continue
        owner = _find_or_create_pessoa(db, owner_nome)
        proj = Projeto(
            codigo=cod,
            nome=nome,
            descricao=desc,
            status=status,
            data_inicio=ini,
            data_fim=fim,
            owner_id=owner.id,
            orcamento=orc,
            ativo=True,
        )
        db.add(proj)
        db.flush()
        por_codigo[cod] = proj
        n += 1
    return n, por_codigo


def migrar_riscos_existentes_para_projeto_compactos(
    db: Session, projeto_compactos: Projeto
) -> int:
    """Marca riscos MUSA/NOVO como tipo_escopo='projeto' do Compactos."""
    # Pega EST-* + NOVO-* + qualquer risco sem projeto_id que não seja corporativo
    riscos = (
        db.query(Risco)
        .filter(
            Risco.projeto_id.is_(None),
            Risco.tipo_escopo == "projeto",
        )
        .all()
    )
    n = 0
    for r in riscos:
        if r.codigo.startswith("CORP-") or r.codigo.startswith("OPOR-"):
            continue  # corporativos não migram
        r.projeto_id = projeto_compactos.id
        r.natureza = "ameaca"
        n += 1
    return n


def seed_objetivos(db: Session) -> tuple[int, dict[str, ObjetivoEstrategico]]:
    n = 0
    por_codigo: dict[str, ObjetivoEstrategico] = {}
    for cod, desc, persp, hor, meta, ind, val, unid, resp_nome in OBJETIVOS:
        existing = db.query(ObjetivoEstrategico).filter_by(codigo=cod).first()
        if existing:
            por_codigo[cod] = existing
            continue
        resp = _find_or_create_pessoa(db, resp_nome)
        obj = ObjetivoEstrategico(
            codigo=cod,
            descricao=desc,
            perspectiva_bsc=persp,
            horizonte=hor,
            meta=meta,
            indicador=ind,
            valor_meta=val,
            unidade_meta=unid,
            responsavel_id=resp.id,
            ativo=True,
        )
        db.add(obj)
        db.flush()
        por_codigo[cod] = obj
        n += 1
    return n, por_codigo


def seed_riscos_corporativos(
    db: Session,
    cats_erm: dict[str, CategoriaERM],
    linhas: dict[int, LinhaDefesa],
    objetivos: dict[str, ObjetivoEstrategico],
) -> int:
    n = 0
    categoria_generica = _get_categoria_musa(db)
    for (cod, nome, desc, cat_erm_cod, horizonte, natureza, tipo_trat,
         pp, ip, pr, ir, ld_num, dono_nome, objs) in RISCOS_CORPORATIVOS:
        if db.query(Risco).filter_by(codigo=cod).first():
            continue
        dono = _find_or_create_pessoa(db, dono_nome)
        cat_erm = cats_erm.get(cat_erm_cod)
        linha = linhas.get(ld_num)

        risco = Risco(
            codigo=cod,
            nome=nome,
            descricao=desc,
            tipo_escopo="corporativo",
            categoria_id=categoria_generica.id if categoria_generica else None,
            categoria_erm_id=cat_erm.id if cat_erm else None,
            linha_defesa_id=linha.id if linha else None,
            responsavel_id=dono.id,
            tipo_tratamento_estrategico=tipo_trat,
            horizonte=horizonte,
            natureza=natureza,
            prob_pura=pp,
            impacto_pura=ip,
            prob_residual=pr,
            impacto_residual=ir,
            classificacao_pura=_classificar(pp, ip),
            classificacao_residual=_classificar(pr, ir),
        )
        db.add(risco)
        db.flush()
        n += 1
        # Links com objetivos
        for obj_cod in objs:
            obj = objetivos.get(obj_cod)
            if not obj:
                continue
            db.add(
                RiscoObjetivoLink(
                    risco_id=risco.id,
                    objetivo_id=obj.id,
                    impacto_percebido=ir,
                )
            )
    return n


APETITES_COSO = [
    # (categoria_erm_codigo, apetite_nivel, tolerancia_classificacao, descricao, trigger)
    ("EST", 3, "MS",
     "Estratégia agressiva de crescimento tolera riscos estratégicos moderados. Reviews trimestrais pelo Comitê Estratégico.",
     "Risco residual em classificação C → acionar Comitê Estratégico + Board."),
    ("OPE", 2, "S",
     "Operações têm apetite baixo: incidentes operacionais graves são inaceitáveis. Foco em Visão Zero para SST.",
     "Fatalidade ou incidente > US$ 5M → acionamento do Comitê de Crise + CEO."),
    ("FIN", 3, "MS",
     "Exposição financeira moderada é parte do negócio (câmbio, mercado). Hedge estruturado obrigatório acima de limites.",
     "Perda > 2% da receita trimestral → reporte ao Comitê Financeiro."),
    ("REP", 1, "PS",
     "Tolerância MUITO BAIXA a erros de reporte financeiro. Restatement é inaceitável.",
     "Qualquer identificação de erro material → Comitê de Auditoria em 48h."),
    ("CON", 1, "S",
     "Conformidade com regulação (ANM, CVM, LGPD) é mandatória. Zero tolerância a não-conformidade sistêmica.",
     "Notificação formal de órgão regulador → Jurídico + CCO em 24h."),
]


def seed_apetites_coso(db: Session) -> int:
    """Popula apetites formais por categoria COSO ERM."""
    from licenciaminer.riscos.models_monitoramento import RiskAppetite
    from datetime import date as _date

    cats = {c.codigo: c for c in db.query(CategoriaERM).all()}
    aprovador = _find_pessoa(db, "Camila Souza") or _find_pessoa(db, "Marcelo Barreiro")
    n = 0
    for cat_cod, nivel, tol, desc, trigger in APETITES_COSO:
        cat = cats.get(cat_cod)
        if not cat:
            continue
        existe = (
            db.query(RiskAppetite)
            .filter_by(categoria_erm_id=cat.id, escopo="por_categoria_erm")
            .first()
        )
        if existe:
            continue
        db.add(
            RiskAppetite(
                categoria_erm_id=cat.id,
                escopo="por_categoria_erm",
                apetite_nivel=nivel,
                tolerancia_max_classificacao=tol,
                descricao=desc,
                trigger_escalation=trigger,
                data_aprovacao=_date(2024, 9, 1),
                aprovador_id=aprovador.id if aprovador else None,
                ativo=True,
            )
        )
        n += 1
    return n


def seed_snapshots_historicos(db: Session) -> int:
    """Cria 2 snapshots históricos (trimestres passados) para demonstrar evolução."""
    if db.query(TopRiscoSnapshot).count() > 0:
        return 0

    today = date.today()
    # Q-2 e Q-1 (2 trimestres atrás)
    n_snapshots = 0
    for i, (offset_months, titulo, periodo) in enumerate([
        (6, "Snapshot 2025 Q4 — Reporte ao Board", "Q4-2025"),
        (3, "Snapshot 2026 Q1 — Reporte ao Board", "Q1-2026"),
    ]):
        data_snap = today.replace(day=1) - timedelta(days=offset_months * 30)
        snap = TopRiscoSnapshot(
            data_snapshot=data_snap,
            titulo=titulo,
            periodo=periodo,
            tipo_escopo="corporativo",
            gerado_por="Camila Souza (CRO)",
            observacoes=(
                "Snapshot histórico criado automaticamente como seed para "
                "demonstração de evolução trimestral."
            ),
        )
        db.add(snap)
        db.flush()

        # Captura top 10 riscos corporativos ATUAIS (sabemos que serão similares)
        # Em produção, captura no momento; aqui usamos os dados atuais.
        corp_riscos = (
            db.query(Risco)
            .filter_by(tipo_escopo="corporativo")
            .all()
        )
        # Ordena por score (prob_residual × impacto_residual)
        ranked = sorted(
            corp_riscos,
            key=lambda r: (r.prob_residual or 0) * (r.impacto_residual or 0),
            reverse=True,
        )[:10]
        for pos, r in enumerate(ranked, start=1):
            # Varia um pouco para simular evolução (snapshot 1 tinha dados ligeiramente diferentes)
            variacao = 0 if i == 1 else (1 if pos % 3 == 0 else 0)
            prob_snap = max(1, min(5, (r.prob_residual or 3) - variacao))
            db.add(
                TopRiscoSnapshotItem(
                    snapshot_id=snap.id,
                    risco_id=r.id,
                    posicao=pos,
                    classificacao_residual=r.classificacao_residual,
                    prob_residual=prob_snap,
                    impacto_residual=r.impacto_residual,
                    score=prob_snap * (r.impacto_residual or 0),
                    acoes_abertas=0,
                    acoes_atrasadas=0,
                )
            )
        n_snapshots += 1
    return n_snapshots


def seed_corporativo(db: Session) -> dict[str, int]:
    """Ponto de entrada — popula tudo relacionado ao módulo corporativo."""
    cats_criadas = seed_categorias_erm(db)
    cats_erm = {c.codigo: c for c in db.query(CategoriaERM).all()}

    linhas_criadas = seed_linhas_defesa(db)
    linhas = {l.numero: l for l in db.query(LinhaDefesa).all()}

    projetos_criados, projetos = seed_projetos(db)
    db.commit()

    # Migra riscos MUSA para pertencer ao Projeto Compactos
    proj_compactos = projetos.get("PROJ-COMPACTOS") or db.query(Projeto).filter_by(codigo="PROJ-COMPACTOS").first()
    migrados = (
        migrar_riscos_existentes_para_projeto_compactos(db, proj_compactos)
        if proj_compactos
        else 0
    )
    db.commit()

    objs_criados, objetivos = seed_objetivos(db)
    db.commit()

    riscos_criados = seed_riscos_corporativos(db, cats_erm, linhas, objetivos)
    db.commit()

    apetites_coso = seed_apetites_coso(db)
    db.commit()

    snapshots_criados = seed_snapshots_historicos(db)
    db.commit()

    return {
        "categorias_erm": cats_criadas,
        "linhas_defesa": linhas_criadas,
        "projetos": projetos_criados,
        "riscos_migrados_para_projeto": migrados,
        "objetivos_estrategicos": objs_criados,
        "riscos_corporativos": riscos_criados,
        "apetites_coso": apetites_coso,
        "snapshots_historicos": snapshots_criados,
    }
