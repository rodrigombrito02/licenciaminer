# Due Diligence — Requisitos Editáveis + Hierarquia Documento→Critérios

> **Tipo:** Plano de evolução (DESENHO, não implementação).
> **Escopo:** módulo Due Diligence (`/due-diligence`, `/ambiental/diligencia`).
> **Princípio diretor:** **aditivo e não-quebra.** Nada que está no ar pode parar. O CSV
> estático vira o *template v1* persistido; o fluxo stateless atual continua funcionando
> intacto enquanto a camada de persistência sobe ao lado.

---

## 1. Situação atual (linha de base)

O módulo é **stateless**. Não há banco de DD.

- **Fonte de verdade = 3 CSVs** em `data/reference/`:
  - `dd_inventario_documentos.csv` — 119 documentos exigidos por licença
    (colunas: `abrangencia, classificacao, modalidade, etapa, fase, licenca, documento,
    doc_id, descricao, aplicabilidade, esfera, norma_referencia, vigente, data_ultima_verificacao`).
  - `dd_requisitos_testes.csv` — **2405 linhas**. Header real:
    `requisito_id, tipo, licenca, documento, modulo, topico, teste_aderencia,
    evidencia_esperada, peso, impacto, norma_origem, artigo_referencia,
    aplicabilidade_uf, data_mapeamento`. **`evidencia_esperada` é o "critério" de hoje,
    de forma plana** (ex.: linha R.02 = documento `LAS_RAS`, tópico "Identificação do
    Empreendedor", evidência "a) Razão social / Nome").
  - `dd_ponderacao.csv` — 8 linhas, escala de peso por (tipo_risco, nivel).
- **Lógica de negócio**: `app/components/dd_inventory.py` (carrega CSV + `LICENCA_MAP`,
  `LICENCA_DESC`, `filtrar_documentos`, `filtrar_requisitos`) e
  `app/components/dd_scoring.py` (`AVALIACOES`, `CONFORMIDADE_ESCALA`,
  `calcular_conformidade`, `gerar_recomendacoes`, `calcular_checklist_completude`).
- **API**: `api/routers/due_diligence.py` (prefix `/api`), endpoints
  `/due-diligence/{license-types,scale,documents,requirements,all-requirements,score,
  upload,criticality,export-xlsx,report/fase1..5}`. O mapeamento licença→docs é
  **hardcoded** em `LICENCA_REQ_KEYS`.
- **Front**: `web/src/app/(dashboard)/due-diligence/page.tsx` (wizard interativo de 5 fases,
  1623 linhas; avaliações guardadas só em estado React) + `.../ambiental/diligencia/page.tsx`
  (landing/explicação). Client em `web/src/lib/api.ts`.

### Limitações que este plano resolve

1. O consultor **não pode editar** requisitos/critérios — tudo vem do CSV.
2. **Não há instâncias por cliente** — a avaliação não persiste nem versiona.
3. A hierarquia **documento → critérios é implícita** (`evidencia_esperada` plana). Não há
   noção de critério obrigatório vs desejável, nem conformidade do documento *derivada* dos
   critérios. Não há proveniência (normativo vs consultor) nem trilha de auditoria.

### Padrão de módulo a copiar (referência)

`src/licenciaminer/sqsolucoes/{database.py,seed.py}` + `api/routers/sqsolucoes.py` +
`web/src/lib/sqsolucoes-api.ts`. Convenções confirmadas:

- **DB próprio SQLite isolado** em `data/<mod>.db`; `Base(DeclarativeBase)`, `engine` com
  `check_same_thread=False`, `SessionLocal`, `get_session()` generator, `init_db()`
  idempotente (`Base.metadata.create_all`).
- **Router** com `prefix="/api/<mod>"`, registrado em `api/main.py` (import no bloco
  `from api.routers import (...)` + `app.include_router(...)`).
- **Seed idempotente** (`if db.query(X).count() > 0 and not force: return`), chamado no
  `_background_init()` do `lifespan` via `asyncio.to_thread`.
