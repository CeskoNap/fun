import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { Decimal } from '@prisma/client/runtime/library';

interface AchievementEvent {
  event: 'LEVEL_UP' | 'BET_PLACED';
  newLevel?: number;
  totalXp?: Decimal;
  amount?: Decimal;
}

@Injectable()
export class AchievementsService {
  constructor(
    private prisma: PrismaService,
    private websocket: WebsocketGateway,
  ) {}

  async checkForAchievements(userId: string, evt: AchievementEvent) {
    const achievements = await this.prisma.achievement.findMany({
      where: { isActive: true },
    });

    const unlocked = await this.prisma.userAchievement.findMany({
      where: { userId },
    });
    const unlockedIds = new Set(unlocked.map((ua) => ua.achievementId));

    // Simple example conditions: code-based
    for (const ach of achievements) {
      if (unlockedIds.has(ach.id)) continue;

      let shouldUnlock = false;

      if (evt.event === 'LEVEL_UP' && evt.newLevel !== undefined) {
        if (ach.code === 'level_10' && evt.newLevel >= 10) shouldUnlock = true;
        if (ach.code === 'level_50' && evt.newLevel >= 50) shouldUnlock = true;
      }

      if (evt.event === 'BET_PLACED' && evt.amount) {
        // Example: cumulative volume achievements
        const stats = await this.prisma.transaction.aggregate({
          _sum: { amount: true },
          where: {
            userId,
            type: 'BET',
          },
        });
        const volume = stats._sum.amount || new Decimal(0);
        if (ach.code === 'volume_1m' && volume.gte(new Decimal(1_000_000))) {
          shouldUnlock = true;
        }
      }

      if (shouldUnlock) {
        await this.prisma.userAchievement.create({
          data: {
            userId,
            achievementId: ach.id,
          },
        });

        this.websocket.emitToUser(userId, 'achievement:unlocked', {
          code: ach.code,
          name: ach.name,
          description: ach.description,
          unlockedAt: new Date().toISOString(),
        });
      }
    }
  }

  async getAchievementsForUser(userId: string) {
    const achievements = await this.prisma.achievement.findMany({
      where: { isActive: true },
      orderBy: { code: 'asc' },
    });
    const unlocked = await this.prisma.userAchievement.findMany({
      where: { userId },
    });
    const byAchId = new Map(unlocked.map((ua) => [ua.achievementId, ua]));

    return achievements.map((a) => {
      const ua = byAchId.get(a.id);
      return {
        code: a.code,
        name: a.name,
        description: a.description,
        icon: a.icon,
        unlocked: !!ua,
        unlockedAt: ua?.unlockedAt ?? null,
      };
    });
  }
}


