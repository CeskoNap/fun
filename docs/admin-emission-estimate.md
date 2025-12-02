# Admin Panel - Daily Emission Estimate

## Overview

The admin panel includes a tool to estimate the **maximum FUN tokens a user can generate per day** based on current configuration. This helps admins balance the economy and prevent excessive token inflation.

## Calculation Method

The estimate calculates the **theoretical maximum** a user could earn in a single day by:
- Claiming all available rewards
- Using optimal strategies
- Assuming maximum level (500) for level-based rewards

## Components

### 1. Daily Reward

```typescript
// Formula: baseReward + (level * levelMultiplier) * streakMultiplier
// Capped at maxDailyReward

const dailyConfig = await getRewardConfig('daily');
const maxLevel = 500;
const maxStreak = 100; // 3.0x multiplier

let dailyReward = dailyConfig.baseReward + (maxLevel * dailyConfig.levelMultiplier);
dailyReward = dailyReward * dailyConfig.streakMultipliers['100']; // 3.0x
dailyReward = Math.min(dailyReward, dailyConfig.maxDailyReward);

// Example: 50 + (500 * 5) * 3.0 = 7,650 FUN (capped at 5,000)
// Result: 5,000 FUN
```

### 2. Hourly Faucet

```typescript
// Formula: (baseFaucet + (level * faucetMultiplier)) * dailyClaimsLimit
// Capped at maxFaucetReward per claim

const faucetConfig = await getRewardConfig('faucet');
const maxLevel = 500;

let faucetPerClaim = faucetConfig.baseFaucet + (maxLevel * faucetConfig.faucetMultiplier);
faucetPerClaim = Math.min(faucetPerClaim, faucetConfig.maxFaucetReward);

const dailyFaucet = faucetPerClaim * faucetConfig.dailyFaucetClaimsLimit;

// Example: (10 + (500 * 0.5)) * 12 = 3,120 FUN
// Result: 3,120 FUN
```

### 3. Rewarded Ads

```typescript
// Formula: rewardAmount * min(adsPerHourLimit * 24, dailyAdsCap)

const adConfig = await getAdRewardConfig();
const maxAdsPerDay = Math.min(
  adConfig.adsPerHourLimit * 24,  // Theoretical max: 5 * 24 = 120
  adConfig.dailyAdsCap             // Actual cap: 30
);

const dailyAds = adConfig.rewardAmount * maxAdsPerDay;

// Example: 50 * 30 = 1,500 FUN
// Result: 1,500 FUN
```

### 4. Quiz

```typescript
// Maximum reward for 3/3 correct answers

const quizConfig = await getRewardConfig('quiz');
const dailyQuiz = quizConfig.rewards['3'];

// Example: 300 FUN
// Result: 300 FUN
```

### 5. Wheel (if enabled)

```typescript
// Maximum possible reward from wheel (if daily limit exists)

const wheelConfig = await getWheelConfig();
const maxWheelSegment = Math.max(...wheelConfig.segments.map(s => s.reward || 0));
const dailyWheel = maxWheelSegment; // Assuming 1 spin per day

// Example: 1,000 FUN
// Result: 1,000 FUN
```

### 6. Missions (if enabled)

```typescript
// Sum of all active daily missions rewards

const dailyMissions = await prisma.mission.findMany({
  where: {
    type: 'DAILY',
    isActive: true
  }
});

const dailyMissionRewards = dailyMissions.reduce((sum, mission) => {
  const reward = mission.reward as { type: string; amount: number };
  if (reward.type === 'token') {
    return sum + reward.amount;
  }
  return sum;
}, 0);

// Example: 100 + 200 + 150 = 450 FUN
// Result: 450 FUN
```

### 7. Level-Up Rewards

```typescript
// One-time rewards, not included in daily estimate
// (Only shown as information)
```

## Total Daily Emission Estimate

```typescript
const totalDailyEmission = 
  dailyReward +
  dailyFaucet +
  dailyAds +
  dailyQuiz +
  (wheelEnabled ? dailyWheel : 0) +
  (missionsEnabled ? dailyMissionRewards : 0);

// Example calculation:
// 5,000 (daily) + 3,120 (faucet) + 1,500 (ads) + 300 (quiz) + 1,000 (wheel) + 450 (missions)
// = 11,370 FUN/day maximum
```

