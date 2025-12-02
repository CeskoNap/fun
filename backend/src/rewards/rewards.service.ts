import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LevelsService } from '../levels/levels.service';
import { Decimal } from '@prisma/client/runtime/library';
import {
  DailyRewardConfig,
  FaucetRewardConfig,
  QuizRewardConfig,
  DailyRewardResult,
  FaucetRewardResult,
  AdRewardResult,
  QuizStartResult,
  QuizSubmitResult,
  QuizQuestionPublic,
} from '../common/types/reward.types';
import { getServerDay, getCurrentHour, getNextServerDay, isWithinServerDay } from '../common/utils/server-time.util';
import { updateUserBalance } from '../common/utils/balance.util';
import { WebsocketGateway } from '../websocket/websocket.gateway';

@Injectable()
export class RewardsService {
  constructor(
    private prisma: PrismaService,
    private levelsService: LevelsService,
    private websocketGateway: WebsocketGateway,
  ) {}

  // ============================================
  // DAILY REWARD
  // ============================================

  async claimDailyReward(userId: string, ipAddress?: string, userAgent?: string): Promise<DailyRewardResult> {
    const serverDay = getServerDay();
    
    // Check if already claimed today
    const existingClaim = await this.prisma.dailyReward.findUnique({
      where: {
        userId_day: {
          userId,
          day: serverDay,
        },
      },
    });

    if (existingClaim) {
      throw new BadRequestException('Daily reward already claimed today');
    }

    // Get user level
    const userLevel = await this.levelsService.getUserLevel(userId);
    const level = userLevel.level;

    // Load daily reward config
    const rewardConfig = await this.prisma.rewardConfig.findUnique({
      where: { type: 'daily' },
    });

    if (!rewardConfig) {
      throw new NotFoundException('Daily reward configuration not found');
    }

    const config = rewardConfig.config as DailyRewardConfig;

    // Calculate streak
    const streak = await this.calculateStreak(userId);

    // Calculate base reward
    let reward = config.baseReward + (level * config.levelMultiplier);

    // Apply streak multiplier
    const streakMultiplier = this.getStreakMultiplier(streak, config.streakMultipliers);
    reward = reward * streakMultiplier;

    // Apply min/max caps
    reward = Math.max(config.minDailyReward, Math.min(config.maxDailyReward, reward));

    const rewardAmount = new Decimal(reward);

    // Update balance atomically
    const balanceResult = await updateUserBalance(
      this.prisma,
      userId,
      rewardAmount,
      'DAILY_REWARD',
      {
        level,
        streak,
        multiplier: streakMultiplier,
      },
    );

    // Create daily reward record
    await this.prisma.dailyReward.create({
      data: {
        userId,
        day: serverDay,
        level,
        amount: rewardAmount,
        streak,
        ipAddress,
        userAgent,
      },
    });

    // Emit WebSocket event
    this.websocketGateway.emitRewardClaimed(userId, 'daily', rewardAmount.toString());
    this.websocketGateway.emitBalanceUpdate(userId, balanceResult.balanceAfter.toString());

    return {
      amount: rewardAmount,
      streak,
      level,
    };
  }

