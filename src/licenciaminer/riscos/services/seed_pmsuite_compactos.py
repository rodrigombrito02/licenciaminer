"""Seed do piloto Summo PM Suite para o Projeto Compactos.

Contexto fictício mas realista:
- Planta greenfield de beneficiamento de minério de ferro
- Capacidade: 6,3 Mtpa com ROM compacto
- Rota: britador giratório → moinho SAG → flotação → remoagem → flotação
- Rejeito: pilha curtume (seca) + filtragem
- Infra: portarias, acessos, pilhas de produto com carregamento em caminhões
- Linha de transmissão: contrato de terceiros
- Marcos: Aprovação Fev/2027, Start-up Jul/2030
- Pacotes críticos long-lead: Moinho SAG, britador, correias, eletrocentro,
  transformadores, subestação, células/colunas de flotação, bombas de polpa
"""

from __future__ import annotations

from datetime import date

from sqlalchemy.orm import Session

from licenciaminer.riscos.models import Pessoa, Projeto
from licenciaminer.riscos.models_pmsuite import (
    ChangeRequest,
    DecisionLog,
    Deliverable,
    ProjectBaseline,
    ProjectCharter,
    WBSNode,
)


CHARTER_COMPACTOS = {
    "justificativa": (
        "Expansão do portfólio de produtos MUSA para capturar demanda crescente "
        "por minério de ferro de alta qualidade. O Projeto Compactos viabiliza o "
        "beneficiamento de ROM compacto (atualmente subutilizado), aumentando em "
        "6,3 Mtpa a capacidade de produção e diversificando a oferta de produtos "
        "(sinter feed e pellet feed) para o mercado internacional."
    ),
    "business_case": (
        "Investimento: R$ 1,5 bilhão (CAPEX) + R$ 300M contingência.\n"
        "Payback estimado: 4,2 anos em cenário base (preço médio 85 USD/t CFR China).\n"
        "TIR real: 14,5% após impostos.\n"
        "VPL: R$ 2,1 bilhões (taxa de desconto 9% real).\n"
        "Horizonte de operação: 18 anos com reserva provada atual.\n"
        "Pay-back em cenário conservador (75 USD/t): 5,7 anos."
    ),
    "objetivo_smart": (
        "Implantar planta de beneficiamento de minério de ferro compacto com "
        "capacidade nominal de 6,3 Mtpa de produto (sinter + pellet feed) até "
        "julho de 2030, dentro do orçamento aprovado de R$ 1,8 bilhões (CAPEX + "
        "contingência), atingindo disponibilidade operacional ≥ 88% no primeiro "
        "ano de operação plena (2031)."
    ),
    "beneficios_esperados": (
        "1. Aumento de 35% na receita de minério de ferro (4,2 → 5,7 B BRL/ano)\n"
        "2. Diversificação de produtos: pellet feed com prêmio de preço (+5-8 USD/t)\n"
        "3. Redução de 12% no custo médio de produção (C1) via ganho de escala\n"
        "4. Aproveitamento de ROM compacto antes descartado (ESG-S)\n"
        "5. Extensão da vida útil da mina em 18 anos\n"
        "6. Geração de 1.200 empregos diretos em operação + 3.500 na construção\n"
        "7. Alinhamento com meta ESG: produto low-CO2 em rotas com H2 (CBAM-ready)"
    ),
    "escopo_incluido": (
        "- Planta de beneficiamento greenfield (britagem, moagem SAG, flotação, remoagem)\n"
        "- Disposição de rejeito em pilha seca (Pilha Curtume) + planta de filtragem\n"
        "- Infraestrutura: portarias, acessos internos, cercamento, utilidades\n"
        "- Manuseio e estocagem de produto + sistema de carregamento em caminhões\n"
        "- Subestação elétrica principal + eletrocentros\n"
        "- Sistema de automação, SCADA e controle\n"
        "- Laboratório, oficinas, sala de controle, prédios administrativos\n"
        "- Comissionamento, start-up e ramp-up até capacidade nominal\n"
        "- Licenciamento ambiental (LP, LI, LO)"
    ),
    "escopo_excluido": (
        "- Expansão do mineroduto (projeto separado MINEROD-02)\n"
        "- Ampliação do Porto Sudeste (contrato do operador portuário)\n"
        "- Linha de transmissão 230 kV — executada por empresa terceirizada (único pacote EPC turn-key do projeto)\n"
        "- Expansão da lavra (projeto MINA-EXP no portfolio)\n"
        "- Atividades de pesquisa e desenvolvimento de produto\n\n"
        "**Modalidade de execução**: EPCM DESCENTRALIZADO\n"
        "E (Engenharia) = terceiros em pacotes por disciplina\n"
        "P (Procurement/Suprimentos) = interno (time próprio MUSA)\n"
        "C (Construção) = terceiros em pacotes de obra\n"
        "M (Montagem) = interno descentralizado com suporte de contratados\n"
        "Gerenciamento: gerenciadora externa respondendo a lideranças de disciplinas internas MUSA."
    ),
    "entregaveis_principais": (
        "1. Planta operando a 88% de disponibilidade com produto nas especs comerciais\n"
        "2. Pilha Curtume operacional com licença LO emitida\n"
        "3. Planta de filtragem de rejeito em operação contínua\n"
        "4. Sistema de carregamento de produto homologado\n"
        "5. Linha de transmissão energizada (fornecida por terceiro)\n"
        "6. Subestação e sistema elétrico comissionados\n"
        "7. Estudos ambientais aprovados e condicionantes atendidas\n"
        "8. Pessoal operacional treinado e certificado\n"
        "9. Documentação as-built completa + manuais de operação"
    ),
    "premissas": (
        "- Outorga de uso de recursos hídricos renovada tempestivamente\n"
        "- Preço médio do minério ≥ 80 USD/t CFR ao longo do horizonte\n"
        "- Câmbio médio projetado: 5,20 BRL/USD\n"
        "- Recursos humanos locais disponíveis para contratação\n"
        "- Estabilidade regulatória (sem mudanças disruptivas em mineração/ambiental)\n"
        "- Fornecimento de energia pela concessionária conforme cronograma contratado\n"
        "- Cronograma de licenciamento ambiental sem bloqueios jurídicos"
    ),
    "restricoes": (
        "- Orçamento CAPEX limitado a R$ 1,8 B (incluindo contingência de 20%)\n"
        "- Start-up comercial obrigatório até Julho/2030 (compromisso com off-takers)\n"
        "- Aprovação final do projeto em reunião de Board em Fev/2027 — gate\n"
        "- Pegada de carbono do produto ≤ 15 kgCO2/t para elegibilidade CBAM\n"
        "- Nenhuma fatalidade durante a construção (Visão Zero — tolerância zero)\n"
        "- Fornecedores de equipamentos críticos pré-qualificados apenas"
    ),
    "criterios_sucesso": (
        "✓ On-time: first-ore até Jul/2030\n"
        "✓ On-budget: CAPEX realizado ≤ 1,8 B BRL\n"
        "✓ On-spec: pellet feed dentro de 66% Fe, SiO2 ≤ 2%, P ≤ 0,06%\n"
        "✓ On-safety: zero fatalidades na construção\n"
        "✓ Disponibilidade ≥ 88% no primeiro ano de operação plena\n"
        "✓ Todas as condicionantes ambientais atendidas no prazo"
    ),
    "criterios_aceitacao": (
        "Entrega aceita pelo Sponsor apenas após: comissionamento quente concluído, "
        "certificação ASME/NR-13 dos principais vasos, licença de operação (LO) "
        "emitida, teste de aceitação de performance (30 dias a 100% da capacidade), "
        "e treinamento/certificação completo do time operacional."
    ),
    "orcamento_total": 1_500_000_000.0,
    "orcamento_contingencia": 300_000_000.0,
    "data_aprovacao_charter": date(2023, 6, 15),
    "data_inicio": date(2023, 6, 1),
    "data_termino": date(2030, 12, 31),
    "sponsor_nome": "Antônio Neves",
    "gerente_nome": "Paulo Bandeira",
    "aprovador_nome": "Marcelo Barreiro",
    "comite_steering": (
        "- Antônio Neves (Sponsor / Diretor de Operações)\n"
        "- Paulo Bandeira (Gerente do Projeto)\n"
        "- Marcelo Barreiro (Diretor Financeiro)\n"
        "- Marina Magalhães (Diretora SSMA e Comunidades)\n"
        "- Fernando Alves (Diretor Técnico)\n"
        "- Glauco Sabatini (Diretor RI)\n"
        "Reuniões mensais — primeiras quintas de cada mês."
    ),
}


