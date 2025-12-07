import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import { GameType } from '@prisma/client';
import { resolveMinesBet, MinesGameData } from '../games/mines.engine';
import { resolvePlinkoBet, PlinkoGameData } from '../games/plinko.engine';

@Injectable()
export class FairnessService {
  constructor(private prisma: PrismaService) {}

  // ===== Manual verification =====

  verifyMinesManual(input: {
    serverSeed: string;
    clientSeed: string;
    nonce: number;
    amount: number;
    rows: number;
    cols: number;
    minesCount: number;
  }) {
    const { serverSeed, clientSeed, nonce, amount, rows, cols, minesCount } = input;

    const gameData: MinesGameData = resolveMinesBet(amount, serverSeed, clientSeed, nonce, {
      rows,
      cols,
      minesCount,
    });

    const multiplier = gameData.finalMultiplier;
    const expectedPayout = new Decimal(amount).mul(multiplier);

    return {
      gameData,
      multiplier,
      expectedPayout: expectedPayout.toFixed(8),
    };
  }

  verifyPlinkoManual(input: {
    serverSeed: string;
    clientSeed: string;
    nonce: number;
    amount: number;
    rows: number;
    risk: 'low' | 'medium' | 'high';
  }) {
    const { serverSeed, clientSeed, nonce, amount, rows, risk } = input;

    const gameData: PlinkoGameData = resolvePlinkoBet(amount, serverSeed, clientSeed, nonce, {
      rows,
      risk,
    });

    const multiplier = gameData.finalMultiplier;
    const expectedPayout = new Decimal(amount).mul(multiplier);

    return {
      gameData,
      multiplier,
      expectedPayout: expectedPayout.toFixed(8),
    };
  }

  // ===== Verification by bet =====

  async verifyMinesBet(betId: string, userId: string) {
    const bet = await this.prisma.bet.findUnique({
      where: { id: betId },
      include: { game: true },
    });
    if (!bet || bet.userId !== userId) {
      throw new NotFoundException('Bet not found');
    }
    if (bet.game.type !== GameType.MINES) {
      throw new BadRequestException('Bet is not a Mines game');
    }

    const gameDataStored = bet.gameData as any;
    if (!gameDataStored) {
      throw new BadRequestException('No game data stored for this bet');
    }

    const amount = Number(bet.amount as bigint);
    const recomputed: MinesGameData = resolveMinesBet(
      amount,
      bet.serverSeed,
      bet.clientSeed,
      bet.nonce,
      {
        rows: gameDataStored.rows,
        cols: gameDataStored.cols,
        minesCount: gameDataStored.minesCount,
      },
    );

    const storedMultiplier = bet.multiplier ? bet.multiplier.toNumber() : 0;
    const recomputedMultiplier = recomputed.finalMultiplier;

    const storedPayout = bet.payout ? Number(bet.payout as bigint) : 0;
    const recomputedPayout = amount * recomputedMultiplier;

    const valid =
      JSON.stringify(gameDataStored) === JSON.stringify(recomputed) &&
      new Decimal(storedMultiplier).eq(recomputedMultiplier) &&
      new Decimal(storedPayout).eq(recomputedPayout);

    return {
      betId: bet.id,
      valid,
      stored: {
        multiplier: storedMultiplier,
        payout: storedPayout.toFixed(8),
        gameData: gameDataStored,
      },
      recomputed: {
        multiplier: recomputedMultiplier,
        payout: recomputedPayout.toFixed(8),
        gameData: recomputed,
      },
    };
  }

  async verifyPlinkoBet(betId: string, userId: string) {
    const bet = await this.prisma.bet.findUnique({
      where: { id: betId },
      include: { game: true },
    });
    if (!bet || bet.userId !== userId) {
      throw new NotFoundException('Bet not found');
    }
    if (bet.game.type !== GameType.PLINKO) {
      throw new BadRequestException('Bet is not a Plinko game');
    }

    const gameDataStored = bet.gameData as any;
    if (!gameDataStored) {
      throw new BadRequestException('No game data stored for this bet');
    }

    const amount = Number(bet.amount as bigint);
    const recomputed: PlinkoGameData = resolvePlinkoBet(
      amount,
      bet.serverSeed,
      bet.clientSeed,
      bet.nonce,
      {
        rows: gameDataStored.rows,
        risk: gameDataStored.risk,
      },
    );

    const storedMultiplier = bet.multiplier ? bet.multiplier.toNumber() : 0;
    const recomputedMultiplier = recomputed.finalMultiplier;

    const storedPayout = bet.payout ? Number(bet.payout as bigint) : 0;
    const recomputedPayout = amount * recomputedMultiplier;

    const valid =
      JSON.stringify(gameDataStored) === JSON.stringify(recomputed) &&
      new Decimal(storedMultiplier).eq(recomputedMultiplier) &&
      new Decimal(storedPayout).eq(recomputedPayout);

    return {
      betId: bet.id,
      valid,
      stored: {
        multiplier: storedMultiplier,
        payout: storedPayout.toFixed(8),
        gameData: gameDataStored,
      },
      recomputed: {
        multiplier: recomputedMultiplier,
        payout: recomputedPayout.toFixed(8),
        gameData: recomputed,
      },
    };
  }
}


