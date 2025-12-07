# 🚀 Guida Passo-Passo: Deploy su Railway

Questa guida ti accompagna passo-passo nel deployment della piattaforma Fun su Railway.

## 📋 Prima di Iniziare

Assicurati di avere:
- ✅ Account GitHub/GitLab/Bitbucket con il repository
- ✅ Codice committato e pushato sul repository
- ✅ 15-20 minuti di tempo

---

## STEP 1: Creare Account Railway

### 1.1 Apri Railway
Vai su: **https://railway.app**

### 1.2 Crea Account
1. Clicca su **"Start a New Project"** o **"Login"**
2. Seleziona **"Login with GitHub"** (o GitLab/Bitbucket)
3. Autorizza Railway ad accedere ai tuoi repository

✅ **Checkpoint**: Dovresti vedere la dashboard di Railway

---

## STEP 2: Creare Nuovo Progetto

### 2.1 Crea Progetto
1. Clicca sul bottone **"+ New Project"** (in alto a destra)
2. Seleziona **"Deploy from GitHub repo"** (o il tuo provider Git)
3. Autorizza Railway se richiesto

### 2.2 Seleziona Repository
1. Trova il repository **fun** nella lista
2. Clicca su di esso per selezionarlo
3. Railway creerà automaticamente un progetto con un servizio

### 2.3 Rimuovi Servizio Automatico
Railway avrà creato automaticamente un servizio. **Per ora ignoriamolo**, lo configureremo dopo.

✅ **Checkpoint**: Vedi il progetto creato nella dashboard

---

## STEP 3: Aggiungere Database PostgreSQL

### 3.1 Aggiungi Database
1. Nel progetto, clicca su **"+ New"** (o **"Add Service"**)
2. Seleziona **"Database"**
3. Clicca su **"Add PostgreSQL"**

### 3.2 Configura Database
Railway creerà automaticamente:
- Un database PostgreSQL
- Le variabili d'ambiente necessarie

### 3.3 Salva Informazioni Database
1. Clicca sul servizio **PostgreSQL** appena creato
2. Vai al tab **"Variables"**
3. **Copiami** il valore di `DATABASE_URL` (lo useremo dopo)
   - Dovrebbe essere simile a: `postgresql://postgres:password@hostname:5432/railway`
4. **IMPORTANTE**: Tieni questa finestra aperta, ci servirà dopo

✅ **Checkpoint**: Database PostgreSQL creato e `DATABASE_URL` salvato

---

## STEP 4: Configurare Backend Service

### 4.1 Crea Servizio Backend
1. Torna al progetto principale
2. Clicca **"+ New"** → **"GitHub Repo"**
3. Seleziona lo **stesso repository** (fun)
4. Clicca **"Deploy Now"**

### 4.2 Configura Root Directory
1. Clicca sul servizio appena creato
2. Vai al tab **"Settings"** (⚙️)
3. Scorri fino a **"Root Directory"**
4. Inserisci: `backend`
5. Clicca **"Update"** per salvare

### 4.3 Configura Build Command
1. Sempre in **"Settings"**, trova **"Build Command"**
2. Inserisci:
   ```bash
   pnpm install && pnpm run build:railway
   ```
3. Clicca **"Update"**

### 4.4 Configura Start Command
1. Trova **"Start Command"**
2. Inserisci:
   ```bash
   pnpm run start:prod
   ```
3. Clicca **"Update"**

### 4.5 Configura Health Check (Opzionale ma Consigliato)
1. Trova **"Health Check Path"**
2. Inserisci: `/health`
3. Health Check Timeout: `100`
4. Clicca **"Update"**

### 4.6 Rinomina Servizio
1. In cima alla pagina, clicca sul nome del servizio
2. Rinominalo in: `backend` o `fun-backend`
3. Premi Enter per salvare

✅ **Checkpoint**: Backend configurato con root directory, build e start command

---

## STEP 5: Configurare Variabili d'Ambiente Backend

### 5.1 Apri Tab Variables
1. Nel servizio **backend**, vai al tab **"Variables"**

### 5.2 Collega Database URL
1. Clicca **"+ New Variable"**
2. Clicca su **"Reference Variable"** (icona 🔗)
3. Nel popup:
   - **Service**: Seleziona il tuo servizio **PostgreSQL**
   - **Variable**: Seleziona `DATABASE_URL`
4. Clicca **"Add"**
   
   ✅ Railway aggiungerà automaticamente `DATABASE_URL` dal database!

### 5.3 Aggiungi CORS_ORIGIN (Temporaneo)
Per ora aggiungiamo un placeholder, lo aggiorneremo dopo:
1. Clicca **"+ New Variable"**
2. **Name**: `CORS_ORIGIN`
3. **Value**: `http://localhost:3000` (lo cambieremo dopo)
4. Clicca **"Add"**

