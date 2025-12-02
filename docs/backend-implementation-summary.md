# Backend Implementation Summary - FASE 4

## Overview

Complete implementation of the NestJS backend for the Fun gaming platform MVP:

- XP/Levels
- Rewards (Daily, Faucet, Ads, Quiz)
- Bets + Mines/Plinko
- Transfers
- Races
- Wheel
- Missions
- Achievements
- Fairness
- Admin
- WebSocket

## Structure

```
backend/src/
├── common/
│   ├── guards/
│   │   └── auth.guard.ts          # Authentication guard
│   ├── decorators/
│   │   └── user.decorator.ts      # @CurrentUser() decorator
│   ├── types/
│   │   ├── xp.types.ts            # XP/Level types
│   │   └── reward.types.ts        # Reward types
│   └── utils/
│       ├── server-time.util.ts     # Server time utilities (02:00 reset)
│       └── balance.util.ts         # Atomic balance updates
├── levels/
│   ├── levels.module.ts
│   ├── levels.service.ts           # XP calculation, level progression
│   ├── levels.controller.ts        # GET /levels/me
│   └── levels.service.spec.ts      # Unit tests
├── rewards/
│   ├── rewards.module.ts
│   ├── rewards.service.ts          # Daily, Faucet, Ads, Quiz
│   └── rewards.controller.ts      # POST /rewards/*
├── admin/
│   ├── admin.module.ts
│   ├── admin.service.ts            # Config management, emission estimate
│   └── admin.controller.ts         # GET/PUT /admin/config/*
├── websocket/
│   ├── websocket.module.ts
│   └── websocket.gateway.ts        # Realtime events
└── prisma/
    ├── prisma.module.ts
    └── prisma.service.ts           # Prisma client
```

## Key Features Implemented

### 1. LevelsService

**Core Methods:**
- `calculateXPFromBet(betAmount, gameType)` - Calculate XP with multipliers
- `calculateLevelFromXP(totalXP)` - Get level from cumulative XP
- `addXpForUser(userId, xp, source, sourceId)` - Add XP and handle level-ups
- `getUserLevel(userId)` - Get user's level data

**Features:**
- ✅ Loads XP config (baseXpRate, globalXpMultiplier, gameMultipliers)
- ✅ Applies global multiplier to all XP
- ✅ Calculates level from cumulative XP thresholds
- ✅ Handles multiple level jumps (rewards for each level)
- ✅ Creates XpLog entries
- ✅ Creates LevelUpReward records
- ✅ Updates UserBalance atomically
- ✅ Emits WebSocket events on level-up

**Example Usage:**
```typescript
// From BetsModule (future)
const xp = await levelsService.calculateXPFromBet(betAmount, GameType.MINES);
const result = await levelsService.addXpForUser(userId, xp, 'bet', betId);
// result contains: newLevel, levelsGained, levelUpRewards[]
```

### 2. RewardsService

#### A) Daily Reward (`claimDailyReward`)

**Logic:**
- ✅ Checks server day (reset at 02:00)
- ✅ Prevents double-claiming (unique constraint)
- ✅ Calculates streak from previous claims
- ✅ Applies streak multipliers (7, 14, 30, 60, 100 days)
- ✅ Calculates reward: `baseReward + (level * levelMultiplier) * streakMultiplier`
- ✅ Applies min/max caps
- ✅ Updates balance atomically
- ✅ Creates DailyReward record
- ✅ Emits WebSocket events

#### B) Hourly Faucet (`claimHourlyFaucet`)

**Logic:**
- ✅ Checks 1-hour cooldown (server time)
- ✅ Checks daily limit (`dailyFaucetClaimsLimit`)
- ✅ Calculates reward: `baseFaucet + (level * faucetMultiplier)`
- ✅ Applies min/max caps
- ✅ Updates balance atomically
- ✅ Creates HourlyFaucet record
- ✅ Emits WebSocket events

#### C) Ad Reward (`claimAdReward`)

**Logic:**
- ✅ Checks `isActive` flag
- ✅ Checks hourly limit (`adsPerHourLimit`)
- ✅ Checks daily cap (`dailyAdsCap`) using `day` field
- ✅ Updates balance atomically
- ✅ Creates AdReward record with `hour` and `day`
- ✅ Emits WebSocket events

#### D) Quiz (`startDailyQuiz`, `submitDailyQuizAnswers`)

**Logic:**
- ✅ Prevents multiple attempts per day (server day)
- ✅ Selects 3 random questions in user's language
- ✅ Validates answers against correct answers
- ✅ Calculates reward from config (0/1/2/3 correct)
- ✅ Updates balance atomically
- ✅ Updates QuizAttempt record
- ✅ Emits WebSocket events

### 3. Balance Management

**Atomic Updates:**
- All balance changes use `updateUserBalance()` utility
- Uses optimistic locking (`version` field)
- Creates Transaction log with `balanceBefore` and `balanceAfter`
- Retries on version conflicts (max 3 attempts)

