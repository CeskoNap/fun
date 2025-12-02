import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import { GameType, RaceStatus, TransactionType } from '@prisma/client';
import { getServerDay } from '../common/utils/server-time.util';
import { updateUserBalance } from '../common/utils/balance.util';

interface PrizeDistributionConfig {
  topPercentageWinners: number;
  tiers: Array<{
    rankStart: number;
    rankEnd: number;
    percentage: number;
  }>;
}

@Injectable()
export class RacesService {
  constructor(private prisma: PrismaService) {}

  private async getDefaultRaceConfig() {
    let cfg = await this.prisma.raceConfig.findFirst({
      where: { name: 'default', isActive: true },
    });

    if (!cfg) {
      // Create default config if missing
      cfg = await this.prisma.raceConfig.create({
        data: {
          name: 'default',
          entryFee: new Decimal(100),
          prizeDistribution: {
            topPercentageWinners: 25,
            tiers: [
              { rankStart: 1, rankEnd: 1, percentage: 20 },
              { rankStart: 2, rankEnd: 2, percentage: 15 },
              { rankStart: 3, rankEnd: 3, percentage: 10 },
              { rankStart: 4, rankEnd: 50, percentage: 35 },
              { rankStart: 51, rankEnd: 100, percentage: 20 },
            ],
          },
          isActive: true,
        },
      });
    }

    return cfg;
  }

  // ============================
  // USER ENDPOINTS
  // ============================

  async getActiveRaces(userId: string) {
    const races = await this.prisma.race.findMany({
      where: {
        status: {
          in: [RaceStatus.UPCOMING, RaceStatus.ACTIVE],
        },
      },
      orderBy: { startsAt: 'asc' },
      include: {
        participants: {
          where: { userId },
        },
      },
    });

    return races.map((race) => {
      const participant = race.participants[0];
      return {
        id: race.id,
        name: race.name,
        description: race.description,
        gameType: race.gameType,
        status: race.status,
        entryFee: race.entryFee.toString(),
        startsAt: race.startsAt,
        endsAt: race.endsAt,
        prizePool: race.prizePool.toString(),
        joined: !!participant,
        volume: participant ? participant.volume.toString() : '0',
      };
    });
  }

  async joinRace(userId: string, raceId: string) {
    const race = await this.prisma.race.findUnique({
      where: { id: raceId },
    });

    if (!race) {
      throw new NotFoundException('Race not found');
    }

    if (![RaceStatus.UPCOMING, RaceStatus.ACTIVE].includes(race.status)) {
      throw new BadRequestException('Race not open for joining');
    }

    // Already joined?
    const existing = await this.prisma.raceParticipant.findUnique({
      where: {
        raceId_userId: {
          raceId,
          userId,
        },
      },
    });

    if (existing) {
      return {
        raceId: race.id,
        entryFee: race.entryFee.toString(),
        prizePool: race.prizePool.toString(),
        alreadyJoined: true,
      };
    }

    // Get entry fee from config / race
    const cfg = await this.getDefaultRaceConfig();
    const entryFee = cfg.entryFee ?? race.entryFee ?? new Decimal(100);

    // Atomic: debit entryFee, inc prizePool, create RaceParticipant
    const result = await this.prisma.$transaction(async (tx) => {
      // Debit entry fee
      const balance = await tx.userBalance.findUnique({
        where: { userId },
      });
      if (!balance || balance.balance.lt(entryFee)) {
        throw new BadRequestException('Insufficient balance for race entry');
      }

      const balanceBefore = balance.balance;
      const balanceAfter = balanceBefore.sub(entryFee);

      const updatedBalance = await tx.userBalance.update({
        where: { userId },
        data: {
          balance: balanceAfter,
        },
      });

      await tx.transaction.create({
        data: {
          userId,
          type: TransactionType.RACE_ENTRY,
          amount: entryFee.neg(),
          balanceBefore,
          balanceAfter: updatedBalance.balance,
          metadata: {
            raceId: race.id,
          },
        },
      });

      // Update prize pool
      const updatedRace = await tx.race.update({
        where: { id: race.id },
        data: {
          prizePool: race.prizePool.add(entryFee),
        },
      });

      // Create participant
      await tx.raceParticipant.create({
        data: {
          raceId: race.id,
          userId,
          volume: new Decimal(0),
          xpEarned: new Decimal(0),
        },
      });

      return {
        entryFee,
        prizePool: updatedRace.prizePool,
        balanceAfter: updatedBalance.balance,
      };
    });

    return {
      raceId: race.id,
      entryFee: result.entryFee.toString(),
      prizePool: result.prizePool.toString(),
      alreadyJoined: false,
    };
  }