## Admin Panel Display

### API Endpoint

```typescript
// GET /api/admin/emission-estimate
{
  "dailyReward": {
    "amount": 5000,
    "formula": "50 + (500 * 5) * 3.0 = 7,650 (capped at 5,000)",
    "config": { "baseReward": 50, "levelMultiplier": 5, "maxDailyReward": 5000 }
  },
  "hourlyFaucet": {
    "amount": 3120,
    "formula": "(10 + (500 * 0.5)) * 12 = 3,120",
    "config": { "baseFaucet": 10, "faucetMultiplier": 0.5, "dailyFaucetClaimsLimit": 12 }
  },
  "rewardedAds": {
    "amount": 1500,
    "formula": "50 * 30 = 1,500",
    "config": { "rewardAmount": 50, "adsPerHourLimit": 5, "dailyAdsCap": 30 }
  },
  "quiz": {
    "amount": 300,
    "formula": "3/3 correct answers",
    "config": { "rewards": { "3": 300 } }
  },
  "wheel": {
    "amount": 1000,
    "enabled": true,
    "config": { "maxSegmentReward": 1000 }
  },
  "missions": {
    "amount": 450,
    "enabled": true,
    "count": 3
  },
  "total": {
    "amount": 11370,
    "breakdown": "5,000 + 3,120 + 1,500 + 300 + 1,000 + 450"
  },
  "calculatedAt": "2024-01-15T10:00:00Z",
  "assumptions": {
    "userLevel": 500,
    "streakDays": 100,
    "allRewardsClaimed": true
  }
}
```

### UI Component

```typescript
// Admin Panel - Emission Estimate Card
<Card>
  <CardHeader>
    <CardTitle>Daily Emission Estimate</CardTitle>
    <CardDescription>
      Maximum FUN a level 500 user can earn per day
    </CardDescription>
  </CardHeader>
  <CardContent>
    <div className="space-y-4">
      <div className="flex justify-between">
        <span>Daily Reward</span>
        <span className="font-mono">5,000 FUN</span>
      </div>
      <div className="flex justify-between">
        <span>Hourly Faucet (12x)</span>
        <span className="font-mono">3,120 FUN</span>
      </div>
      <div className="flex justify-between">
        <span>Rewarded Ads (30/day)</span>
        <span className="font-mono">1,500 FUN</span>
      </div>
      <div className="flex justify-between">
        <span>Quiz (3/3 correct)</span>
        <span className="font-mono">300 FUN</span>
      </div>
      <div className="flex justify-between">
        <span>Wheel</span>
        <span className="font-mono">1,000 FUN</span>
      </div>
      <div className="flex justify-between">
        <span>Daily Missions (3)</span>
        <span className="font-mono">450 FUN</span>
      </div>
      <Separator />
      <div className="flex justify-between text-lg font-bold">
        <span>Total Daily Maximum</span>
        <span className="font-mono text-yellow-500">11,370 FUN</span>
      </div>
    </div>
    <div className="mt-4 text-sm text-muted-foreground">
      <p>⚠️ This is a theoretical maximum. Most users will earn less.</p>
      <p>💡 Adjust configurations to balance token emission vs. game house edge.</p>
    </div>
  </CardContent>
</Card>
```

## Usage Guidelines

### Balancing Economy

1. **Compare emission vs. house edge**:
   - If daily emission = 11,370 FUN/user
   - And house edge = 2% average
   - User needs to wager: 11,370 / 0.02 = **568,500 FUN/day** to break even

2. **Adjust if needed**:
   - If emission too high → Reduce reward amounts or limits
   - If emission too low → Increase rewards to encourage engagement

3. **Monitor actual usage**:
   - Track real daily rewards claimed (not theoretical max)
   - Adjust based on actual user behavior

### Warning Thresholds

- **High Emission** (>15,000 FUN/day): May cause inflation
- **Low Emission** (<5,000 FUN/day): May reduce engagement
- **Balanced** (5,000-15,000 FUN/day): Good range for sustainable economy

## Implementation

See `backend/src/admin/services/emission-estimate.service.ts` for full implementation.

