import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LevelsService } from '../levels/levels.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private levelsService: LevelsService,
  ) {}

  // ============================================
  // XP CONFIG
  // ============================================

  async getXpConfig() {
    return this.levelsService.getXpConfig();
  }

  async updateXpConfig(data: {
    baseXpRate?: number;
    globalXpMultiplier?: number;
    gameMultipliers?: Record<string, number>;
  }, adminId: string) {
    const existing = await this.prisma.xpConfig.findFirst();
    
    if (!existing) {
      // Create if doesn't exist
      return this.prisma.xpConfig.create({
        data: {
          baseXpRate: data.baseXpRate ?? 0.01,
          globalXpMultiplier: data.globalXpMultiplier ?? 1.0,
          gameMultipliers: data.gameMultipliers ?? {},
          updatedBy: adminId,
        },
      });
    }

    return this.prisma.xpConfig.update({
      where: { id: existing.id },
      data: {
        baseXpRate: data.baseXpRate !== undefined ? new Decimal(data.baseXpRate) : undefined,
        globalXpMultiplier: data.globalXpMultiplier !== undefined ? new Decimal(data.globalXpMultiplier) : undefined,
        gameMultipliers: data.gameMultipliers !== undefined ? data.gameMultipliers : undefined,
        updatedBy: adminId,
      },
    });
  }

  // ============================================
  // LEVEL CONFIG
  // ============================================

  async getLevelConfig(level?: number) {
    if (level) {
      return this.levelsService.getLevelConfig(level);
    }
    return this.prisma.levelConfig.findMany({
      orderBy: { level: 'asc' },
    });
  }

  async updateLevelConfig(level: number, data: {
    xpRequired?: number;
    reward?: number | null;
  }) {
    return this.prisma.levelConfig.upsert({
      where: { level },
      update: {
        xpRequired: data.xpRequired !== undefined ? new Decimal(data.xpRequired) : undefined,
        reward: data.reward !== undefined ? (data.reward === null ? null : new Decimal(data.reward)) : undefined,
      },
      create: {
        level,
        xpRequired: new Decimal(data.xpRequired ?? 0),
        reward: data.reward === null ? null : new Decimal(data.reward ?? 0),
      },
    });
  }

  // ============================================
  // REWARD CONFIG
  // ============================================

  async getRewardConfig(type: string) {
    const config = await this.prisma.rewardConfig.findUnique({
      where: { type },
    });
    if (!config) {
      throw new NotFoundException(`Reward config '${type}' not found`);
    }
    return config;
  }

  async updateRewardConfig(type: string, config: any) {
    return this.prisma.rewardConfig.upsert({
      where: { type },
      update: { config },
      create: { type, config },
    });
  }

  // ============================================
  // AD REWARD CONFIG
  // ============================================

  async getAdRewardConfig() {
    const config = await this.prisma.adRewardConfig.findFirst();
    if (!config) {
      throw new NotFoundException('Ad reward config not found');
    }
    return config;
  }

  async updateAdRewardConfig(data: {
    rewardAmount?: number;
    adsPerHourLimit?: number;
    dailyAdsCap?: number;
    isActive?: boolean;
  }) {
    const existing = await this.prisma.adRewardConfig.findFirst();
    
    if (!existing) {
      return this.prisma.adRewardConfig.create({
        data: {
          rewardAmount: new Decimal(data.rewardAmount ?? 50),
          adsPerHourLimit: data.adsPerHourLimit ?? 5,
          dailyAdsCap: data.dailyAdsCap ?? 30,
          isActive: data.isActive ?? true,
        },
      });
    }

    return this.prisma.adRewardConfig.update({
      where: { id: existing.id },
      data: {
        rewardAmount: data.rewardAmount !== undefined ? new Decimal(data.rewardAmount) : undefined,
        adsPerHourLimit: data.adsPerHourLimit,
        dailyAdsCap: data.dailyAdsCap,
        isActive: data.isActive,
      },
    });
  }

  // ============================================
  // RACE CONFIG
  // ============================================

  async getRaceConfig(name: string = 'default') {
    const config = await this.prisma.raceConfig.findUnique({
      where: { name },
    });
    if (!config) {
      throw new NotFoundException(`Race config '${name}' not found`);
    }
    return config;
  }

  async updateRaceConfig(name: string, data: {
    entryFee?: number;
    prizeDistribution?: any;
    isActive?: boolean;
  }) {
    return this.prisma.raceConfig.upsert({
      where: { name },
      update: {
        entryFee: data.entryFee !== undefined ? new Decimal(data.entryFee) : undefined,
        prizeDistribution: data.prizeDistribution,
        isActive: data.isActive,
      },
      create: {
        name,
        entryFee: new Decimal(data.entryFee ?? 100),
        prizeDistribution: data.prizeDistribution ?? {
          topPercentageWinners: 25,
          tiers: [
            { rankStart: 1, rankEnd: 1, percentage: 20 },
            { rankStart: 2, rankEnd: 2, percentage: 15 },
            { rankStart: 3, rankEnd: 3, percentage: 10 },
            { rankStart: 4, rankEnd: 50, percentage: 35 },
            { rankStart: 51, rankEnd: 100, percentage: 20 },
          ],
        },
        isActive: data.isActive ?? true,
      },
    });
  }

  // ============================================
  // WHEEL CONFIG
  // ============================================

  async getWheelConfig(name: string = 'default') {
    const cfg = await this.prisma.wheelConfig.findFirst({
      where: { name },
    });
    if (!cfg) {
      throw new NotFoundException(`Wheel config '${name}' not found`);
    }
    return cfg;
  }

  async updateWheelConfig(name: string, segments: any) {
    return this.prisma.wheelConfig.upsert({
      where: { name },
      update: { segments },
      create: { name, segments },
    });
  }

  // ============================================
  // MISSIONS ADMIN
  // ============================================

  async listMissions() {
    return this.prisma.mission.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async createMission(data: any, adminId: string) {
    const mission = await this.prisma.mission.create({ data });
    await this.prisma.adminActionLog.create({
      data: {
        adminId,
        action: 'create_mission',
        details: { missionId: mission.id },
      },
    });
    return mission;
  }

  async updateMission(id: string, data: any, adminId: string) {
    const mission = await this.prisma.mission.update({
      where: { id },
      data,
    });
    await this.prisma.adminActionLog.create({
      data: {
        adminId,
        action: 'update_mission',
        details: { missionId: id },
      },
    });
    return mission;
  }

  async deleteMission(id: string, adminId: string) {
    await this.prisma.mission.delete({ where: { id } });
    await this.prisma.adminActionLog.create({
      data: {
        adminId,
        action: 'delete_mission',
        details: { missionId: id },
      },
    });
    return { deleted: true };
  }

  // ============================================
  // ACHIEVEMENTS ADMIN
  // ============================================

  async listAchievements() {
    return this.prisma.achievement.findMany({
      orderBy: { code: 'asc' },
    });
  }

  async createAchievement(data: any, adminId: string) {
    const ach = await this.prisma.achievement.create({ data });
    await this.prisma.adminActionLog.create({
      data: {
        adminId,
        action: 'create_achievement',
        details: { achievementId: ach.id },
      },
    });
    return ach;
  }

  async updateAchievement(id: string, data: any, adminId: string) {
    const ach = await this.prisma.achievement.update({
      where: { id },
      data,
    });
    await this.prisma.adminActionLog.create({
      data: {
        adminId,
        action: 'update_achievement',
        details: { achievementId: id },
      },
    });
    return ach;
  }

  async deleteAchievement(id: string, adminId: string) {
    await this.prisma.achievement.delete({ where: { id } });
    await this.prisma.adminActionLog.create({
      data: {
        adminId,
        action: 'delete_achievement',
        details: { achievementId: id },
      },
    });
    return { deleted: true };
  }

  // ============================================
  // EMISSION ESTIMATE
  // ============================================

  async getDailyEmissionEstimate() {
    // Get all configs
    const dailyConfig = await this.getRewardConfig('daily').catch(() => null);
    const faucetConfig = await this.getRewardConfig('faucet').catch(() => null);
    const adConfig = await this.getAdRewardConfig().catch(() => null);
    const quizConfig = await this.getRewardConfig('quiz').catch(() => null);

    const maxLevel = 500;
    const maxStreak = 100;

    // Calculate daily reward
    let dailyReward = 0;
    if (dailyConfig) {
      const config = dailyConfig.config as any;
      dailyReward = config.baseReward + (maxLevel * config.levelMultiplier);
      const streakMultiplier = config.streakMultipliers?.['100'] || 3.0;
      dailyReward = dailyReward * streakMultiplier;
      dailyReward = Math.max(config.minDailyReward || 50, Math.min(config.maxDailyReward || 5000, dailyReward));
    }

    // Calculate faucet
    let dailyFaucet = 0;
    if (faucetConfig) {
      const config = faucetConfig.config as any;
      const faucetPerClaim = config.baseFaucet + (maxLevel * config.faucetMultiplier);
      const cappedFaucet = Math.max(config.minFaucetReward || 10, Math.min(config.maxFaucetReward || 500, faucetPerClaim));
      dailyFaucet = cappedFaucet * (config.dailyFaucetClaimsLimit || 12);
    }

    // Calculate ads
    let dailyAds = 0;
    if (adConfig) {
      const maxAdsPerDay = Math.min(
        (adConfig.adsPerHourLimit || 5) * 24,
        adConfig.dailyAdsCap || 30
      );
      dailyAds = adConfig.rewardAmount.toNumber() * maxAdsPerDay;
    }

    // Calculate quiz
    let dailyQuiz = 0;
    if (quizConfig) {
      const config = quizConfig.config as any;
      dailyQuiz = config.rewards?.['3'] || 300; // Max reward for 3/3 correct
    }

    const total = dailyReward + dailyFaucet + dailyAds + dailyQuiz;

    return {
      dailyReward: {
        amount: dailyReward,
        formula: `baseReward + (level * levelMultiplier) * streakMultiplier (capped)`,
        config: dailyConfig?.config,
      },
      hourlyFaucet: {
        amount: dailyFaucet,
        formula: `(baseFaucet + (level * faucetMultiplier)) * dailyClaimsLimit (capped)`,
        config: faucetConfig?.config,
      },
      rewardedAds: {
        amount: dailyAds,
        formula: `rewardAmount * min(adsPerHourLimit * 24, dailyAdsCap)`,
        config: {
          rewardAmount: adConfig?.rewardAmount.toNumber(),
          adsPerHourLimit: adConfig?.adsPerHourLimit,
          dailyAdsCap: adConfig?.dailyAdsCap,
        },
      },
      quiz: {
        amount: dailyQuiz,
        formula: `Max reward for 3/3 correct answers`,
        config: quizConfig?.config,
      },
      total: {
        amount: total,
        breakdown: `${dailyReward} + ${dailyFaucet} + ${dailyAds} + ${dailyQuiz}`,
      },
      calculatedAt: new Date().toISOString(),
      assumptions: {
        userLevel: maxLevel,
        streakDays: maxStreak,
        allRewardsClaimed: true,
      },
    };
  }
}

