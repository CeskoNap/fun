import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import { GameType } from '@prisma/client';
import { XpConfig, LevelConfig, XpEarnedResult } from '../common/types/xp.types';
import { updateUserBalance } from '../common/utils/balance.util';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { AchievementsService } from '../achievements/achievements.service';

@Injectable()
export class LevelsService {
  constructor(
    private prisma: PrismaService,
    private websocketGateway: WebsocketGateway,
    private achievementsService: AchievementsService,
  ) {}

  /**
   * Get XP configuration
   */
  async getXpConfig(): Promise<XpConfig> {
    const config = await this.prisma.xpConfig.findFirst();
    if (!config) {
      throw new NotFoundException('XP configuration not found');
    }
    return {
      id: config.id,
      baseXpRate: config.baseXpRate,
      globalXpMultiplier: config.globalXpMultiplier,
      gameMultipliers: config.gameMultipliers as Record<string, number>,
      updatedAt: config.updatedAt,
      updatedBy: config.updatedBy,
    };
  }

  /**
   * Get level configuration for a specific level
   */
  async getLevelConfig(level: number): Promise<LevelConfig | null> {
    const config = await this.prisma.levelConfig.findUnique({
      where: { level },
    });
    if (!config) {
      return null;
    }
    return {
      id: config.id,
      level: config.level,
      xpRequired: config.xpRequired,
      reward: config.reward,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    };
  }

  /**
   * Calculate XP earned from a bet
   */
  async calculateXPFromBet(
    betAmount: bigint | number, // Bet amount as integer (no decimals)
    gameType: GameType,
  ): Promise<Decimal> {
    // Convert to number for XP calculation
    const betAmountNum = typeof betAmount === 'bigint' ? Number(betAmount) : betAmount;
    const betAmountDec = new Decimal(betAmountNum);
    const xpConfig = await this.getXpConfig();
    
    // Get game-specific multiplier
    const gameMultiplier = xpConfig.gameMultipliers[gameType] || 1.0;
    
    // Calculate base XP
    const baseXP = betAmountDec
      .mul(gameMultiplier)
      .mul(xpConfig.baseXpRate);
    
    // Apply global multiplier
    const finalXP = baseXP.mul(xpConfig.globalXpMultiplier);
    
    return finalXP;
  }

  /**
   * Calculate level from total XP (cumulative)
   */
  async calculateLevelFromXP(totalXP: Decimal): Promise<number> {
    let level = 1;
    
    // Check each level from 1 to 500
    for (let l = 2; l <= 500; l++) {
      const levelConfig = await this.getLevelConfig(l);
      if (!levelConfig) {
        break; // Level config not found, stop
      }
      
      // xpRequired is cumulative from level 1
      if (totalXP.gte(levelConfig.xpRequired)) {
        level = l;
      } else {
        break; // XP not enough for this level
      }
    }
    
    return level;
  }

  /**
   * Calculate XP needed for next level
   */
  async calculateXPToNextLevel(currentLevel: number, currentXP: Decimal): Promise<Decimal | null> {
    const nextLevelConfig = await this.getLevelConfig(currentLevel + 1);
    if (!nextLevelConfig) {
      return null; // Max level reached
    }
    
    // xpRequired is cumulative, so subtract current XP
    const xpNeeded = nextLevelConfig.xpRequired.sub(currentXP);
    return xpNeeded.gt(0) ? xpNeeded : new Decimal(0);
  }

  /**
   * Add XP to user and handle level progression
   */
  async addXpForUser(
    userId: string,
    xp: Decimal,
    source: 'bet' | 'mission' | 'wheel' | 'other',
    sourceId?: string,
    metadata?: Record<string, any>,
  ): Promise<XpEarnedResult> {
    // Get or create user level
    let userLevel = await this.prisma.userLevel.findUnique({
      where: { userId },
    });

    if (!userLevel) {
      // Create initial user level
      userLevel = await this.prisma.userLevel.create({
        data: {
          userId,
          level: 1,
          xp: new Decimal(0),
          totalXpEarned: new Decimal(0),
        },
      });
    }

    const oldLevel = userLevel.level;
    const oldXP = userLevel.xp;
    const oldTotalXP = userLevel.totalXpEarned;

    // Add XP
    const newTotalXP = oldTotalXP.add(xp);
    const newXP = oldXP.add(xp);

    // Calculate new level
    const newLevel = await this.calculateLevelFromXP(newTotalXP);
    const levelsGained = newLevel - oldLevel;

    // Calculate level-up rewards
    const levelUpRewards: Array<{ level: number; amount: bigint }> = [];
    
    if (levelsGained > 0) {
      // User gained one or more levels
      for (let level = oldLevel + 1; level <= newLevel; level++) {
        const levelConfig = await this.getLevelConfig(level);
        if (levelConfig && levelConfig.reward) {
          levelUpRewards.push({
            level,
            amount: levelConfig.reward as bigint,
          });

          // Credit level-up reward (if exists)
          const rewardAmount = levelConfig.reward as bigint | null;
          if (rewardAmount && rewardAmount > 0n) {
            await updateUserBalance(
              this.prisma,
              userId,
              rewardAmount,
              'LEVEL_UP_REWARD',
              {
                level,
                source,
                sourceId,
              },
            );

            // Log level-up reward
            await this.prisma.levelUpReward.create({
              data: {
                userId,
                level,
                amount: rewardAmount,
              },
            });
          }
        }
      }
    }

    // Update user level
    const xpToNextLevel = await this.calculateXPToNextLevel(newLevel, newTotalXP);
    
    const updatedUserLevel = await this.prisma.userLevel.update({
      where: { userId },
      data: {
        level: newLevel,
        xp: newXP,
        totalXpEarned: newTotalXP,
        xpToNextLevel,
      },
    });

    // Log XP earned
    await this.prisma.xpLog.create({
      data: {
        userId,
        xpEarned: xp,
        source,
        sourceId: sourceId || null,
        levelBefore: oldLevel,
        levelAfter: newLevel,
        metadata: metadata || {},
      },
    });

    // Emit WebSocket events
    if (levelsGained > 0) {
      this.websocketGateway.emitToUser(userId, 'level:up', {
        oldLevel,
        newLevel,
        levelsGained,
        rewards: levelUpRewards,
        totalXP: newTotalXP.toString(),
      });

      // Check achievements on level up
      await this.achievementsService.checkForAchievements(userId, {
        event: 'LEVEL_UP',
        newLevel,
        totalXp: newTotalXP,
      });
    }

    return {
      xpEarned: xp,
      oldLevel,
      newLevel,
      levelsGained,
      levelUpRewards,
      totalXp: newTotalXP,
    };
  }

  /**
   * Get user level data
   */
  async getUserLevel(userId: string) {
    let userLevel = await this.prisma.userLevel.findUnique({
      where: { userId },
    });

    if (!userLevel) {
      // Create initial user level
      userLevel = await this.prisma.userLevel.create({
        data: {
          userId,
          level: 1,
          xp: new Decimal(0),
          totalXpEarned: new Decimal(0),
        },
      });
    }

    // Calculate XP to next level
    const xpToNextLevel = await this.calculateXPToNextLevel(
      userLevel.level,
      userLevel.totalXpEarned,
    );

    return {
      level: userLevel.level,
      xp: userLevel.xp,
      totalXpEarned: userLevel.totalXpEarned,
      xpToNextLevel,
    };
  }
}

