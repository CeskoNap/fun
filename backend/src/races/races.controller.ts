import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { RacesService } from './races.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser as CU } from '../common/decorators/user.decorator';

@Controller('races')
export class RacesController {
  constructor(private readonly racesService: RacesService) {}

  @Get('active')
  @UseGuards(AuthGuard)
  async getActiveRaces(@CU() userId: string) {
    return this.racesService.getActiveRaces(userId);
  }

  @Get('homepage/active')
  async getHomepageActiveRace() {
    return this.racesService.getHomepageActiveRace();
  }

  @Post(':id/join')
  @UseGuards(AuthGuard)
  async joinRace(@CU() userId: string, @Param('id') raceId: string) {
    return this.racesService.joinRace(userId, raceId);
  }

  @Get(':id/leaderboard')
  @UseGuards(AuthGuard)
  async getLeaderboard(@Param('id') raceId: string) {
    return this.racesService.getLeaderboard(raceId);
  }
}


