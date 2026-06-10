"""Expande inventário e requisitos do módulo Pilhas com cobertura GISTM premium.

Adiciona 14 documentos cobrindo os 15 princípios + ~55 requisitos auditáveis
estruturados por princípio para roll-up no relatório premium.

Idempotente: detecta últimos IDs existentes e só adiciona itens novos.
"""
from __future__ import annotations

import csv
from pathlib import Path

INV = Path("data/reference/pilhas_inventario_documentos.csv")
REQ = Path("data/reference/pilhas_requisitos_testes.csv")

# Estado atual
with open(INV, encoding="utf-8") as f:
    inv_rows = list(csv.DictReader(f))
last_num = max((int(r["num"]) for r in inv_rows if r["num"].isdigit()), default=0)

with open(REQ, encoding="utf-8") as f:
    req_rows = list(csv.DictReader(f))
existing_ids = {r["requisito_id"] for r in req_rows}

# 14 docs cobrindo princípios GISTM
gistm_docs = [
    ("Avaliacao de impacto social em comunidades afetadas (P1)", "DOC-GISTM-P01",
     "Avaliacao baseline social das comunidades em ZAS/ZSS",
     "atualizacao quinquenal", "mineradoras ICMM", "Internacional",
     "GISTM Principio 1", "vigente"),
    ("Mecanismo de grievance e engajamento continuo (P2)", "DOC-GISTM-P02",
     "Canal de queixas operacional com SLA de resposta",
     "registro continuo", "mineradoras ICMM", "Internacional",
     "GISTM Principio 2", "vigente"),
    ("Base de conhecimento integrada da pilha (P3)", "DOC-GISTM-P03",
     "Knowledge management system com versionamento e custodia",
     "atualizacao mensal", "mineradoras ICMM", "Internacional",
     "GISTM Principio 3", "vigente"),
    ("Avaliacao de risco multi-disciplinar (P4)", "DOC-GISTM-P04",
     "FMEA, BowTie ou equivalente aplicado a pilha",
     "atualizacao anual", "mineradoras ICMM", "Internacional",
     "GISTM Principio 4", "vigente"),
    ("Selecao de alternativas com BAT - Best Available Technology (P5)", "DOC-GISTM-P05",
     "Trade-off de alternativas com criterios tecnicos e ambientais",
     "entrega no projeto", "mineradoras ICMM", "Internacional",
     "GISTM Principio 5", "vigente"),
    ("Plano de gestao da pilha - TMP (P6)", "DOC-GISTM-P06",
     "TMP - Tailings Management Plan integrado a EoR/RTFE/ITRB",
     "atualizacao anual", "mineradoras ICMM", "Internacional",
     "GISTM Principio 6", "vigente"),
    ("Programa de monitoramento de desempenho (P7)", "DOC-GISTM-P07",
     "Performance monitoring com KPIs gatilhados a resposta",
     "registro continuo", "mineradoras ICMM", "Internacional",
     "GISTM Principio 7", "vigente"),
    ("Revisao periodica de seguranca - DSR (P8)", "DOC-GISTM-P08",
     "DSR - Dam Safety Review formal por especialista independente",
     "quinquenal", "mineradoras ICMM", "Internacional",
     "GISTM Principio 8", "vigente"),
    ("Sistema de gestao integrado - TMS (P9)", "DOC-GISTM-P09",
     "TMS - Tailings Management System (politicas, processos, responsabilidades)",
     "atualizacao continua", "mineradoras ICMM", "Internacional",
     "GISTM Principio 9", "vigente"),
    ("Governanca C-level e accountability (P10)", "DOC-GISTM-P10",
     "Accountable Executive designado pelo CEO/Board com escopo formal",
     "designacao formal anual", "mineradoras ICMM", "Internacional",
     "GISTM Principio 10", "vigente"),
    ("Plano de resposta a emergencia GISTM (P11)", "DOC-GISTM-P11",
     "ERP com mapeamento de cenarios e ZAS atualizada",
     "atualizacao anual", "mineradoras ICMM", "Internacional",
     "GISTM Principio 11", "vigente"),
    ("Plano de recuperacao de longo prazo - LTRP (P12-13)", "DOC-GISTM-P12",
     "LTRP - Long Term Recovery Plan com financiamento garantido",
     "atualizacao quinquenal", "mineradoras ICMM", "Internacional",
     "GISTM Principio 12-13", "vigente"),
    ("Disclosure publico de informacoes tecnicas (P14)", "DOC-GISTM-P14",
     "Portal publico com relatorios anuais GTMI conforme template ICMM",
     "atualizacao anual", "mineradoras ICMM", "Internacional",
     "GISTM Principio 14", "vigente"),
    ("Mecanismo de acesso a documentos por stakeholders (P15)", "DOC-GISTM-P15",
     "Sistema de solicitacao de acesso a documentos com SLA",
     "registro continuo", "mineradoras ICMM", "Internacional",
     "GISTM Principio 15", "vigente"),
]

