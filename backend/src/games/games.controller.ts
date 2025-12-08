import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { GamesService } from './games.service';
import { GameType } from '@prisma/client';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/user.decorator';

@Controller('games')
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  @Get('global-record')
  async getGlobalRecord() {
    return this.gamesService.getGlobalRecord();
  }

  @Get('rtp-live')
  async getRtpLive() {
    return this.gamesService.getRtpLive();
  }

  @Get(':gameType/big-wins')
  async getBigWins(@Param('gameType') gameType: GameType) {
    return this.gamesService.getBigWins(gameType);
  }

  @Get(':gameType/lucky-wins')
  async getLuckyWins(@Param('gameType') gameType: GameType) {
    return this.gamesService.getLuckyWins(gameType);
  }

  @Get(':gameType/info')
  async getGameInfo(@Param('gameType') gameType: GameType) {
    return this.gamesService.getGameInfo(gameType);
  }

  @Get(':gameType/recent-bets')
  @UseGuards(AuthGuard)
  async getRecentBets(
    @Param('gameType') gameType: GameType,
    @CurrentUser() userId: string,
  ) {
    return this.gamesService.getRecentBets(userId, gameType);
  }
}


