# XP & Level System Design

## Overview

Users progress through levels 1-500 by earning XP from gameplay. The system uses a **non-linear progression curve** that makes early levels accessible but high levels very challenging.

## XP Formula

### Base XP from Bets

```
XP = (betAmount * gameMultiplier * baseXpRate) * globalXpMultiplier
```

Where:
- `betAmount`: Amount wagered in FUN (8 decimals)
- `gameMultiplier`: Game-specific multiplier (from `XpConfig.gameMultipliers`, default 1.0 for all games)
- `baseXpRate`: Global XP rate (from `XpConfig.baseXpRate`, default: 0.01 = 1 XP per 100 FUN)
- `globalXpMultiplier`: **Global multiplier applied to all XP** (from `XpConfig.globalXpMultiplier`, default: 1.0)

**Example:**
- User bets 1,000 FUN on Mines (multiplier 1.0)
- baseXpRate = 0.01
- globalXpMultiplier = 1.0 (normal speed)
- XP earned = (1,000 * 1.0 * 0.01) * 1.0 = **10 XP**

**Example with 2x global multiplier:**
- Same bet, but globalXpMultiplier = 2.0 (double XP event)
- XP earned = (1,000 * 1.0 * 0.01) * 2.0 = **20 XP**

### Purpose of globalXpMultiplier

The `globalXpMultiplier` allows admins to:
- **Increase progression speed**: Set to 2.0 for double XP events
- **Decrease progression speed**: Set to 0.5 to slow down leveling
- **Adjust economy balance**: Fine-tune XP without changing level thresholds

This multiplier is applied **after** the base calculation, so it affects all XP sources uniformly.

### Additional XP Sources

- **Missions**: Configurable XP rewards
- **Wheel**: Configurable XP rewards
- **Future sources**: Can be added via configuration

## Level Progression Curve

### Formula

The progression uses a **quadratic curve** with exponential scaling at higher levels:

```
XP_Required(level) = baseXP * (level^exponent) + offset
```

Where:
- `baseXP`: Base multiplier (configurable)
- `exponent`: Curve steepness (starts at 1.0, increases at milestones)
- `offset`: Base XP required for level 1

### Milestone Adjustments

The exponent increases at milestone levels to make progression slower:

- **Levels 1-10**: exponent = 1.0 (linear)
- **Levels 11-50**: exponent = 1.2 (slightly exponential)
- **Levels 51-100**: exponent = 1.5 (moderate exponential)
- **Levels 101-200**: exponent = 1.8 (steep exponential)
- **Levels 201-300**: exponent = 2.0 (quadratic)
- **Levels 301-400**: exponent = 2.2 (very steep)
- **Levels 401-500**: exponent = 2.5 (extremely steep)

### Example XP Thresholds

Based on the formula and target of ~50,000 FUN wagered for level 10:

| Level | XP Required (Cumulative) | Est. FUN Wagered* |
|-------|--------------------------|-------------------|
| 1     | 0                        | 0                 |
| 10    | 500                      | 50,000            |
| 50    | 50,000                    | 5,000,000         |
| 100   | 200,000                   | 20,000,000        |
| 200   | 1,500,000                 | 150,000,000       |
| 300   | 5,000,000                 | 500,000,000       |
| 400   | 15,000,000                | 1,500,000,000     |
| 500   | 50,000,000                | 5,000,000,000     |

**Important**: The `LevelConfig.xpRequired` field stores the **cumulative total XP** required to reach that level, not the difference from the previous level.

For example:
- Level 10 requires **500 total XP** (cumulative from level 1)
- Level 50 requires **50,000 total XP** (cumulative from level 1)
- To go from level 10 to 50, user needs: 50,000 - 500 = **49,500 additional XP**

*Assuming baseXpRate = 0.01 (1 XP per 100 FUN)

### Implementation

The exact thresholds are stored in `LevelConfig` table, allowing adjustments without code changes.

**Important**: `LevelConfig.xpRequired` is **cumulative** - it represents the total XP needed from level 1 to reach that level.

```typescript
// Pseudo-code for level calculation
function calculateLevelFromXP(totalXP: number): number {
  let level = 1;
  while (level < 500) {
    // Get cumulative XP required for next level
    const xpRequiredForNextLevel = getXPRequired(level + 1);
    if (totalXP >= xpRequiredForNextLevel) {
      level++;
    } else {
      break;
    }
  }
  return level;
}

// Helper function to get cumulative XP required for a level
function getXPRequired(level: number): number {
  const levelConfig = await prisma.levelConfig.findUnique({
    where: { level }
  });
  return levelConfig.xpRequired; // This is cumulative from level 1
}
```

## Level-Up Rewards

### Reward Structure

Rewards are configured per level in `LevelConfig.reward`:

| Level Range | Reward (FUN) | Notes |
|-------------|--------------|-------|
| 2-9         | 50           | Small incremental rewards |
| 10          | 1,000        | Milestone reward |
| 11-49       | 100          | Incremental |
| 50          | 3,000        | Milestone reward |
| 51-99       | 200          | Incremental |
| 100         | 5,000        | Milestone reward |
| 101-199     | 500          | Incremental |
| 200         | 10,000       | Milestone reward |
| 201-299     | 1,000        | Incremental |
| 300         | 20,000       | Milestone reward |
| 301-399     | 2,000        | Incremental |
| 400         | 35,000       | Milestone reward |
| 401-499     | 3,000        | Incremental |
| 500         | 50,000       | Final milestone reward |

### Multiple Level Jumps

If a user gains enough XP to skip multiple levels (e.g., from level 5 to level 12), they receive rewards for **every level crossed**:

```typescript
// Pseudo-code
function processLevelUp(oldLevel: number, newLevel: number, userId: string) {
  for (let level = oldLevel + 1; level <= newLevel; level++) {
    const reward = getLevelReward(level);
    if (reward > 0) {
      creditUser(userId, reward, 'LEVEL_UP_REWARD', { level });
      logLevelUpReward(userId, level, reward);
    }
  }
}
```

## XP Calculation on Bet Resolution

When a bet is resolved:

1. Load XP configuration from `XpConfig` table:
   - `baseXpRate`
   - `globalXpMultiplier`
   - `gameMultipliers[gameType]`
2. Calculate base XP: `betAmount * gameMultiplier * baseXpRate`
3. Apply global multiplier: `baseXP * globalXpMultiplier`
4. Add XP to user's total
5. Check if level increased
6. If level increased:
   - Calculate all levels crossed
   - Award rewards for each level
   - Log all level-up rewards
7. Update `UserLevel` record
8. Log XP in `XpLog` table

## Configuration

All formulas and thresholds are configurable via database:

- **`XpConfig` table**:
  - `baseXpRate`: Base XP rate (default: 0.01)
  - `globalXpMultiplier`: Global multiplier for all XP (default: 1.0)
  - `gameMultipliers`: JSON object with multipliers per game type
    ```json
    {
      "MINES": 1.0,
      "PLINKO": 1.0,
      "CRASH": 1.2,
      "DICE": 0.8
    }
    ```
- **`LevelConfig` table**: XP required and reward for each level
- All values can be updated via admin panel without code deployment

## Future Extensions

- XP multipliers for special events
- XP bonuses for streaks
- Seasonal XP boosts
- VIP tiers with XP bonuses

