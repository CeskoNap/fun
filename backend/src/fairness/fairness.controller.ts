import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { FairnessService } from './fairness.service';
import { MinesManualDto } from './dto/mines-manual.dto';
import { PlinkoManualDto } from './dto/plinko-manual.dto';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/user.decorator';

@Controller('fairness')
export class FairnessController {
  constructor(private readonly fairnessService: FairnessService) {}

  // Manual verification - Mines
  @Post('mines/verify-manual')
  async verifyMinesManual(@Body() dto: MinesManualDto) {
    return this.fairnessService.verifyMinesManual(dto);
  }

  // Verify bet - Mines
  @Get('mines/verify-bet/:betId')
  @UseGuards(AuthGuard)
  async verifyMinesBet(@Param('betId') betId: string, @CurrentUser() userId: string) {
    return this.fairnessService.verifyMinesBet(betId, userId);
  }

  // Manual verification - Plinko
  @Post('plinko/verify-manual')
  async verifyPlinkoManual(@Body() dto: PlinkoManualDto) {
    return this.fairnessService.verifyPlinkoManual({
      ...dto,
      risk: dto.risk as 'low' | 'medium' | 'high',
    });
  }

  // Verify bet - Plinko
  @Get('plinko/verify-bet/:betId')
  @UseGuards(AuthGuard)
  async verifyPlinkoBet(@Param('betId') betId: string, @CurrentUser() userId: string) {
    return this.fairnessService.verifyPlinkoBet(betId, userId);
  }
}


