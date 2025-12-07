import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import { getServerDay } from '../common/utils/server-time.util';
import { updateUserBalance } from '../common/utils/balance.util';
import { TransactionType } from '@prisma/client';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { createHmac } from 'crypto';

interface WheelSegment {
  type: 'token' | 'xp' | 'none';
  amount?: number;
}

interface WheelConfigData {
  segments: WheelSegment[];
  weights?: number[];
  maxSpinsPerDay?: number;
  cooldownMinutes?: number;
}

@Injectable()
export class WheelService {
  constructor(
    private prisma: PrismaService,
    private websocket: WebsocketGateway,
  ) {}

  private async getActiveConfig(): Promise<{ id: string; data: WheelConfigData }> {
    let cfg = await this.prisma.wheelConfig.findFirst({
      where: { name: 'default', isActive: true },
    });

    if (!cfg) {
      cfg = await this.prisma.wheelConfig.create({
        data: {
          name: 'default',
          segments: {
            segments: [
              { type: 'token', amount: 50 },
              { type: 'token', amount: 100 },
              { type: 'xp', amount: 100 },
              { type: 'none' },
            ],
            weights: [1, 1, 1, 1],
            maxSpinsPerDay: 3,
            cooldownMinutes: 0,
          },
        },
      });
    }

    const data = cfg.segments as any as WheelConfigData;
    return { id: cfg.id, data };
  }

  private pickSegmentIndex(
    segments: WheelSegment[],
    weights: number[] | undefined,
    userId: string,
  ): number {
    if (!segments.length) {
      throw new BadRequestException('Wheel configuration has no segments');
    }

    const w = weights && weights.length === segments.length ? weights : undefined;
    const seed = process.env.WHEEL_SECRET || 'wheel-secret';
    const now = Date.now().toString();
    const hmac = createHmac('sha256', seed);
    hmac.update(`${userId}:${now}`);
    const hash = hmac.digest('hex').slice(0, 13);
    const rnd = parseInt(hash, 16) / Math.pow(2, 52); // [0,1)

    if (!w) {
      return Math.floor(rnd * segments.length);
    }

    const total = w.reduce((acc, v) => acc + v, 0);
    let t = rnd * total;
    for (let i = 0; i < w.length; i++) {
      if (t < w[i]) return i;
      t -= w[i];
    }
    return w.length - 1;
  }

  async getConfigForUser(userId: string) {
    const { data } = await this.getActiveConfig();
    const serverDay = getServerDay();

    const spinsToday = await this.prisma.wheelSpin.count({
      where: {
        userId,
        day: serverDay,
      },
    });

    const maxSpinsPerDay = data.maxSpinsPerDay ?? 3;

    return {
      segmentsCount: data.segments.length,
      hasTokenReward: data.segments.some((s) => s.type === 'token'),
      hasXpReward: data.segments.some((s) => s.type === 'xp'),
      maxSpinsPerDay,
      spinsToday,
    };
  }

  async spin(userId: string) {
    const { data } = await this.getActiveConfig();
    const serverDay = getServerDay();

    const maxSpinsPerDay = data.maxSpinsPerDay ?? 3;
    const cooldownMinutes = data.cooldownMinutes ?? 0;

    const todaySpins = await this.prisma.wheelSpin.findMany({
      where: { userId, day: serverDay },
      orderBy: { spunAt: 'desc' },
    });

    if (todaySpins.length >= maxSpinsPerDay) {
      throw new BadRequestException('Daily wheel spin limit reached');
    }

    if (cooldownMinutes > 0 && todaySpins[0]) {
      const last = todaySpins[0].spunAt.getTime();
      const diffMin = (Date.now() - last) / (1000 * 60);
      if (diffMin < cooldownMinutes) {
        throw new BadRequestException('Wheel cooldown not elapsed yet');
      }
    }

    const idx = this.pickSegmentIndex(data.segments, data.weights, userId);
    const segment = data.segments[idx];

    let tokenAmount: bigint = 0n;
    let xpAmount = new Decimal(0);

    if (segment.type === 'token' && segment.amount && segment.amount > 0) {
      // Convert to BigInt (round to nearest integer, no decimals)
      tokenAmount = BigInt(Math.round(segment.amount));
    } else if (segment.type === 'xp' && segment.amount && segment.amount > 0) {
      xpAmount = new Decimal(segment.amount);
    }

    const result = await this.prisma.$transaction(async (tx) => {
      let finalBalance: bigint | null = null;

      if (tokenAmount > 0n) {
        const balanceResult = await updateUserBalance(
          tx,
          userId,
          tokenAmount,
          TransactionType.WHEEL_REWARD,
          { source: 'wheel', segmentIndex: idx },
        );
        finalBalance = balanceResult.balanceAfter;
      }

      let xpAdded: Decimal | null = null;
      if (xpAmount.gt(0)) {
        // XP is logged via LevelsService from caller (for simplicity we only credit token here).
        xpAdded = xpAmount;
      }

      const spin = await tx.wheelSpin.create({
        data: {
          userId,
          day: serverDay,
          segment: idx,
          rewardType: segment.type,
          amount: tokenAmount > 0n ? tokenAmount : null,
          xpAmount: xpAmount.gt(0) ? xpAmount : null,
        },
      });

      return { spin, finalBalance, xpAdded };
    });

    if (result.finalBalance) {
      this.websocket.emitBalanceUpdate(userId, result.finalBalance.toString());
    }

    if (tokenAmount > 0n) {
      this.websocket.emitRewardClaimed(userId, 'wheel_token', tokenAmount.toString());
    }
    if (xpAmount.gt(0)) {
      this.websocket.emitRewardClaimed(userId, 'wheel_xp', xpAmount.toFixed(2));
    }

    return {
      segmentIndex: idx,
      rewardType: segment.type,
      amount: tokenAmount.toString(),
      xpAmount: xpAmount.toFixed(2),
      spinsToday: todaySpins.length + 1,
      maxSpinsPerDay,
    };
  }
}