- **Client** em `web/src/lib/<mod>-api.ts` com `BASE = ${API}/<mod>` e helpers `jget/jsend`.

---

## 2. Modelo conceitual

Duas dimensões novas, ortogonais ao que existe:

```
TEMPLATE (régua-mestre, por licença, versionada)
  └─ DOCUMENTO (filho do template)
       └─ CRITÉRIO (filho do documento)  ← era evidencia_esperada plana
            • proveniência: normativo | consultor
            • obrigatoriedade: obrigatorio | desejavel
            • peso (mora aqui)

         ── snapshot na criação ──▶

INSTÂNCIA / AVALIAÇÃO (DD de UM cliente/escopo, cópia congelada do template numa versão)
  └─ DOCUMENTO (snapshot)
       └─ CRITÉRIO (snapshot)  ──▶  AVALIAÇÃO POR CRITÉRIO (Atende/Parcial/Não Atende/Não Aplica)

AUDITORIA  (quem mudou o quê, quando, por quê) — sobre template, documento, critério, instância.
```

**Regras-chave:**

- **Template vs Instância.** Template é a régua-mestre por licença (editável pelo consultor).
  Instância nasce como **cópia/snapshot** do template *numa versão específica*. Editar o
  template depois **não altera** instâncias já criadas (versionamento).
- **Proveniência.** Cada critério marca `proveniencia = normativo | consultor`. Os 2405 do CSV
  entram como `normativo`. Critérios adicionados pelo consultor entram como `consultor`.
- **Trilha de auditoria.** Toda alteração (criar/editar/desativar critério, customizar
  instância) grava autor, data, ação e justificativa.
- **Conformidade do documento DERIVADA dos critérios** (ver §6).
- **"Não Aplica" propaga**: critério N/A sai do denominador; documento 100% N/A vira N/A.

---

## 3. Modelo de dados (SQLAlchemy concreto)

Novo módulo `src/licenciaminer/dd/` → `data/dd.db`. Espelha `sqsolucoes/database.py`.

```python
# src/licenciaminer/dd/database.py
DB_PATH = Path(__file__).resolve().parents[3] / "data" / "dd.db"
DB_URL = f"sqlite:///{DB_PATH.as_posix()}"
engine = create_engine(DB_URL, connect_args={"check_same_thread": False}, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)

class Base(DeclarativeBase): ...

# enums como constantes (string), seguindo o estilo do módulo
PROVENIENCIA = ["normativo", "consultor"]
OBRIGATORIEDADE = ["obrigatorio", "desejavel"]
OBJETO_TIPO = ["licenca_ambiental", "anuencia", "regularizacao_fundiaria"]  # multi-objeto (§9)
AVALIACAO_VALORES = {"Atende": 1.0, "Atende Parcialmente": 0.5, "Não Atende": 0.0, "Não Aplica": None}
INSTANCIA_STATUS = ["rascunho", "em_avaliacao", "concluida", "arquivada"]
```

### 3.1 `dd_template` — régua-mestre versionada

```python
class DDTemplate(Base):
    __tablename__ = "dd_templates"
    id:            Mapped[int]  = mapped_column(Integer, primary_key=True, autoincrement=True)
    objeto_tipo:   Mapped[str]  = mapped_column(String(40), default="licenca_ambiental")  # OBJETO_TIPO
    licenca_codigo:Mapped[str]  = mapped_column(String(40))   # "LAC1", "IPHAN", "REG_FUNDIARIA"...
    nome:          Mapped[str]  = mapped_column(String(200))
    descricao:     Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    versao:        Mapped[int]  = mapped_column(Integer, default=1)   # versionamento (§ regra)
    norma_origem:  Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    ativo:         Mapped[bool] = mapped_column(default=True)         # só 1 versão ativa por licenca_codigo
    criado_por:    Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    criado_em:     Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    documentos: Mapped[list["DDDocumento"]] = relationship(
        back_populates="template", cascade="all, delete-orphan")
```

