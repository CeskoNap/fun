import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { BetsService } from './bets.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/user.decorator';
import { CreateBetDto } from './dto/create-bet.dto';

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
}


