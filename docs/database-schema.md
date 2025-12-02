# Database Schema Documentation

## Overview

The database uses PostgreSQL with Prisma ORM. All monetary values use 8 decimals (matching the FUN token).

## Key Design Decisions

### Server Time Authority
- **All time-based operations use server time**, not client time
- Daily reset occurs at **02:00 server time**
- This prevents timezone manipulation and abuse

### Optimistic Locking
- `UserBalance.version` field prevents race conditions
- Incremented on each balance update
- Failed updates retry with fresh data

### Transaction Logging
- Every balance change is logged in `Transaction` table
- Enables full audit trail and balance reconciliation
- Can reconstruct any user's balance from transaction history

## Core Tables

### User & Authentication
- `User`: Core user data, OAuth info, profile, legal acceptances
- `Session`: Active user sessions
- `LoginLog`: Login attempts for security monitoring

### Balance Management
- `UserBalance`: Current balance and locked balance (for active bets)
- `Transaction`: Complete audit log of all balance changes

### XP & Levels
- `UserLevel`: Current level, XP, and progression
- `XpLog`: Historical XP earnings for audit
- `LevelUpReward`: Rewards claimed on level up
- `LevelConfig`: XP thresholds and rewards per level

### Rewards
- `DailyReward`: Daily login rewards (1 per day, reset 02:00)
- `HourlyFaucet`: Hourly faucet claims (cooldown 1h, daily limit)
- `AdReward`: Rewarded ad completions (max 5 per hour)
- `RewardConfig`: Configurable reward amounts and formulas

### Quiz
- `QuizQuestion`: Question pool (200+ questions)
- `QuizQuestionTranslation`: Multi-language support (EN/IT)
- `QuizAttempt`: Daily quiz attempts (1 per day, reset 02:00)

### Games
- `Game`: Game definitions and configuration
- `Bet`: Individual bets with provably fair data

### Social Features
- `TokenTransfer`: User-to-user token transfers (level 10+)
- `Race`: Competitive races with prize pools
- `RaceParticipant`: User participation in races

### Gamification
- `WheelConfig`: Wheel of fortune configuration
- `WheelSpin`: User wheel spins
- `Mission`: Mission definitions (daily/weekly/monthly)
- `UserMission`: User mission progress
- `Achievement`: Achievement definitions
- `UserAchievement`: Unlocked achievements

### Configuration
- `Config`: Global configuration key-value store
- `FeatureFlag`: Feature toggles

### Admin
- `AdminActionLog`: Audit log of all admin actions

## Relationships

### User → Balance
- One-to-one: Each user has exactly one balance record

### User → Transactions
- One-to-many: User has many transactions

### User → Bets
- One-to-many: User has many bets

### User → Rewards
- One-to-many: User has many reward claims

### Game → Bets
- One-to-many: Game has many bets

## Indexes

All foreign keys and frequently queried fields are indexed for performance:
- User lookups by OAuth ID, email, username
- Transaction queries by user, type, date
- Reward queries by user and date
- Bet queries by user, game, status

## Data Types

- **Decimal(20, 8)**: Token amounts (8 decimals)
- **Decimal(20, 2)**: XP values (2 decimals)
- **Decimal(5, 4)**: Percentages (e.g., house edge 0.0150 = 1.5%)
- **JSON/JSONB**: Flexible data for game configs, metadata, etc.

## Migration Strategy

Prisma Migrate handles schema changes:
```bash
pnpm prisma migrate dev --name migration_name
```

Always test migrations on dev/staging before production.

