import { Decimal } from '@prisma/client/runtime/library';

export interface XpConfig {
  id: string;
  baseXpRate: Decimal;
  globalXpMultiplier: Decimal;
  gameMultipliers: Record<string, number>;
  updatedAt: Date;
  updatedBy?: string | null;
}

export interface LevelConfig {
  id: string;
  level: number;
  xpRequired: Decimal; // Cumulative XP from level 1
  reward: Decimal | null; // FUN reward on level up
  createdAt: Date;
  updatedAt: Date;
}

export interface UserLevelData {
  level: number;
  xp: Decimal;
  totalXpEarned: Decimal;
  xpToNextLevel: Decimal | null;
}

export interface XpEarnedResult {
  xpEarned: Decimal;
  oldLevel: number;
  newLevel: number;
  levelsGained: number;
  levelUpRewards: Array<{
    level: number;
    amount: Decimal;
  }>;
  totalXp: Decimal;
}