# Skip docs que já existem
inv_existing_names = {r["documento"].strip() for r in inv_rows}
new_inv = [d for d in gistm_docs if d[0].strip() not in inv_existing_names]

inv_header = ["num", "abrangencia", "classificacao", "modalidade", "etapa", "fase",
              "licenca", "documento", "doc_id", "descricao", "atualizacoes",
              "aplicabilidade", "esfera", "norma_referencia", "vigente",
              "data_ultima_verificacao"]

with open(INV, "a", encoding="utf-8", newline="") as f:
    w = csv.writer(f)
    for i, (doc, doc_id, desc, atual, aplic, esfera, norma, vig) in enumerate(new_inv, start=last_num + 1):
        w.writerow([i, "Internacional", "Premium GISTM", "", "GOVERNANCA_GISTM",
                    "Governanca", "", doc, doc_id, desc, atual, aplic, esfera,
                    norma, vig, "2026-05-16"])

print(f"Inventario: +{len(new_inv)} docs GISTM")

# Principios
P = {
    1: "Engajamento de comunidades afetadas",
    2: "Mecanismos de grievance",
    3: "Base de conhecimento integrada",
    4: "Avaliacao de risco",
    5: "Selecao de alternativas (BAT)",
    6: "Gestao da pilha (TMP)",
    7: "Monitoramento de desempenho",
    8: "Revisao periodica de seguranca",
    9: "Sistema de gestao (TMS)",
    10: "Governanca e accountability",
    11: "Resposta a emergencia",
    12: "Recuperacao de longo prazo",
    13: "Cessacao e transferencia",
    14: "Disclosure publico",
    15: "Acesso a documentos",
}

