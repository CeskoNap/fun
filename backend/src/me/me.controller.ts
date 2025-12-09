import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/user.decorator';
import { fromCentesimi } from '../common/utils/balance.util';

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

    const balanceAmount = balance ? (balance.balance as bigint) : 0n;
    return {
      balance: fromCentesimi(balanceAmount).toFixed(2),
    };
  }

  @Get('transactions')
  async getTransactions(
    @CurrentUser() userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 100;
    const skip = (pageNum - 1) * limitNum;
    const take = Math.min(limitNum, 100); // Max 100 per page

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.transaction.count({
        where: { userId },
      }),
    ]);

    return {
      transactions: transactions.map(t => {
        const metadata = t.metadata as any || {};
        return {
          id: t.id,
          type: t.type,
          amount: fromCentesimi(t.amount as bigint).toFixed(2),
          balanceBefore: fromCentesimi(t.balanceBefore as bigint).toFixed(2),
          balanceAfter: fromCentesimi(t.balanceAfter as bigint).toFixed(2),
          gameType: metadata.gameType || null,
          metadata: t.metadata,
          createdAt: t.createdAt,
        };
      }),
      pagination: {
        page: pageNum,
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    };
  }
}


