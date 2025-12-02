import { Controller, Get, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/user.decorator';

@Controller('me')
@UseGuards(AuthGuard)
export class MeController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('balance')
  async getBalance(@CurrentUser() userId: string) {
    const balance = await this.prisma.userBalance.findUnique({
      where: { userId },
      select: { balance: true },
    });

    return {
      balance: balance ? balance.balance.toString() : '0',
    };
  }
}


