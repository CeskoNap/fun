# Fun - Gaming Platform

A web3 gaming platform inspired by stake.com, using an internal ERC-20 token (FUN) for gameplay without real money.

## Project Structure

```
website/
├── frontend/          # Next.js frontend
├── backend/           # NestJS backend API
├── contracts/         # Solidity smart contracts
├── shared/            # Shared types/utilities
└── docs/              # Documentation
```

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: NestJS, TypeScript, PostgreSQL, Prisma
- **Blockchain**: Polygon PoS, ethers.js/viem
- **Database**: PostgreSQL
- **Realtime**: WebSocket (Socket.io)

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- pnpm (recommended) or npm/yarn

### Backend

1. Configura PostgreSQL e crea un database (es. `fun_dev`).
2. Crea `backend/.env` con almeno:
   - `DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/fun_dev?schema=public`
   - `WHEEL_SECRET=some-long-random-string`
   - `CORS_ORIGIN=http://localhost:3000`
3. Dal root del progetto:

```bash
cd backend
pnpm install          # oppure npm install
npx prisma generate
npx prisma migrate dev
pnpm start:dev        # oppure npm run start:dev
```

Il backend sarà disponibile su `http://localhost:3001` (o la porta configurata in Nest).

### Frontend

1. Crea `frontend/.env.local` con:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
```

2. Dal root del progetto:

```bash
cd frontend
pnpm install          # oppure npm install
pnpm dev              # oppure npm run dev
```

Il frontend sarà disponibile su `http://localhost:3000`.

### Utente demo e admin

Per l’MVP l’autenticazione è simulata tramite header `X-User-Id`:

- Il frontend usa un `USER_ID` demo hard-coded (es. `demo-user-1`) nelle chiamate API.
- Per creare l’utente demo puoi:
  - lasciare che il backend crei record `User`/`UserLevel` on-demand alla prima richiesta, oppure
  - inserire manualmente una riga in `User` con `id = 'demo-user-1'`.

Per usare la dashboard `/admin/*` in modo “reale”, in produzione dovrai:

- Aggiungere un sistema di ruoli (es. `role = 'ADMIN'` su `User`),
- Aggiornare l’`AuthGuard` per filtrare gli endpoint admin.

Per sviluppo locale puoi assumere che l’utente demo sia admin (il guard è ancora permissivo).

## Documentation

- [Token Design](./docs/token-design.md)
- [Database Schema](./docs/database-schema.md)
- [Backend Implementation Summary](./docs/backend-implementation-summary.md)
- [API Reference (Frontend)](./docs/api-reference-frontend.md)
- [Reward System](./docs/reward-system.md)