# ---------------------------------------------------------------------------
# WBS — estrutura 3 níveis com ~65 nós
# Formato: (codigo, nome, nivel, tipo, pai_codigo, is_critico, is_long_lead,
#           is_marco, is_terceirizado, orcamento_milhoes, duracao_meses)
# ---------------------------------------------------------------------------


# WBS_ESTRUTURA: cada tupla tem os campos padrão + tupla extra (disciplina_epcm, executor,
# is_servico_contratado). Quando is_servico_contratado=True, aplicam-se os ciclos padrão
# de 150 dias (suprimentos) + 45 dias (mobilização) — definidos no próprio seed.

# WBS — modalidade EPCM descentralizado (E+C externos; P+M internos com gerenciadora).
# Cada tupla: (codigo, nome, nivel, tipo, parent_codigo, is_critico, is_long_lead,
#             is_marco, is_terceirizado, orc_milhoes, duracao_meses,
#             disciplina_epcm, executor, is_servico_contratado)
# Quando is_servico_contratado=True, aplicam-se os ciclos 150 dias suprimentos + 45 dias mobilização.

WBS_ESTRUTURA = [
    # NÍVEL 1 — FASES
    ("1", "Engenharia e Gestão do Projeto", 1, "fase", None, True, False, False, False, 330, 84, "E", "hibrido", False),
    ("2", "Licenciamento e Autorizações", 1, "fase", None, True, False, False, False, 35, 78, None, "interno", False),
    ("3", "Pacotes de Construção (C)", 1, "fase", None, True, False, False, False, 320, 42, "C", "terceiro", True),
    ("4", "Britagem Primária", 1, "fase", None, True, True, False, False, 180, 30, None, "hibrido", False),
    ("5", "Moagem e Classificação", 1, "fase", None, True, True, False, False, 280, 36, None, "hibrido", False),
    ("6", "Flotação e Reagentes", 1, "fase", None, True, True, False, False, 140, 30, None, "hibrido", False),
    ("7", "Filtragem e Espessamento de Rejeito", 1, "fase", None, False, False, False, False, 85, 24, None, "hibrido", False),
    ("8", "Disposição de Rejeito (Pilha Curtume)", 1, "fase", None, True, False, False, False, 95, 36, None, "hibrido", False),
    ("9", "Manuseio e Estocagem de Produto", 1, "fase", None, False, False, False, False, 65, 24, None, "hibrido", False),
    ("10", "Infraestrutura Elétrica", 1, "fase", None, True, True, False, False, 200, 42, None, "hibrido", False),
    ("11", "Utilidades", 1, "fase", None, False, False, False, False, 50, 18, None, "hibrido", False),
    ("12", "Sistemas Auxiliares e Edificações", 1, "fase", None, False, False, False, False, 70, 24, None, "hibrido", False),
    ("13", "Automação e Controle", 1, "fase", None, False, False, False, False, 60, 24, None, "hibrido", False),
    ("14", "Montagem Eletromecânica (M)", 1, "fase", None, True, False, False, False, 240, 30, "M", "terceiro", True),
    ("15", "Comissionamento e Start-up", 1, "fase", None, True, False, False, False, 40, 12, None, "hibrido", False),
    ("16", "Contingência e Reservas", 1, "fase", None, False, False, False, False, 300, None, None, None, False),

    # --- 1. Engenharia e Gestão — pacotes descentralizados ---
    # ENGENHARIA (E) — contratos externos por disciplina (fast-tracking: durações reduzidas vs benchmark conservador)
    ("1.1", "Engenharia Básica (FEL3)", 2, "deliverable", "1", True, False, False, False, 45, 10, "E", "terceiro", True),
    ("1.2", "Engenharia Detalhada — Processo/Mecânica", 2, "work_package", "1", True, False, False, False, 45, 20, "E", "terceiro", True),
    ("1.3", "Engenharia Detalhada — Elétrica e Automação", 2, "work_package", "1", True, False, False, False, 35, 20, "E", "terceiro", True),
    ("1.4", "Engenharia Detalhada — Civil/Estrutural", 2, "work_package", "1", False, False, False, False, 28, 18, "E", "terceiro", True),
    ("1.5", "Engenharia Detalhada — Tubulação e Layout", 2, "work_package", "1", False, False, False, False, 22, 18, "E", "terceiro", True),
    # GERENCIADORA + PMO INTERNO
    ("1.6", "Gerenciadora do Projeto (PMO externo)", 2, "work_package", "1", True, False, False, False, 80, 84, None, "gerenciadora", True),
    ("1.7", "Lideranças de Disciplina — Time Interno MUSA", 2, "work_package", "1", True, False, False, False, 45, 84, None, "interno", False),
    ("1.8", "Suprimentos (P) — Time Interno MUSA", 2, "work_package", "1", True, False, False, False, 15, 84, "P", "interno", False),
    ("1.9", "Gestão QHSE e Interface Ambiental", 2, "work_package", "1", False, False, False, False, 15, 84, None, "interno", False),

    # --- 2. Licenciamento ---
    ("2.1", "Licença Prévia (LP)", 2, "deliverable", "2", True, False, False, False, 8, 12, None, "interno", False),
    ("2.2", "Licença de Instalação (LI)", 2, "deliverable", "2", True, False, False, False, 12, 10, None, "interno", False),
    ("2.3", "Licença de Operação (LO)", 2, "deliverable", "2", True, False, False, False, 6, 8, None, "interno", False),
    ("2.4", "Autorizações ANM e Outorgas Hídricas", 2, "deliverable", "2", False, False, False, False, 9, 14, None, "interno", False),

    # --- 3. Pacotes de Construção (C) — contratos externos ---
    ("3.1", "Pacote Construção Civil 1 — Terraplenagem e Acessos", 2, "work_package", "3", True, False, False, False, 130, 22, "C", "terceiro", True),
    ("3.2", "Pacote Construção Civil 2 — Fundações e Prédios Industriais", 2, "work_package", "3", True, False, False, False, 170, 30, "C", "terceiro", True),
    ("3.3", "Drenagem Superficial", 2, "work_package", "3", False, False, False, False, 8, 14, None, "terceiro", True),
    ("3.4", "Portarias, Guaritas e Cercamento", 2, "work_package", "3", False, False, False, False, 12, 10, None, "terceiro", True),

    # --- 4. Britagem ---
    ("4.1", "Britador Giratório (Gyratory Crusher)", 2, "work_package", "4", True, True, False, False, 85, 30, None, "terceiro", True),
    ("4.2", "Correias Transportadoras Primárias", 2, "work_package", "4", True, True, False, False, 42, 22, None, "terceiro", True),
    ("4.3", "Estrutura Metálica do Britador", 2, "work_package", "4", False, False, False, False, 28, 16, None, "terceiro", True),
    ("4.4", "Instrumentação e Elétrica Local — Britagem", 2, "work_package", "4", False, False, False, False, 25, 18, None, "hibrido", False),

    # --- 5. Moagem ---
    ("5.1", "Moinho SAG (long-lead ~32 meses)", 2, "work_package", "5", True, True, False, False, 145, 32, None, "terceiro", True),
    ("5.2", "Moinho de Bolas / Remoagem", 2, "work_package", "5", True, True, False, False, 55, 28, None, "terceiro", True),
    ("5.3", "Ciclones e Hidrociclones", 2, "work_package", "5", False, False, False, False, 18, 16, None, "terceiro", True),
    ("5.4", "Bombas de Polpa (critical service)", 2, "work_package", "5", True, True, False, False, 38, 24, None, "terceiro", True),
    ("5.5", "Sistema de Bolas e Corpos Moedores", 2, "work_package", "5", False, False, False, False, 24, 14, None, "terceiro", True),

    # --- 6. Flotação ---
    ("6.1", "Células de Flotação Rougher", 2, "work_package", "6", True, True, False, False, 62, 26, None, "terceiro", True),
    ("6.2", "Colunas de Flotação Cleaner", 2, "work_package", "6", True, True, False, False, 38, 26, None, "terceiro", True),
    ("6.3", "Sistema de Reagentes e Adições", 2, "work_package", "6", False, False, False, False, 16, 16, None, "terceiro", True),
    ("6.4", "Instrumentação de Flotação (Flotação Smart)", 2, "work_package", "6", False, False, False, False, 12, 14, None, "hibrido", False),
    ("6.5", "Tubulação de Polpa e Acessórios", 2, "work_package", "6", False, False, False, False, 12, 16, None, "terceiro", True),

    # --- 7. Filtragem ---
    ("7.1", "Espessadores de Rejeito", 2, "work_package", "7", False, False, False, False, 25, 20, None, "terceiro", True),
    ("7.2", "Filtros-prensa de Rejeito", 2, "work_package", "7", True, False, False, False, 38, 22, None, "terceiro", True),
    ("7.3", "Correias de Rejeito Filtrado", 2, "work_package", "7", False, False, False, False, 12, 16, None, "terceiro", True),
    ("7.4", "Edificação e Estrutura — Filtragem", 2, "work_package", "7", False, False, False, False, 10, 16, None, "terceiro", True),

    # --- 8. Pilha Curtume ---
    ("8.1", "Preparação da Base e Impermeabilização", 2, "work_package", "8", True, False, False, False, 35, 20, None, "terceiro", True),
    ("8.2", "Drenagem e Monitoramento Geotécnico", 2, "work_package", "8", True, False, False, False, 18, 24, None, "hibrido", False),
    ("8.3", "Sistema de Transporte e Compactação", 2, "work_package", "8", False, False, False, False, 28, 14, None, "hibrido", False),
    ("8.4", "Instrumentação Geotécnica (piezometria, InSAR)", 2, "work_package", "8", True, False, False, False, 14, 18, None, "terceiro", True),

    # --- 9. Manuseio de Produto ---
    ("9.1", "Pilhas de Produto (stockpiles)", 2, "work_package", "9", False, False, False, False, 22, 14, None, "hibrido", False),
    ("9.2", "Correias Transportadoras de Produto", 2, "work_package", "9", True, True, False, False, 28, 20, None, "terceiro", True),
    ("9.3", "Sistema de Carregamento em Caminhões", 2, "work_package", "9", False, False, False, False, 10, 12, None, "terceiro", True),
    ("9.4", "Balança Rodoviária e Logística Interna", 2, "work_package", "9", False, False, False, False, 5, 8, None, "terceiro", True),

    # --- 10. Elétrica ---
    ("10.1", "Subestação Principal 230/138 kV", 2, "work_package", "10", True, True, False, False, 85, 24, None, "terceiro", True),
    ("10.2", "Linha de Transmissão 230 kV (EPC turn-key terceiro)", 2, "work_package", "10", True, True, False, True, 65, 30, None, "terceiro", True),
    ("10.3", "Eletrocentros MCC", 2, "work_package", "10", True, True, False, False, 28, 20, None, "terceiro", True),
    ("10.4", "Transformadores de Força", 2, "work_package", "10", True, True, False, False, 22, 22, None, "terceiro", True),
    ("10.5", "Distribuição Elétrica Interna e Iluminação", 2, "work_package", "10", False, False, False, False, 12, 18, None, "hibrido", False),
    ("10.6", "Sistema de Aterramento e SPDA", 2, "work_package", "10", False, False, False, False, 6, 14, None, "hibrido", False),

    # --- 11. Utilidades ---
    ("11.1", "Água de Processo (captação + tratamento)", 2, "work_package", "11", False, False, False, False, 22, 16, None, "terceiro", True),
    ("11.2", "Água Industrial e Potável", 2, "work_package", "11", False, False, False, False, 8, 10, None, "hibrido", False),
    ("11.3", "Ar Comprimido Industrial", 2, "work_package", "11", False, False, False, False, 7, 12, None, "hibrido", False),
    ("11.4", "Armazenamento e Distribuição de Diesel", 2, "work_package", "11", False, False, False, False, 6, 10, None, "hibrido", False),
    ("11.5", "Drenagem Industrial e Tratamento de Efluentes", 2, "work_package", "11", False, False, False, False, 7, 14, None, "hibrido", False),

    # --- 12. Sistemas Auxiliares ---
    ("12.1", "Oficinas Mecânicas e Almoxarifado", 2, "work_package", "12", False, False, False, False, 18, 14, None, "terceiro", True),
    ("12.2", "Laboratório Químico e Físico", 2, "work_package", "12", False, False, False, False, 15, 12, None, "terceiro", True),
    ("12.3", "Sala de Controle Central (CCO)", 2, "work_package", "12", False, False, False, False, 22, 16, None, "terceiro", True),
    ("12.4", "Prédio Administrativo e Vestiários", 2, "work_package", "12", False, False, False, False, 15, 14, None, "terceiro", True),

    # --- 13. Automação ---
    ("13.1", "PLCs e Instrumentação de Campo", 2, "work_package", "13", False, False, False, False, 25, 20, None, "terceiro", True),
    ("13.2", "Sistema SCADA Integrado", 2, "work_package", "13", False, False, False, False, 15, 16, None, "terceiro", True),
    ("13.3", "Rede Industrial (OT) e Fibra Óptica", 2, "work_package", "13", False, False, False, False, 10, 14, None, "terceiro", True),
    ("13.4", "Segurança Cibernética OT", 2, "work_package", "13", False, False, False, False, 10, 14, None, "terceiro", True),

    # --- 14. Montagem Eletromecânica (M) — pacotes de serviço contratados ---
    ("14.1", "Pacote Montagem Eletromecânica — Britagem/Moagem", 2, "work_package", "14", True, False, False, False, 95, 14, "M", "terceiro", True),
    ("14.2", "Pacote Montagem Eletromecânica — Flotação/Remoagem", 2, "work_package", "14", True, False, False, False, 70, 12, "M", "terceiro", True),
    ("14.3", "Pacote Montagem Elétrica/Automação (integração)", 2, "work_package", "14", True, False, False, False, 55, 14, "M", "terceiro", True),
    ("14.4", "Pacote Montagem — Filtragem/Rejeito/Pilha Curtume", 2, "work_package", "14", False, False, False, False, 20, 12, "M", "terceiro", True),

    # --- 15. Comissionamento (compactado — overlap com montagem final) ---
    ("15.1", "Pré-comissionamento (assistência técnica contratada)", 2, "work_package", "15", False, False, False, False, 12, 3, None, "terceiro", True),
    ("15.2", "Comissionamento Frio", 2, "work_package", "15", False, False, False, False, 10, 2, None, "hibrido", False),
    ("15.3", "Comissionamento Quente", 2, "work_package", "15", True, False, False, False, 12, 2, None, "hibrido", False),
    ("15.4", "Ramp-up e First Ore até Capacidade Nominal", 2, "work_package", "15", True, False, False, False, 6, 3, None, "interno", False),

    # MARCOS (sem duração)
    ("M1", "Aprovação Final do Projeto pelo Board", 1, "marco", None, True, False, True, False, 0, 0, None, None, False),
    ("M2", "Assinatura do Contrato com Gerenciadora", 1, "marco", None, True, False, True, True, 0, 0, None, None, False),
    ("M3", "Conclusão da Engenharia Básica (FEL3)", 1, "marco", None, True, False, True, True, 0, 0, None, None, False),
    ("M4", "Licença de Instalação (LI) emitida", 1, "marco", None, True, False, True, False, 0, 0, None, None, False),
    ("M5", "Contratação do EPC da Linha de Transmissão", 1, "marco", None, True, False, True, True, 0, 0, None, None, False),
    ("M6", "Contratos de Construção Civil 1 e 2 assinados", 1, "marco", None, True, False, True, True, 0, 0, None, None, False),
    ("M7", "Pedido do Moinho SAG (LOA anticipada)", 1, "marco", None, True, False, True, True, 0, 0, None, None, False),
    ("M8", "Pacotes de Montagem Eletromecânica contratados", 1, "marco", None, True, False, True, True, 0, 0, None, None, False),
    ("M9", "Energização da Subestação", 1, "marco", None, True, False, True, False, 0, 0, None, None, False),
    ("M10", "Recebimento do Moinho SAG no Canteiro", 1, "marco", None, True, False, True, False, 0, 0, None, None, False),
    ("M11", "Licença de Operação (LO) emitida", 1, "marco", None, True, False, True, False, 0, 0, None, None, False),
    ("M12", "First Ore — Start-up Comercial", 1, "marco", None, True, False, True, False, 0, 0, None, None, False),
]


