/**
 * Generate a sequential alphanumeric ID (base36: 0-9, A-Z)
 * Examples: 1, 2, ..., 9, A, B, ..., Z, 10, 11, ..., 19, 1A, 1B, ..., 1Z, 20, ...
 * Format: Uses base36 encoding (0-9, A-Z) in uppercase
 */
export function generateSequentialId(sequenceNumber: bigint): string {
  if (sequenceNumber <= 0n) {
    throw new Error('Sequence number must be positive');
  }

  // Convert to base36 (0-9, A-Z)
  let num = sequenceNumber;
  let result = '';
  const base = 36n;
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  while (num > 0n) {
    const remainder = Number(num % base);
    result = chars[remainder] + result;
    num = num / base; // BigInt division automatically truncates
  }

  return result || '1'; // Fallback to '1' if result is empty
}

/**
 * Get the next sequential ID for a transaction
 * This function should be called within a database transaction to ensure atomicity
 */
export async function getNextSequentialId(
  prisma: any, // PrismaClient or transaction client
): Promise<string> {
  // Get or create the sequence record (only one should exist)
  let sequence = await prisma.transactionSequence.findFirst({});

  let nextNumber: bigint;
  if (!sequence) {
    // First time: create with nextId = 1
    sequence = await prisma.transactionSequence.create({
      data: {
        id: 'default',
        nextId: 1n,
      },
    });
    nextNumber = 1n;
  } else {
    nextNumber = sequence.nextId as bigint;
  }

  // Increment for next use
  await prisma.transactionSequence.update({
    where: { id: sequence.id },
    data: {
      nextId: nextNumber + 1n,
    },
  });

  return generateSequentialId(nextNumber);
}