**Transaction Types:**
- `DAILY_REWARD`
- `HOURLY_FAUCET`
- `AD_REWARD`
- `QUIZ_REWARD`
- `LEVEL_UP_REWARD`
- `BET`, `WIN`, `LOSS` (future)

### 4. WebSocket Integration

**Events Emitted:**
- `balance:update` - When balance changes
- `level:up` - When user levels up (with rewards)
- `reward:claimed` - When any reward is claimed

**Namespace:** `/user`
**Room Format:** `user:{userId}`

### 5. Admin API & Other Modules

**Endpoints:**
- `GET /admin/config/xp` - Get XP config
- `PUT /admin/config/xp` - Update XP config
- `GET /admin/config/levels` - Get all level configs
- `PUT /admin/config/levels/:level` - Update level config
- `GET /admin/config/rewards/:type` - Get reward config
- `PUT /admin/config/rewards/:type` - Update reward config
- `GET /admin/config/ads` - Get ad config
- `PUT /admin/config/ads` - Update ad config
- `GET /admin/config/races/:name` - Get race config
- `PUT /admin/config/races/:name` - Update race config
- `GET /admin/emission-estimate` - Get daily emission estimate

**Emission Estimate:**
Calculates theoretical maximum FUN/day for level 500 user:
- Daily reward (with max streak)
- Hourly faucet (12 claims)
- Ads (30/day with dailyAdsCap)
- Quiz (3/3 correct)

## Server Time Management

All time-based operations use **server time only**:
- `getServerDay()` - Current server day (reset at 02:00)
- `getCurrentHour()` - Current hour window
- `getNextServerDay()` - Next reset time
- `isWithinServerDay()` - Check if date is in current server day

**Reset Time:** 02:00 server time

## Testing

**Unit Tests:**
- `levels.service.spec.ts` - Tests for:
  - XP calculation with multipliers
  - Level calculation from cumulative XP
  - Level-up rewards for single and multiple jumps

**Test Coverage:**
- ✅ XP calculation (base, global multiplier, game multiplier)
- ✅ Level calculation from cumulative XP
- ✅ Single level-up with reward
- ✅ Multiple level jumps with rewards

## API Examples

### Claim Daily Reward
```bash
POST /rewards/daily
Headers: X-User-Id: user123

Response:
{
  "amount": "550.00000000",
  "streak": 7,
  "level": 50
}
```

### Claim Hourly Faucet
```bash
POST /rewards/faucet
Headers: X-User-Id: user123

Response:
{
  "amount": "35.00000000",
  "nextAvailableAt": "2024-01-15T15:00:00Z",
  "claimsToday": 5,
  "dailyLimit": 12
}
```

### Start Quiz
```bash
POST /rewards/quiz/start
Headers: X-User-Id: user123

Response:
{
  "attemptId": "attempt-123",
  "questions": [
    {
      "id": "q1",
      "questionText": "What is Bitcoin?",
      "options": ["A cryptocurrency", "A bank", "A company", "A country"]
    },
    // ... 2 more questions
  ]
}
```

### Submit Quiz
```bash
POST /rewards/quiz/submit
Headers: X-User-Id: user123
Body: {
  "attemptId": "attempt-123",
  "answers": [0, 1, 0]
}

Response:
{
  "correctCount": 2,
  "amount": "150.00000000",
  "questions": [
    {
      "questionId": "q1",
      "userAnswer": 0,
      "correctAnswer": 0,
      "isCorrect": true
    },
    // ...
  ]
}
```

## FASE 5–9 Checklist (moduli aggiuntivi)

### Backend Modules

- `bets` – Bets API (`POST /bets`), integrazione con Mines/Plinko, XP, races, missions, achievements.
- `games` – Engines:
  - `mines.engine.ts` – `resolveMinesBet(...)`
  - `plinko.engine.ts` – `resolvePlinkoBet(...)`
- `transfers` – `/transfers`, `/transfers/history` (token transfers LEVEL 10+).
- `races` – `/races/active`, `/races/:id/join`, `/races/:id/leaderboard` + `/admin/races/*`.
- `wheel` – `/wheel/config`, `/wheel/spin`.
- `missions` – `/missions/active`, `/missions/:id/claim`, hook su bet.
- `achievements` – `/achievements`, hook su level-up e bet.
- `fairness` – `/fairness/mines|plinko/*` (manual + per bet).
- `me` – `/me/balance` + info utente.

### Key Tables (oltre a quelle iniziali)

- `Bet`, `Game`, `Race`, `RaceParticipant`
- `TokenTransfer`
- `WheelConfig`, `WheelSpin`
- `Mission`, `UserMission`
- `Achievement`, `UserAchievement`
- `Config`, `RewardConfig`, `AdRewardConfig`, `RaceConfig`, `XpConfig`, `FeatureFlag`
- `AdminActionLog`

### Requisiti → Implementazione (mappa veloce)

- **XP/Levels (1–500, global multipliers, milestones)**  
  - Modulo: `levels`  
  - Tabelle: `UserLevel`, `LevelConfig`, `XpConfig`, `XpLog`, `LevelUpReward`  
  - Endpoint: `GET /levels/me`  
  - Frontend: `/levels`, header, home.

