import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { BetsService } from './bets.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/user.decorator';
import { CreateBetDto } from './dto/create-bet.dto';
import { StartMinesBetDto } from './dto/start-mines-bet.dto';
import { RevealTileDto } from './dto/reveal-tile.dto';
import { CashOutDto } from './dto/cash-out.dto';

@Controller('bets')
@UseGuards(AuthGuard)
export class BetsController {
  constructor(private readonly betsService: BetsService) {}

  @Post()
  async createBet(
    @CurrentUser() userId: string,
    @Body() dto: CreateBetDto,
  ) {
    return this.betsService.createAndResolveBet(
      userId,
      dto.gameType,
      dto.amount,
      dto.clientSeed,
      dto.params as any,
    );
  }

  @Post('mines/start')
  async startMinesBet(
    @CurrentUser() userId: string,
    @Body() dto: StartMinesBetDto,
  ) {
    return this.betsService.startMinesBet(
      userId,
      dto.amount,
      dto.rows,
      dto.cols,
      dto.minesCount,
      dto.clientSeed,
    );
  }

  @Post('mines/reveal-tile')
  async revealTile(
    @CurrentUser() userId: string,
    @Body() dto: RevealTileDto,
  ) {
    return this.betsService.revealTile(userId, dto.betId, dto.tileIndex);
  }

  @Post('mines/cash-out')
  async cashOut(
    @CurrentUser() userId: string,
    @Body() dto: CashOutDto,
  ) {
    return this.betsService.cashOut(userId, dto.betId);
  }
}