### 3.2 `dd_documento` — filho do template

```python
class DDDocumento(Base):
    __tablename__ = "dd_documentos"
    id:           Mapped[int]  = mapped_column(Integer, primary_key=True, autoincrement=True)
    template_id:  Mapped[int]  = mapped_column(ForeignKey("dd_templates.id", ondelete="CASCADE"))
    doc_id:       Mapped[Optional[str]] = mapped_column(String(60), nullable=True)  # chave legada (EIA, PRAD, LAS_RAS)
    nome:         Mapped[str]  = mapped_column(String(250))
    descricao:    Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    modulo:       Mapped[Optional[str]] = mapped_column(String(120), nullable=True)  # "MÓDULO 1 — IDENTIFICAÇÃO"
    norma_referencia: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    obrigatorio:  Mapped[bool] = mapped_column(default=True)   # doc obrigatório vs opcional p/ a licença
    ordem:        Mapped[int]  = mapped_column(Integer, default=0)
    template: Mapped[DDTemplate] = relationship(back_populates="documentos")
    criterios: Mapped[list["DDCriterio"]] = relationship(
        back_populates="documento", cascade="all, delete-orphan")
```

### 3.3 `dd_criterio` — filho do documento (era `evidencia_esperada`)

```python
class DDCriterio(Base):
    __tablename__ = "dd_criterios"
    id:            Mapped[int]  = mapped_column(Integer, primary_key=True, autoincrement=True)
    documento_id:  Mapped[int]  = mapped_column(ForeignKey("dd_documentos.id", ondelete="CASCADE"))
    requisito_id:  Mapped[Optional[str]] = mapped_column(String(40), nullable=True)  # "R.02" legado (rastreio)
    topico:        Mapped[Optional[str]] = mapped_column(String(250), nullable=True) # "Tópico 1.1 – ..."
    teste_aderencia: Mapped[Optional[str]] = mapped_column(Text, nullable=True)      # a pergunta
    evidencia_esperada: Mapped[str] = mapped_column(Text)                            # o critério em si
    # — novos eixos —
    proveniencia:  Mapped[str]  = mapped_column(String(20), default="normativo")     # PROVENIENCIA
    obrigatoriedade: Mapped[str] = mapped_column(String(20), default="obrigatorio")  # OBRIGATORIEDADE
    peso:          Mapped[float] = mapped_column(Float, default=1.0)                 # PESO MORA AQUI
    impacto:       Mapped[Optional[float]] = mapped_column(Float, nullable=True)     # p/ criticidade
    norma_origem:  Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    artigo_referencia: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    ativo:         Mapped[bool] = mapped_column(default=True)        # soft-delete (não apaga histórico)
    ordem:         Mapped[int]  = mapped_column(Integer, default=0)
    documento: Mapped[DDDocumento] = relationship(back_populates="criterios")
```

### 3.4 `dd_avaliacao` — instância por cliente/escopo (snapshot)

A instância **embute o snapshot** dos documentos+critérios na versão em que foi criada, de
modo que mudanças futuras no template não a afetem. Snapshot armazenado em tabelas-filhas
dedicadas (não JSON solto) para permitir consulta/score.