  async getLeaderboard(raceId: string) {
    const race = await this.prisma.race.findUnique({
      where: { id: raceId },
      include: {
        participants: {
          orderBy: { volume: 'desc' },
          include: { user: true },
        },
      },
    });

    if (!race) {
      throw new NotFoundException('Race not found');
    }

    const participants = race.participants.map((p, index) => ({
      rank: index + 1,
      username: p.user.username,
      volume: p.volume.toString(),
      prize: p.prize ? p.prize.toString() : null,
    }));

    return {
      raceId: race.id,
      status: race.status,
      participants,
    };
  }

  // Called from BetsService after a bet is resolved
  async handleBetForRaces(
    userId: string,
    gameType: GameType,
    betAmount: Decimal,
  ) {
    // Find active races that apply to this game type
    const activeRaces = await this.prisma.race.findMany({
      where: {
        status: RaceStatus.ACTIVE,
        OR: [
          { gameType: null },
          { gameType },
        ],
        participants: {
          some: { userId },
        },
      },
      include: {
        participants: {
          where: { userId },
        },
      },
    });

    if (activeRaces.length === 0) return;

    await this.prisma.$transaction(async (tx) => {
      for (const race of activeRaces) {
        const participant = race.participants[0];
        if (!participant) continue;

        await tx.raceParticipant.update({
          where: { id: participant.id },
          data: {
            volume: participant.volume.add(betAmount),
          },
        });
      }
    });
  }

  // ============================
  // ADMIN HELPERS (settlement)
  // ============================

  async settleRace(raceId: string, adminId: string) {
    const race = await this.prisma.race.findUnique({
      where: { id: raceId },
      include: {
        participants: {
          orderBy: { volume: 'desc' },
          include: { user: true },
        },
      },
    });

    if (!race) throw new NotFoundException('Race not found');
    if (race.status !== RaceStatus.ACTIVE && race.status !== RaceStatus.UPCOMING) {
      throw new BadRequestException('Race cannot be settled in current status');
    }

    const cfg = await this.getDefaultRaceConfig();
    const dist = cfg.prizeDistribution as PrizeDistributionConfig;

    const participants = race.participants;
    const totalParticipants = participants.length;
    if (totalParticipants === 0 || race.prizePool.lte(0)) {
      // No participants or no prize pool, just mark as ENDED
      await this.prisma.race.update({
        where: { id: race.id },
        data: { status: RaceStatus.ENDED },
      });
      return { settled: false, reason: 'No participants or prize pool' };
    }

    const topWinners = Math.ceil(
      (totalParticipants * (dist.topPercentageWinners ?? 25)) / 100,
    );

    const winners: { index: number; prize: Decimal }[] = [];
    const prizePool = race.prizePool;

    for (const tier of dist.tiers) {
      let { rankStart, rankEnd, percentage } = tier;
      if (rankStart > topWinners) continue;
      rankEnd = Math.min(rankEnd, topWinners);
      if (rankStart > rankEnd) continue;

      const countInTier = rankEnd - rankStart + 1;
      const tierPool = prizePool.mul(percentage).div(100);
      const prizePerUser = tierPool.div(countInTier);

      for (let rank = rankStart; rank <= rankEnd; rank++) {
        const idx = rank - 1;
        if (idx >= totalParticipants) break;
        winners.push({ index: idx, prize: prizePerUser });
      }
    }

    await this.prisma.$transaction(async (tx) => {
      for (let i = 0; i < participants.length; i++) {
        const participant = participants[i];
        const winner = winners.find((w) => w.index === i);

        let prize = new Decimal(0);
        if (winner) {
          prize = winner.prize;

          const balance = await tx.userBalance.findUnique({
            where: { userId: participant.userId },
          });
          if (balance) {
            const before = balance.balance;
            const after = before.add(prize);
            await tx.userBalance.update({
              where: { userId: participant.userId },
              data: { balance: after },
            });
            await tx.transaction.create({
              data: {
                userId: participant.userId,
                type: TransactionType.RACE_PRIZE,
                amount: prize,
                balanceBefore: before,
                balanceAfter: after,
                metadata: { raceId: race.id, rank: i + 1 },
              },
            });
          }
        }

        await tx.raceParticipant.update({
          where: { id: participant.id },
          data: {
            rank: i + 1,
            prize: prize.gt(0) ? prize : null,
          },
        });
      }

      await tx.race.update({
        where: { id: race.id },
        data: { status: RaceStatus.ENDED },
      });

      // Log admin action
      await tx.adminActionLog.create({
        data: {
          adminId,
          action: 'settle_race',
          details: {
            raceId: race.id,
            totalParticipants,
            prizePool: prizePool.toString(),
          },
        },
      });
    });

    return { settled: true };
  }
}


