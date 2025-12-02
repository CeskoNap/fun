# Configuration Examples

This document shows examples of how configuration values are used in the codebase.

## XP Configuration

### XpConfig Table

```sql
-- Single row with XP settings
INSERT INTO "XpConfig" (id, "baseXpRate", "globalXpMultiplier", "gameMultipliers", "updatedAt")
VALUES (
  'xp-config-1',
  0.01,  -- 1 XP per 100 FUN
  1.0,   -- Normal speed (can be changed to 2.0 for double XP event)
  '{"MINES": 1.0, "PLINKO": 1.0, "CRASH": 1.2, "DICE": 0.8}'::json,
  NOW()
);
```

### Usage in Code

```typescript
// services/xp.service.ts
async function calculateXPFromBet(
  betAmount: Decimal,
  gameType: GameType,
  userId: string
): Promise<Decimal> {
  // Load XP configuration
  const xpConfig = await prisma.xpConfig.findFirst();
  if (!xpConfig) {
    throw new Error('XP configuration not found');
  }

  // Get game-specific multiplier
  const gameMultipliers = xpConfig.gameMultipliers as Record<string, number>;
  const gameMultiplier = gameMultipliers[gameType] || 1.0;

  // Calculate base XP
  const baseXP = betAmount
    .mul(gameMultiplier)
    .mul(xpConfig.baseXpRate);

  // Apply global multiplier
  const finalXP = baseXP.mul(xpConfig.globalXpMultiplier);

  return finalXP;
}
```

### Example Scenarios

**Normal Speed (globalXpMultiplier = 1.0):**
- Bet: 1,000 FUN on Mines
- XP = (1,000 * 1.0 * 0.01) * 1.0 = **10 XP**

**Double XP Event (globalXpMultiplier = 2.0):**
- Bet: 1,000 FUN on Mines
- XP = (1,000 * 1.0 * 0.01) * 2.0 = **20 XP**

**Half Speed (globalXpMultiplier = 0.5):**
- Bet: 1,000 FUN on Mines
- XP = (1,000 * 1.0 * 0.01) * 0.5 = **5 XP**

## Ad Reward Configuration

### AdRewardConfig Table

```sql
-- Single row with ad reward settings
INSERT INTO "AdRewardConfig" (id, "rewardAmount", "adsPerHourLimit", "dailyAdsCap", "isActive", "updatedAt")
VALUES (
  'ad-config-1',
  50.0,  -- 50 FUN per ad
  5,     -- Max 5 ads per hour
  30,    -- Max 30 ads per day
  true,
  NOW()
);
```

### Usage in Code

```typescript
// services/ad-reward.service.ts
async function claimAdReward(
  userId: string,
  adProvider: string,
  ipAddress?: string,
  userAgent?: string
): Promise<{ success: boolean; message: string; amount?: Decimal }> {
  // Load ad reward configuration
  const adConfig = await prisma.adRewardConfig.findFirst({
    where: { isActive: true }
  });
  
  if (!adConfig) {
    return { success: false, message: 'Ad rewards are currently disabled' };
  }

  const now = new Date();
  const currentHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
  const currentDay = getServerDay(); // Day reset at 02:00

  // Check hourly limit
  const adsThisHour = await prisma.adReward.count({
    where: {
      userId,
      hour: {
        gte: currentHour,
        lt: new Date(currentHour.getTime() + 60 * 60 * 1000)
      }
    }
  });

  if (adsThisHour >= adConfig.adsPerHourLimit) {
    const nextHour = new Date(currentHour.getTime() + 60 * 60 * 1000);
    return {
      success: false,
      message: `Hourly limit reached. Next ad available at ${nextHour.toISOString()}`
    };
  }

  // Check daily cap (using day field for efficient query)
  const adsToday = await prisma.adReward.count({
    where: {
      userId,
      day: currentDay // Uses indexed (userId, day) for fast lookup
    }
  });

  if (adsToday >= adConfig.dailyAdsCap) {
    const nextDay = getNextServerDay(); // Next day at 02:00
    return {
      success: false,
      message: `Daily cap reached (${adConfig.dailyAdsCap} ads/day). Resets at ${nextDay.toISOString()}`
    };
  }

  // Both checks passed - reward user
  const amount = new Decimal(adConfig.rewardAmount);
  await creditUserBalance(userId, amount, 'AD_REWARD', {
    provider: adProvider,
    hour: currentHour,
    day: currentDay
  });

  await prisma.adReward.create({
    data: {
      userId,
      hour: currentHour,
      day: currentDay, // Logical day (reset at 02:00) for daily cap tracking
      provider: adProvider,
      amount: amount.toNumber(),
      ipAddress,
      userAgent
    }
  });

  return {
    success: true,
    message: `Rewarded ${amount} FUN`,
    amount
  };
}
```