```python
class DDInstancia(Base):
    __tablename__ = "dd_instancias"
    id:            Mapped[int]  = mapped_column(Integer, primary_key=True, autoincrement=True)
    template_id:   Mapped[int]  = mapped_column(ForeignKey("dd_templates.id"))  # origem
    template_versao: Mapped[int] = mapped_column(Integer)                       # versão congelada
    objeto_tipo:   Mapped[str]  = mapped_column(String(40))
    licenca_codigo:Mapped[str]  = mapped_column(String(40))
    cliente:       Mapped[str]  = mapped_column(String(200))
    escopo:        Mapped[Optional[str]] = mapped_column(String(250), nullable=True)  # atividade/classe/área
    atividade:     Mapped[Optional[str]] = mapped_column(String(60), nullable=True)
    classe:        Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    status:        Mapped[str]  = mapped_column(String(20), default="rascunho")   # INSTANCIA_STATUS
    criado_por:    Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    criado_em:     Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    documentos: Mapped[list["DDInstanciaDocumento"]] = relationship(
        back_populates="instancia", cascade="all, delete-orphan")

class DDInstanciaDocumento(Base):
    __tablename__ = "dd_instancia_documentos"
    id:            Mapped[int]  = mapped_column(Integer, primary_key=True, autoincrement=True)
    instancia_id:  Mapped[int]  = mapped_column(ForeignKey("dd_instancias.id", ondelete="CASCADE"))
    doc_id:        Mapped[Optional[str]] = mapped_column(String(60), nullable=True)
    nome:          Mapped[str]  = mapped_column(String(250))
    obrigatorio:   Mapped[bool] = mapped_column(default=True)
    status_doc:    Mapped[Optional[str]] = mapped_column(String(30), nullable=True)  # Apresentado/Parcial/Não Apresentado
    arquivo_ref:   Mapped[Optional[str]] = mapped_column(String(250), nullable=True) # nome do PDF analisado
    instancia: Mapped[DDInstancia] = relationship(back_populates="documentos")
    criterios: Mapped[list["DDInstanciaCriterio"]] = relationship(
        back_populates="documento", cascade="all, delete-orphan")

class DDInstanciaCriterio(Base):
    __tablename__ = "dd_instancia_criterios"
    id:               Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    inst_documento_id:Mapped[int] = mapped_column(ForeignKey("dd_instancia_documentos.id", ondelete="CASCADE"))
    criterio_origem_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)  # rastreia o template
    requisito_id:     Mapped[Optional[str]] = mapped_column(String(40), nullable=True)
    topico:           Mapped[Optional[str]] = mapped_column(String(250), nullable=True)
    teste_aderencia:  Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    evidencia_esperada: Mapped[str] = mapped_column(Text)
    proveniencia:     Mapped[str] = mapped_column(String(20), default="normativo")
    obrigatoriedade:  Mapped[str] = mapped_column(String(20), default="obrigatorio")
    peso:             Mapped[float] = mapped_column(Float, default=1.0)
    # — avaliação do consultor —
    avaliacao:        Mapped[Optional[str]] = mapped_column(String(30), nullable=True)  # AVALIACAO_VALORES
    observacao:       Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    evidencia_encontrada: Mapped[Optional[str]] = mapped_column(Text, nullable=True)    # IA preenche (Fase 3)
    fonte_avaliacao:  Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # manual | ia
    documento: Mapped[DDInstanciaDocumento] = relationship(back_populates="criterios")
```

### 3.5 `dd_auditoria` — trilha (autor/data/justificativa)

```python
class DDAuditoria(Base):
    __tablename__ = "dd_auditoria"
    id:        Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    entidade:  Mapped[str] = mapped_column(String(30))   # template|documento|criterio|instancia|inst_criterio
    entidade_id: Mapped[int] = mapped_column(Integer)
    acao:      Mapped[str] = mapped_column(String(30))   # criar|editar|desativar|snapshot|avaliar
    autor:     Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    justificativa: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    diff:      Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)  # {campo:[antes,depois]}
    criado_em: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
```

`get_session()` + `init_db()` idênticos ao padrão sqsolucoes.

---

## 4. Estratégia de SEED a partir dos 3 CSVs

`src/licenciaminer/dd/seed.py`, idempotente, chamado no `_background_init()`. **Não joga
fora** o mapeamento legal nem as 2405 linhas — elas viram o **template v1**.

1. **Reaproveitar a lógica existente** (não reescrever): importar de
   `app/components/dd_inventory.py` (`load_inventario`, `load_requisitos`, `LICENCA_MAP`,
   `LICENCA_DESC`) e de `due_diligence.py` (`LICENCA_REQ_KEYS`). O CSV permanece como fonte
   do seed; o banco é uma materialização.
