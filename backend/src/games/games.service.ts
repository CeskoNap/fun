import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GameType } from '@prisma/client';
import { fromCentesimi } from '../common/utils/balance.util';
import { getServerDay, getNextServerDay } from '../common/utils/server-time.util';

@Injectable()
export class GamesService {
  constructor(private prisma: PrismaService) {}

  async getGlobalRecord() {
    // Find the bet with the highest multiplier across all games
    const recordBet = await this.prisma.bet.findFirst({
      where: {
        status: 'WON',
        multiplier: { not: null },
      },
      orderBy: {
        multiplier: 'desc',
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
      },
    });

    if (!recordBet || !recordBet.multiplier) {
      return {
        multiplier: null,
        username: null,
        userId: null,
      };
    }

    return {
      multiplier: recordBet.multiplier.toNumber(),
      username: recordBet.user.displayName || recordBet.user.username,
      userId: recordBet.user.id,
    };
  }

  async getBigWins(gameType: GameType) {
    // Get top 3 bets by payout amount for this game type
    const bigWins = await this.prisma.bet.findMany({
      where: {
        game: { type: gameType },
        status: 'WON',
        payout: { not: null },
      },
      orderBy: {
        payout: 'desc',
      },
      take: 3,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
        game: {
          select: {
            type: true,
          },
        },
      },
    });

    return bigWins.map((bet, index) => ({
      rank: index + 1,
      userId: bet.user.id,
      username: bet.user.displayName || bet.user.username,
      date: bet.resolvedAt || bet.createdAt,
      bet: fromCentesimi(bet.amount),
      multiplier: bet.multiplier?.toNumber() || 0,
      payout: bet.payout ? fromCentesimi(bet.payout) : 0,
    }));
  }

  async getLuckyWins(gameType: GameType) {
    // Get top 3 bets by multiplier for this game type
    const luckyWins = await this.prisma.bet.findMany({
      where: {
        game: { type: gameType },
        status: 'WON',
        multiplier: { not: null },
      },
      orderBy: {
        multiplier: 'desc',
      },
      take: 3,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
        game: {
          select: {
            type: true,
          },
        },
      },
    });

    return luckyWins.map((bet, index) => ({
      rank: index + 1,
      userId: bet.user.id,
      username: bet.user.displayName || bet.user.username,
      date: bet.resolvedAt || bet.createdAt,
      bet: fromCentesimi(bet.amount),
      multiplier: bet.multiplier?.toNumber() || 0,
      payout: bet.payout ? fromCentesimi(bet.payout) : 0,
    }));
  }

  async getGameInfo(gameType: GameType) {
    const game = await this.prisma.game.findUnique({
      where: { type: gameType },
    });

    if (!game) {
      throw new NotFoundException(`Game ${gameType} not found`);
    }

    // Game descriptions (can be moved to database or i18n later)
    const descriptions: Record<GameType, string> = {
      MINES: 'Discover hidden gems while avoiding mines. Reveal tiles to increase your multiplier, but watch out for mines!',
      PLINKO: 'Drop the ball and watch it bounce through pegs. Higher risk means higher potential multipliers!',
      CRASH: 'Watch the multiplier rise and cash out before it crashes. Timing is everything!',
      DICE: 'Predict if the roll will be higher or lower than your chosen number. Simple, fast, and exciting!',
    };

    return {
      type: game.type,
      name: game.name,
      description: descriptions[gameType] || 'A fun and exciting game.',
      isActive: game.isActive,
    };
  }

  async getRecentBets(userId: string, gameType: GameType) {
    const serverDay = getServerDay();
    const nextDay = getNextServerDay();

    const bets = await this.prisma.bet.findMany({
      where: {
        userId,
        game: { type: gameType },
        createdAt: {
          gte: serverDay,
          lt: nextDay,
        },
        status: { in: ['WON', 'LOST'] },
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        game: {
          select: {
            type: true,
          },
        },
      },
    });

    return bets.map((bet) => ({
      id: bet.id,
      createdAt: bet.createdAt,
      multiplier: bet.multiplier?.toNumber() || 0,
      payout: bet.payout ? fromCentesimi(bet.payout) : 0,
      status: bet.status,
    }));
  }
}