### Example Scenarios

**Scenario 1: User hits hourly limit**
- User watched 5 ads between 10:00-10:59
- 6th ad request at 10:45
- **Result**: Rejected - "Hourly limit reached. Next ad available at 11:00"

**Scenario 2: User hits daily cap**
- User watched 30 ads today (across different hours)
- 31st ad request at 15:00 (only 2 ads in that hour)
- **Result**: Rejected - "Daily cap reached (30 ads/day). Resets at [next day 02:00]"

**Scenario 3: Both limits respected**
- User watched 4 ads in current hour (10:00-10:59)
- User watched 25 ads today
- **Result**: Success - Rewarded 50 FUN, total today: 26/30

## Race Configuration

### RaceConfig Table

```sql
-- Default race configuration
INSERT INTO "RaceConfig" (id, name, "entryFee", "prizeDistribution", "isActive", "createdAt", "updatedAt")
VALUES (
  'race-config-default',
  'default',
  100.0,  -- 100 FUN entry fee
  '{
    "topPercentageWinners": 25,
    "tiers": [
      {"rankStart": 1, "rankEnd": 1, "percentage": 20},
      {"rankStart": 2, "rankEnd": 2, "percentage": 15},
      {"rankStart": 3, "rankEnd": 3, "percentage": 10},
      {"rankStart": 4, "rankEnd": 50, "percentage": 35},
      {"rankStart": 51, "rankEnd": 100, "percentage": 20}
    ]
  }'::json,
  true,
  NOW(),
  NOW()
);
```

### Usage in Code

```typescript
// services/race.service.ts
async function distributeRacePrizes(raceId: string): Promise<void> {
  const race = await prisma.race.findUnique({ where: { id: raceId } });
  const raceConfig = await prisma.raceConfig.findFirst({
    where: { name: 'default', isActive: true }
  });

  if (!raceConfig) {
    throw new Error('Race configuration not found');
  }

  const participants = await prisma.raceParticipant.findMany({
    where: { raceId },
    orderBy: { volume: 'desc' }
  });

  const totalParticipants = participants.length;
  const prizePool = race.prizePool;
  const distribution = raceConfig.prizeDistribution as {
    topPercentageWinners: number;
    tiers: Array<{ rankStart: number; rankEnd: number; percentage: number }>;
  };

  // Calculate how many winners (top 25%)
  const winnerCount = Math.ceil(
    totalParticipants * distribution.topPercentageWinners / 100
  );

  // Distribute prizes according to tiers
  for (const tier of distribution.tiers) {
    // Clamp tier to available winners
    const tierStart = Math.max(1, tier.rankStart);
    const tierEnd = Math.min(winnerCount, tier.rankEnd);

    if (tierStart > winnerCount) {
      continue; // Skip tier if start is beyond winners
    }

    const tierParticipants = participants.slice(tierStart - 1, tierEnd);
    const tierPrizePool = prizePool.mul(tier.percentage).div(100);
    const prizePerParticipant = tierPrizePool.div(tierParticipants.length);

    for (const participant of tierParticipants) {
      await creditUserBalance(
        participant.userId,
        prizePerParticipant,
        'RACE_PRIZE',
        { raceId, rank: participant.rank }
      );
    }
  }
}
```

## Reward Configuration Examples

### Daily Reward Config

```json
{
  "baseReward": 50,
  "levelMultiplier": 5,
  "minDailyReward": 50,
  "maxDailyReward": 5000,
  "streakMultipliers": {
    "7": 1.2,
    "14": 1.5,
    "30": 2.0,
    "60": 2.5,
    "100": 3.0
  }
}
```

### Faucet Config

```json
{
  "baseFaucet": 10,
  "faucetMultiplier": 0.5,
  "minFaucetReward": 10,
  "maxFaucetReward": 500,
  "dailyFaucetClaimsLimit": 12
}
```

### Quiz Config

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

