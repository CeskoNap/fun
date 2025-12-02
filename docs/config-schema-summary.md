# Configuration Schema Summary

## Overview

All numeric values and formulas are stored in database tables. **NO hard-coded values** in the codebase.

## Configuration Tables

### 1. XpConfig

**Purpose**: XP calculation parameters

**Schema**:
```sql
CREATE TABLE "XpConfig" (
  id TEXT PRIMARY KEY,
  "baseXpRate" DECIMAL(10, 4) DEFAULT 0.01,  -- 1 XP per 100 FUN
  "globalXpMultiplier" DECIMAL(10, 4) DEFAULT 1.0,  -- Global multiplier for all XP
  "gameMultipliers" JSONB,  -- { "MINES": 1.0, "PLINKO": 1.0, ... }
  "updatedAt" TIMESTAMP,
  "updatedBy" TEXT  -- Admin user ID
);
```

**Usage**:
```typescript
XP = (betAmount * gameMultiplier * baseXpRate) * globalXpMultiplier
```

**Example Values**:
- `baseXpRate`: 0.01
- `globalXpMultiplier`: 1.0 (normal), 2.0 (double XP event), 0.5 (half speed)
- `gameMultipliers`: `{"MINES": 1.0, "PLINKO": 1.0, "CRASH": 1.2, "DICE": 0.8}`

---

### 2. LevelConfig

**Purpose**: XP thresholds and level-up rewards for each level (1-500)

**Schema**:
```sql
CREATE TABLE "LevelConfig" (
  id TEXT PRIMARY KEY,
  level INT UNIQUE,
  "xpRequired" DECIMAL(20, 2),  -- Cumulative XP needed for this level
  reward DECIMAL(20, 8),  -- FUN reward on level up (nullable)
  "createdAt" TIMESTAMP,
  "updatedAt" TIMESTAMP
);
```

**Example Rows**:
| level | xpRequired | reward |
|-------|-------------|--------|
| 1     | 0           | NULL   |
| 10    | 500         | 1000   |
| 50    | 5000        | 3000   |
| 100   | 15000       | 5000   |
| 500   | 500000      | 50000  |

---

### 3. RewardConfig

**Purpose**: Configuration for daily, faucet, quiz, and streak rewards

**Schema**:
```sql
CREATE TABLE "RewardConfig" (
  id TEXT PRIMARY KEY,
  type TEXT UNIQUE,  -- 'daily', 'faucet', 'quiz', 'streak'
  config JSONB,  -- Type-specific configuration
  "updatedAt" TIMESTAMP
);
```

**Type: 'daily'**:
```json
{
  "baseReward": 50,
  "levelMultiplier": 5,
  "minDailyReward": 50,
  "maxDailyReward": 5000
}
```

**Type: 'faucet'**:
```json
{
  "baseFaucet": 10,
  "faucetMultiplier": 0.5,
  "minFaucetReward": 10,
  "maxFaucetReward": 500,
  "dailyFaucetClaimsLimit": 12
}
```

**Type: 'quiz'**:
```json
{
  "rewards": {
    "0": 0,
    "1": 50,
    "2": 150,
    "3": 300
  }
}
```

**Type: 'streak'**:
```json
{
  "multipliers": {
    "7": 1.2,
    "14": 1.5,
    "30": 2.0,
    "60": 2.5,
    "100": 3.0
  }
}
```

---

### 4. AdRewardConfig

**Purpose**: Rewarded ads configuration

**Schema**:
```sql
CREATE TABLE "AdRewardConfig" (
  id TEXT PRIMARY KEY,
  "rewardAmount" DECIMAL(20, 8) DEFAULT 50.0,  -- FUN per ad
  "adsPerHourLimit" INT DEFAULT 5,  -- Max ads per hour
  "dailyAdsCap" INT DEFAULT 30,  -- Max ads per day (NEW)
  "isActive" BOOLEAN DEFAULT true,
  "updatedAt" TIMESTAMP
);
```

**Usage**:
- Both `adsPerHourLimit` (5) AND `dailyAdsCap` (30) must be respected
- User can watch max 5 ads per hour AND max 30 ads per day

---

### 5. RaceConfig

**Purpose**: Race entry fees and prize distribution

**Schema**:
```sql
CREATE TABLE "RaceConfig" (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE,  -- 'default', 'weekly', 'monthly'
  "entryFee" DECIMAL(20, 8) DEFAULT 100.0,  -- FUN to join
  "prizeDistribution" JSONB,  -- Prize tiers configuration
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMP,
  "updatedAt" TIMESTAMP
);
```

**prizeDistribution Structure**:
```json
{
  "topPercentageWinners": 25,
  "tiers": [
    { "rankStart": 1, "rankEnd": 1, "percentage": 20 },
    { "rankStart": 2, "rankEnd": 2, "percentage": 15 },
    { "rankStart": 3, "rankEnd": 3, "percentage": 10 },
    { "rankStart": 4, "rankEnd": 50, "percentage": 35 },
    { "rankStart": 51, "rankEnd": 100, "percentage": 20 }
  ]
}
```

---

### 6. WheelConfig

**Purpose**: Wheel of fortune segments and rewards

**Schema**:
```sql
CREATE TABLE "WheelConfig" (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE,
  segments JSONB,  -- Array of segments with rewards
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMP,
  "updatedAt" TIMESTAMP
);
```