  private async calculateStreak(userId: string): Promise<number> {
    const serverDay = getServerDay();
    const yesterday = new Date(serverDay);
    yesterday.setDate(yesterday.getDate() - 1);

    // Get last claim
    const lastClaim = await this.prisma.dailyReward.findFirst({
      where: { userId },
      orderBy: { claimedAt: 'desc' },
    });

    if (!lastClaim) {
      return 1; // First claim
    }

    const lastClaimDay = new Date(lastClaim.day);
    const daysDiff = Math.floor((serverDay.getTime() - lastClaimDay.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff === 1) {
      // Consecutive day
      return (lastClaim.streak || 1) + 1;
    } else if (daysDiff === 0) {
      // Same day (shouldn't happen, but handle it)
      return lastClaim.streak || 1;
    } else {
      // Streak broken
      return 1;
    }
  }

  private getStreakMultiplier(streak: number, multipliers: Record<string, number>): number {
    const thresholds = [100, 60, 30, 14, 7];
    for (const threshold of thresholds) {
      if (streak >= threshold) {
        return multipliers[threshold.toString()] || 1.0;
      }
    }
    return 1.0;
  }

  // ============================================
  // HOURLY FAUCET
  // ============================================

  async claimHourlyFaucet(userId: string, ipAddress?: string, userAgent?: string): Promise<FaucetRewardResult> {
    const serverDay = getServerDay();
    const currentHour = getCurrentHour();

    // Load faucet config
    const rewardConfig = await this.prisma.rewardConfig.findUnique({
      where: { type: 'faucet' },
    });

    if (!rewardConfig) {
      throw new NotFoundException('Faucet configuration not found');
    }

    const config = rewardConfig.config as FaucetRewardConfig;

    // Check last claim
    const lastClaim = await this.prisma.hourlyFaucet.findFirst({
      where: { userId },
      orderBy: { claimedAt: 'desc' },
    });

    if (lastClaim) {
      const timeSinceLastClaim = currentHour.getTime() - lastClaim.hour.getTime();
      const oneHourMs = 60 * 60 * 1000;

      if (timeSinceLastClaim < oneHourMs) {
        const nextAvailable = new Date(lastClaim.hour.getTime() + oneHourMs);
        throw new BadRequestException(
          `Faucet cooldown active. Next claim available at ${nextAvailable.toISOString()}`,
        );
      }
    }

    // Check daily limit
    const claimsToday = await this.prisma.hourlyFaucet.count({
      where: {
        userId,
        day: serverDay,
      },
    });

    if (claimsToday >= config.dailyFaucetClaimsLimit) {
      const nextDay = getNextServerDay();
      throw new BadRequestException(
        `Daily faucet limit reached (${config.dailyFaucetClaimsLimit}/day). Resets at ${nextDay.toISOString()}`,
      );
    }

    // Get user level
    const userLevel = await this.levelsService.getUserLevel(userId);
    const level = userLevel.level;

    // Calculate reward
    let reward = config.baseFaucet + (level * config.faucetMultiplier);
    reward = Math.max(config.minFaucetReward, Math.min(config.maxFaucetReward, reward));

    const rewardAmount = new Decimal(reward);

    // Update balance
    const balanceResult = await updateUserBalance(
      this.prisma,
      userId,
      rewardAmount,
      'HOURLY_FAUCET',
      {
        level,
        hour: currentHour.toISOString(),
      },
    );

    // Create faucet record
    await this.prisma.hourlyFaucet.create({
      data: {
        userId,
        hour: currentHour,
        day: serverDay,
        amount: rewardAmount,
        ipAddress,
        userAgent,
      },
    });

    // Emit WebSocket event
    this.websocketGateway.emitRewardClaimed(userId, 'faucet', rewardAmount.toString());
    this.websocketGateway.emitBalanceUpdate(userId, balanceResult.balanceAfter.toString());

    const nextAvailable = new Date(currentHour.getTime() + 60 * 60 * 1000);

    return {
      amount: rewardAmount,
      nextAvailableAt: nextAvailable,
      claimsToday: claimsToday + 1,
      dailyLimit: config.dailyFaucetClaimsLimit,
    };
  }

  // ============================================
  // AD REWARD
  // ============================================

  async claimAdReward(
    userId: string,
    provider: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AdRewardResult> {
    // Load ad reward config
    const adConfig = await this.prisma.adRewardConfig.findFirst({
      where: { isActive: true },
    });

    if (!adConfig) {
      throw new NotFoundException('Ad rewards are currently disabled');
    }

    const serverDay = getServerDay();
    const currentHour = getCurrentHour();

    // Check hourly limit
    const adsThisHour = await this.prisma.adReward.count({
      where: {
        userId,
        hour: {
          gte: currentHour,
          lt: new Date(currentHour.getTime() + 60 * 60 * 1000),
        },
      },
    });

    if (adsThisHour >= adConfig.adsPerHourLimit) {
      const nextHour = new Date(currentHour.getTime() + 60 * 60 * 1000);
      throw new BadRequestException(
        `Hourly ad limit reached (${adConfig.adsPerHourLimit}/hour). Next ad available at ${nextHour.toISOString()}`,
      );
    }

    // Check daily cap
    const adsToday = await this.prisma.adReward.count({
      where: {
        userId,
        day: serverDay,
      },
    });

    if (adsToday >= adConfig.dailyAdsCap) {
      const nextDay = getNextServerDay();
      throw new BadRequestException(
        `Daily ad cap reached (${adConfig.dailyAdsCap}/day). Resets at ${nextDay.toISOString()}`,
      );
    }

    const rewardAmount = adConfig.rewardAmount;

    // Update balance
    const balanceResult = await updateUserBalance(
      this.prisma,
      userId,
      rewardAmount,
      'AD_REWARD',
      {
        provider,
        hour: currentHour.toISOString(),
        day: serverDay.toISOString(),
      },
    );

    // Create ad reward record
    await this.prisma.adReward.create({
      data: {
        userId,
        hour: currentHour,
        day: serverDay,
        provider,
        amount: rewardAmount,
        ipAddress,
        userAgent,
      },
    });

    // Emit WebSocket event
    this.websocketGateway.emitRewardClaimed(userId, 'ad', rewardAmount.toString());
    this.websocketGateway.emitBalanceUpdate(userId, balanceResult.balanceAfter.toString());

    return {
      amount: rewardAmount,
      adsThisHour: adsThisHour + 1,
      adsToday: adsToday + 1,
      hourlyLimit: adConfig.adsPerHourLimit,
      dailyLimit: adConfig.dailyAdsCap,
    };
  }

  // ============================================
  // QUIZ
  // ============================================

  async startDailyQuiz(userId: string): Promise<QuizStartResult> {
    const serverDay = getServerDay();

    // Check if already attempted today
    const existingAttempt = await this.prisma.quizAttempt.findUnique({
      where: {
        userId_day: {
          userId,
          day: serverDay,
        },
      },
    });

    if (existingAttempt && existingAttempt.completedAt) {
      throw new BadRequestException('Daily quiz already completed today');
    }

    // Get user language
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { language: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const language = user.language || 'en';

    // Get active questions
    const activeQuestions = await this.prisma.quizQuestion.findMany({
      where: { isActive: true },
      include: {
        translations: {
          where: { language },
        },
      },
    });

    if (activeQuestions.length < 3) {
      throw new BadRequestException('Not enough quiz questions available');
    }

    // Select 3 random questions
    const shuffled = activeQuestions.sort(() => 0.5 - Math.random());
    const selectedQuestions = shuffled.slice(0, 3);

    // Get translations
    const questionsWithTranslations: QuizQuestionPublic[] = [];
    const questionIds: string[] = [];

    for (const question of selectedQuestions) {
      const translation = question.translations[0];
      if (!translation) {
        continue; // Skip if no translation available
      }

      // IMPORTANT: do NOT send correctAnswerIndex to the client here.
      // It is kept only on the server to prevent cheating.
      questionsWithTranslations.push({
        id: question.id,
        questionText: translation.questionText,
        options: translation.options as string[],
      });

      questionIds.push(question.id);
    }

    if (questionsWithTranslations.length < 3) {
      throw new BadRequestException('Not enough quiz questions with translations');
    }

    // Create or update quiz attempt
    let attempt;
    if (existingAttempt) {
      // Update existing attempt (in case user refreshed)
      attempt = await this.prisma.quizAttempt.update({
        where: { id: existingAttempt.id },
        data: {
          questionIds: questionIds as any,
        },
      });
    } else {
      attempt = await this.prisma.quizAttempt.create({
        data: {
          userId,
          day: serverDay,
          questionIds: questionIds as any,
          answers: [],
          correctCount: 0,
          amount: new Decimal(0),
        },
      });
    }

    return {
      attemptId: attempt.id,
      questions: questionsWithTranslations,
    };
  }

  async submitDailyQuizAnswers(
    userId: string,
    attemptId: string,
    answers: number[],
  ): Promise<QuizSubmitResult> {
    if (answers.length !== 3) {
      throw new BadRequestException('Must provide exactly 3 answers');
    }

    const serverDay = getServerDay();

    // Load attempt
    const attempt = await this.prisma.quizAttempt.findUnique({
      where: { id: attemptId },
    });

    if (!attempt) {
      throw new NotFoundException('Quiz attempt not found');
    }

    if (attempt.userId !== userId) {
      throw new BadRequestException('Quiz attempt does not belong to user');
    }

    if (!isWithinServerDay(attempt.day)) {
      throw new BadRequestException('Quiz attempt expired');
    }

    if (attempt.completedAt) {
      throw new BadRequestException('Quiz already completed');
    }

    // Load questions and check answers
    const questionIds = attempt.questionIds as string[];
    let correctCount = 0;
    const questionResults: Array<{
      questionId: string;
      userAnswer: number;
      correctAnswer: number;
      isCorrect: boolean;
    }> = [];

    for (let i = 0; i < questionIds.length; i++) {
      const questionId = questionIds[i];
      const userAnswer = answers[i];

      // Get question translation (use user's language)
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { language: true },
      });

      const language = user?.language || 'en';

      const question = await this.prisma.quizQuestion.findUnique({
        where: { id: questionId },
        include: {
          translations: {
            where: { language },
          },
        },
      });

      if (!question || !question.translations[0]) {
        continue;
      }

      const correctAnswer = question.translations[0].correctAnswerIndex;
      const isCorrect = userAnswer === correctAnswer;

      if (isCorrect) {
        correctCount++;
      }

      questionResults.push({
        questionId,
        userAnswer,
        correctAnswer,
        isCorrect,
      });
    }

    // Load quiz reward config
    const rewardConfig = await this.prisma.rewardConfig.findUnique({
      where: { type: 'quiz' },
    });

    if (!rewardConfig) {
      throw new NotFoundException('Quiz reward configuration not found');
    }

    const config = rewardConfig.config as QuizRewardConfig;
    const rewardAmount = new Decimal(config.rewards[correctCount.toString() as '0' | '1' | '2' | '3'] || 0);

    // Update balance
    const balanceResult = await updateUserBalance(
      this.prisma,
      userId,
      rewardAmount,
      'QUIZ_REWARD',
      {
        attemptId,
        correctCount,
        questionIds,
      },
    );

    // Update attempt
    await this.prisma.quizAttempt.update({
      where: { id: attemptId },
      data: {
        answers: answers as any,
        correctCount,
        amount: rewardAmount,
        completedAt: new Date(),
      },
    });

    // Emit WebSocket event
    if (rewardAmount.gt(0)) {
      this.websocketGateway.emitRewardClaimed(userId, 'quiz', rewardAmount.toString());
      this.websocketGateway.emitBalanceUpdate(userId, balanceResult.balanceAfter.toString());
    }

    return {
      correctCount,
      amount: rewardAmount,
      questions: questionResults,
    };
  }
}

