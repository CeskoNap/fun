import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import { GameType, RaceStatus, TransactionType } from '@prisma/client';
import { getServerDay } from '../common/utils/server-time.util';
import { updateUserBalance } from '../common/utils/balance.util';
import { fromCentesimi } from '../common/utils/balance.util';

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
          entryFee: 100n,
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
    const now = new Date();
    
    // First, check and activate races that should be active
    await this.activateDueRaces(now);
    
    // Also check and end races that should be ended
    await this.endDueRaces(now);

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

    // Precompute total volume per race (all participants), includes any admin adjustments
    const volumeSums = await this.prisma.raceParticipant.groupBy({
      by: ['raceId'],
      where: {
        raceId: {
          in: races.map((r) => r.id),
        },
      },
      _sum: {
        volume: true,
      },
    });
    const volumeSumMap = new Map<string, bigint>();
    for (const v of volumeSums) {
      volumeSumMap.set(v.raceId, (v._sum.volume as bigint) ?? 0n);
    }

    return races.map((race) => {
      const participant = race.participants[0];
      const totalVolume = volumeSumMap.get(race.id) ?? 0n;
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
        totalVolume: totalVolume.toString(),
      };
    });
  }

  async activateDueRaces(now: Date) {
    // Find races that should be activated (UPCOMING and startsAt <= now)
    const racesToActivate = await this.prisma.race.findMany({
      where: {
        status: RaceStatus.UPCOMING,
        startsAt: {
          lte: now,
        },
        endsAt: {
          gt: now, // Only activate if not already ended
        },
      },
    });

    if (racesToActivate.length > 0) {
      await this.prisma.race.updateMany({
        where: {
          id: {
            in: racesToActivate.map(r => r.id),
          },
        },
        data: {
          status: RaceStatus.ACTIVE,
        },
      });
      
      console.log(`Activated ${racesToActivate.length} race(s) automatically`);
    }
  }

  async endDueRaces(now: Date) {
    // Find races that should be ended (ACTIVE and endsAt <= now)
    const racesToEnd = await this.prisma.race.findMany({
      where: {
        status: RaceStatus.ACTIVE,
        endsAt: {
          lte: now,
        },
      },
    });

    if (racesToEnd.length > 0) {
      await this.prisma.race.updateMany({
        where: {
          id: {
            in: racesToEnd.map(r => r.id),
          },
        },
        data: {
          status: RaceStatus.ENDED,
        },
      });
      
      console.log(`Ended ${racesToEnd.length} race(s) automatically`);
    }
  }

  async joinRace(userId: string, raceId: string) {
    const race = await this.prisma.race.findUnique({
      where: { id: raceId },
    });

    if (!race) {
      throw new NotFoundException('Race not found');
    }

    if (race.status !== RaceStatus.UPCOMING && race.status !== RaceStatus.ACTIVE) {
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
    const raceEntryFee = race.entryFee as bigint;
    const cfgEntryFee = cfg.entryFee as bigint | null;
    const entryFee = cfgEntryFee ?? raceEntryFee ?? 100n;

    // Atomic: debit entryFee, inc prizePool, create RaceParticipant
    const result = await this.prisma.$transaction(async (tx) => {
      // Debit entry fee
      const balance = await tx.userBalance.findUnique({
        where: { userId },
      });
      const balanceAmount = balance?.balance as bigint || 0n;
      if (!balance || balanceAmount < entryFee) {
        throw new BadRequestException('Insufficient balance for race entry');
      }

      const balanceBefore = balanceAmount;
      const balanceAfter = balanceBefore - entryFee;

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
          amount: -entryFee, // Negative for debit
          balanceBefore,
          balanceAfter: updatedBalance.balance as bigint,
          metadata: {
            raceId: race.id,
          },
        },
      });

      // Create participant (prize pool is set by admin and doesn't change)
      await tx.raceParticipant.create({
        data: {
          raceId: race.id,
          userId,
          volume: 0n,
          xpEarned: new Decimal(0),
        },
      });

      return {
        entryFee,
        prizePool: race.prizePool as bigint,
        balanceAfter: updatedBalance.balance as bigint,
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
    betAmount: bigint, // Bet amount as integer (no decimals)
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

        const currentVolume = participant.volume as bigint;
        await tx.raceParticipant.update({
          where: { id: participant.id },
          data: {
            volume: currentVolume + betAmount,
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

    const participants = race.participants;
    const totalParticipants = participants.length;
    const prizePoolCheck = race.prizePool as bigint;
    if (totalParticipants === 0 || prizePoolCheck <= 0n) {
      // No participants or no prize pool, just mark as ENDED
      await this.prisma.race.update({
        where: { id: race.id },
        data: { status: RaceStatus.ENDED },
      });
      return { settled: false, reason: 'No participants or prize pool' };
    }

    const winners: { index: number; prize: bigint }[] = [];
    const prizePool = race.prizePool as bigint;

    // Fixed prize distribution:
    // - 25% to 1st place
    // - 15% to 2nd place
    // - 10% to 3rd place
    // - 20% divided among 4th-10th place (7 positions)
    // - 30% divided among 11th-50th place (40 positions)

    // 1st place: 25%
    if (totalParticipants >= 1) {
      const prize1st = (prizePool * 25n) / 100n;
      winners.push({ index: 0, prize: prize1st });
    }

    // 2nd place: 15%
    if (totalParticipants >= 2) {
      const prize2nd = (prizePool * 15n) / 100n;
      winners.push({ index: 1, prize: prize2nd });
    }

    // 3rd place: 10%
    if (totalParticipants >= 3) {
      const prize3rd = (prizePool * 10n) / 100n;
      winners.push({ index: 2, prize: prize3rd });
    }

    // 4th-10th place: 20% divided among 7 positions
    const positions4to10 = Math.min(7, Math.max(0, totalParticipants - 3));
    if (positions4to10 > 0) {
      const tierPool4to10 = (prizePool * 20n) / 100n;
      const prizePerUser4to10 = tierPool4to10 / BigInt(positions4to10);
      for (let rank = 4; rank <= Math.min(10, totalParticipants); rank++) {
        const idx = rank - 1;
        winners.push({ index: idx, prize: prizePerUser4to10 });
      }
    }

    // 11th-50th place: 30% divided among up to 40 positions
    const positions11to50 = Math.min(40, Math.max(0, totalParticipants - 10));
    if (positions11to50 > 0) {
      const tierPool11to50 = (prizePool * 30n) / 100n;
      const prizePerUser11to50 = tierPool11to50 / BigInt(positions11to50);
      for (let rank = 11; rank <= Math.min(50, totalParticipants); rank++) {
        const idx = rank - 1;
        winners.push({ index: idx, prize: prizePerUser11to50 });
      }
    }

    await this.prisma.$transaction(async (tx) => {
      for (let i = 0; i < participants.length; i++) {
        const participant = participants[i];
        const winner = winners.find((w) => w.index === i);

        let prize: bigint = 0n;
        if (winner) {
          prize = winner.prize;

          const balance = await tx.userBalance.findUnique({
            where: { userId: participant.userId },
          });
          if (balance) {
            const before = balance.balance as bigint;
            const after = before + prize;
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
            prize: prize > 0n ? prize : null,
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

  async getHomepageActiveRace() {
    const now = new Date();
    
    // First, check and activate races that should be active
    await this.activateDueRaces(now);
    
    // Also check and end races that should be ended
    await this.endDueRaces(now);
    
    // Get the most recent active race (or upcoming race if no active ones)
    const race = await this.prisma.race.findFirst({
      where: {
        status: {
          in: [RaceStatus.ACTIVE, RaceStatus.UPCOMING],
        },
      },
      orderBy: { startsAt: 'desc' },
      include: {
        participants: {
          orderBy: { volume: 'desc' },
          take: 3,
          include: {
            user: {
              select: {
                username: true,
              },
            },
          },
        },
      },
    });

    if (!race) {
      return null;
    }

    // Calculate potential prizes based on prize distribution
    const cfg = await this.getDefaultRaceConfig();
    const dist = cfg.prizeDistribution as unknown as PrizeDistributionConfig;
    // Ensure prizePool is treated as BigInt (Prisma returns it as BigInt)
    const prizePool = typeof race.prizePool === 'bigint' 
      ? race.prizePool 
      : BigInt(race.prizePool);
    
    const topPlayers = race.participants.map((p, index) => {
      const rank = index + 1;
      let potentialPrize = 0;
      
      // Calculate potential prize based on current rank and distribution
      for (const tier of dist.tiers) {
        if (rank >= tier.rankStart && rank <= tier.rankEnd) {
          const tierPool = (prizePool * BigInt(tier.percentage)) / 100n;
          const countInTier = tier.rankEnd - tier.rankStart + 1;
          potentialPrize = fromCentesimi(tierPool / BigInt(countInTier));
          break;
        }
      }

      return {
        rank,
        username: p.user.username,
        prize: potentialPrize,
      };
    });

    return {
      id: race.id,
      name: race.name,
      prizePool: fromCentesimi(prizePool),
      startsAt: race.startsAt,
      endsAt: race.endsAt,
      status: race.status,
      topPlayers,
    };
  }
}


