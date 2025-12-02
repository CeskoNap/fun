import { Controller, Get, UseGuards } from '@nestjs/common';
import { AchievementsService } from './achievements.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/user.decorator';

@Controller('achievements')
@UseGuards(AuthGuard)
export class AchievementsController {
  constructor(private readonly achievementsService: AchievementsService) {}

  @Get()
  async getForUser(@CurrentUser() userId: string) {
    return this.achievementsService.getAchievementsForUser(userId);
  }
}


