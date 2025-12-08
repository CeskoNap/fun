import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LevelsService } from '../levels/levels.service';
import { Decimal } from '@prisma/client/runtime/library';
import { updateUserBalance, fromCentesimi } from '../common/utils/balance.util';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

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
        reward: data.reward !== undefined ? (data.reward === null ? null : BigInt(Math.round(data.reward))) : undefined,
      },
      create: {
        level,
        xpRequired: new Decimal(data.xpRequired ?? 0),
        reward: data.reward === null ? null : BigInt(Math.round(data.reward ?? 0)),
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
          rewardAmount: BigInt(Math.round(data.rewardAmount ?? 50)),
          adsPerHourLimit: data.adsPerHourLimit ?? 5,
          dailyAdsCap: data.dailyAdsCap ?? 30,
          isActive: data.isActive ?? true,
        },
      });
    }

    return this.prisma.adRewardConfig.update({
      where: { id: existing.id },
      data: {
        rewardAmount: data.rewardAmount !== undefined ? BigInt(Math.round(data.rewardAmount)) : undefined,
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
        entryFee: data.entryFee !== undefined ? BigInt(Math.round(data.entryFee)) : undefined,
        prizeDistribution: data.prizeDistribution,
        isActive: data.isActive,
      },
      create: {
        name,
        entryFee: BigInt(Math.round(data.entryFee ?? 100)),
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

  // ============================================
  // USER MANAGEMENT
  // ============================================

  async listUsers(options: {
    page?: number;
    limit?: number;
    search?: string;
    role?: UserRole;
    isBanned?: boolean;
  }) {
    const page = options.page || 1;
    const limit = options.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (options.search) {
      where.OR = [
        { username: { contains: options.search, mode: 'insensitive' } },
        { email: { contains: options.search, mode: 'insensitive' } },
        { displayName: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    if (options.role) {
      where.role = options.role;
    }

    if (options.isBanned !== undefined) {
      where.isBanned = options.isBanned;
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          username: true,
          email: true,
          displayName: true,
          role: true,
          isBanned: true,
          bannedUntil: true,
          banReason: true,
          isActive: true,
          createdAt: true,
          balance: {
            select: {
              balance: true,
            },
          },
          userLevel: {
            select: {
              level: true,
              xp: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users: users.map((u) => ({
        ...u,
        balance: u.balance ? fromCentesimi(u.balance.balance as bigint).toFixed(2) : '0.00',
        level: u.userLevel?.level || 1,
        xp: u.userLevel?.xp.toString() || '0',
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getStats() {
    const [totalUsers, activeUsers, bannedUsers, totalBalanceResult, totalTransactions] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isBanned: false, isActive: true } }),
      this.prisma.user.count({ where: { isBanned: true } }),
      this.prisma.userBalance.aggregate({
        _sum: {
          balance: true,
        },
      }),
      this.prisma.transaction.count(),
    ]);

    const totalBalance = totalBalanceResult._sum.balance || 0n;

    return {
      totalUsers,
      activeUsers,
      bannedUsers,
      totalBalance: fromCentesimi(totalBalance).toFixed(2),
      totalTransactions,
    };
  }

  async getUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        balance: true,
        userLevel: true,
        _count: {
          select: {
            bets: true,
            transactions: true,
            raceParticipants: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { passwordHash, ...userWithoutPassword } = user;

    return {
      ...userWithoutPassword,
      balance: user.balance ? fromCentesimi(user.balance.balance as bigint).toFixed(2) : '0.00',
      level: user.userLevel?.level || 1,
      xp: user.userLevel?.xp.toString() || '0',
    };
  }

  async banUser(userId: string, adminId: string, reason?: string, until?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role === 'ADMIN') {
      throw new BadRequestException('Cannot ban admin users');
    }

    const bannedUntil = until ? new Date(until) : null;

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        isBanned: true,
        bannedUntil,
        banReason: reason || 'Banned by admin',
      },
    });

    await this.prisma.adminActionLog.create({
      data: {
        adminId,
        targetUserId: userId,
        action: 'ban_user',
        details: {
          reason,
          until: bannedUntil?.toISOString(),
        },
      },
    });

    return updated;
  }

  async unbanUser(userId: string, adminId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        isBanned: false,
        bannedUntil: null,
        banReason: null,
      },
    });

    await this.prisma.adminActionLog.create({
      data: {
        adminId,
        targetUserId: userId,
        action: 'unban_user',
        details: {},
      },
    });

    return updated;
  }

  async giveTokens(userId: string, adminId: string, amount: number, reason?: string) {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // amount is already in decimal format, pass it directly to updateUserBalance
    // (which will convert to centesimi internally)

    const result = await updateUserBalance(
      this.prisma,
      userId,
      amount,
      'ADMIN_ADJUSTMENT',
      {
        reason: reason || 'Admin token grant',
        adminId,
      },
    );

    await this.prisma.adminActionLog.create({
      data: {
        adminId,
        targetUserId: userId,
        action: 'give_tokens',
        details: {
          amount: amount.toFixed(2),
          reason,
          balanceBefore: fromCentesimi(result.balanceBefore).toFixed(2),
          balanceAfter: fromCentesimi(result.balanceAfter).toFixed(2),
        },
      },
    });

    return {
      userId,
      amount: amount.toFixed(2),
      balanceBefore: fromCentesimi(result.balanceBefore).toFixed(2),
      balanceAfter: fromCentesimi(result.balanceAfter).toFixed(2),
      transactionId: result.transactionId,
    };
  }

  async updateUser(userId: string, adminId: string, data: { role?: string; displayName?: string; language?: string }) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Prevent changing own role or banning self
    if (userId === adminId && data.role && data.role !== user.role) {
      throw new BadRequestException('Cannot change your own role');
    }

    const updateData: any = {};
    if (data.role !== undefined) {
      if (!['USER', 'MODERATOR', 'ADMIN'].includes(data.role)) {
        throw new BadRequestException('Invalid role');
      }
      updateData.role = data.role as UserRole;
    }
    if (data.displayName !== undefined) {
      updateData.displayName = data.displayName;
    }
    if (data.language !== undefined) {
      if (!['en', 'it'].includes(data.language)) {
        throw new BadRequestException('Invalid language');
      }
      updateData.language = data.language;
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    await this.prisma.adminActionLog.create({
      data: {
        adminId,
        targetUserId: userId,
        action: 'update_user',
        details: data,
      },
    });

    const { passwordHash, ...userWithoutPassword } = updated;
    return userWithoutPassword;
  }

  async createTestUsers() {
    const users = [
      { username: 'test1', email: 'test1@test.com', password: 'test123' },
      { username: 'test2', email: 'test2@test.com', password: 'test123' },
      { username: 'test3', email: 'test3@test.com', password: 'test123' },
      { username: 'test4', email: 'test4@test.com', password: 'test123' },
      { username: 'test5', email: 'test5@test.com', password: 'test123' },
    ];

    const results = [];

    for (const userData of users) {
      try {
        // Check if user already exists
        const existing = await this.prisma.user.findUnique({
          where: { username: userData.username.toLowerCase() },
        });

        if (existing) {
          results.push({
            username: userData.username,
            status: 'skipped',
            message: 'User already exists',
            userId: existing.id,
          });
          continue;
        }

        // Hash password
        const passwordHash = await bcrypt.hash(userData.password, 10);

        // Create user with transaction
        const result = await this.prisma.$transaction(async (tx) => {
          // Create user
          const user = await tx.user.create({
            data: {
              username: userData.username.toLowerCase(),
              email: userData.email.toLowerCase(),
              passwordHash,
              displayName: userData.username,
              isActive: true,
              ageConfirmed: true,
              ageConfirmedAt: new Date(),
            },
          });

          // Create user balance with initial balance (10,000 FUN = 1,000,000 centesimi)
          await tx.userBalance.create({
            data: {
              userId: user.id,
              balance: BigInt(1000000),
              lockedBalance: BigInt(0),
            },
          });

          // Create user level
          await tx.userLevel.create({
            data: {
              userId: user.id,
              level: 1,
              xp: new Decimal(0),
              totalXpEarned: new Decimal(0),
            },
          });

          return user;
        });

        results.push({
          username: userData.username,
          status: 'created',
          message: 'User created successfully',
          userId: result.id,
        });
      } catch (error: any) {
        results.push({
          username: userData.username,
          status: 'error',
          message: error.message || 'Unknown error',
        });
      }
    }

    return {
      message: 'Test users creation completed',
      results,
      credentials: {
        username: 'test1, test2, test3, test4, or test5',
        password: 'test123',
      },
    };
  }
}

