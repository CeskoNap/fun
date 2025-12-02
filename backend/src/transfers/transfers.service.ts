import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import { TransactionType } from '@prisma/client';
import { getServerDay } from '../common/utils/server-time.util';
import { CreateTransferDto } from './dto/create-transfer.dto';

interface TransferLimitsConfig {
  maxTransfersPerDay: number;
  maxAmountPerDay: number;
}

interface TransferFeeConfig {
  feePercent: number; // e.g. 0.01 = 1%
  houseUserId?: string;
}

@Injectable()
export class TransfersService {
  constructor(private prisma: PrismaService) {}

  private async getLimitsConfig(): Promise<TransferLimitsConfig> {
    const cfg = await this.prisma.config.findUnique({
      where: { key: 'transfers.limits' },
    });
    if (!cfg) {
      return {
        maxTransfersPerDay: 10,
        maxAmountPerDay: 1_000_000,
      };
    }
    const value = cfg.value as any;
    return {
      maxTransfersPerDay: value.maxTransfersPerDay ?? 10,
      maxAmountPerDay: value.maxAmountPerDay ?? 1_000_000,
    };
  }

  private async getFeeConfig(): Promise<TransferFeeConfig> {
    const cfg = await this.prisma.config.findUnique({
      where: { key: 'transfers.fee' },
    });
    if (!cfg) {
      return {
        feePercent: 0,
      };
    }
    const value = cfg.value as any;
    return {
      feePercent: value.feePercent ?? 0,
      houseUserId: value.houseUserId,
    };
  }

  async createTransfer(
    fromUserId: string,
    dto: CreateTransferDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const { toUsername, amount } = dto;

    if (amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }

    const amountDec = new Decimal(amount);

    // Validate sender
    const sender = await this.prisma.user.findUnique({
      where: { id: fromUserId },
      include: {
        userLevel: true,
      },
    });

    if (!sender || !sender.isActive || sender.isBanned) {
      throw new BadRequestException('Sender not allowed');
    }

    if (!sender.userLevel || sender.userLevel.level < 10) {
      throw new BadRequestException('Level too low to transfer tokens');
    }

    // Validate recipient
    const recipient = await this.prisma.user.findUnique({
      where: { username: toUsername },
    });

    if (!recipient) {
      throw new NotFoundException('Recipient not found');
    }

    if (recipient.id === fromUserId) {
      throw new BadRequestException('Cannot transfer to yourself');
    }

    const serverDay = getServerDay();
    const limits = await this.getLimitsConfig();
    const feeCfg = await this.getFeeConfig();

    // Daily limits for sender
    const todayTransfers = await this.prisma.tokenTransfer.findMany({
      where: {
        fromUserId,
        day: serverDay,
      },
      select: { amount: true },
    });

    const transfersCount = todayTransfers.length;
    const amountSumToday = todayTransfers.reduce(
      (acc, t) => acc.add(t.amount),
      new Decimal(0),
    );

    if (transfersCount >= limits.maxTransfersPerDay) {
      throw new BadRequestException('Daily transfer count limit reached');
    }

    if (amountSumToday.add(amountDec).gt(new Decimal(limits.maxAmountPerDay))) {
      throw new BadRequestException('Daily transfer amount limit reached');
    }

    // Fee
    const feePercent = feeCfg.feePercent ?? 0;
    const feeAmount = feePercent > 0 ? amountDec.mul(feePercent) : new Decimal(0);
    const netAmount = amountDec.sub(feeAmount);

    if (netAmount.lte(0)) {
      throw new BadRequestException('Net amount must be positive');
    }

    // Atomic transaction: debit sender, credit recipient (+ optional house), log TokenTransfer
    const result = await this.prisma.$transaction(async (tx) => {
      // Check sender balance
      const balance = await tx.userBalance.findUnique({
        where: { userId: fromUserId },
      });
      if (!balance || balance.balance.lt(amountDec)) {
        throw new BadRequestException('Insufficient balance');
      }

      // Debit sender
      const senderBalanceAfter = balance.balance.sub(amountDec);

      const updatedSenderBalance = await tx.userBalance.update({
        where: { userId: fromUserId },
        data: {
          balance: senderBalanceAfter,
        },
      });

      await tx.transaction.create({
        data: {
          userId: fromUserId,
          type: TransactionType.TOKEN_TRANSFER_SENT,
          amount: amountDec.neg(),
          balanceBefore: balance.balance,
          balanceAfter: updatedSenderBalance.balance,
          metadata: {
            toUserId: recipient.id,
            toUsername,
          },
        },
      });

      // Credit recipient
      const recipientBalance = await tx.userBalance.findUnique({
        where: { userId: recipient.id },
      });
      if (!recipientBalance) {
        throw new Error('Recipient balance not found');
      }

      const recipientBalanceAfter = recipientBalance.balance.add(netAmount);
      const updatedRecipientBalance = await tx.userBalance.update({
        where: { userId: recipient.id },
        data: {
          balance: recipientBalanceAfter,
        },
      });

      await tx.transaction.create({
        data: {
          userId: recipient.id,
          type: TransactionType.TOKEN_TRANSFER_RECEIVED,
          amount: netAmount,
          balanceBefore: recipientBalance.balance,
          balanceAfter: updatedRecipientBalance.balance,
          metadata: {
            fromUserId,
            fromUsername: sender.username,
          },
        },
      });

      // Optional house fee
      if (feeAmount.gt(0) && feeCfg.houseUserId) {
        const houseBalance = await tx.userBalance.findUnique({
          where: { userId: feeCfg.houseUserId },
        });
        if (houseBalance) {
          const houseAfter = houseBalance.balance.add(feeAmount);
          await tx.userBalance.update({
            where: { userId: feeCfg.houseUserId },
            data: { balance: houseAfter },
          });
          await tx.transaction.create({
            data: {
              userId: feeCfg.houseUserId,
              type: TransactionType.ADMIN_ADJUSTMENT,
              amount: feeAmount,
              balanceBefore: houseBalance.balance,
              balanceAfter: houseAfter,
              metadata: {
                source: 'transfer_fee',
                fromUserId,
              },
            },
          });
        }
      }

      // Log TokenTransfer
      await tx.tokenTransfer.create({
        data: {
          fromUserId,
          toUserId: recipient.id,
          amount: amountDec,
          day: serverDay,
          ipAddress,
          userAgent,
        },
      });

      return {
        fromBalance: updatedSenderBalance.balance,
        toUsername,
        amount: amountDec,
        fee: feeAmount,
        netAmount,
      };
    });

    return {
      fromBalance: result.fromBalance.toString(),
      toUsername: result.toUsername,
      amount: result.amount.toString(),
      fee: result.fee.toString(),
      netAmount: result.netAmount.toString(),
    };
  }

  async getHistory(userId: string, direction: 'sent' | 'received' | 'all', limit: number) {
    const take = Math.min(limit || 20, 100);

    const where =
      direction === 'sent'
        ? { fromUserId: userId }
        : direction === 'received'
        ? { toUserId: userId }
        : {
            OR: [{ fromUserId: userId }, { toUserId: userId }],
          };

    const transfers = await this.prisma.tokenTransfer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      include: {
        fromUser: true,
        toUser: true,
      },
    });

    return transfers.map((t) => {
      const isSender = t.fromUserId === userId;
      return {
        id: t.id,
        direction: isSender ? 'sent' : 'received',
        username: isSender ? t.toUser.username : t.fromUser.username,
        amount: t.amount.toString(),
        day: t.day,
        createdAt: t.createdAt,
      };
    });
  }
}