**segments Structure**:
```json
[
  { "rewardType": "token", "amount": 50, "probability": 0.25 },
  { "rewardType": "token", "amount": 100, "probability": 0.25 },
  { "rewardType": "token", "amount": 200, "probability": 0.125 },
  { "rewardType": "token", "amount": 500, "probability": 0.125 },
  { "rewardType": "token", "amount": 1000, "probability": 0.125 },
  { "rewardType": "xp", "amount": 100, "probability": 0.125 },
  { "rewardType": "none", "probability": 0.025 }
]
```

---

### 7. Mission

**Purpose**: Mission definitions with objectives and rewards

**Schema**:
```sql
CREATE TABLE "Mission" (
  id TEXT PRIMARY KEY,
  type TEXT,  -- 'DAILY', 'WEEKLY', 'MONTHLY'
  name TEXT,
  description TEXT,
  objective JSONB,  -- { type: 'bet_count', target: 10, gameType: 'MINES' }
  reward JSONB,  -- { type: 'token'|'xp', amount: 100 }
  "isActive" BOOLEAN DEFAULT true,
  "startsAt" TIMESTAMP,
  "endsAt" TIMESTAMP,
  "createdAt" TIMESTAMP,
  "updatedAt" TIMESTAMP
);
```

---

### 8. Config (Generic)

**Purpose**: Global configuration key-value store

**Schema**:
```sql
CREATE TABLE "Config" (
  id TEXT PRIMARY KEY,
  key TEXT UNIQUE,
  value JSONB,  -- Can be string, number, object, array
  category TEXT,  -- 'xp', 'reward', 'game', 'system', etc.
  "updatedAt" TIMESTAMP,
  "updatedBy" TEXT  -- Admin user ID
);
```

**Example Keys**:
- `system.initial_bonus`: 1000 (FUN for new users)
- `transfer.min_level`: 10
- `transfer.daily_limit`: 10000
- `game.house_edge.mines`: 0.015

---

## Code Examples

### Loading XP Configuration

```typescript
// services/xp.service.ts
async function getXPConfig() {
  const config = await prisma.xpConfig.findFirst();
  if (!config) {
    throw new Error('XP configuration not found');
  }
  return {
    baseXpRate: config.baseXpRate,
    globalXpMultiplier: config.globalXpMultiplier,
    gameMultipliers: config.gameMultipliers as Record<string, number>
  };
}

async function calculateXP(betAmount: Decimal, gameType: GameType) {
  const config = await getXPConfig();
  const gameMultiplier = config.gameMultipliers[gameType] || 1.0;
  
  const baseXP = betAmount
    .mul(gameMultiplier)
    .mul(config.baseXpRate);
  
  return baseXP.mul(config.globalXpMultiplier);
}
```

### Checking Ad Reward Limits

```typescript
// services/ad-reward.service.ts
async function canClaimAdReward(userId: string): Promise<{
  canClaim: boolean;
  reason?: string;
  hourlyCount: number;
  dailyCount: number;
}> {
  const adConfig = await prisma.adRewardConfig.findFirst({
    where: { isActive: true }
  });
  
  if (!adConfig) {
    return { canClaim: false, reason: 'Ad rewards disabled', hourlyCount: 0, dailyCount: 0 };
  }

  const now = new Date();
  const currentHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
  const currentDay = getServerDay(); // Reset at 02:00

  // Check hourly limit
  const hourlyCount = await prisma.adReward.count({
    where: {
      userId,
      hour: {
        gte: currentHour,
        lt: new Date(currentHour.getTime() + 60 * 60 * 1000)
      }
    }
  });

  if (hourlyCount >= adConfig.adsPerHourLimit) {
    return {
      canClaim: false,
      reason: `Hourly limit reached (${adConfig.adsPerHourLimit}/hour)`,
      hourlyCount,
      dailyCount: 0
    };
  }

  // Check daily cap
  const dailyCount = await prisma.adReward.count({
    where: {
      userId,
      day: currentDay
    }
  });

  if (dailyCount >= adConfig.dailyAdsCap) {
    return {
      canClaim: false,
      reason: `Daily cap reached (${adConfig.dailyAdsCap}/day)`,
      hourlyCount,
      dailyCount
    };
  }

  return {
    canClaim: true,
    hourlyCount,
    dailyCount
  };
}
```

### Loading Race Configuration

```typescript
// services/race.service.ts
async function getRaceConfig(name: string = 'default') {
  const config = await prisma.raceConfig.findFirst({
    where: { name, isActive: true }
  });
  
  if (!config) {
    throw new Error(`Race config '${name}' not found`);
  }
  
  return {
    entryFee: config.entryFee,
    prizeDistribution: config.prizeDistribution as {
      topPercentageWinners: number;
      tiers: Array<{ rankStart: number; rankEnd: number; percentage: number }>;
    }
  };
}
```

## Admin Panel Updates

All configuration tables can be edited via the admin panel:

1. **XP Settings**: Adjust `baseXpRate`, `globalXpMultiplier`, `gameMultipliers`
2. **Reward Settings**: Edit daily, faucet, quiz, streak configs
3. **Ad Settings**: Modify `rewardAmount`, `adsPerHourLimit`, `dailyAdsCap`
4. **Race Settings**: Configure entry fees and prize distribution
5. **Level Settings**: Update XP thresholds and level-up rewards

Changes take effect immediately (no code deployment needed).