# (princ, teste, evidencia, peso, impacto)
items = [
    (1, "Existe processo formal de identificacao de comunidades em ZAS e ZSS atualizado nos ultimos 12 meses?", "Mapa ZAS/ZSS + lista de comunidades + atas", 3, "Alto"),
    (1, "Foi conduzida avaliacao social baseline com metodologia reconhecida (IFC PS5 / GISTM)?", "Relatorio de baseline com indicadores SMART", 3, "Alto"),
    (1, "Engajamento e documentado em plano com cronograma e metricas?", "SEP - Stakeholder Engagement Plan", 2, "Medio"),
    (1, "Comunidades sao informadas previamente sobre simulados e visitas tecnicas?", "Comunicados + protocolos de envio", 2, "Medio"),
    (2, "Existe mecanismo de grievance acessivel e divulgado para as comunidades?", "Procedimento + canais de contato + estatisticas", 3, "Alto"),
    (2, "SLA de resposta a queixa esta definido e cumprido (registro)?", "Dashboard de queixas com tempo medio de resposta", 2, "Medio"),
    (2, "Existe escalonamento e tratamento de queixas reincidentes?", "Procedimento de escalation + logs", 2, "Medio"),
    (2, "Resultado da apuracao retorna a comunidade reclamante (closure loop)?", "Comunicados de retorno + ata", 2, "Medio"),
    (3, "Existe Knowledge Management System (KMS) com versionamento de toda documentacao tecnica?", "KMS / portal de documentos com historico", 3, "Alto"),
    (3, "Dados de instrumentacao sao integrados a base centralizada com retencao definida?", "Data lake / sistema centralizado + politica de retencao", 3, "Alto"),
    (3, "Existe processo formal para atualizar a base quando ha mudanca de premissa?", "MoC - Management of Change registrado", 2, "Medio"),
    (3, "Custodia tecnica esta formalizada (responsavel e backup)?", "Matriz de responsabilidade tecnica", 2, "Medio"),
    (4, "Existe avaliacao de risco multi-disciplinar (geo, ambiental, social) atualizada?", "Matriz de risco com revisao datada", 3, "Alto"),
    (4, "Metodologia adotada e reconhecida (FMEA, BowTie, FMECA)?", "Metodologia documentada + treinamento equipe", 2, "Medio"),
    (4, "Cenarios incluem mudanca climatica e eventos extremos?", "Memorial com cenarios RCP 4.5/8.5", 3, "Alto"),
    (4, "Riscos sao reportados ao Accountable Executive trimestralmente?", "Atas / dashboards de governanca", 2, "Medio"),
    (5, "Existe estudo formal de alternativas tecnologicas (dry stack, codisposicao, barragem)?", "Trade-off study com criterios de selecao", 3, "Alto"),
    (5, "Selecao considera reducao maxima de risco como criterio dominante?", "Matriz de decisao com peso ao risco", 3, "Alto"),
    (5, "BAT - Best Available Technology e revisitada a cada 5 anos ou em projeto novo?", "Cronograma de revisao + ultima atualizacao", 2, "Medio"),
    (6, "Existe TMP - Tailings Management Plan integrado e atualizado?", "TMP versao mais recente + log de alteracoes", 3, "Alto"),
    (6, "TMP define ciclo de auditoria com EoR/RTFE/ITRB?", "Cronograma de auditorias + relatorios anteriores", 3, "Alto"),
    (6, "Mudancas significativas passam por MoC documentado?", "Registros de MoC dos ultimos 24 meses", 2, "Medio"),
    (6, "TMP inclui criterios de aceitacao de projeto e operacao?", "Performance criteria + indicadores", 2, "Medio"),
    (7, "Programa de monitoramento contempla instrumentacao geotecnica completa (piezometros, inclinometros, marcos)?", "Plano de monitoramento + planta de locacao", 3, "Alto"),
    (7, "Existem thresholds TARP com niveis de alerta e acao definidos?", "TARP - Trigger Action Response Plan", 3, "Alto"),
    (7, "Telemetria tem disponibilidade maior ou igual a 99% verificavel?", "SLA de telemetria + logs de uptime", 3, "Alto"),
    (7, "Dashboards estao acessiveis ao C-level em tempo real?", "Print de dashboard executivo + acesso comprovado", 2, "Medio"),
    (8, "Existe DSR - Dam Safety Review formal periodica (no maximo quinquenal)?", "Ultimo DSR datado e assinado", 3, "Alto"),
    (8, "Especialista responsavel pelo DSR e independente da operacao?", "CV especialista + declaracao de independencia", 3, "Alto"),
    (8, "Recomendacoes do DSR sao acompanhadas em plano de acao com prazos?", "Plano de acao + status de implementacao", 2, "Medio"),
    (9, "Existe Tailings Management System (TMS) documentado e aprovado pelo board?", "TMS + ata de aprovacao do board", 3, "Alto"),
    (9, "Politica de tailings esta integrada a politica corporativa de seguranca?", "Politicas + cross-references", 2, "Medio"),
    (9, "TMS define competencias minimas para cada funcao critica?", "Matriz de competencias + plano de capacitacao", 2, "Medio"),
    (9, "Auditoria interna do TMS ocorre ao menos anualmente?", "Relatorios de auditoria interna", 2, "Medio"),
    (10, "Accountable Executive foi designado formalmente pelo CEO ou Board?", "Carta de designacao", 3, "Alto"),
    (10, "Accountable Executive reporta diretamente ao Board sobre status da pilha?", "Atas com reportes periodicos", 3, "Alto"),
    (10, "Responsabilidades RACI estao mapeadas para EoR, RTFE, ITRB?", "Matriz RACI + organograma", 2, "Medio"),
    (10, "Conflitos de interesse de membros do ITRB sao declarados e gerenciados?", "Politica de COI + declaracoes", 2, "Medio"),
    (11, "Existe ERP - Emergency Response Plan especifico para a pilha?", "ERP datado e versionado", 3, "Alto"),
    (11, "ERP incorpora cenarios multiplos incluindo ruptura hipotetica?", "Memorial com cenarios + ZAS/ZSS", 3, "Alto"),
    (11, "Simulados externos com poder publico ocorrem ao menos anualmente?", "Relatorios de simulado + lista de presenca", 3, "Alto"),
    (11, "Comunidades em ZAS tem treinamento e canal direto para alerta?", "Plano de comunicacao + comprovantes", 2, "Medio"),
    (12, "Existe LTRP - Long Term Recovery Plan documentado?", "LTRP datado e financiado", 3, "Alto"),
    (12, "LTRP contempla recursos financeiros provisionados (escrow ou garantia)?", "Comprovante de provisao", 3, "Alto"),
    (12, "Cenarios de recuperacao consideram impactos socioeconomicos de longo prazo?", "Estudo socioeconomico de longo prazo", 2, "Medio"),
    (13, "Existe plano de cessacao operacional integrado ao plano de fechamento mineiro?", "Plano de cessacao + cronograma", 3, "Alto"),
    (13, "Transferencia de custodia pos-fechamento esta acordada (publico/privado)?", "Termo de transferencia + condicoes", 3, "Alto"),
    (13, "Monitoramento pos-cessacao tem responsavel definido por minimo 5 anos?", "Cronograma + responsavel", 2, "Medio"),
    (14, "Existe portal publico com relatorios anuais conforme template ICMM/GTMI?", "URL + relatorios publicados", 3, "Alto"),
    (14, "Disclosure inclui classificacao de consequencia da pilha?", "Documento publicado + data", 3, "Alto"),
    (14, "Disclosure inclui resultado da ultima DSR e DSI?", "Sumario executivo publicado", 2, "Medio"),
    (14, "Disclosure inclui resumo do ERP e ZAS mapeada?", "Documento publico", 3, "Alto"),
    (15, "Existe procedimento para receber e responder solicitacoes de informacao do publico?", "Procedimento + SLA + log", 3, "Alto"),
    (15, "Informacoes confidenciais tem criterio claro de classificacao?", "Politica de classificacao da informacao", 2, "Medio"),
    (15, "Documentos solicitados sao entregues em formato acessivel (legivel)?", "Exemplos de respostas + feedback", 2, "Medio"),
]

