import { Decimal } from '@prisma/client/runtime/library';

export interface DailyRewardConfig {
  baseReward: number;
  levelMultiplier: number;
  minDailyReward: number;
  maxDailyReward: number;
  streakMultipliers: {
    [key: string]: number; // "7": 1.2, "14": 1.5, etc.
  };
}

export interface FaucetRewardConfig {
  baseFaucet: number;
  faucetMultiplier: number;
  minFaucetReward: number;
  maxFaucetReward: number;
  dailyFaucetClaimsLimit: number;
}

export interface QuizRewardConfig {
  rewards: {
    '0': number;
    '1': number;
    '2': number;
    '3': number;
  };
}

export interface DailyRewardResult {
  amount: Decimal;
  streak: number;
  level: number;
}

export interface FaucetRewardResult {
  amount: Decimal;
  nextAvailableAt: Date;
  claimsToday: number;
  dailyLimit: number;
}

export interface AdRewardResult {
  amount: Decimal;
  adsThisHour: number;
  adsToday: number;
  hourlyLimit: number;
  dailyLimit: number;
}

// Public question sent to client (NO correctAnswerIndex)
export interface QuizQuestionPublic {
  id: string;
  questionText: string;
  options: string[];
}

export interface QuizStartResult {
  attemptId: string;
  questions: QuizQuestionPublic[];
}

export interface QuizSubmitResult {
  correctCount: number;
  amount: Decimal;
  questions: Array<{
    questionId: string;
    userAnswer: number;
    correctAnswer: number;
    isCorrect: boolean;
  }>;
}

