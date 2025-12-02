# Reward System Design

## Overview

The platform offers multiple ways for users to earn FUN tokens, all designed to be sustainable and prevent abuse.

## Daily Reward

### Formula

```
dailyReward = baseReward + (level * levelMultiplier)
```

With min/max caps:
- **Minimum**: 50 FUN (level 1)
- **Maximum**: 5,000 FUN (level 500+)

**Example:**
- Level 1: 50 + (1 * 5) = **55 FUN**
- Level 50: 50 + (50 * 5) = **300 FUN**
- Level 100: 50 + (100 * 5) = **550 FUN**
- Level 500: Capped at **5,000 FUN**

### Streak Bonus

Users who claim daily rewards consecutively receive bonus multipliers:

| Streak Days | Multiplier | Example (Level 50) |
|-------------|------------|-------------------|
| 1-6         | 1.0x       | 300 FUN           |
| 7            | 1.2x       | 360 FUN           |
| 14           | 1.5x       | 450 FUN           |
| 30           | 2.0x       | 600 FUN           |
| 60           | 2.5x       | 750 FUN           |
| 100+         | 3.0x       | 900 FUN           |

**Reset:** Streak resets to 0 if user misses a day (based on server time, reset at 02:00).

### Anti-Abuse

- **Server time only**: Day reset at 02:00 server time
- **One per day**: Unique constraint on `(userId, day)`
- **IP/User-Agent tracking**: Logged for pattern detection

## Hourly Faucet

### Formula

```
faucetReward = baseFaucet + (level * faucetMultiplier)
```

With min/max caps:
- **Minimum**: 10 FUN (level 1)
- **Maximum**: 500 FUN (level 500+)

**Example:**
- Level 1: 10 + (1 * 0.5) = **10.5 FUN**
- Level 50: 10 + (50 * 0.5) = **35 FUN**
- Level 100: 10 + (100 * 0.5) = **60 FUN**
- Level 500: Capped at **500 FUN**

### Limits

- **Cooldown**: 1 hour between claims (server time)
- **Daily limit**: 12 claims per day (reset at 02:00)
- **Total daily max**: ~420 FUN (level 1) to ~6,000 FUN (level 500)

### Anti-Abuse

- Server time-based cooldown
- Daily claim limit tracking
- IP/User-Agent logging

## Rewarded Ads

### Reward Amount

- **Fixed**: Configurable in `AdRewardConfig.rewardAmount` (default: 50 FUN per completed ad)
- **Hourly limit**: Configurable in `AdRewardConfig.adsPerHourLimit` (default: 5 ads per hour)
  - Calendar hour: 00:00-00:59, 01:00-01:59, etc.
- **Daily cap**: Configurable in `AdRewardConfig.dailyAdsCap` (default: 30 ads per day)
  - Reset at 02:00 server time
  - **Both limits apply**: User must respect both hourly (5/h) AND daily (30/day) limits

### Limits Logic

1. **Hourly check**: Count ads in current hour (e.g., 14:00-14:59)
   - If >= `adsPerHourLimit` (5), reject
2. **Daily check**: Count ads today (reset at 02:00)
   - If >= `dailyAdsCap` (30), reject
3. If both checks pass, reward user and log in `AdReward` table

### Example Scenarios

**Scenario 1: User hits hourly limit**
- User watched 5 ads between 10:00-10:59
- Tries to watch 6th ad at 10:45
- **Result**: Rejected (hourly limit reached)

**Scenario 2: User hits daily cap**
- User watched 30 ads today (across different hours)
- Tries to watch 31st ad at 15:00 (only 2 ads in that hour)
- **Result**: Rejected (daily cap reached, even though hourly limit not reached)

**Scenario 3: Optimal usage**
- User watches exactly 5 ads per hour for 6 hours = 30 ads
- Total reward: 30 * 50 = **1,500 FUN/day** (at default config)

### Anti-Abuse

- Server-side verification of ad completion
- Hour-based tracking (not rolling 60 minutes)
- Daily cap tracking (reset at 02:00 server time)
- IP/User-Agent logging
- Rate limiting on reward endpoint

### Configuration

All values stored in `AdRewardConfig` table:
- `rewardAmount`: FUN per ad (default: 50)
- `adsPerHourLimit`: Max ads per hour (default: 5)
- `dailyAdsCap`: Max ads per day (default: 30)
- `isActive`: Enable/disable ad rewards

## Quiz Daily Reward

### Reward Structure

Based on correct answers (out of 3 questions):

| Correct Answers | Reward (FUN) |
|-----------------|--------------|
| 0               | 0            |
| 1               | 50           |
| 2               | 150          |
| 3               | 300          |

### Configuration

Stored in `RewardConfig` table with type `'quiz'`:

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

### Anti-Abuse

- One attempt per day (reset at 02:00)
- Server-side answer validation
- IP/User-Agent logging
- CAPTCHA on quiz start (optional)

## Level-Up Rewards

