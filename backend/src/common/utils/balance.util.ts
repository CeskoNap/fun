import { PrismaService } from '../../prisma/prisma.service';
import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { TransactionType } from '@prisma/client';

export interface BalanceUpdateResult {
  balanceBefore: Decimal;
  balanceAfter: Decimal;
  transactionId: string;
}

// Type for Prisma client (either PrismaService or transaction client)
type PrismaClientLike = Pick<PrismaService, 'userBalance' | 'transaction'>;

/**
 * Atomically update user balance with transaction logging
 * Uses optimistic locking via version field
 */
export async function updateUserBalance(
  prisma: PrismaClientLike,
  userId: string,
  amount: Decimal, // Positive for credit, negative for debit
  transactionType: TransactionType,
  metadata?: Record<string, any>,
  maxRetries: number = 3
): Promise<BalanceUpdateResult> {
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      // Get current balance with version
      const balance = await prisma.userBalance.findUnique({
        where: { userId },
      });

      if (!balance) {
        throw new Error(`User balance not found for userId: ${userId}`);
      }

      const balanceBefore = balance.balance;
      const balanceAfter = balanceBefore.add(amount);

      // Validate balance doesn't go negative (except for admin adjustments)
      if (balanceAfter.lessThan(0) && transactionType !== 'ADMIN_ADJUSTMENT') {
        throw new Error(`Insufficient balance. Current: ${balanceBefore}, Required: ${amount.abs()}`);
      }

      // Update balance with optimistic locking
      const updated = await prisma.userBalance.update({
        where: {
          userId,
          version: balance.version, // Optimistic lock
        },
        data: {
          balance: balanceAfter,
          version: balance.version + 1,
        },
      });

      // Create transaction log
      const transaction = await prisma.transaction.create({
        data: {
          userId,
          type: transactionType,
          amount,
          balanceBefore,
          balanceAfter,
          metadata: metadata || {},
        },
      });

      return {
        balanceBefore,
        balanceAfter: updated.balance,
        transactionId: transaction.id,
      };
    } catch (error: any) {
      // If version mismatch (optimistic lock failed), retry
      if (error.code === 'P2025' && retries < maxRetries - 1) {
        retries++;
        // Small delay before retry
        await new Promise(resolve => setTimeout(resolve, 50));
        continue;
      }
      throw error;
    }
  }

  throw new Error(`Failed to update balance after ${maxRetries} retries`);
}

