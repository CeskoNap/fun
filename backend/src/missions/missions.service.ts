import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GameType, MissionStatus, MissionType, TransactionType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { getServerDay } from '../common/utils/server-time.util';
import { updateUserBalance } from '../common/utils/balance.util';
import { LevelsService } from '../levels/levels.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';

interface MissionObjective {
  type: 'bet_count' | 'wager_volume';
  target: number;
  gameType?: GameType;
}

interface MissionReward {
  tokenAmount?: number;
  xpAmount?: number;
}

@Injectable()
export class MissionsService {
  constructor(
    private prisma: PrismaService,
    private levelsService: LevelsService,
    private websocket: WebsocketGateway,
  ) {}

  private isMissionActive(mission: any, now: Date): boolean {
    if (!mission.isActive) return false;
    if (mission.startsAt && mission.startsAt > now) return false;
    if (mission.endsAt && mission.endsAt < now) return false;
    return true;
  }

  async handleBetForMissions(userId: string, gameType: GameType, amount: Decimal) {
    const now = new Date();
    const missions = await this.prisma.mission.findMany({
      where: {
        isActive: true,
      },
    });

    for (const mission of missions) {
      if (!this.isMissionActive(mission, now)) continue;

      const objective = mission.objective as MissionObjective;
      if (objective.gameType && objective.gameType !== gameType) continue;

      let userMission = await this.prisma.userMission.findUnique({
        where: {
          userId_missionId: {
            userId,
            missionId: mission.id,
          },
        },
      });

      if (userMission && userMission.status !== MissionStatus.ACTIVE) {
        continue;
      }

      const progress = (userMission?.progress as any) || {};

      if (objective.type === 'bet_count') {
        progress.betCount = (progress.betCount || 0) + 1;
        progress.target = objective.target;
      } else if (objective.type === 'wager_volume') {
        const current = new Decimal(progress.volume || 0);
        progress.volume = current.add(amount).toNumber();
        progress.target = objective.target;
      }

      const reached =
        objective.type === 'bet_count'
          ? progress.betCount >= objective.target
          : progress.volume >= objective.target;

      const status = reached ? MissionStatus.COMPLETED : MissionStatus.ACTIVE;

      if (!userMission) {
        await this.prisma.userMission.create({
          data: {
            userId,
            missionId: mission.id,
            progress,
            status,
            completedAt: reached ? now : null,
          },
        });
      } else {
        await this.prisma.userMission.update({
          where: { id: userMission.id },
          data: {
            progress,
            status,
            completedAt: reached ? now : userMission.completedAt,
          },
        });
      }
    }
  }

  async getActiveMissionsForUser(userId: string) {
    const now = new Date();
    const missions = await this.prisma.mission.findMany({
      where: { isActive: true },
      orderBy: { type: 'asc' },
    });

    const userMissions = await this.prisma.userMission.findMany({
      where: { userId },
    });
    const byMissionId = new Map(userMissions.map((um) => [um.missionId, um]));

    return missions
      .filter((m) => this.isMissionActive(m, now))
      .map((m) => {
        const um = byMissionId.get(m.id);
        const objective = m.objective as MissionObjective;
        const reward = m.reward as MissionReward;

        const progress = (um?.progress as any) || {};
        return {
          id: m.id,
          type: m.type,
          name: m.name,
          description: m.description,
          objective,
          reward,
          status: um?.status ?? MissionStatus.ACTIVE,
          progress,
          endsAt: m.endsAt,
        };
      });
  }

  async claimMission(userId: string, missionId: string) {
    const userMission = await this.prisma.userMission.findUnique({
      where: {
        userId_missionId: {
          userId,
          missionId,
        },
      },
      include: {
        mission: true,
      },
    });

    if (!userMission || userMission.status !== MissionStatus.COMPLETED) {
      throw new Error('Mission not completed or already claimed');
    }

    const mission = userMission.mission;
    const reward = mission.reward as MissionReward;

    let tokenReward = new Decimal(0);
    let xpReward = new Decimal(0);

    if (reward.tokenAmount && reward.tokenAmount > 0) {
      tokenReward = new Decimal(reward.tokenAmount);
    }
    if (reward.xpAmount && reward.xpAmount > 0) {
      xpReward = new Decimal(reward.xpAmount);
    }

    const result = await this.prisma.$transaction(async (tx) => {
      let finalBalance: Decimal | null = null;

      if (tokenReward.gt(0)) {
        const balance = await updateUserBalance(
          tx,
          userId,
          tokenReward,
          TransactionType.MISSION_REWARD,
          { missionId },
        );
        finalBalance = balance.balanceAfter;
      }

      if (xpReward.gt(0)) {
        await this.levelsService.addXpForUser(userId, xpReward, 'mission', missionId, {
          missionType: mission.type,
        });
      }

      await tx.userMission.update({
        where: { id: userMission.id },
        data: {
          status: MissionStatus.REWARDED,
          rewardedAt: new Date(),
        },
      });

      return { finalBalance };
    });

    if (result.finalBalance) {
      this.websocket.emitBalanceUpdate(userId, result.finalBalance.toString());
    }

    if (tokenReward.gt(0)) {
      this.websocket.emitRewardClaimed(userId, 'mission_token', tokenReward.toFixed(8));
    }
    if (xpReward.gt(0)) {
      this.websocket.emitRewardClaimed(userId, 'mission_xp', xpReward.toFixed(2));
    }

    return {
      missionId,
      tokenReward: tokenReward.toFixed(8),
      xpReward: xpReward.toFixed(2),
      status: MissionStatus.REWARDED,
    };
  }
}