See [XP & Level System](./xp-level-system.md) for details.

## Race Prizes

### Entry Fee

- **Configurable** in `RaceConfig.entryFee` (default: 100 FUN per race entry)
- Deducted from user balance when joining race

### Prize Pool

- Total pool = sum of all entry fees from all participants
- Top percentage of participants win prizes (configurable in `RaceConfig.prizeDistribution.topPercentageWinners`, default: 25%)

### Distribution

Prize distribution is **fully configurable** in `RaceConfig.prizeDistribution` JSON field:

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

**Default Distribution** (example with 10,000 FUN pool):

| Rank Range | % of Pool | Example (10,000 FUN pool) |
|------------|-----------|---------------------------|
| 1st        | 20%       | 2,000 FUN                 |
| 2nd        | 15%       | 1,500 FUN                 |
| 3rd        | 10%       | 1,000 FUN                 |
| 4th-50th   | 35%       | ~778 FUN each (35,000 / 45) |
| 51st-100th | 20%       | ~400 FUN each (20,000 / 50) |

### Scaling Logic

If fewer participants than the maximum rank in tiers:

1. Calculate `topPercentageWinners` count: `Math.ceil(totalParticipants * topPercentageWinners / 100)`
2. Only participants within this count receive prizes
3. For each tier:
   - If `rankEnd > topPercentageWinners`, clamp to `topPercentageWinners`
   - If `rankStart > topPercentageWinners`, skip this tier
   - Distribute tier percentage among participants in that rank range

**Example with 40 participants:**
- Top 25% = 10 winners (positions 1-10)
- Tier 1-3: Distributed normally (positions 1-3)
- Tier 4-50: Clamped to positions 4-10 (7 participants share 35% of pool)
- Tier 51-100: Skipped (no participants in this range)

### Configuration

All race settings stored in `RaceConfig` table:
- `entryFee`: FUN required to join (default: 100)
- `prizeDistribution`: JSON with tiers and percentages
- `isActive`: Enable/disable this race config
- Multiple configs can exist (e.g., 'default', 'weekly', 'monthly')

## Mission Rewards

Configurable per mission:
- Token rewards (FUN)
- XP rewards
- Both

Examples:
- **Daily Mission**: "Place 10 bets" → 100 FUN + 50 XP
- **Weekly Mission**: "Wager 10,000 FUN" → 500 FUN + 200 XP
- **Monthly Mission**: "Reach level 50" → 2,000 FUN + 1,000 XP

## Wheel Rewards

Configurable segments in `WheelConfig`:
- Token rewards (various amounts)
- XP rewards
- "Try again" (no reward)
- Special bonuses

Example wheel (8 segments):
- 50 FUN (2 segments)
- 100 FUN (2 segments)
- 200 FUN (1 segment)
- 500 FUN (1 segment)
- 1,000 FUN (1 segment)
- 100 XP (1 segment)

## Reward Sustainability

### Daily Token Emission Estimate

For an active level 100 user:
- Daily reward: ~550 FUN
- Hourly faucet (12x): ~720 FUN
- Ads (max 30/day with default `dailyAdsCap`): ~1,500 FUN (30 × 50 FUN)
- Quiz: ~300 FUN (if 3/3 correct)
- **Total potential**: ~3,070 FUN/day

**Note**: The daily ads cap (default: 30 ads/day) limits the maximum ads reward, not the theoretical 120 ads/hour × 24 hours. This prevents excessive token emission while still providing meaningful rewards.

### Balancing

- House edge on games (1.5-3%) removes tokens from circulation
- Level-up rewards are one-time (not daily)
- Race entry fees create deflationary pressure
- Future: Optional token burning mechanisms

## Configuration

All reward amounts and formulas are stored in database tables (NO hard-coded values):

### Reward Configuration Tables

- **`RewardConfig`** (type: 'daily', 'faucet', 'quiz', 'streak'):
  ```json
  // type: 'daily'
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
  
  // type: 'faucet'
  {
    "baseFaucet": 10,
    "faucetMultiplier": 0.5,
    "minFaucetReward": 10,
    "maxFaucetReward": 500,
    "dailyFaucetClaimsLimit": 12
  }
  
  // type: 'quiz'
  {
    "rewards": {
      "0": 0,
      "1": 50,
      "2": 150,
      "3": 300
    }
  }
  ```

- **`AdRewardConfig`**:
  - `rewardAmount`: FUN per ad (default: 50)
  - `adsPerHourLimit`: Max ads per hour (default: 5)
  - `dailyAdsCap`: Max ads per day (default: 30)
  - `isActive`: Enable/disable

- **`LevelConfig`** table: XP required and reward for each level (1-500)

- **`RaceConfig`** table: Entry fee and prize distribution tiers

- **`WheelConfig`** table: Wheel segments with rewards and probabilities

- **`Mission`** table: Mission objectives and rewards (FUN/XP)

Admins can adjust all values via admin panel without code changes.

