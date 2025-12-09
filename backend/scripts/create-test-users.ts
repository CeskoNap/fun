import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const users = [
    { username: 'test1', email: 'test1@test.com', password: 'test123' },
    { username: 'test2', email: 'test2@test.com', password: 'test123' },
    { username: 'test3', email: 'test3@test.com', password: 'test123' },
    { username: 'test4', email: 'test4@test.com', password: 'test123' },
    { username: 'test5', email: 'test5@test.com', password: 'test123' },
  ];

  console.log('Creating test users...');

  for (const userData of users) {
    try {
      // Check if user already exists
      const existing = await prisma.user.findUnique({
        where: { username: userData.username },
      });

      if (existing) {
        console.log(`User ${userData.username} already exists, skipping...`);
        continue;
      }

      // Hash password
      const passwordHash = await bcrypt.hash(userData.password, 10);

      // Create user
      const user = await prisma.user.create({
        data: {
          username: userData.username,
          email: userData.email,
          passwordHash,
          isActive: true,
          ageConfirmed: true,
          ageConfirmedAt: new Date(),
        },
      });

      // Create user balance with initial balance
      await prisma.userBalance.create({
        data: {
          userId: user.id,
          balance: BigInt(1000000), // 10,000 FUN (in centesimi)
        },
      });

      // Create user level
      await prisma.userLevel.create({
        data: {
          userId: user.id,
          level: 1,
          xp: new Decimal(0),
          totalXpEarned: new Decimal(0),
        },
      });

      console.log(`✅ Created user: ${userData.username} (ID: ${user.id})`);
    } catch (error: any) {
      console.error(`❌ Error creating user ${userData.username}:`, error.message);
    }
  }

  console.log('\n✅ Test users creation completed!');
  console.log('\nLogin credentials:');
  console.log('Username: test1, test2, test3, test4, or test5');
  console.log('Password: test123');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