# Ciclos padrão do projeto (Compactos)
CICLO_SUPRIMENTOS_DIAS = 150
CICLO_MOBILIZACAO_DIAS = 45


# Change Requests históricas
CHANGE_REQUESTS = [
    {
        "codigo": "CR-001",
        "titulo": "Substituição da tecnologia de flotação — adoção de colunas",
        "descricao": (
            "Substituir flotação convencional rougher-cleaner-scavenger por arranjo "
            "rougher + colunas cleaner para ganho de recuperação metalúrgica."
        ),
        "justificativa": (
            "Estudos de bancada indicam ganho de 2,5 p.p. de recuperação, "
            "justificando o CAPEX adicional em 14 meses via receita incremental."
        ),
        "categoria": "escopo",
        "origem": "time_interno",
        "impacto_escopo": "Inclusão de 4 colunas de flotação cleaner (vs 8 células convencionais).",
        "impacto_cronograma_dias": 90,
        "impacto_custo": 38_000_000.0,
        "impacto_qualidade": "Ganho de 2,5 p.p. na recuperação metalúrgica.",
        "impacto_risco": "Reduz CORP-005 (perda operacional) e cria risco de long-lead item.",
        "status": "aprovada",
        "prioridade": "alta",
        "solicitante_nome": "Juliana Costa",
        "aprovador_nome": "Antônio Neves",
        "data_abertura": date(2024, 8, 15),
        "data_decisao": date(2024, 9, 10),
        "decisao": "APROVADA. Implementação imediata no detalhamento 6.2.",
    },
    {
        "codigo": "CR-002",
        "titulo": "Adição de 4º filtro-prensa na planta de filtragem",
        "descricao": (
            "Incluir 4º filtro-prensa como redundância operacional para "
            "garantir disponibilidade alvo de 88% da planta de filtragem."
        ),
        "justificativa": (
            "Cálculo de confiabilidade mostrou 3 unidades com 1 stand-by "
            "atingem 86% — abaixo da meta."
        ),
        "categoria": "escopo",
        "origem": "time_interno",
        "impacto_escopo": "Adição de 1 filtro-prensa 25m².",
        "impacto_cronograma_dias": 45,
        "impacto_custo": 12_500_000.0,
        "impacto_qualidade": "Disponibilidade 86% → 93%.",
        "status": "aprovada",
        "prioridade": "media",
        "solicitante_nome": "Daniel Oliveira",
        "aprovador_nome": "Antônio Neves",
        "data_abertura": date(2024, 11, 5),
        "data_decisao": date(2024, 12, 2),
        "decisao": "APROVADA com absorção parcial na contingência de escopo.",
    },
    {
        "codigo": "CR-003",
        "titulo": "Alteração da rota da linha de transmissão por restrição fundiária",
        "descricao": (
            "Desvio de 8 km na rota original da LT devido à negociação fundiária "
            "não concluída em 2 propriedades no traçado inicial."
        ),
        "justificativa": (
            "Negociações travadas; desapropriação teria atraso incompatível "
            "com o cronograma."
        ),
        "categoria": "cronograma",
        "origem": "externo",
        "impacto_escopo": "Extensão da LT em 8 km (+15%); licença corrigida junto à SEMAD.",
        "impacto_cronograma_dias": 60,
        "impacto_custo": 9_500_000.0,
        "impacto_qualidade": None,
        "impacto_risco": "Adiciona risco de atraso na energização (M4).",
        "status": "em_analise",
        "prioridade": "alta",
        "solicitante_nome": "Rafael Torres",
        "aprovador_nome": "Antônio Neves",
        "data_abertura": date(2026, 3, 12),
        "data_decisao": None,
        "decisao": None,
    },
]


