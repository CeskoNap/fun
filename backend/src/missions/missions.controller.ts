import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { MissionsService } from './missions.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/user.decorator';

@Controller('missions')
@UseGuards(AuthGuard)
export class MissionsController {
  constructor(private readonly missionsService: MissionsService) {}

  @Get('active')
  async getActive(@CurrentUser() userId: string) {
    return this.missionsService.getActiveMissionsForUser(userId);
  }

  @Post(':id/claim')
  async claim(@CurrentUser() userId: string, @Param('id') missionId: string) {
    return this.missionsService.claimMission(userId, missionId);
  }
}


