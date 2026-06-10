# Roteiro de Demo — Auditoria de Pilhas Summo Quartile

**Duração-alvo:** 10 minutos · **Formato:** call ou presencial · **Quem apresenta:** sócio Summo + condutor da plataforma

---

## Preparação (antes da call)

- [ ] Confirmar com o cliente o nome de uma pilha real (ou usar a demo "PDR Itabirito Norte")
- [ ] Abrir `http://localhost:3004/pilhas` (ou URL de produção quando publicada)
- [ ] Limpar localStorage do browser se a demo anterior contaminou o estado
- [ ] Ter à mão o arquivo `case_planilha.xlsx` previamente gerado como fallback

---

## Bloco 1 — Contexto (1 min)

> *"Quero abrir lembrando do cenário em que pilhas estão hoje. Pós-Brumadinho a ANM trouxe Res. 85/2021,
> 95/2022 e 189/2024. ABNT atualizou as NBRs 13028 e 13029. ICMM consolidou o GISTM — global standard
> que BHP, CBA, Nexa, Vale já assinaram. E agora estão tramitando o PL 2.519 em Minas e o PL 3.799 federal,
> que vão obrigar transparência ativa por ativo. Quem chegar bagunçado nesse novo regime vai pagar caro."*

**Mensagens-chave:** pressão regulatória crescente · janela curta · custo de IC/autuação supera prevenção

---

## Bloco 2 — Apresentação da ferramenta (2 min)

Abrir `/pilhas`. Mostrar:

1. **Seletor de modo** (Auditoria · Licenciamento · Fechamento)
   > *"A ferramenta atende três casos. Hoje vou focar em **Auditoria** — diagnóstico de ativo em operação,
   > que é o cenário mais comum dos clientes da Summo."*

2. **KPIs no topo** (documentos, requisitos, normas)
   > *"108 requisitos auditáveis, 85 documentos mapeados, 23 normas — federal, estadual, ABNT e ICMM."*

3. **Aba "Arcabouço"** — passar rápido pela lista de normas
   > *"Note que cobrimos não só legislação vigente, mas também os dois projetos de lei em curso."*

---

## Bloco 3 — Walkthrough técnico (4 min)

### 3.1 Preencher dados da pilha (1 min)

Inputar (devagar, comentando):
- Nome: "Pilha PDR Itabirito Norte"
- Classe: 5
- Tipo: rejeito
- Método: dry stack
- Material: minério de ferro
- Altura: 95m
- Volume: 18.000.000 m³
- Consequência GISTM: high
- Município: Itabirito

> *"Esses dados alimentam o relatório e ajustam os requisitos aplicáveis.
> Em produção, conseguimos auto-popular boa parte a partir do CNPJ — temos
> integração com SCM da ANM, CFEM, IBAMA, SEMAD."*

### 3.2 Avaliar requisitos (2 min)

Ir para aba **Avaliar**. Marcar uns 8–10 requisitos misturando:
- Atende (verde)
- Atende Parcialmente (amarelo) — comentar: *"o ponto típico que vira IC"*
- Não Atende (vermelho) — comentar: *"em produção, isso já carregaria o plano de ação"*
- Não Aplica — comentar: *"o sistema reconhece e ajusta o denominador"*

Apertar **"Calcular Conformidade"**. Mostrar resultado.

> *"Aqui temos score ponderado por peso de requisito, classificação automática, KPIs
> e recomendações priorizadas. Tudo derivado da metodologia que aplicamos em consultoria."*

### 3.3 Gerar entregáveis (1 min)

1. Clicar **"Gerar Relatório (HTML/PDF)"** → abre em nova aba
   > *"Relatório auditável, identidade Summo, gauge de conformidade, dados do ativo,
   > plano de ação, arcabouço aplicado. Imprime direto como PDF — Ctrl+P."*

2. Voltar e clicar **"Baixar Planilha (XLSX)"**
   > *"E a planilha auditável com 4 abas: Dashboard, Inventário, Avaliação e Plano de
   > Ação. Esta última já vem com colunas de Responsável, Prazo e Status em branco,
   > prontas para a equipe operacional preencher e acompanhar."*

Abrir o XLSX rapidamente (Excel) e mostrar a aba **Plano de Ação** com a formatação condicional.

---

## Bloco 4 — Diferencial Summo (2 min)

> *"O diferencial aqui não é a ferramenta isoladamente — é o que vem com ela."*

Os 4 pilares (citar oralmente, sem slide):

1. **Sócios sêniores com 30+ anos** de mineração e metalurgia — conhecem a engenharia, o regulador e o C-level
2. **Plataforma proprietária** que consolida 16 fontes públicas (ANM, IBAMA, SEMAD, COPAM, CFEM, RAL, SCM, infrações, áreas protegidas, normas)
3. **Boas práticas internacionais** incorporadas — ICMM Good Practice 2025, MAC Tailings Guide v3.1, ANCOLD, AECOM, lições pós-Brumadinho
4. **Ancorada em "Gestão de Riscos e Crises"** — uma das 4 frentes históricas da Summo Quartile, com casos de uso em BHP, CSN, Nexa, CBA, Petrobras, Cosan

> *"Auditorias de pilha não são commodity. O que diferencia é quem lê os dados e
> sabe traduzir para a diretoria, e a Summo tem essa cadeira no mercado há mais de uma década."*

---

## Bloco 5 — Próximos passos (1 min)

> *"Proposta concreta: queremos rodar uma **auditoria piloto em 1 pilha** com condição
> comercial diferenciada. Em 4 a 6 semanas entregamos o diagnóstico completo, plano de
> ação e plataforma para vocês continuarem acompanhando. Se fizer sentido, evoluímos
> para programa anual ou multi-ativo."*

**CTAs (escolher 1):**
- "Posso enviar a proposta formal até [data]?"
- "Vocês conseguem indicar a pilha mais crítica para o piloto?"
- "Quem é a pessoa do operacional/segurança de barragens com quem alinho o escopo técnico?"

---

## Perguntas-objeção previstas

| Objeção | Resposta curta |
|---|---|
| "Já temos equipe interna" | "Perfeito. Funcionamos como **independent review** complementar — aceitação ICMM e bons rituais de auditoria pressupõem terceira parte." |
| "Quanto custa?" | One-pager — Tier 1 R\$ 45–65k pontual / Tier 2 R\$ 95–140k anual. Mas o ticket é o de menos: o ROI vem do IC/autuação evitada. |
| "Outras consultorias fazem isso" | "Fazem. O que entregamos a mais é (1) plataforma proprietária que mantém o trabalho vivo entre auditorias e (2) acesso sênior C-level dos sócios." |
| "GISTM serve para nós?" | "Se vocês exportam ou estão em fundos com critério ESG, sim — é a régua de fato. Temos overlay opcional com 77 requisitos." |
| "Quanto tempo de implantação?" | Tier 1: 4 semanas. Tier 2: arranque em 6 semanas, depois ritmo trimestral. |
| "Vão entender a particularidade do nosso ativo?" | "Sim — método construtivo, classe de consequência, material e geometria entram como variáveis no scoring. E sempre tem visita técnica no Tier 2." |

---

## Pós-demo

- [ ] Enviar one-pager (PDF do `comercial_pilhas_one_pager.html`)
- [ ] Enviar planilha demo gerada na call como anexo
- [ ] Agendar reunião de aprofundamento técnico com a área de segurança de barragens do cliente
- [ ] Registrar lead no CRM com tier comercial e ativo-alvo
