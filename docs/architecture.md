# System Architecture

## Overview

Fun is a full-stack gaming platform with:
- **Frontend**: Next.js 14 (React, TypeScript, Tailwind)
- **Backend**: NestJS (Node.js, TypeScript)
- **Database**: PostgreSQL with Prisma ORM
- **Blockchain**: Polygon PoS (EVM)
- **Realtime**: WebSocket (Socket.io)

## Architecture Diagram

```
┌─────────────────┐
│   Next.js App   │  (Frontend - Vercel)
│   (React/TS)    │
└────────┬────────┘
         │ HTTP/WebSocket
         │
┌────────▼────────┐
│  NestJS Backend │  (API Server - Railway/Render)
│   (REST/WS)     │
└────────┬────────┘
         │
    ┌────┴────┐
    │        │
┌───▼───┐ ┌─▼────────┐
│PostgreSQL│ │Polygon RPC│
│ (Neon/   │ │ (Alchemy/ │
│ Supabase)│ │ Infura)   │
└─────────┘ └───────────┘
```

## Component Breakdown

### Frontend (Next.js)

**Location**: `/frontend`

**Structure**:
```
frontend/
├── app/              # Next.js 14 App Router
│   ├── (auth)/       # Auth pages
│   ├── (dashboard)/  # Protected pages
│   └── api/          # API routes (if needed)
├── components/       # React components
│   ├── games/       # Game components (Mines, Plinko)
│   ├── ui/          # Reusable UI components
│   └── layout/      # Layout components
├── lib/             # Utilities, hooks, i18n
├── styles/          # Global styles, Tailwind
└── public/          # Static assets
```

