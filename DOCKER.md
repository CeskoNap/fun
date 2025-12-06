# Docker Setup Guide

Questa guida spiega come avviare la piattaforma Fun Gaming Platform utilizzando Docker.

## Prerequisiti

- Docker Engine 20.10+
- Docker Compose 2.0+

## Avvio Rapido

1. **Clona il repository** (se non l'hai già fatto)

2. **Avvia tutti i servizi con Docker Compose:**

```bash
docker-compose up -d
```

Questo comando avvierà:
- PostgreSQL (porta 5432)
- Backend NestJS (porta 3001)
- Frontend Next.js (porta 3000)

3. **Attendi che i servizi siano pronti** (circa 30-60 secondi per la prima build)

4. **Accedi alla piattaforma:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001

## Comandi Utili

### Visualizzare i log
```bash
# Tutti i servizi
docker-compose logs -f

# Solo backend
docker-compose logs -f backend

# Solo frontend
docker-compose logs -f frontend

# Solo database
docker-compose logs -f postgres
```

### Fermare i servizi
```bash
docker-compose down
```

### Fermare e rimuovere i volumi (cancella il database)
```bash
docker-compose down -v
```

### Ricostruire le immagini
```bash
docker-compose build --no-cache
```

### Eseguire comandi nei container

```bash
# Backend - Prisma migrations
docker-compose exec backend npx prisma migrate dev

# Backend - Prisma Studio
docker-compose exec backend npx prisma studio

# Frontend - Build
docker-compose exec frontend pnpm build
```

## Configurazione

Le variabili d'ambiente sono configurate direttamente nel file `docker-compose.yml`. Per personalizzare:

1. Modifica le variabili nel file `docker-compose.yml`
2. Oppure crea un file `.env` nella root del progetto con:

```
WHEEL_SECRET=your-secret-here
DATABASE_URL=postgresql://fun_user:fun_password@postgres:5432/fun_dev?schema=public
```

## Database

Il database PostgreSQL viene creato automaticamente con:
- **User**: fun_user
- **Password**: fun_password
- **Database**: fun_dev
- **Port**: 5432

I dati del database sono persistenti nel volume Docker `postgres_data`.

## Risoluzione Problemi

### Porte già in uso
Se le porte 3000, 3001 o 5432 sono già in uso, modifica le porte nel file `docker-compose.yml`:

```yaml
ports:
  - "3000:3000"  # Cambia il primo numero
```

### Problemi con Prisma
Se il backend non si avvia, controlla i log:
```bash
docker-compose logs backend
```

Potrebbe essere necessario eseguire manualmente le migrazioni:
```bash
docker-compose exec backend npx prisma migrate deploy
```

### Rebuild completo
Se hai problemi con le dipendenze:
```bash
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

## Sviluppo vs Produzione

La configurazione attuale è ottimizzata per lo sviluppo:
- Hot reload attivo per backend e frontend
- Volume mounts per modifiche in tempo reale
- Log dettagliati

Per la produzione, considera:
- Build delle immagini in produzione
- Variabili d'ambiente sicure
- Configurazione NODE_ENV=production
- Ottimizzazioni delle immagini Docker