### 5.4 Aggiungi WHEEL_SECRET
1. Genera un secret sicuro (apri un terminale):
   ```bash
   openssl rand -hex 32
   ```
   Oppure usa questo generatore online: https://randomkeygen.com/
   
2. Clicca **"+ New Variable"**
3. **Name**: `WHEEL_SECRET`
4. **Value**: Incolla il secret generato
5. Clicca **"Add"**

### 5.5 Aggiungi NODE_ENV
1. Clicca **"+ New Variable"**
2. **Name**: `NODE_ENV`
3. **Value**: `production`
4. Clicca **"Add"**

### 5.6 Verifica PORT
Railway assegna automaticamente `PORT`. **Non aggiungerlo manualmente**.

✅ **Checkpoint**: Tutte le variabili backend configurate

---

## STEP 6: Generare Dominio Backend

### 6.1 Genera Dominio
1. Nel servizio **backend**, vai al tab **"Settings"**
2. Scorri fino a **"Domains"** (o **"Network"**)
3. Clicca **"Generate Domain"**
4. Railway genererà un dominio tipo: `backend-production-xxxx.up.railway.app`

### 6.2 Salva URL Backend
**COPIA** questo URL! Lo useremo per:
- Configurare il frontend
- Aggiornare `CORS_ORIGIN`

✅ **Checkpoint**: URL backend salvato (es. `https://backend-production-xxxx.up.railway.app`)

---

## STEP 7: Aggiornare CORS_ORIGIN

### 7.1 Aggiorna CORS_ORIGIN
1. Nel servizio **backend**, vai al tab **"Variables"**
2. Trova `CORS_ORIGIN`
3. Clicca su di esso per modificarlo
4. **Per ora** lascia `http://localhost:3000`
   - Lo aggiorneremo dopo aver creato il frontend
5. Clicca **"Update"**

✅ **Checkpoint**: CORS_ORIGIN configurato (temporaneo)

---

## STEP 8: Trigger Deploy Backend

### 8.1 Avvia Deploy
1. Nel servizio **backend**, vai al tab **"Deployments"**
2. Clicca **"Deploy"** (se non si è avviato automaticamente)
3. Seleziona il branch `main` (o `master`)
4. Clicca **"Deploy"**

### 8.2 Monitora Build
1. Clicca sul deployment in corso
2. Vai al tab **"Logs"**
3. Aspetta che il build completi (5-10 minuti la prima volta)
4. Dovresti vedere:
   - `pnpm install` in esecuzione
   - `Prisma Client generated`
   - `Nest build` completato
   - `Prisma migrations deployed`
   - `🚀 Backend running on port...`

### 8.3 Verifica Health Check
1. Una volta completato, apri il dominio del backend nel browser
2. Aggiungi `/health` alla fine dell'URL:
   ```
   https://backend-production-xxxx.up.railway.app/health
   ```
3. Dovresti vedere:
   ```json
   {"status":"ok","timestamp":"2024-..."}
   ```

✅ **Checkpoint**: Backend deployato e funzionante!

---

## STEP 9: Configurare Frontend Service

### 9.1 Crea Servizio Frontend
1. Torna al progetto principale
2. Clicca **"+ New"** → **"GitHub Repo"**
3. Seleziona lo **stesso repository** (fun)
4. Clicca **"Deploy Now"**

### 9.2 Configura Root Directory
1. Clicca sul servizio appena creato
2. Vai al tab **"Settings"** (⚙️)
3. Scorri fino a **"Root Directory"**
4. Inserisci: `frontend`
5. Clicca **"Update"**

### 9.3 Configura Build Command
1. Trova **"Build Command"**
2. Inserisci:
   ```bash
   pnpm install && pnpm run build
   ```
3. Clicca **"Update"**

### 9.4 Configura Start Command
1. Trova **"Start Command"**
2. Inserisci:
   ```bash
   pnpm run start
   ```
3. Clicca **"Update"**

### 9.5 Rinomina Servizio
1. Rinomina il servizio in: `frontend` o `fun-frontend`

✅ **Checkpoint**: Frontend configurato

---

## STEP 10: Configurare Variabili d'Ambiente Frontend

### 10.1 Apri Tab Variables
1. Nel servizio **frontend**, vai al tab **"Variables"**

### 10.2 Aggiungi NEXT_PUBLIC_API_URL
1. Clicca **"+ New Variable"**
2. **Name**: `NEXT_PUBLIC_API_URL`
3. **Value**: Il URL del backend che hai salvato prima (STEP 6.2)
   - Esempio: `https://backend-production-xxxx.up.railway.app`
   - ⚠️ **IMPORTANTE**: Inizia con `https://` (non `http://`)
4. Clicca **"Add"**

### 10.3 Aggiungi NODE_ENV
1. Clicca **"+ New Variable"**
2. **Name**: `NODE_ENV`
3. **Value**: `production`
4. Clicca **"Add"**