**Key Features**:
- Server-side rendering (SSR) for SEO
- Client-side routing
- WebSocket client for realtime updates
- i18n support (EN/IT)
- Dark theme only (#171717 background, #FBBB0C accent)

### Backend (NestJS)

**Location**: `/backend`

**Structure**:
```
backend/
├── src/
│   ├── auth/         # OAuth (Google/Apple), JWT
│   ├── users/        # User management
│   ├── games/        # Game logic (Mines, Plinko)
│   ├── bets/         # Bet placement & resolution
│   ├── rewards/      # Daily, faucet, ads, quiz
│   ├── levels/       # XP & level system
│   ├── transfers/    # Token transfers
│   ├── races/        # Race system
│   ├── missions/     # Mission system
│   ├── wheel/        # Wheel of fortune
│   ├── admin/        # Admin panel API
│   ├── websocket/    # WebSocket gateway
│   └── common/       # Shared modules, guards, decorators
├── prisma/           # Prisma schema & migrations
└── test/             # E2E tests
```

**Key Modules**:
- **AuthModule**: OAuth, JWT, session management
- **UsersModule**: User CRUD, profile management
- **GamesModule**: Game definitions, bet processing
- **RewardsModule**: All reward types (daily, faucet, ads, quiz)
- **LevelsModule**: XP calculation, level progression
- **WebSocketModule**: Realtime updates
- **AdminModule**: Admin operations

### Smart Contracts

**Location**: `/contracts`

**Contracts**:
- `FunToken.sol`: ERC-20 token (8 decimals)

**Tools**:
- Hardhat for compilation, testing, deployment
- ethers.js v6 for interactions

**Networks**:
- Mumbai (Polygon testnet) for development
- Polygon mainnet for production

## Data Flow

### User Registration

1. User clicks "Login with Google/Apple"
2. OAuth redirect → Backend callback
3. Backend creates/updates User record
4. Backend creates UserBalance (1,000 FUN initial)
5. Backend logs Transaction (INITIAL_BONUS)
6. Backend creates Session (JWT)
7. Frontend receives JWT, stores in httpOnly cookie
8. Frontend redirects to dashboard

### Placing a Bet

1. User selects game (Mines/Plinko), amount, parameters
2. Frontend sends POST `/api/bets` with bet details
3. Backend validates:
   - User authenticated
   - Sufficient balance
   - Bet amount within limits
   - Game active
4. Backend locks balance (moves to `lockedBalance`)
5. Backend creates Bet record (status: PENDING)
6. Backend generates provably fair seeds
7. Backend resolves bet (calculates result)
8. Backend updates balance (unlock, add/subtract)
9. Backend logs Transaction
10. Backend calculates XP, updates level if needed
11. Backend emits WebSocket event (balance update)
12. Frontend receives update, refreshes UI

### Claiming Daily Reward

1. User clicks "Claim Daily Reward"
2. Frontend sends POST `/api/rewards/daily`
3. Backend checks:
   - Server time (day reset at 02:00)
   - User hasn't claimed today
   - Streak calculation
4. Backend calculates reward (level-based + streak)
5. Backend updates UserBalance
6. Backend logs Transaction
7. Backend creates DailyReward record
8. Backend emits WebSocket event
9. Frontend shows success message

## Security

### Authentication

- **OAuth**: Google & Apple OAuth 2.0
- **Sessions**: JWT stored in httpOnly cookies
- **CSRF**: SameSite cookies, CSRF tokens
- **Rate Limiting**: Per-endpoint rate limits

### Authorization

- **Roles**: USER, MODERATOR, ADMIN
- **Guards**: Role-based access control (RBAC)
- **Resource Ownership**: Users can only access their own data

### Anti-Abuse

- **Server Time**: All time-based operations use server time
- **IP Tracking**: Logged for pattern detection
- **Rate Limiting**: Aggressive limits on reward endpoints
- **CAPTCHA**: hCaptcha on sensitive operations
- **Optimistic Locking**: Prevents race conditions on balance updates

### Data Protection

- **Input Validation**: class-validator on all inputs
- **SQL Injection**: Prisma ORM prevents SQL injection
- **XSS**: React escapes by default, sanitize user inputs
- **Secrets**: All secrets in environment variables

## Realtime Updates

### WebSocket Events

**Client → Server**:
- `join:user:{userId}` - Join user's private room
- `leave:user:{userId}` - Leave user's room

**Server → Client**:
- `balance:update` - Balance changed
- `bet:resolved` - Bet result available
- `level:up` - User leveled up
- `reward:claimed` - Reward claimed
- `game:update` - Game state update (e.g., Crash multiplier)

### Implementation

- Socket.io for WebSocket server
- Namespaces: `/user`, `/game`, `/admin`
- Rooms: Per-user rooms for private updates
- Reconnection: Automatic reconnection with state sync

## Configuration Management

### Environment Variables

**Frontend**:
- `NEXT_PUBLIC_API_URL` - Backend API URL
- `NEXT_PUBLIC_WS_URL` - WebSocket URL

**Backend**:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - JWT signing secret
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth secret
- `APPLE_CLIENT_ID` - Apple OAuth client ID
- `APPLE_CLIENT_SECRET` - Apple OAuth secret
- `HCAPTCHA_SECRET` - hCaptcha secret key
- `POLYGON_RPC_URL` - Polygon RPC endpoint
- `TOKEN_CONTRACT_ADDRESS` - FunToken contract address

### Database Configuration

- `Config` table: Global settings
- `LevelConfig` table: XP thresholds, level rewards
- `RewardConfig` table: Reward formulas
- `FeatureFlag` table: Feature toggles

## Deployment

### Frontend (Vercel)

1. Connect GitHub repository
2. Set environment variables
3. Deploy automatically on push to `main`

### Backend (Railway/Render)

1. Connect GitHub repository
2. Set environment variables
3. Run migrations: `pnpm prisma migrate deploy`
4. Start: `pnpm start:prod`

### Database (Neon/Supabase)

1. Create PostgreSQL database
2. Get connection string
3. Run migrations from backend

### Smart Contracts (Polygon)

1. Deploy to Mumbai testnet first
2. Test thoroughly
3. Deploy to Polygon mainnet
4. Verify on Polygonscan

## Monitoring & Logging

### Logging

- **Structured Logging**: JSON format
- **Log Levels**: ERROR, WARN, INFO, DEBUG
- **Log Aggregation**: (Future: Sentry, Datadog)

### Metrics

- **Custom Events**: Tracked in database
- **Analytics**: (Future: Plausible, GA)
- **Error Tracking**: (Future: Sentry)

### Health Checks

- `/health` endpoint for uptime monitoring
- Database connection check
- External service checks (OAuth, RPC)

## Future Enhancements

- On-chain balance sync
- Wallet connection (MetaMask, WalletConnect)
- Cash-in/cash-out functionality
- Mobile apps (React Native)
- Advanced analytics dashboard
- A/B testing framework

