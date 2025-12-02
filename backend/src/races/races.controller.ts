import { Controller, Get, Param, Post, UseGuards, CurrentUser } from '@nestjs/common';
import { RacesService } from './races.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser as CU } from '../common/decorators/user.decorator';

@Controller('races')
@UseGuards(AuthGuard)
export class RacesController {
  constructor(private readonly racesService: RacesService) {}

  @Get('active')
  async getActiveRaces(@CU() userId: string) {
    return this.racesService.getActiveRaces(userId);
  }

  @Post(':id/join')
  async joinRace(@CU() userId: string, @Param('id') raceId: string) {
    return this.racesService.joinRace(userId, raceId);
  }

  @Get(':id/leaderboard')
  async getLeaderboard(@Param('id') raceId: string) {
    return this.racesService.getLeaderboard(raceId);
  }
}