✅ **Checkpoint**: Variabili frontend configurate

---

## STEP 11: Generare Dominio Frontend

### 11.1 Genera Dominio
1. Nel servizio **frontend**, vai al tab **"Settings"**
2. Scorri fino a **"Domains"**
3. Clicca **"Generate Domain"**
4. Railway genererà un dominio tipo: `frontend-production-yyyy.up.railway.app`

### 11.2 Salva URL Frontend
**COPIA** questo URL!

✅ **Checkpoint**: URL frontend salvato

---

## STEP 12: Aggiornare CORS_ORIGIN nel Backend

### 12.1 Aggiorna CORS_ORIGIN
1. Vai al servizio **backend**
2. Tab **"Variables"**
3. Trova `CORS_ORIGIN`
4. Clicca per modificarlo
5. Sostituisci con l'URL del frontend (quello appena generato)
   - Esempio: `https://frontend-production-yyyy.up.railway.app`
6. Clicca **"Update"**

### 12.2 Riavvia Backend (per applicare CORS)
1. Vai al tab **"Deployments"**
2. Clicca **"Redeploy"** sull'ultimo deployment
3. Oppure fai un nuovo deploy

✅ **Checkpoint**: CORS configurato correttamente

---

## STEP 13: Deploy Frontend

### 13.1 Avvia Deploy
1. Nel servizio **frontend**, vai al tab **"Deployments"**
2. Clicca **"Deploy"**
3. Seleziona branch `main`
4. Clicca **"Deploy"**

### 13.2 Monitora Build
1. Monitora i log (può richiedere 5-10 minuti)
2. Dovresti vedere:
   - Installazione dipendenze
   - Build di Next.js
   - Build completato

✅ **Checkpoint**: Frontend deployato

---

## STEP 14: Test Completo

### 14.1 Test Frontend
1. Apri l'URL del frontend nel browser
2. La pagina dovrebbe caricare correttamente

### 14.2 Test Backend Connection
1. Apri DevTools (F12) nel browser
2. Vai al tab **"Network"**
3. Cerca chiamate API (dovrebbero andare all'URL del backend)
4. Verifica che non ci siano errori CORS

### 14.3 Test Funzionalità
1. Prova a registrarti/login
2. Verifica che le API funzionino
3. Controlla la console per errori WebSocket

✅ **Checkpoint**: Tutto funziona!

---

## STEP 15: Eseguire Seed Database (Opzionale)

Se hai uno script di seed per popolare dati base:

### 15.1 Installa Railway CLI (Opzionale)
```bash
npm i -g @railway/cli
railway login
railway link
```

### 15.2 Esegui Seed
```bash
railway run --service backend pnpm run prisma:seed
```

Oppure usa il terminale web di Railway:
1. Vai al servizio **backend**
2. Tab **"Deployments"**
3. Clicca sui tre puntini dell'ultimo deployment
4. Seleziona "View Logs" o "Open Terminal"
5. Esegui: `pnpm run prisma:seed`

✅ **Checkpoint**: Database popolato con dati base

---

## 🎉 Completato!

La tua piattaforma Fun è ora live su Railway!

### URL Finali
- **Frontend**: `https://frontend-production-yyyy.up.railway.app`
- **Backend**: `https://backend-production-xxxx.up.railway.app`
- **Health Check**: `https://backend-production-xxxx.up.railway.app/health`

---

## 🐛 Troubleshooting

### Backend non si avvia
- ✅ Controlla i log del deployment
- ✅ Verifica che `DATABASE_URL` sia collegata
- ✅ Verifica che le migrazioni Prisma siano state eseguite

### Frontend non si connette al backend
- ✅ Verifica `NEXT_PUBLIC_API_URL` nel frontend
- ✅ Verifica `CORS_ORIGIN` nel backend
- ✅ Assicurati che entrambi usino `https://`

### Errori CORS
- ✅ Verifica che `CORS_ORIGIN` corrisponda esattamente all'URL del frontend
- ✅ Riavvia il backend dopo aver cambiato CORS_ORIGIN

### Build fallisce
- ✅ Controlla i log dettagliati
- ✅ Verifica che `pnpm` sia disponibile (Railway lo rileva automaticamente)
- ✅ Verifica che tutte le dipendenze siano in `package.json`

---

## 📊 Monitoraggio

### Visualizzare Logs
- Ogni servizio ha un tab **"Logs"** in tempo reale
- Puoi filtrare per livello (info, error, etc.)

### Metrics
- Railway mostra CPU, Memory, Network usage
- Monitora i crediti gratuiti ($5/mese)

---

## 🔄 Prossimi Deploy

Dopo il setup iniziale, ogni push su `main` triggererà automaticamente un nuovo deploy!

---

**Buon divertimento con la tua piattaforma! 🚀**

