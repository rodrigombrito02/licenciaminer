# Deploy — Sistema Summo Quartile

Guia passo-a-passo para publicar a plataforma em produção.

**Arquitetura:**

```
┌─────────────────┐         ┌──────────────────┐
│  Vercel         │ ──API─→ │  Railway         │
│  Frontend       │         │  Backend         │
│  (Next.js)      │         │  (FastAPI)       │
│  R$ 0/mês       │         │  ~US$ 5/mês      │
└─────────────────┘         └─────────┬────────┘
                                      │
                                      ↓ Volume persistente
                            ┌──────────────────┐
                            │  Parquets 347MB  │
                            │  + SQLites       │
                            │  + DuckDB        │
                            └──────────────────┘
```

---

## ✅ Pré-requisitos no repo (já feitos)

- [x] `requirements.txt` — deps Python para o backend
- [x] `Procfile` — comando de start
- [x] `runtime.txt` — Python 3.11
- [x] `nixpacks.toml` — config de build com gdal/geos/proj
- [x] `railway.json` — healthcheck e restart policy
- [x] `api/main.py` — CORS configurável por env var
- [x] `.env.example` — documentação das vars

---

## Fase 1 — Frontend no Vercel (15 min, R$ 0)

### 1.1 Importar projeto
1. Acesse https://vercel.com/dashboard → **"Add New" → "Project"**
2. Selecione o repo `rodrigombrito02/licenciaminer`
3. **Configurar:**
   - **Project Name**: `summoquartile` (ou outro nome livre — vira a URL)
   - **Framework Preset**: Next.js (auto-detecta)
   - **Root Directory**: `web` ← **importante mudar do default**
   - **Build/Output**: deixar default
4. **Environment Variables** (placeholder):
   ```
   NEXT_PUBLIC_API_URL = https://placeholder.up.railway.app/api
   ```
5. **Deploy** → ~3 min → você tem `summoquartile.vercel.app`

**Resultado**: tela carrega mas nada funciona (API ainda não existe). Próximo passo: subir o backend.

---

## Fase 2 — Backend no Railway (30-45 min, free tier)

### 2.1 Criar conta e projeto
1. https://railway.com → **Login with GitHub**
2. **"New Project" → "Deploy from GitHub repo"**
3. Selecione `rodrigombrito02/licenciaminer`
4. Railway detecta automaticamente `nixpacks.toml` e `Procfile`
5. **Aguarde primeiro build (~5-8 min na primeira vez)**

### 2.2 Adicionar Volume persistente para os parquets
1. No projeto Railway → aba **"Volumes"** → **"Create Volume"**
2. **Mount path**: `/app/data`
3. **Size**: 1 GB (Free tier inclui 0.5 GB; pode subir pra 1GB)
4. Conectar ao service do backend

### 2.3 Environment Variables (Railway → Variables)
```bash
# Obrigatorias
DATA_DIR=/app/data
CORS_ORIGINS=https://summoquartile.vercel.app

# Opcional (so se for usar chat)
# ANTHROPIC_API_KEY=sk-ant-...
```

### 2.4 Subir os 347MB de parquets pro volume
**Opção A — Railway CLI (recomendado):**
```bash
# No seu computador local:
npm install -g @railway/cli
railway login
railway link  # escolher o projeto

# Subir parquets (do diretório licenciaminer):
railway run --service summoquartile-api -- bash -c "ls /app/data/processed"
# (verifica que volume montou)

# Copiar via SSH ou via upload script
# Detalhes em: https://docs.railway.com/reference/volumes
```

**Opção B — Setup script no startup:**
Adicione um script que baixe os parquets de um S3/Backblaze B2 no primeiro start. Mais complexo, mas evita upload manual.

### 2.5 Pegar a URL pública
- Railway → Settings → **"Generate Domain"** → gera `summoquartile-api.up.railway.app`
- Ou customize: **"Custom Domain"** → seu próprio (precisa DNS)

### 2.6 Testar
```
curl https://summoquartile-api.up.railway.app/health
# Deve retornar: {"status":"ok"}

curl https://summoquartile-api.up.railway.app/api/pilhas/stats
# Deve retornar JSON com estatísticas
```

---

## Fase 3 — Conectar Vercel ao Railway (5 min)

1. Vercel → Project → Settings → **Environment Variables**
2. Edite `NEXT_PUBLIC_API_URL`:
   ```
   NEXT_PUBLIC_API_URL = https://summoquartile-api.up.railway.app/api
   ```
3. **Deployments** → último deploy → **"Redeploy"**
4. Aguarda ~2 min
5. **Sistema funcionando online** 🎉

---

## Fase 4 (FUTURA) — Auth via Cloudflare Access (~20 min, R$ 0 até 50 usuários)

Por ora a URL é "pública mas obscura" — qualquer um que tiver o link entra. Para uso interno + sócios em fase de testes, isso é suficiente.

**Quando ativar Cloudflare Access:**
- Antes de divulgar URL a qualquer cliente
- Quando começar a colocar dados sensíveis de clientes
- Antes do piloto MUSA real

**Pré-requisito**: domínio próprio no Cloudflare (ex: `summoquartile.app` por R$ 40/ano, ou subdomínio `app.summoquartile.com`).

Setup detalhado quando chegar a hora.

---

## Troubleshooting comum

### "Failed to fetch" no frontend
- Verifica se `NEXT_PUBLIC_API_URL` no Vercel aponta pro Railway certo
- Verifica se CORS_ORIGINS no Railway contém a URL do Vercel
- Verifica se o backend está respondendo: `curl <URL>/health`

### Backend não inicializa
- Railway → Logs → procurar erro de import
- Verificar se `requirements.txt` tem todas as deps que `api/main.py` importa
- Se faltar lib do sistema (geopandas pede gdal), conferir `nixpacks.toml`

### Parquets não encontrados
- Verificar que `DATA_DIR=/app/data` está setado
- Verificar que volume montou: `railway run -- ls /app/data/processed`
- Confirmar upload dos parquets

### Sleep/cold start no free tier
- Railway free não dorme (US$ 5 crédito/mês). Render free dorme após 15min.
- Se mudar pra Render Free, primeiro acesso após pausa demora 30-60s.

---

## Custo mensal estimado

| Item | Custo |
|---|---|
| Vercel Hobby (frontend) | R$ 0 |
| Railway free tier (até US$ 5 crédito) | R$ 0 |
| Volume 1GB Railway | incluído no crédito |
| Anthropic API (se ativar chat) | pay-as-you-go, ~R$ 50-200/mês |
| Cloudflare Access (futuro, até 50 users) | R$ 0 |
| **Total inicial** | **R$ 0** |

Quando exceder o free credit Railway (uso muito intenso), Pro Plan: US$ 20/mês.