- **Daily / Faucet / Ads / Quiz**  
  - Modulo: `rewards`  
  - Tabelle: `DailyReward`, `HourlyFaucet`, `AdReward`, `QuizQuestion*`, `QuizAttempt`, `RewardConfig`, `AdRewardConfig`  
  - Endpoint: `/rewards/daily|faucet|ads|quiz/*`  
  - Frontend: `/rewards`.

- **Bets + Mines/Plinko (provably fair)**  
  - Modulo: `bets`, `games`, `fairness`  
  - Tabelle: `Bet`, `Game`  
  - Endpoint: `POST /bets`, `/fairness/*`  
  - Frontend: `/games/mines`, `/games/plinko`, `/fairness`.

- **Transfers FUN (livello 10+)**  
  - Modulo: `transfers`  
  - Tabelle: `TokenTransfer`, `Transaction`, `UserBalance`  
  - Endpoint: `POST /transfers`, `GET /transfers/history`  
  - Frontend: `/transfers`.

- **Races (entry fee 100 FUN, top 25% winners)**  
  - Modulo: `races`, `admin/races`  
  - Tabelle: `Race`, `RaceParticipant`, `RaceConfig`  
  - Endpoint utente: `/races/active`, `/races/:id/join`, `/races/:id/leaderboard`  
  - Endpoint admin: `/admin/races/*`  
  - Frontend: `/races`, `/admin/races`.

- **Wheel (bonus wheel)**  
  - Modulo: `wheel`, `admin`  
  - Tabelle: `WheelConfig`, `WheelSpin`  
  - Endpoint: `/wheel/config`, `/wheel/spin`, `/admin/wheel/config/:name`  
  - Frontend: `/wheel`, `/admin/wheel`.

- **Missions (daily/weekly/monthly)**  
  - Modulo: `missions`, `admin`  
  - Tabelle: `Mission`, `UserMission`  
  - Endpoint: `/missions/active`, `/missions/:id/claim`, `/admin/missions` (CRUD)  
  - Frontend: `/missions`, `/admin/missions`.

- **Achievements (badges)**  
  - Modulo: `achievements`, `admin`  
  - Tabelle: `Achievement`, `UserAchievement`  
  - Endpoint: `/achievements`, `/admin/achievements` (CRUD)  
  - Frontend: `/achievements`, `/admin/achievements`.

- **Fairness (provably fair verification)**  
  - Modulo: `fairness`, `games`, `common/utils/provably-fair.util.ts`  
  - Endpoint: `/fairness/mines|plinko/verify-manual`, `/fairness/mines|plinko/verify-bet/:betId`  
  - Frontend: `/fairness`, docs: `docs/fairness.md`.

- **Admin config & emission estimate**  
  - Modulo: `admin`  
  - Endpoint: `/admin/config/*`, `/admin/emission-estimate`, `/admin/races/*`, `/admin/wheel/*`, `/admin/missions/*`, `/admin/achievements/*`  
  - Frontend: `/admin/overview`, `/admin/config`, `/admin/races`, `/admin/wheel`, `/admin/missions`, `/admin/achievements`.

- **Realtime WebSocket**  
  - Modulo: `websocket` (`WebsocketGateway`)  
  - Eventi: `balance:update`, `bet:resolved`, `level:up`, `reward:claimed`, `achievement:unlocked`  
  - Frontend: hook `useUserSocket`, `SocketBridge`, toast integrati.

## TODO produzione (next steps)

Per andare in produzione reale restano da implementare/rafforzare:

- **Auth reale**:
  - OAuth2/OIDC o JWT al posto di `X-User-Id`,
  - gestione ruoli (USER / ADMIN / MODERATOR),
  - protezione seria sugli endpoint `/admin/*`.
- **Rate limiting**:
  - Throttling per IP/utente su endpoint critici: `/bets`, `/rewards/*`, `/wheel`, `/missions`, `/transfers`, `/fairness/*`, `/admin/*`.
- **Sicurezza & hardening**:
  - CORS ristretto ai domini frontend reali,
  - headers di sicurezza (Helmet),
  - logging e audit trail più completi,
  - validazione DTO rigorosa, sanitizzazione input, protezione CSRF dove necessario.
- **Deploy infra**:
  - Backend NestJS su Railway/Render/Fly.io con Docker,
  - PostgreSQL gestito (Neon, Supabase, Railway),
  - Frontend Next.js su Vercel,
  - ambiente di staging con schema e seed dedicati.


## Next Steps

1. **BetsModule** - Integrate with LevelsService for XP on bet resolution
2. **OAuth Integration** - Replace simple AuthGuard with proper OAuth
3. **Rate Limiting** - Add rate limiting middleware
4. **Error Handling** - Enhanced error responses
5. **Validation** - DTOs with class-validator
6. **E2E Tests** - Full integration tests

## Notes

- All numeric values are configurable via database (no hard-coded values)
- Server time is authoritative (no client time used)
- All balance operations are atomic with transaction logging
- WebSocket events emitted for realtime UI updates
- Optimistic locking prevents race conditions

