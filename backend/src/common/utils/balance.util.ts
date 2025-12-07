import { PrismaService } from '../../prisma/prisma.service';
import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { TransactionType } from '@prisma/client';

export interface BalanceUpdateResult {
  balanceBefore: bigint;
  balanceAfter: bigint;
  transactionId: string;
}

// Type for Prisma client (either PrismaService or transaction client)
type PrismaClientLike = Pick<PrismaService, 'userBalance' | 'transaction'>;

/**
 * Atomically update user balance with transaction logging
 * Uses optimistic locking via version field
 * Note: Balance is now stored as BigInt (no decimals)
 */
export async function updateUserBalance(
  prisma: PrismaClientLike,
  userId: string,
  amount: bigint | number, // Positive for credit, negative for debit (as integer, no decimals)
  transactionType: TransactionType,
  metadata?: Record<string, any>,
  maxRetries: number = 3
): Promise<BalanceUpdateResult> {
  let retries = 0;
  const amountBigInt = typeof amount === 'number' ? BigInt(Math.round(amount)) : amount;
  
  while (retries < maxRetries) {
    try {
      // Get current balance with version
      const balance = await prisma.userBalance.findUnique({
        where: { userId },
      });

      if (!balance) {
        throw new Error(`User balance not found for userId: ${userId}`);
      }

      const balanceBefore = balance.balance as bigint;
      const balanceAfter = balanceBefore + amountBigInt;

      // Validate balance doesn't go negative (except for admin adjustments)
      if (balanceAfter < 0n && transactionType !== 'ADMIN_ADJUSTMENT') {
        throw new Error(`Insufficient balance. Current: ${balanceBefore}, Required: ${amountBigInt < 0n ? -amountBigInt : amountBigInt}`);
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
          amount: amountBigInt,
          balanceBefore,
          balanceAfter: updated.balance as bigint,
          metadata: metadata || {},
        },
      });

      return {
        balanceBefore,
        balanceAfter: updated.balance as bigint,
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