2. **Um template por licença** (`LICENCA_TIPOS`): cria `DDTemplate(licenca_codigo=cod,
   versao=1, ativo=True, objeto_tipo="licenca_ambiental")`.
3. **Documentos**: para cada licença, usar `filtrar_documentos(cod)` + `LICENCA_REQ_KEYS` para
   montar o conjunto de docs. Cada doc do inventário → `DDDocumento` (mapeando
   `documento, doc_id, descricao, modulo, norma_referencia`).
4. **Critérios**: para cada doc, `filtrar_requisitos(doc)` (as linhas do
   `dd_requisitos_testes.csv`). Cada linha → `DDCriterio` com:
   - `evidencia_esperada` ← coluna `evidencia_esperada` (o critério plano de hoje),
   - `requisito_id, topico, teste_aderencia, impacto, norma_origem, artigo_referencia` ← colunas homônimas,
   - `proveniencia = "normativo"`, `obrigatoriedade = "obrigatorio"` (default normativo),
   - `peso` ← coluna `peso` se numérica, senão derivar de `dd_ponderacao.csv`
     (`tipo_risco/nivel → peso`); fallback `1.0`.
5. **Idempotência**: `if db.query(DDTemplate).count() > 0 and not force: return`.
6. **Auditoria de origem**: 1 registro `DDAuditoria(acao="snapshot",
   justificativa="seed v1 a partir de dd_*.csv")` por template.
7. **Validação pós-seed** (log): nº de templates == len(LICENCA_TIPOS); soma de critérios
   reconcilia com as 2405 linhas aplicadas (descontando linhas órfãs sem doc mapeado).

---

## 5. Endpoints da API

Novo router `api/routers/dd_templates.py` com `prefix="/api/dd"`, registrado em `api/main.py`
(import + `app.include_router(dd_templates.router)`). **Não toca** em
`api/routers/due_diligence.py` (que segue stateless). Convive ao lado.

### Templates / Documentos / Critérios (edição pelo consultor)

| Método | Rota | Função |
|---|---|---|
| GET | `/dd/templates` | lista templates (filtra `objeto_tipo`, `licenca_codigo`, `ativo`) |
| GET | `/dd/templates/{id}` | template + documentos + critérios (árvore) |
| POST | `/dd/templates` | cria template (ou nova versão de um existente) |
| PATCH | `/dd/templates/{id}` | edita metadados (exige `autor`+`justificativa` → auditoria) |
| POST | `/dd/templates/{id}/nova-versao` | clona p/ `versao+1` (instâncias antigas intactas) |
| POST | `/dd/documentos` / PATCH `/dd/documentos/{id}` | CRUD documento do template |
| POST | `/dd/criterios` / PATCH `/dd/criterios/{id}` | CRUD critério (peso, proveniência, obrigatoriedade) |
| DELETE | `/dd/criterios/{id}` | soft-delete (`ativo=False`) + auditoria |
| GET | `/dd/auditoria?entidade=&entidade_id=` | trilha de uma entidade |

### Instâncias (snapshot + avaliação + score derivado)

| Método | Rota | Função |
|---|---|---|
| POST | `/dd/instancias` | cria instância = **snapshot** do template ativo (cliente, escopo, atividade, classe) |
| GET | `/dd/instancias` | lista (filtra cliente/status) |
| GET | `/dd/instancias/{id}` | instância + docs + critérios (com avaliações) |
| PATCH | `/dd/instancias/{id}` | status, escopo |
| POST | `/dd/instancias/{id}/criterios/{cid}/avaliar` | grava `avaliacao` + `observacao` (+auditoria) |
| PATCH | `/dd/instancias/{id}/criterios` | avaliação em lote (`{cid: "Atende", ...}`) |
| POST | `/dd/instancias/{id}/criterios` | adiciona critério **só nesta instância** (`proveniencia="consultor"`) |
| GET | `/dd/instancias/{id}/score` | score **derivado** (doc + global), reusando `dd_scoring` (§6) |
| POST | `/dd/instancias/{id}/preencher-ia` | Fase 3: roda IA sobre PDF e popula avaliações (§8 Fase 3) |