DECISIONS = [
    {
        "codigo": "DEC-001",
        "titulo": "Adoção de pilha seca (Pilha Curtume) em vez de barragem",
        "contexto": (
            "Tendência regulatória e de governança ESG aponta para eliminação "
            "de barragens alteadas a montante. Disposição seca tem payback operacional "
            "positivo via redução de área e passivo."
        ),
        "alternativas_consideradas": (
            "1. Barragem convencional (rejeitada por risco geotécnico e ESG)\n"
            "2. Pilha seca com filtragem (APROVADA)\n"
            "3. Retroaterro cavity fill (inviável pela geometria do depósito)"
        ),
        "decisao": (
            "Adotar pilha seca com planta de filtragem em larga escala. Investimento "
            "adicional em CAPEX compensado pela redução de risco e passivo de longo prazo."
        ),
        "rationale": (
            "Alinhamento com agenda ESG, mitigação do risco corporativo CORP-003 "
            "(licença social) e aderência à Resolução ANM 4/2019."
        ),
        "impactos": (
            "CAPEX +R$ 95M; OPEX adicional R$ 12M/ano; redução significativa de risco "
            "geotécnico; melhor percepção de stakeholders e Board."
        ),
        "decisor_nome": "Antônio Neves",
        "data_decisao": date(2023, 11, 20),
        "forum": "Steering Committee Extraordinário",
        "stakeholders_envolvidos": "Board, Diretoria SSMA, Consultoria geotécnica externa, Comunidades",
    },
    {
        "codigo": "DEC-002",
        "titulo": "Contratação externa (EPC turn-key) da linha de transmissão",
        "contexto": (
            "LT de 230 kV com 42 km de traçado exige expertise específica em "
            "licenciamento eletro-ambiental e execução em áreas rurais."
        ),
        "alternativas_consideradas": (
            "1. Execução direta (rejeitada por falta de know-how)\n"
            "2. Contrato EPC turn-key (APROVADA) — fornecedor assume traçado, licença, construção e comissionamento\n"
            "3. Contrato misto (rejeitado por complexidade de interface)"
        ),
        "decisao": (
            "Contratar EPC turn-key com fornecedor especializado em LTs. MUSA fornece "
            "somente interface de conexão com a SE principal."
        ),
        "rationale": "Foco da MUSA em mineração; reduz complexidade; transfere risco técnico.",
        "impactos": (
            "Interface fica nos pontos de conexão. Cronograma de energização depende "
            "do fornecedor — risco de atraso transferido via SLA contratual."
        ),
        "decisor_nome": "Marcelo Barreiro",
        "data_decisao": date(2024, 5, 14),
        "forum": "Steering Committee",
        "stakeholders_envolvidos": "Diretoria de Operações, Diretoria Financeira, Jurídico, Fornecedores pré-qualificados",
    },
    {
        "codigo": "DEC-003",
        "titulo": "Antecipação da compra do Moinho SAG (pedido em 2024 Q3)",
        "contexto": (
            "Lead time do Moinho SAG 32 ft em 28-32 meses. Ciclo de fabricação nos "
            "fornecedores globais se comprimiu após 2022 (alta demanda de cobre e ferro)."
        ),
        "alternativas_consideradas": (
            "1. Aguardar aprovação formal do projeto em Fev/2027 (inviável)\n"
            "2. Antecipar pedido com reserva de capacidade em 2024 Q3 (APROVADA)\n"
            "3. Usar moinhos usados refurbished (rejeitado por incerteza técnica)"
        ),
        "decisao": (
            "Emitir LOA (Letter of Award) em Set/2024 com cláusula de cancelamento "
            "mediante multa de 5% do valor do contrato se aprovação em Fev/2027 for negativa."
        ),
        "rationale": (
            "Cláusula de cancelamento limita downside; atraso de 12 meses seria "
            "inaceitável para o compromisso com off-takers em Jul/2030."
        ),
        "impactos": (
            "Comprometimento antecipado de R$ 7,3M em sinal; ganho de 12 meses no "
            "cronograma crítico; reserva de capacidade na carteira do fornecedor."
        ),
        "decisor_nome": "Paulo Bandeira",
        "data_decisao": date(2024, 9, 3),
        "forum": "Steering Committee",
        "stakeholders_envolvidos": "Sponsor, PMO, Suprimentos, Jurídico, Fornecedor (FLSmidth)",
    },
    {
        "codigo": "DEC-004",
        "titulo": "Adoção de critério Visão Zero para HSE na construção",
        "contexto": (
            "Projetos greenfield de mineração têm histórico de fatalidades na construção. "
            "MUSA define meta corporativa de zero fatalidades."
        ),
        "alternativas_consideradas": (
            "1. Metas tradicionais (TRIR ≤ X) — rejeitada por complacência histórica\n"
            "2. Visão Zero + programa Safety Observer (APROVADA)"
        ),
        "decisao": (
            "Adotar Visão Zero como critério de sucesso do projeto. Incluir cláusula "
            "contratual de penalidade em EPC para fatalidades."
        ),
        "rationale": "Alinhamento com compromisso corporativo + manutenção da licença social.",
        "impactos": "Aumenta custo de HSE em ~3% do OPEX; reduz risco catastrófico.",
        "decisor_nome": "Marina Magalhães",
        "data_decisao": date(2023, 8, 10),
        "forum": "Comitê de Segurança MUSA",
        "stakeholders_envolvidos": "Diretoria SSMA, Sponsor, Board",
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


def seed_pmsuite_compactos(db: Session) -> dict[str, int]:
    projeto = db.query(Projeto).filter_by(codigo="PROJ-COMPACTOS").first()
    if not projeto:
        return {"charter": 0, "baseline": 0, "wbs_nodes": 0, "change_requests": 0, "decisions": 0}

    n_charter = 0
    n_baseline = 0
    n_wbs = 0
    n_cr = 0
    n_dec = 0

    # --- Charter ---
    if not db.query(ProjectCharter).filter_by(projeto_id=projeto.id).first():
        sponsor = _find_or_create_pessoa(db, CHARTER_COMPACTOS["sponsor_nome"])
        gerente = _find_or_create_pessoa(db, CHARTER_COMPACTOS["gerente_nome"])
        aprovador = _find_or_create_pessoa(db, CHARTER_COMPACTOS["aprovador_nome"])
        charter = ProjectCharter(
            projeto_id=projeto.id,
            justificativa=CHARTER_COMPACTOS["justificativa"],
            business_case=CHARTER_COMPACTOS["business_case"],
            objetivo_smart=CHARTER_COMPACTOS["objetivo_smart"],
            beneficios_esperados=CHARTER_COMPACTOS["beneficios_esperados"],
            escopo_incluido=CHARTER_COMPACTOS["escopo_incluido"],
            escopo_excluido=CHARTER_COMPACTOS["escopo_excluido"],
            entregaveis_principais=CHARTER_COMPACTOS["entregaveis_principais"],
            premissas=CHARTER_COMPACTOS["premissas"],
            restricoes=CHARTER_COMPACTOS["restricoes"],
            criterios_sucesso=CHARTER_COMPACTOS["criterios_sucesso"],
            criterios_aceitacao=CHARTER_COMPACTOS["criterios_aceitacao"],
            orcamento_total=CHARTER_COMPACTOS["orcamento_total"],
            orcamento_contingencia=CHARTER_COMPACTOS["orcamento_contingencia"],
            moeda="BRL",
            data_aprovacao=CHARTER_COMPACTOS["data_aprovacao_charter"],
            data_inicio_prevista=CHARTER_COMPACTOS["data_inicio"],
            data_termino_prevista=CHARTER_COMPACTOS["data_termino"],
            sponsor_id=sponsor.id,
            gerente_projeto_id=gerente.id,
            aprovador_id=aprovador.id,
            comite_steering=CHARTER_COMPACTOS["comite_steering"],
            versao=1,
            status="aprovado",
        )
        db.add(charter)
        db.flush()
        n_charter += 1

        # Baseline inicial
        baseline = ProjectBaseline(
            projeto_id=projeto.id,
            versao=1,
            nome="Baseline original — TAP aprovado 2023 Q2",
            descricao="Primeira linha de base aprovada ao final do FEL3.",
            data_aprovacao=CHARTER_COMPACTOS["data_aprovacao_charter"],
            orcamento=CHARTER_COMPACTOS["orcamento_total"] + CHARTER_COMPACTOS["orcamento_contingencia"],
            data_inicio=CHARTER_COMPACTOS["data_inicio"],
            data_termino=CHARTER_COMPACTOS["data_termino"],
            ativa=True,
            aprovador_id=aprovador.id,
            motivo="Aprovação formal do Board ao encerramento do FEL3.",
        )
        db.add(baseline)
        n_baseline += 1

    # --- WBS ---
    if db.query(WBSNode).filter_by(projeto_id=projeto.id).count() == 0:
        # Base de referência de datas
        base_inicio = CHARTER_COMPACTOS["data_inicio"]
        # Cria em 2 passadas: primeiro sem parent (acha id), depois ajusta pais
        codigo_to_node: dict[str, WBSNode] = {}

        # Mapeamento de responsáveis por fase
        responsaveis_fase = {
            "1": "Paulo Bandeira", "2": "Marina Magalhães",
            "3": "Ricardo Ferreira", "4": "Juliana Costa",
            "5": "Juliana Costa", "6": "Juliana Costa",
            "7": "Juliana Costa", "8": "Daniel Oliveira",
            "9": "Rafael Torres", "10": "Rafael Torres",
            "11": "Ricardo Ferreira", "12": "Ricardo Ferreira",
            "13": "Luciana Pereira", "14": "Antônio Neves",
            "15": "Marcelo Barreiro",
        }

        # Marcos: datas definidas (cronograma típico para start-up Jul/2030)
        marcos_datas = {
            "M1": date(2027, 2, 15),   # Aprovação Board
            "M2": date(2024, 3, 15),   # Gerenciadora assinada
            "M3": date(2025, 8, 30),   # Fim FEL3
            "M4": date(2026, 6, 30),   # LI
            "M5": date(2024, 10, 15),  # EPC LT
            "M6": date(2027, 5, 30),   # Construção civil 1 e 2 contratadas
            "M7": date(2024, 9, 3),    # LOA moinho SAG
            "M8": date(2028, 3, 30),   # Montagem eletromecânica contratada
            "M9": date(2029, 8, 30),   # Energização SE
            "M10": date(2027, 1, 20),  # Recebimento SAG
            "M11": date(2030, 4, 15),  # LO
            "M12": date(2030, 7, 15),  # First ore
        }

        for tup in WBS_ESTRUTURA:
            (codigo, nome, nivel, tipo, parent_codigo, is_crit, is_ll,
             is_marco, is_terc, orc_mi, dur_meses,
             disciplina, executor, is_serv_contr) = tup
            # Responsável
            resp_nome = responsaveis_fase.get(codigo.split(".")[0], "Paulo Bandeira")
            resp = _find_or_create_pessoa(db, resp_nome)

            # Ciclos padrão se for serviço contratado
            ciclo_sup = CICLO_SUPRIMENTOS_DIAS if is_serv_contr else None
            ciclo_mob = CICLO_MOBILIZACAO_DIAS if is_serv_contr else None

            node = WBSNode(
                projeto_id=projeto.id,
                parent_id=None,
                codigo_wbs=codigo,
                nome=nome,
                nivel=nivel,
                tipo=tipo,
                responsavel_id=resp.id,
                orcamento_estimado=(orc_mi * 1_000_000) if orc_mi else None,
                duracao_dias_estimada=(dur_meses * 30) if dur_meses else None,
                is_critico=is_crit,
                is_long_lead=is_ll,
                is_marco=is_marco,
                is_terceirizado=is_terc,
                data_termino_planejada=marcos_datas.get(codigo),
                disciplina_epcm=disciplina,
                executor=executor,
                is_servico_contratado=is_serv_contr,
                ciclo_suprimentos_dias=ciclo_sup,
                ciclo_mobilizacao_dias=ciclo_mob,
            )
            db.add(node)
            db.flush()
            codigo_to_node[codigo] = node
            n_wbs += 1

        # 2ª passada: liga parents
        for tup in WBS_ESTRUTURA:
            codigo = tup[0]
            parent_codigo = tup[4]
            if parent_codigo is None:
                continue
            child = codigo_to_node.get(codigo)
            parent = codigo_to_node.get(parent_codigo)
            if child and parent:
                child.parent_id = parent.id

    # --- Change Requests ---
    for cr_spec in CHANGE_REQUESTS:
        if db.query(ChangeRequest).filter_by(
            projeto_id=projeto.id, codigo=cr_spec["codigo"]
        ).first():
            continue
        sol = _find_pessoa(db, cr_spec["solicitante_nome"])
        apr = _find_pessoa(db, cr_spec["aprovador_nome"])
        cr = ChangeRequest(
            projeto_id=projeto.id,
            codigo=cr_spec["codigo"],
            titulo=cr_spec["titulo"],
            descricao=cr_spec["descricao"],
            justificativa=cr_spec["justificativa"],
            categoria=cr_spec["categoria"],
            origem=cr_spec["origem"],
            impacto_escopo=cr_spec["impacto_escopo"],
            impacto_cronograma_dias=cr_spec["impacto_cronograma_dias"],
            impacto_custo=cr_spec["impacto_custo"],
            impacto_qualidade=cr_spec["impacto_qualidade"],
            impacto_risco=cr_spec.get("impacto_risco"),
            status=cr_spec["status"],
            prioridade=cr_spec["prioridade"],
            solicitante_id=sol.id if sol else None,
            aprovador_id=apr.id if apr else None,
            data_abertura=cr_spec["data_abertura"],
            data_decisao=cr_spec.get("data_decisao"),
            decisao=cr_spec.get("decisao"),
        )
        db.add(cr)
        n_cr += 1

    # --- Decisions ---
    for dec_spec in DECISIONS:
        if db.query(DecisionLog).filter_by(
            projeto_id=projeto.id, codigo=dec_spec["codigo"]
        ).first():
            continue
        decisor = _find_pessoa(db, dec_spec["decisor_nome"])
        dec = DecisionLog(
            projeto_id=projeto.id,
            codigo=dec_spec["codigo"],
            titulo=dec_spec["titulo"],
            contexto=dec_spec["contexto"],
            alternativas_consideradas=dec_spec["alternativas_consideradas"],
            decisao=dec_spec["decisao"],
            rationale=dec_spec["rationale"],
            impactos=dec_spec["impactos"],
            decisor_id=decisor.id if decisor else None,
            data_decisao=dec_spec["data_decisao"],
            forum=dec_spec["forum"],
            stakeholders_envolvidos=dec_spec["stakeholders_envolvidos"],
        )
        db.add(dec)
        n_dec += 1

    db.commit()

    # --- Vínculo risco ↔ WBS por heurística ---
    _vincular_riscos_wbs(db, projeto.id)
    db.commit()

    return {
        "charter": n_charter,
        "baseline": n_baseline,
        "wbs_nodes": n_wbs,
        "change_requests": n_cr,
        "decisions": n_dec,
    }


def _vincular_riscos_wbs(db: Session, projeto_id: int) -> None:
    """Heurística para vincular os 28 riscos de projeto aos nós WBS relevantes."""
    from licenciaminer.riscos.models import Risco

    wbs = {n.codigo_wbs: n for n in db.query(WBSNode).filter_by(projeto_id=projeto_id).all()}
    # Mapeamento textual risco → wbs
    heuristicas = [
        (["Licen", "licen", "MAM"], "2"),  # Licenciamento → fase 2
        (["comunidade", "REC"], "2"),  # Licenciamento e comunidades
        (["geotec", "pilha", "barragem"], "8"),
        (["moinho", "SAG", "OPE"], "5"),
        (["flotação", "flotac"], "6"),
        (["escoamento", "CLO", "logística", "logistica"], "9"),
        (["engenharia", "ENG", "projeto"], "1"),
        (["segura", "SEG"], "14"),  # comissionamento/start-up
        (["mão-de-obra", "RH"], "1"),  # gestão
        (["financeir", "FIN"], "1"),  # gestão
        (["fundi", "FUN", "acesso"], "3"),  # terraplenagem/acessos
        (["regulat", "CLO-EXEC-16"], "2"),
    ]
    riscos = db.query(Risco).filter_by(projeto_id=projeto_id).all()
    for r in riscos:
        if r.wbs_node_id:
            continue
        texto = f"{r.codigo} {r.nome or ''} {r.descricao or ''}".lower()
        for termos, wbs_cod in heuristicas:
            if any(t.lower() in texto for t in termos):
                no = wbs.get(wbs_cod)
                if no:
                    r.wbs_node_id = no.id
                    break
