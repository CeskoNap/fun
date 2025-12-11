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
import { resolveMinesBet, MinesParams, MinesGameData, generateMinesPositions, calculateMinesMultiplier } from '../games/mines.engine';
import { resolvePlinkoBet, PlinkoParams, PlinkoGameData } from '../games/plinko.engine';
import { resolveDiceBet, DiceParams, DiceGameData } from '../games/dice.engine';
import { toCentesimi, fromCentesimi } from '../common/utils/balance.util';

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

    // Convert to centesimi (BigInt): amountNumber is in decimal format (e.g., 10.50)
    const amount = toCentesimi(amountNumber);

    const game = await this.prisma.game.findUnique({
      where: { type: gameType },
    });

    if (!game || !game.isActive) {
      throw new BadRequestException('Game not available');
    }

    const minBet = game.minBet as bigint;
    const maxBet = game.maxBet as bigint | null;

    if (amount < minBet) {
      throw new BadRequestException(`Amount below minimum bet (${fromCentesimi(minBet).toFixed(2)})`);
    }

    if (maxBet && amount > maxBet) {
      throw new BadRequestException(`Amount above maximum bet (${fromCentesimi(maxBet).toFixed(2)})`);
    }

    const balance = await this.prisma.userBalance.findUnique({
      where: { userId },
    });

    const balanceAmount = balance?.balance as bigint || 0n;
    if (!balance || balanceAmount < amount) {
      throw new BadRequestException('Insufficient balance');
    }

    const serverSeed = generateServerSeed();
    const effectiveClientSeed = clientSeed || `auto-${userId}`;
    const nonce = await this.getNextNonceForUser(userId);

    // Debit bet amount (negative for debit)
    const debitResult = await updateUserBalance(
      this.prisma,
      userId,
      -amount,
      TransactionType.BET,
      { gameType, nonce },
    );

    // Create bet PENDING (for one-shot games)
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

    // Resolve game result
    // amount is already in centesimi (BigInt)
    const { status, multiplier, payout, gameData } = await this.resolveGameBet(
      gameType,
      amount,
      serverSeed,
      effectiveClientSeed,
      nonce,
      params,
    );

    let creditResult = null;
    if (payout > 0n) {
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
    // Convert amount from centesimi to decimal for XP calculation
    const amountDecimal = fromCentesimi(amount);
    const xp = await this.levelsService.calculateXPFromBet(amountDecimal, gameType);
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
      amount: Number(amount), // Convert BigInt to number for achievements
    });

    const finalBalance = creditResult?.balanceAfter ?? debitResult.balanceAfter;

    this.websocketGateway.emitToUser(userId, 'bet:resolved', {
      betId: bet.id,
      gameType,
      status,
      payout: fromCentesimi(payout).toFixed(2),
      multiplier,
      xpEarned: xp.toString(),
      newLevel: xpResult.newLevel,
      levelsGained: xpResult.levelsGained,
      balance: fromCentesimi(finalBalance).toFixed(2),
      gameData,
    });
    this.websocketGateway.emitBalanceUpdate(userId, fromCentesimi(finalBalance).toFixed(2));

    // Emit global big win event if multiplier >= 5x
    const multiplierNum = typeof multiplier === 'number' ? multiplier : Number(multiplier);
    console.log(`[Big Win Check] Status: ${status}, Multiplier: ${multiplier} (type: ${typeof multiplier}), MultiplierNum: ${multiplierNum}, Is >= 5: ${multiplierNum >= 5}`);
    
    if (status === 'WON' && multiplierNum >= 5) {
      console.log(`[Big Win] Condition met! Fetching user data for userId: ${userId}`);
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { username: true, displayName: true },
      });
      
      console.log(`[Big Win] User found:`, user);
      
      if (user) {
        const bigWinData = {
          betId: bet.id,
          gameType,
          userId,
          username: user.displayName || user.username,
          multiplier: multiplierNum,
          payout: fromCentesimi(payout).toFixed(2),
        };
        console.log(`[Big Win] Emitting big-win:public event:`, bigWinData);
        this.websocketGateway.emitBigWin(bigWinData);
      } else {
        console.log(`[Big Win] User not found for userId: ${userId}`);
      }
    } else {
      console.log(`[Big Win] Condition not met - Status: ${status}, MultiplierNum: ${multiplierNum}, >= 5: ${multiplierNum >= 5}`);
    }

    return {
      betId: bet.id,
      gameType,
      status,
      amount: fromCentesimi(amount).toFixed(2),
      payout: fromCentesimi(payout).toFixed(2),
      multiplier,
      xpEarned: xp.toString(),
      newLevel: xpResult.newLevel,
      levelsGained: xpResult.levelsGained,
      balance: fromCentesimi(finalBalance).toFixed(2),
      gameData,
    };
  }

  private async resolveGameBet(
    gameType: GameType,
    amount: bigint, // Amount in centesimi (BigInt)
    serverSeed: string,
    clientSeed: string,
    nonce: number,
    params?: Record<string, any>,
  ): Promise<{
    status: BetStatus;
    multiplier: number;
    payout: bigint; // Payout in centesimi (BigInt)
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

      // Convert amount from centesimi to decimal for game engine
      const amountDecimal = fromCentesimi(amount);
      
      const result: MinesGameData = resolveMinesBet(
        amountDecimal,
        serverSeed,
        clientSeed,
        nonce,
        { rows, cols, minesCount } as MinesParams,
      );

      const multiplier = result.finalMultiplier;
      // Calculate payout in decimal, then convert to centesimi
      const payoutDecimal = amountDecimal * multiplier;
      const payout = toCentesimi(payoutDecimal);
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

      // Convert amount from centesimi to decimal for game engine
      const amountDecimal = fromCentesimi(amount);
      
      const result: PlinkoGameData = resolvePlinkoBet(
        amountDecimal,
        serverSeed,
        clientSeed,
        nonce,
        { rows, risk } as PlinkoParams,
      );

      const multiplier = result.finalMultiplier;
      // Calculate payout in decimal, then convert to centesimi
      const payoutDecimal = amountDecimal * multiplier;
      const payout = toCentesimi(payoutDecimal);
      const status = multiplier > 0 ? BetStatus.WON : BetStatus.LOST;

      return {
        status,
        multiplier,
        payout,
        gameData: result,
      };
    }

    if (gameType === GameType.DICE) {
      const target = params?.target ?? 50;
      if (target < 1 || target > 100) {
        throw new BadRequestException('Target must be between 1 and 100');
      }
      const direction: 'over' | 'under' = params?.direction ?? 'over';
      if (!['over', 'under'].includes(direction)) {
        throw new BadRequestException('Direction must be "over" or "under"');
      }

      // Convert amount from centesimi to decimal for game engine
      const amountDecimal = fromCentesimi(amount);
      
      const result: DiceGameData = resolveDiceBet(
        amountDecimal,
        serverSeed,
        clientSeed,
        nonce,
        { target, direction } as DiceParams,
      );

      const multiplier = result.finalMultiplier;
      // Calculate payout in decimal, then convert to centesimi
      const payoutDecimal = amountDecimal * multiplier;
      const payout = toCentesimi(payoutDecimal);
      const status = result.won ? BetStatus.WON : BetStatus.LOST;

      return {
        status,
        multiplier,
        payout,
        gameData: result,
      };
    }

    throw new BadRequestException('Unsupported game type');
  }

  // Start interactive Mines game
  async startMinesBet(
    userId: string,
    amountNumber: number,
    rows: number,
    cols: number,
    minesCount: number,
    clientSeed?: string,
  ) {
    if (amountNumber <= 0) {
      throw new BadRequestException('Bet amount must be positive');
    }

    // Convert to centesimi (BigInt): amountNumber is in decimal format (e.g., 10.50)
    const amount = toCentesimi(amountNumber);

    const game = await this.prisma.game.findUnique({
      where: { type: GameType.MINES },
    });

    if (!game || !game.isActive) {
      throw new BadRequestException('Game not available');
    }

    const minBet = game.minBet as bigint;
    const maxBet = game.maxBet as bigint | null;

    if (amount < minBet) {
      throw new BadRequestException(`Amount below minimum bet (${fromCentesimi(minBet).toFixed(2)})`);
    }

    if (maxBet && amount > maxBet) {
      throw new BadRequestException(`Amount above maximum bet (${fromCentesimi(maxBet).toFixed(2)})`);
    }

    const balance = await this.prisma.userBalance.findUnique({
      where: { userId },
    });

    const balanceAmount = balance?.balance as bigint || 0n;
    if (!balance || balanceAmount < amount) {
      throw new BadRequestException('Insufficient balance');
    }

    const totalCells = rows * cols;
    if (rows <= 0 || cols <= 0) {
      throw new BadRequestException('rows and cols must be > 0');
    }
    if (minesCount <= 0 || minesCount >= totalCells) {
      throw new BadRequestException('minesCount must be > 0 and < rows*cols');
    }

    const serverSeed = generateServerSeed();
    const effectiveClientSeed = clientSeed || `auto-${userId}`;
    const nonce = await this.getNextNonceForUser(userId);

    // Debit bet amount (negative for debit)
    const debitResult = await updateUserBalance(
      this.prisma,
      userId,
      -amount,
      TransactionType.BET,
      { gameType: GameType.MINES, nonce },
    );

    // Generate mine positions provably fair
    const minePositions = generateMinesPositions(
      totalCells,
      minesCount,
      serverSeed,
      effectiveClientSeed,
      nonce,
    );

    const initialGameData = {
      rows,
      cols,
      minesCount,
      minePositions,
      revealedTiles: [],
      gemsRevealed: 0,
      gameEnded: false,
    };

    const bet = await this.prisma.bet.create({
      data: {
        userId,
        gameId: game.id,
        amount,
        status: BetStatus.PENDING,
        serverSeed,
        clientSeed: effectiveClientSeed,
        nonce,
        gameData: initialGameData,
      },
    });

    // Races volume update (for bet placed)
    await this.racesService.handleBetForRaces(userId, GameType.MINES, amount);

    // Missions progress update (for bet placed)
    await this.missionsService.handleBetForMissions(userId, GameType.MINES, amount);

    // Achievements check for bet events
    await this.achievementsService.checkForAchievements(userId, {
      event: 'BET_PLACED',
      amount: Number(amount),
    });

    this.websocketGateway.emitToUser(userId, 'bet:created', {
      betId: bet.id,
      gameType: GameType.MINES,
      status: BetStatus.PENDING,
      balance: fromCentesimi(debitResult.balanceAfter).toFixed(2),
      gameData: initialGameData,
    });
    this.websocketGateway.emitBalanceUpdate(userId, fromCentesimi(debitResult.balanceAfter).toFixed(2));

    return {
      betId: bet.id,
      gameType: GameType.MINES,
      status: BetStatus.PENDING,
      amount: fromCentesimi(amount).toFixed(2),
      balance: fromCentesimi(debitResult.balanceAfter).toFixed(2),
      gameData: initialGameData,
    };
  }

  // Interactive Mines: Reveal a tile
  async revealTile(userId: string, betId: string, tileIndex: number) {
    const bet = await this.prisma.bet.findUnique({
      where: { id: betId },
      include: { game: true },
    });

    if (!bet || bet.userId !== userId) {
      throw new NotFoundException('Bet not found');
    }

    if (bet.game.type !== GameType.MINES) {
      throw new BadRequestException('This endpoint is only for Mines games');
    }

    const gameData = bet.gameData as any;
    if (!gameData || !gameData.minePositions) {
      throw new BadRequestException('Invalid game data');
    }

    // Check if game has already ended (this can happen even if status is still PENDING due to race conditions)
    if (gameData.gameEnded) {
      throw new BadRequestException('Game has already ended');
    }

    if (bet.status !== BetStatus.PENDING) {
      throw new BadRequestException('Bet is not active');
    }

    const { rows, cols, minePositions, revealedTiles = [], gemsRevealed = 0 } = gameData;
    const totalCells = rows * cols;

    if (tileIndex < 0 || tileIndex >= totalCells) {
      throw new BadRequestException(`Tile index must be between 0 and ${totalCells - 1}`);
    }

    if (revealedTiles.includes(tileIndex)) {
      throw new BadRequestException('Tile already revealed');
    }

    const isMine = minePositions.includes(tileIndex);
    const newRevealedTiles = [...revealedTiles, tileIndex];
    const newGemsRevealed = isMine ? gemsRevealed : gemsRevealed + 1;
    const maxSafe = totalCells - gameData.minesCount;
    const currentMultiplier = isMine 
      ? 0 
      : calculateMinesMultiplier(gameData.minesCount, newGemsRevealed, maxSafe);

    let updatedGameData = {
      ...gameData,
      revealedTiles: newRevealedTiles,
      gemsRevealed: newGemsRevealed,
      currentMultiplier,
      gameEnded: isMine,
    };

    // If hit a mine, game ends immediately
    if (isMine) {
      const updatedBet = await this.prisma.bet.update({
        where: { id: betId },
        data: {
          status: BetStatus.LOST,
          multiplier: new Decimal(0),
          payout: BigInt(0),
          gameData: updatedGameData,
          resolvedAt: new Date(),
        },
      });

      // XP (even on loss)
      // Convert bet.amount from centesimi to decimal for XP calculation
      const betAmountDecimal = fromCentesimi(bet.amount as bigint);
      const xp = await this.levelsService.calculateXPFromBet(betAmountDecimal, GameType.MINES);
      const xpResult = await this.levelsService.addXpForUser(
        userId,
        xp,
        'bet',
        bet.id,
        { gameType: GameType.MINES },
      );

      const balance = await this.prisma.userBalance.findUnique({
        where: { userId },
      });

      const balanceAmount = balance?.balance as bigint || 0n;
      this.websocketGateway.emitToUser(userId, 'bet:resolved', {
        betId: bet.id,
        gameType: GameType.MINES,
        status: BetStatus.LOST,
        payout: '0.00',
        multiplier: 0,
        xpEarned: xp.toString(),
        newLevel: xpResult.newLevel,
        levelsGained: xpResult.levelsGained,
        balance: fromCentesimi(balanceAmount).toFixed(2),
        gameData: updatedGameData,
      });
      this.websocketGateway.emitBalanceUpdate(userId, fromCentesimi(balanceAmount).toFixed(2));

      return {
        betId: bet.id,
        isMine: true,
        gameEnded: true,
        multiplier: 0,
        gameData: updatedGameData,
      };
    }

    // Update bet with new game state
    const updatedBet = await this.prisma.bet.update({
      where: { id: betId },
      data: {
        gameData: updatedGameData,
      },
    });

    const balance = await this.prisma.userBalance.findUnique({
      where: { userId },
    });

    const balanceAmount = balance?.balance as bigint || 0n;
    this.websocketGateway.emitToUser(userId, 'bet:tile-revealed', {
      betId: bet.id,
      tileIndex,
      isMine: false,
      gemsRevealed: newGemsRevealed,
      currentMultiplier,
      gameData: updatedGameData,
      balance: fromCentesimi(balanceAmount).toFixed(2),
    });

    return {
      betId: bet.id,
      isMine: false,
      gameEnded: false,
      gemsRevealed: newGemsRevealed,
      currentMultiplier,
      gameData: updatedGameData,
    };
  }

  // Interactive Mines: Cash out
  async cashOut(userId: string, betId: string) {
    const bet = await this.prisma.bet.findUnique({
      where: { id: betId },
      include: { game: true },
    });

    if (!bet || bet.userId !== userId) {
      throw new NotFoundException('Bet not found');
    }

    if (bet.game.type !== GameType.MINES) {
      throw new BadRequestException('This endpoint is only for Mines games');
    }

    const gameData = bet.gameData as any;
    if (!gameData || gameData.gemsRevealed === undefined) {
      throw new BadRequestException('Invalid game data');
    }

    // Check if game has already ended (this can happen even if status is still PENDING due to race conditions)
    if (gameData.gameEnded) {
      throw new BadRequestException('Game has already ended');
    }

    if (bet.status !== BetStatus.PENDING) {
      throw new BadRequestException('Bet is not active');
    }

    if (gameData.gemsRevealed === 0) {
      throw new BadRequestException('Cannot cash out with no gems revealed');
    }

    // bet.amount is in centesimi, convert to decimal, calculate payout, then back to centesimi
    const amountDecimal = fromCentesimi(bet.amount as bigint);
    const multiplier = gameData.currentMultiplier || 1.0;
    const payoutDecimal = amountDecimal * multiplier;
    const payout = toCentesimi(payoutDecimal);

    // Credit winnings
    const creditResult = await updateUserBalance(
      this.prisma,
      userId,
      payout,
      TransactionType.WIN,
      { gameType: GameType.MINES, betId: bet.id, multiplier },
    );

    const updatedGameData = {
      ...gameData,
      gameEnded: true,
      finalMultiplier: multiplier,
    };

    // Update bet to WON
    const updatedBet = await this.prisma.bet.update({
      where: { id: betId },
      data: {
        status: BetStatus.WON,
        multiplier: new Decimal(multiplier),
        payout,
        gameData: updatedGameData,
        resolvedAt: new Date(),
      },
    });

    // XP
    // Convert bet.amount from centesimi to decimal for XP calculation
    const betAmountDecimal = fromCentesimi(bet.amount as bigint);
    const xp = await this.levelsService.calculateXPFromBet(betAmountDecimal, GameType.MINES);
    const xpResult = await this.levelsService.addXpForUser(
      userId,
      xp,
      'bet',
      bet.id,
      { gameType: GameType.MINES },
    );

    // Missions and achievements already handled on bet creation

    this.websocketGateway.emitToUser(userId, 'bet:resolved', {
      betId: bet.id,
      gameType: GameType.MINES,
      status: BetStatus.WON,
      payout: fromCentesimi(payout).toFixed(2),
      multiplier,
      xpEarned: xp.toString(),
      newLevel: xpResult.newLevel,
      levelsGained: xpResult.levelsGained,
      balance: fromCentesimi(creditResult.balanceAfter).toFixed(2),
      gameData: updatedGameData,
    });
    this.websocketGateway.emitBalanceUpdate(userId, fromCentesimi(creditResult.balanceAfter).toFixed(2));

    // Emit global big win event if multiplier >= 5x
    const multiplierNum = typeof multiplier === 'number' ? multiplier : Number(multiplier);
    console.log(`[Cash Out Big Win Check] Status: WON, Multiplier: ${multiplier} (type: ${typeof multiplier}), MultiplierNum: ${multiplierNum}, Is >= 5: ${multiplierNum >= 5}`);
    
    if (multiplierNum >= 5) {
      console.log(`[Cash Out Big Win] Condition met! Fetching user data for userId: ${userId}`);
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { username: true, displayName: true },
      });
      
      console.log(`[Cash Out Big Win] User found:`, user);
      
      if (user) {
        const bigWinData = {
          betId: bet.id,
          gameType: GameType.MINES,
          userId,
          username: user.displayName || user.username,
          multiplier: multiplierNum,
          payout: fromCentesimi(payout).toFixed(2),
        };
        console.log(`[Cash Out Big Win] Emitting big-win:public event:`, bigWinData);
        this.websocketGateway.emitBigWin(bigWinData);
      } else {
        console.log(`[Cash Out Big Win] User not found for userId: ${userId}`);
      }
    } else {
      console.log(`[Cash Out Big Win] Condition not met - MultiplierNum: ${multiplierNum}, >= 5: ${multiplierNum >= 5}`);
    }

    return {
      betId: bet.id,
      status: BetStatus.WON,
      payout: fromCentesimi(payout).toFixed(2),
      multiplier,
      xpEarned: xp.toString(),
      newLevel: xpResult.newLevel,
      levelsGained: xpResult.levelsGained,
      balance: fromCentesimi(creditResult.balanceAfter).toFixed(2),
      gameData: updatedGameData,
    };
  }
}


