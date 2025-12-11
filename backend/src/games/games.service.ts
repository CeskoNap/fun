import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GameType } from '@prisma/client';
import { fromCentesimi } from '../common/utils/balance.util';
import { getServerDay, getNextServerDay } from '../common/utils/server-time.util';
import { Decimal } from '@prisma/client/runtime/library';

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
      betId: bet.id,
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

  async getRtpLive() {
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    // Get all bets from last 24 hours
    const bets = await this.prisma.bet.findMany({
      where: {
        createdAt: {
          gte: twentyFourHoursAgo,
        },
        status: { in: ['WON', 'LOST'] },
      },
      select: {
        amount: true,
        payout: true,
        createdAt: true,
      },
    });

    if (bets.length === 0) {
      return {
        rtp: 100.0,
        change: 0,
        history: [],
      };
    }

    // Calculate total bet amount and total payout
    let totalBetAmount = 0n;
    let totalPayout = 0n;

    for (const bet of bets) {
      totalBetAmount += bet.amount as bigint;
      totalPayout += (bet.payout as bigint) || 0n;
    }

    // Calculate RTP: (Total Payout / Total Bet Amount) * 100
    const rtpDecimal = totalBetAmount > 0n
      ? (Number(totalPayout) / Number(totalBetAmount)) * 100
      : 100.0;

    // For change calculation, we'd need historical data
    // For now, return 0 as placeholder
    const change = 0;

    // Generate history data (last 24 hours, hourly buckets)
    const history: Array<{ time: string; rtp: number }> = [];
    const now = new Date();
    for (let i = 23; i >= 0; i--) {
      const hourStart = new Date(now);
      hourStart.setHours(now.getHours() - i, 0, 0, 0);
      const hourEnd = new Date(hourStart);
      hourEnd.setHours(hourStart.getHours() + 1);

      const hourBets = bets.filter(
        (bet) => bet.createdAt >= hourStart && bet.createdAt < hourEnd
      );

      let hourTotalBet = 0n;
      let hourTotalPayout = 0n;
      for (const bet of hourBets) {
        hourTotalBet += bet.amount as bigint;
        hourTotalPayout += (bet.payout as bigint) || 0n;
      }

      const hourRtp = hourTotalBet > 0n
        ? (Number(hourTotalPayout) / Number(hourTotalBet)) * 100
        : 100.0;

      history.push({
        time: hourStart.toISOString(),
        rtp: hourRtp,
      });
    }

    return {
      rtp: Number(rtpDecimal.toFixed(2)),
      change,
      history,
    };
  }
}