**Score derivado reusa `app/components/dd_scoring.py`** (não reimplementa a metodologia):
monta `{criterio_id: avaliacao}` + `{criterio_id: peso}` a partir da instância e chama
`calcular_conformidade(...)`, agregando primeiro por documento e depois global.

---

## 6. Hierarquia documento→critérios e score derivado

Formaliza `evidencia_esperada` como **filho de documento**. A conformidade do documento é
**calculada a partir dos critérios**, não atribuída diretamente:

- **% do documento** = `Σ(valor_critério · peso) / Σ(peso)` sobre critérios **aplicáveis**
  (excluindo `Não Aplica`), onde `valor` ∈ {1.0, 0.5, 0.0} (mesma escala de `AVALIACOES`).
- **Obrigatório vs desejável**: dois sub-scores por documento — *hard* (só `obrigatorio`)
  e *full* (todos). Um documento com **obrigatório "Não Atende"** rebaixa o status do doc
  (regra de gate), independente dos desejáveis.
- **Onde mora o peso**: no **critério** (`DDCriterio.peso` / `DDInstanciaCriterio.peso`). O
  peso do documento é emergente (soma dos pesos dos critérios). O `dd_ponderacao.csv` continua
  alimentando a derivação de peso no seed.
- **"Não Aplica" propaga**: critério N/A sai do denominador; se **todos** os critérios de um
  doc são N/A, o doc inteiro é N/A e sai do score global; idem propaga para o agregado.
- **Status do documento derivado**: faixa de % mapeada na `CONFORMIDADE_ESCALA` existente
  (reuso direto de `classificar_conformidade`).

Resultado: o card do documento mostra "% derivado dos N critérios (X obrigatórios)", e o
score global é a agregação ponderada dos documentos aplicáveis.

---

## 7. Telas do frontend (consultor)

Client novo `web/src/lib/dd-api.ts` (`BASE = ${API}/dd`, helpers `jget/jsend`, interfaces
`DDTemplate, DDDocumento, DDCriterio, DDInstancia, DDInstanciaCriterio, DDScore`). **Não
altera** `web/src/lib/api.ts` (cliente stateless atual segue intacto).

1. **Editor de Régua-Mestre** — `/(dashboard)/due-diligence/templates`
   - Lista de templates por licença (badge de versão, proveniência).
   - Árvore documento → critérios (Collapsible, mesmo padrão visual da página atual).
   - Editar critério inline: texto, **peso**, **obrigatório/desejável**, **proveniência**
     (badge "normativo" travado vs "consultor" editável). Salvar exige justificativa.
   - Botão "Nova versão" (clona; avisa que instâncias antigas não mudam).
   - Aba "Auditoria": timeline de alterações (autor/data/justificativa/diff).

2. **Avaliação de Instância** — `/(dashboard)/due-diligence/instancias/[id]`
   - Reaproveita o wizard atual de 5 fases, mas **persistindo** numa instância.
   - Lista de documentos; cada doc **expande em seus critérios**; ao avaliar critério, a
     **% do documento atualiza ao vivo** (derivada, §6), com selo obrigatório vs desejável.
   - Indicador "X de Y obrigatórios atendidos" + status derivado por doc + score global.
   - Botão "Adicionar critério (consultor)" só nesta instância.
   - Reuso dos endpoints de relatório/XLSX existentes (alimentados pela instância).

3. **Landing** — `/(dashboard)/ambiental/diligencia` ganha dois CTAs novos
   ("Editar réguas", "Minhas diligências") sem remover o fluxo atual.

---

## 8. Plano por fases

