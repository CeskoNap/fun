import { Controller, Post, Get, Body, Query, UseGuards, Req } from '@nestjs/common';
import { TransfersService } from './transfers.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/user.decorator';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { HistoryQueryDto } from './dto/history-query.dto';

@Controller('transfers')
@UseGuards(AuthGuard)
export class TransfersController {
  constructor(private readonly transfersService: TransfersService) {}

  @Post()
  async createTransfer(
    @CurrentUser() userId: string,
    @Body() dto: CreateTransferDto,
    @Req() req: any,
  ) {
    const ipAddress = req.ip;
    const userAgent = req.headers['user-agent'];
    return this.transfersService.createTransfer(userId, dto, ipAddress, userAgent);
  }

  @Get('history')
  async getHistory(
    @CurrentUser() userId: string,
    @Query() query: HistoryQueryDto,
  ) {
    const direction = query.direction || 'all';
    const limit = query.limit || 20;
    return this.transfersService.getHistory(userId, direction, limit);
  }
}


