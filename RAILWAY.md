# Railway Deployment Guide

Guida completa per deployare Fun Gaming Platform su Railway.

## 📋 Prerequisiti

1. Account Railway: https://railway.app
2. Repository Git (GitHub, GitLab, o Bitbucket)
3. Accesso al repository

## 🚀 Setup Iniziale

### 1. Connetti Repository a Railway

1. Vai su [Railway Dashboard](https://railway.app)
2. Clicca "New Project"
3. Seleziona "Deploy from GitHub repo"
4. Autorizza Railway e seleziona il tuo repository
5. Railway creerà automaticamente un servizio (lo rimuoveremo e creeremo i nostri)

### 2. Crea PostgreSQL Database

1. Nel progetto Railway, clicca "+ New"
2. Seleziona "Database" → "Add PostgreSQL"
3. Railway creerà automaticamente il database
4. **Nota l'URL del database** (sarà nella sezione Variables)

### 3. Configura Backend Service

1. Clicca "+ New" → "GitHub Repo" (o usa lo stesso repo)
2. Seleziona il tuo repository
3. Nelle impostazioni del servizio:
   - **Name**: `backend` (o `fun-backend`)
   - **Root Directory**: `backend`
   - **Build Command**: `pnpm install && pnpm run build:railway`
   - **Start Command**: `pnpm run start:prod`
   - **Health Check Path**: `/health`
   - **Health Check Timeout**: `100`

### 4. Configura Frontend Service

1. Clicca "+ New" → "GitHub Repo"
2. Seleziona lo stesso repository
3. Nelle impostazioni del servizio:
   - **Name**: `frontend` (o `fun-frontend`)
   - **Root Directory**: `frontend`
   - **Build Command**: `pnpm install && pnpm run build`
   - **Start Command**: `pnpm run start`
   - **Environment**: `production`

## 🔧 Variabili d'Ambiente

### Backend Service Variables

Configura queste variabili nel servizio **backend** su Railway:

```env
# Database (Railway genera automaticamente questa variabile)
# La variabile DATABASE_URL viene aggiunta automaticamente quando connetti il database
# Se non lo fa, aggiungila manualmente dal tab "Variables" del database service

# Port (Railway assegna automaticamente PORT)
PORT=3001

# CORS (URL del frontend su Railway)
CORS_ORIGIN=https://<your-frontend-service>.railway.app

# Wheel Secret (genera un secret sicuro)
WHEEL_SECRET=<genera-un-secret-sicuro>

# Node Environment
NODE_ENV=production
```

### Frontend Service Variables

Configura queste variabili nel servizio **frontend**:

```env
# API URL (URL del backend su Railway)
NEXT_PUBLIC_API_URL=https://<your-backend-service>.railway.app

# Node Environment
NODE_ENV=production
```

## 🔗 Collegare i Servizi

### Collegare Database al Backend

1. Vai al servizio **backend**
2. Clicca sul tab "Variables"
3. Clicca "+ Reference Variable"
4. Seleziona il servizio **PostgreSQL**
5. Seleziona `DATABASE_URL`
6. Railway aggiungerà automaticamente la variabile

### Ottenere gli URL dei Servizi

1. Vai a ogni servizio (backend, frontend)
2. Clicca sul tab "Settings"
3. Trova "Domains" o "Generate Domain"
4. Genera un dominio (es. `fun-backend-production.up.railway.app`)
5. Usa questi URL nelle variabili d'ambiente:
   - `CORS_ORIGIN` nel backend → URL del frontend
   - `NEXT_PUBLIC_API_URL` nel frontend → URL del backend

## 📦 Setup Database (Migrazioni e Seed)

Le migrazioni vengono eseguite automaticamente all'avvio del backend grazie allo script `start:prod` che include `prisma migrate deploy`.

### Eseguire Seed Manualmente (Opzionale)

1. Vai al servizio **backend** su Railway
2. Clicca sul tab "Deployments"
3. Clicca sui tre puntini dell'ultimo deployment
4. Seleziona "Open in VS Code" o usa "Railway CLI"
5. Esegui: `pnpm run prisma:seed`

**Oppure usa Railway CLI:**

```bash
# Installa Railway CLI
npm i -g @railway/cli

# Login
railway login

# Connettiti al progetto
railway link

# Connettiti al servizio backend
railway run --service backend pnpm run prisma:seed
```

## 🔄 Workflow di Deploy

### Deploy Automatico

Railway deploya automaticamente quando:
- Fai push su `main`/`master`
- Merge di una pull request
- Deploy manuale dal dashboard

### Deploy Manuale

1. Vai al servizio su Railway
2. Clicca "Deploy"
3. Seleziona il branch e commit
4. Clicca "Deploy"

## 🧪 Test del Deploy

### Backend Health Check

```bash
curl https://<your-backend-service>.railway.app/health
```

Dovrebbe rispondere:
```json
{"status":"ok","timestamp":"2024-..."}
```

### Frontend

Apri l'URL del frontend nel browser e verifica che:
- La pagina carichi correttamente
- Le API calls funzionino (apri DevTools → Network)
- WebSocket si connetta (controlla console)

## 🐛 Troubleshooting

### Build Fallisce

1. Controlla i log del build sul dashboard Railway
2. Verifica che `pnpm` sia disponibile (Railway lo rileva automaticamente)
3. Controlla che tutte le dipendenze siano in `package.json`

### Database Connection Error

1. Verifica che `DATABASE_URL` sia configurata nel backend
2. Controlla che il database sia in esecuzione
3. Verifica che il database sia collegato al servizio backend

### CORS Errors

1. Verifica che `CORS_ORIGIN` nel backend corrisponda all'URL del frontend
2. Includi sia `https://` che eventuali varianti con/senza `www`

### Prisma Migrations Fail

1. Controlla i log del backend all'avvio
2. Verifica che le migrations siano nel repository (`backend/prisma/migrations/`)
3. Se necessario, esegui manualmente: `railway run --service backend npx prisma migrate deploy`

### Frontend Non Si Connette al Backend

1. Verifica `NEXT_PUBLIC_API_URL` nel frontend
2. Assicurati che inizi con `https://` (non `http://`)
3. Controlla che il backend sia accessibile pubblicamente

## 📊 Monitoraggio

### Logs

- Visualizza i log in tempo reale dal dashboard Railway
- Ogni servizio ha il suo tab "Logs"
- Puoi filtrare per livello (info, error, etc.)

### Metrics

- Railway mostra CPU, Memory, e Network usage
- Monitora il consumo dei crediti gratuiti ($5/mese)

## 💰 Costi

### Piano Gratuito

- **$5 crediti al mese**
- PostgreSQL incluso
- ~100 ore di runtime al mese
- Perfetto per sviluppo/test

### Upgrade

- Starter: $5/mese + $0.01/ora per servizio
- Pro: $20/mese + crediti aggiuntivi

## 🔐 Sicurezza

### Environment Variables Sensibili

- **Non committare** `.env` files
- Usa Railway Variables per tutti i secret
- Genera secret sicuri per produzione:
  ```bash
  # Per WHEEL_SECRET
  openssl rand -hex 32
  ```

### HTTPS

- Railway fornisce HTTPS automaticamente
- Usa sempre `https://` negli URL di produzione
- Non configurare certificati manualmente

## 📝 Checklist Pre-Deploy

- [ ] Database PostgreSQL creato e collegato
- [ ] Backend service configurato con root directory `backend`
- [ ] Frontend service configurato con root directory `frontend`
- [ ] Variabili d'ambiente configurate per entrambi i servizi
- [ ] `DATABASE_URL` collegata dal database al backend
- [ ] `CORS_ORIGIN` punta all'URL del frontend
- [ ] `NEXT_PUBLIC_API_URL` punta all'URL del backend
- [ ] `WHEEL_SECRET` generato e configurato
- [ ] Migrazioni Prisma eseguite (automatico con `start:prod`)
- [ ] Seed eseguito manualmente (opzionale)
- [ ] Health check backend funziona
- [ ] Frontend carica correttamente
- [ ] Test completo della piattaforma

## 🆘 Supporto

- [Railway Docs](https://docs.railway.app)
- [Railway Discord](https://discord.gg/railway)
- [Railway Status](https://status.railway.app)

---

**Buon deploy! 🚀**