start_id = 200
gistm_reqs = []
for i, (pnum, teste, evid, peso, impacto) in enumerate(items):
    rid = f"RP.{start_id + i}"
    if rid in existing_ids:
        continue
    topico = f"P{pnum:02d} - {P[pnum]}"
    doc_for_match = f"GISTM Principio {pnum}"
    modulo = f"GISTM - Principio {pnum:02d}"
    norma = f"GISTM P{pnum}"
    gistm_reqs.append((rid, "Gestao", "", doc_for_match, modulo, topico, teste, evid,
                       str(peso), impacto, norma, "", "BR", "2026-05-16"))

with open(REQ, "a", encoding="utf-8", newline="") as f:
    w = csv.writer(f)
    for row in gistm_reqs:
        w.writerow(row)

print(f"Requisitos: +{len(gistm_reqs)} reqs GISTM (RP.{start_id}-RP.{start_id + len(gistm_reqs) - 1})")

# Validate
with open(INV, encoding="utf-8") as f:
    inv_after = list(csv.DictReader(f))
with open(REQ, encoding="utf-8") as f:
    reqs_after = list(csv.DictReader(f))
print()
print(f"Inventario total: {len(inv_after)} docs (GOVERNANCA_GISTM: "
      f"{sum(1 for r in inv_after if r.get('etapa','').strip()=='GOVERNANCA_GISTM')})")
print(f"Requisitos total: {len(reqs_after)} "
      f"(modulo GISTM: {sum(1 for r in reqs_after if 'GISTM' in (r.get('modulo','') or ''))})")
