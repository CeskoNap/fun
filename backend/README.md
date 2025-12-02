# Backend - Fun Gaming Platform

NestJS backend API for the Fun gaming platform.

## Structure

```
src/
├── common/           # Shared utilities, guards, decorators
│   ├── guards/       # Auth guards
│   ├── decorators/   # Custom decorators
│   ├── types/        # TypeScript types
│   └── utils/        # Utility functions
├── levels/           # XP & Level system
├── rewards/          # Daily, Faucet, Ads, Quiz rewards
├── admin/            # Admin panel API
├── websocket/        # WebSocket gateway for realtime updates
└── prisma/           # Prisma service
```

## Getting Started (Backend)

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- pnpm (o npm/yarn)

### Environment Variables

Crea un file `.env` in `backend/` (o usa variabili d’ambiente) con almeno:

- `DATABASE_URL`  
  Formato: `postgresql://USER:PASSWORD@HOST:PORT/DBNAME?schema=public`
- `WHEEL_SECRET` (facoltativo ma consigliato, usato per randomizzazione wheel)
- `CORS_ORIGIN` (es. `http://localhost:3000` per il frontend)

Per l’MVP l’autenticazione è basata su header `X-User-Id`, quindi non è necessario configurare JWT/OAuth subito (da fare in produzione).

### Installazione & Migrazioni

```bash
cd backend

# Installa dipendenze
pnpm install   # oppure npm install

# Genera client Prisma
npx prisma generate

# Applica migrazioni (crea schema DB)
npx prisma migrate dev

# (Opzionale) seed di base se/quando aggiunto
# npx prisma db seed
```

### Avvio server di sviluppo

```bash
cd backend
pnpm start:dev   # oppure npm run start:dev
```

Il backend sarà in ascolto (tipicamente) su `http://localhost:3001` con le API NestJS.

## API Endpoints

### Levels
- `GET /levels/me` - Get current user's level and XP

### Rewards
- `POST /rewards/daily` - Claim daily reward
- `POST /rewards/faucet` - Claim hourly faucet
- `POST /rewards/ads` - Claim ad reward
- `POST /rewards/quiz/start` - Start daily quiz
- `POST /rewards/quiz/submit` - Submit quiz answers

### Admin
- `GET /admin/config/xp` - Get XP configuration
- `PUT /admin/config/xp` - Update XP configuration
- `GET /admin/config/levels` - Get all level configurations
- `GET /admin/config/rewards/:type` - Get reward configuration
- `PUT /admin/config/rewards/:type` - Update reward configuration
- `GET /admin/config/ads` - Get ad reward configuration
- `PUT /admin/config/ads` - Update ad reward configuration
- `GET /admin/emission-estimate` - Get daily emission estimate

Per l’elenco completo (inclusi Bets, Transfers, Races, Wheel, Missions, Achievements, Fairness) vedi `docs/backend-implementation-summary.md` e `docs/api-reference-frontend.md`.

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e
```

## WebSocket Events

Connect to `/user` namespace:

- `balance:update` - Balance changed
- `level:up` - User leveled up
- `reward:claimed` - Reward claimed

