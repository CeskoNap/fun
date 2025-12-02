import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LevelsService } from '../levels/levels.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { Decimal } from '@prisma/client/runtime/library';
import { GameType, BetStatus, TransactionType } from '@prisma/client';
import { generateServerSeed } from '../common/utils/provably-fair.util';
import { updateUserBalance } from '../common/utils/balance.util';
import { RacesService } from '../races/races.service';
import { MissionsService } from '../missions/missions.service';
import { AchievementsService } from '../achievements/achievements.service';
import { resolveMinesBet, MinesParams, MinesGameData } from '../games/mines.engine';
import { resolvePlinkoBet, PlinkoParams, PlinkoGameData } from '../games/plinko.engine';

@Injectable()
export class BetsService {
  constructor(
    private prisma: PrismaService,
    private levelsService: LevelsService,
    private websocketGateway: WebsocketGateway,
    private racesService: RacesService,
    private missionsService: MissionsService,
    private achievementsService: AchievementsService,
  ) {}

  // NOTE: Game resolution logic (Mines/Plinko) should be implemented here or via game engines.
  // For now, assume resolveGameBet is already implemented.

  private async getNextNonceForUser(userId: string): Promise<number> {
    // Simple nonce: count of bets + 1
    const count = await this.prisma.bet.count({ where: { userId } });
    return count + 1;
  }

  async createAndResolveBet(
    userId: string,
    gameType: GameType,
    amountNumber: number,
    clientSeed?: string,
    params?: Record<string, any>,
  ) {
    if (amountNumber <= 0) {
      throw new BadRequestException('Bet amount must be positive');
    }

    const amount = new Decimal(amountNumber);

    const game = await this.prisma.game.findUnique({
      where: { type: gameType },
    });

    if (!game || !game.isActive) {
      throw new BadRequestException('Game not available');
    }

    if (amount.lt(game.minBet)) {
      throw new BadRequestException(`Amount below minimum bet (${game.minBet.toString()})`);
    }

    if (game.maxBet && amount.gt(game.maxBet)) {
      throw new BadRequestException(`Amount above maximum bet (${game.maxBet.toString()})`);
    }

    const balance = await this.prisma.userBalance.findUnique({
      where: { userId },
    });

    if (!balance || balance.balance.lt(amount)) {
      throw new BadRequestException('Insufficient balance');
    }

    const serverSeed = generateServerSeed();
    const effectiveClientSeed = clientSeed || `auto-${userId}`;
    const nonce = await this.getNextNonceForUser(userId);

    // Debit bet amount
    const debitResult = await updateUserBalance(
      this.prisma,
      userId,
      amount.neg(),
      TransactionType.BET,
      { gameType, nonce },
    );

    // Create bet PENDING
    const bet = await this.prisma.bet.create({
      data: {
        userId,
        gameId: game.id,
        amount,
        status: BetStatus.PENDING,
        serverSeed,
        clientSeed: effectiveClientSeed,
        nonce,
      },
    });

    // Resolve game result (placeholder call)
    const { status, multiplier, payout, gameData } = await this.resolveGameBet(
      gameType,
      amountNumber,
      serverSeed,
      effectiveClientSeed,
      nonce,
      params,
    );

    let creditResult = null;
    if (payout.gt(0)) {
      creditResult = await updateUserBalance(
        this.prisma,
        userId,
        payout,
        TransactionType.WIN,
        { gameType, betId: bet.id, multiplier },
      );
    }

    const updatedBet = await this.prisma.bet.update({
      where: { id: bet.id },
      data: {
        status,
        payout,
        multiplier: new Decimal(multiplier),
        gameData,
        resolvedAt: new Date(),
      },
    });

    // XP
    const xp = await this.levelsService.calculateXPFromBet(amount, gameType);
    const xpResult = await this.levelsService.addXpForUser(
      userId,
      xp,
      'bet',
      bet.id,
      { gameType },
    );

    // Races volume update
    await this.racesService.handleBetForRaces(userId, gameType, amount);

    // Missions progress update
    await this.missionsService.handleBetForMissions(userId, gameType, amount);

    // Achievements check for bet events
    await this.achievementsService.checkForAchievements(userId, {
      event: 'BET_PLACED',
      amount,
    });

    const finalBalance = creditResult?.balanceAfter ?? debitResult.balanceAfter;

    this.websocketGateway.emitToUser(userId, 'bet:resolved', {
      betId: bet.id,
      gameType,
      status,
      payout: payout.toString(),
      multiplier,
      xpEarned: xp.toString(),
      newLevel: xpResult.newLevel,
      levelsGained: xpResult.levelsGained,
      balance: finalBalance.toString(),
      gameData,
    });
    this.websocketGateway.emitBalanceUpdate(userId, finalBalance.toString());

    return {
      betId: bet.id,
      gameType,
      status,
      amount: amount.toString(),
      payout: payout.toString(),
      multiplier,
      xpEarned: xp.toString(),
      newLevel: xpResult.newLevel,
      levelsGained: xpResult.levelsGained,
      balance: finalBalance.toString(),
      gameData,
    };
  }

  private async resolveGameBet(
    gameType: GameType,
    amount: number,
    serverSeed: string,
    clientSeed: string,
    nonce: number,
    params?: Record<string, any>,
  ): Promise<{
    status: BetStatus;
    multiplier: number;
    payout: Decimal;
    gameData: any;
  }> {
    if (gameType === GameType.MINES) {
      const rows = params?.rows ?? 5;
      const cols = params?.cols ?? 5;
      const minesCount = params?.minesCount ?? 5;

      if (rows <= 0 || cols <= 0) {
        throw new BadRequestException('rows and cols must be > 0');
      }
      const totalCells = rows * cols;
      if (minesCount <= 0 || minesCount >= totalCells) {
        throw new BadRequestException('minesCount must be > 0 and < rows*cols');
      }

      const result: MinesGameData = resolveMinesBet(
        amount,
        serverSeed,
        clientSeed,
        nonce,
        { rows, cols, minesCount } as MinesParams,
      );

      const multiplier = result.finalMultiplier;
      const amountDec = new Decimal(amount);
      const payout = amountDec.mul(multiplier);
      const status = multiplier > 0 ? BetStatus.WON : BetStatus.LOST;

      return {
        status,
        multiplier,
        payout,
        gameData: result,
      };
    }

    if (gameType === GameType.PLINKO) {
      const rows = params?.rows ?? 12;
      const allowedRows = [12, 14, 16];
      if (!allowedRows.includes(rows)) {
        throw new BadRequestException(`Invalid rows for Plinko. Allowed: ${allowedRows.join(', ')}`);
      }
      const risk: 'low' | 'medium' | 'high' = params?.risk ?? 'medium';
      if (!['low', 'medium', 'high'].includes(risk)) {
        throw new BadRequestException('Invalid risk for Plinko');
      }

      const result: PlinkoGameData = resolvePlinkoBet(
        amount,
        serverSeed,
        clientSeed,
        nonce,
        { rows, risk } as PlinkoParams,
      );

      const multiplier = result.finalMultiplier;
      const amountDec = new Decimal(amount);
      const payout = amountDec.mul(multiplier);
      const status = multiplier > 0 ? BetStatus.WON : BetStatus.LOST;

      return {
        status,
        multiplier,
        payout,
        gameData: result,
      };
    }

    throw new BadRequestException('Unsupported game type');
  }
}


