import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { RewardsService } from './rewards.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/user.decorator';

@Controller('rewards')
@UseGuards(AuthGuard)
export class RewardsController {
  constructor(private readonly rewardsService: RewardsService) {}

  @Post('daily')
  @HttpCode(HttpStatus.OK)
  async claimDailyReward(@CurrentUser() userId: string) {
    return this.rewardsService.claimDailyReward(userId);
  }

  @Post('faucet')
  @HttpCode(HttpStatus.OK)
  async claimHourlyFaucet(@CurrentUser() userId: string) {
    return this.rewardsService.claimHourlyFaucet(userId);
  }

  @Post('ads')
  @HttpCode(HttpStatus.OK)
  async claimAdReward(
    @CurrentUser() userId: string,
    @Body() body: { provider: string },
  ) {
    return this.rewardsService.claimAdReward(userId, body.provider);
  }

  @Post('quiz/start')
  @HttpCode(HttpStatus.OK)
  async startDailyQuiz(@CurrentUser() userId: string) {
    return this.rewardsService.startDailyQuiz(userId);
  }

  @Post('quiz/submit')
  @HttpCode(HttpStatus.OK)
  async submitDailyQuizAnswers(
    @CurrentUser() userId: string,
    @Body() body: { attemptId: string; answers: number[] },
  ) {
    return this.rewardsService.submitDailyQuizAnswers(
      userId,
      body.attemptId,
      body.answers,
    );
  }
}