### Fase 1 — Fundação / persistência + critérios (aditivo puro)
- Criar `src/licenciaminer/dd/{database.py,seed.py}` (modelo §3, seed §4).
- Registrar `init_db` + `seed` no `_background_init()` do `lifespan` (padrão sqsolucoes).
- Router `dd_templates.py` com GETs de template/árvore + criação de instância (snapshot) +
  endpoint de **score derivado** (§6) reusando `dd_scoring`.
- `web/src/lib/dd-api.ts` + tela read-only da árvore documento→critérios.
- **O fluxo stateless atual continua intocado** — nada é removido.

### Fase 2 — Edição pelo consultor
- PATCH/POST/DELETE de template/documento/critério com **auditoria** obrigatória.
- Versionamento (`nova-versao`) garantindo que instâncias antigas não mudam.
- Editor de Régua-Mestre (tela 1) + aba Auditoria.
- Avaliação persistida por critério (tela 2) com % do doc derivada ao vivo.

### Fase 3 — IA preenche critérios a partir do PDF
- Endpoint `/dd/instancias/{id}/preencher-ia`: usa o **`/due-diligence/upload` já existente**
  para extrair texto do PDF, depois para cada critério do(s) documento(s) chama o LLM
  (padrão de `api/routers/chat.py`) pedindo `{avaliacao, evidencia_encontrada, confianca}`.
- Grava `avaliacao`, `evidencia_encontrada`, `fonte_avaliacao="ia"`; consultor revisa/edita
  (vira `manual`). Auditoria registra origem IA. Score derivado recalcula automaticamente.

---

## 9. Como isso atende a Jaguar

O motor **objeto de conformidade → inventário documental → documento → critérios** é genérico
(`objeto_tipo` + template versionado). Isso destrava os quatro pedidos:

- **Faseamento de NOVOS licenciamentos.** Cada fase (LP→LI→LO ou LAC1/LAC2) já é um
  `licenca_codigo` com template próprio. Abrir um novo licenciamento = criar uma **instância**
  (snapshot) por fase; o progresso e o que falta ficam persistidos e versionados por fase.
- **INFORMAÇÃO COMPLEMENTAR.** O motor documento→critérios **é o gabarito do que falta**:
  rodar o score derivado da instância lista exatamente os critérios `Não Atende`/`Não Aplica`
  e os documentos com obrigatórios pendentes — esse é o conteúdo da resposta ao órgão. O
  `gerar_recomendacoes` existente já vira o esqueleto do ofício de complementação.
- **MULTI-ANUÊNCIAS (IPHAN / IBAMA).** São novos **objetos de conformidade**
  (`objeto_tipo="anuencia"`, `licenca_codigo="IPHAN"`, `"IBAMA_FAUNA"`…), cada um com seu
  **inventário próprio** de documentos+critérios num template dedicado. Mesma máquina de
  snapshot/avaliação/score; nenhuma mudança estrutural.
- **REGULARIZAÇÃO FUNDIÁRIA.** Novo objeto (`objeto_tipo="regularizacao_fundiaria"`,
  `licenca_codigo` por matrícula/área). O template lista o inventário documental fundiário
  (matrícula, CCIR, ITR, cadeia dominial, georreferenciamento…); a instância por matrícula/área
  responde **o que tem / o que falta / o que é necessário** — exatamente a derivação
  documento→critérios já descrita. O score vira o "% de regularização" da área.

> Em todos os casos, **a metodologia de scoring, a escala de conformidade e os relatórios
> existentes são reutilizados** — muda apenas o `objeto_tipo` e o conteúdo do template.

---

## 10. Garantias de não-quebra (resumo)

- DB novo e isolado (`data/dd.db`); zero alteração em DuckDB ou nos CSVs.
- `api/routers/due_diligence.py` e `web/src/lib/api.ts` **não são editados** — fluxo stateless
  segue no ar; novo router `/api/dd` e novo client `dd-api.ts` vivem ao lado.
- Seed idempotente e em background (não bloqueia healthcheck).
- CSVs permanecem como fonte do seed (reproduzível) e como fallback do fluxo stateless.
