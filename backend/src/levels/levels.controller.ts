import { Controller, Get, UseGuards } from '@nestjs/common';
import { LevelsService } from './levels.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/user.decorator';

@Controller('levels')
@UseGuards(AuthGuard)
export class LevelsController {
  constructor(private readonly levelsService: LevelsService) {}

  @Get('me')
  async getMyLevel(@CurrentUser() userId: string) {
    return this.levelsService.getUserLevel(userId);
  }
}

