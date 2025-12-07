import { PrismaClient, GameType, MissionType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

// Helper function to convert decimal to BigInt (for 2 decimal places)
function toCentesimi(amount: number): bigint {
  return BigInt(Math.round(amount * 100));
}

async function main() {
  console.log('🌱 Starting database seed...');

  // ============================================
  // 1. GAMES
  // ============================================
  console.log('📦 Seeding Games...');
  
  const games = [
    {
      type: GameType.MINES,
      name: 'Mines',
      isActive: true,
      houseEdge: new Decimal('0.0200'), // 2%
      minBet: toCentesimi(1.00), // 1.00 FUN
      maxBet: toCentesimi(100000.00), // 100,000 FUN
      config: {
        minMines: 1,
        maxMines: 24,
        defaultRows: 5,
        defaultCols: 5,
      },
    },
    {
      type: GameType.PLINKO,
      name: 'Plinko',
      isActive: true,
      houseEdge: new Decimal('0.0150'), // 1.5%
      minBet: toCentesimi(1.00),
      maxBet: toCentesimi(100000.00),
      config: {
        minRows: 8,
        maxRows: 16,
        defaultRows: 12,
        riskLevels: ['low', 'medium', 'high'],
      },
    },
    {
      type: GameType.CRASH,
      name: 'Crash',
      isActive: true,
      houseEdge: new Decimal('0.0100'), // 1%
      minBet: toCentesimi(1.00),
      maxBet: toCentesimi(100000.00),
      config: {
        autoCashoutEnabled: true,
        minMultiplier: 1.0,
        maxMultiplier: 10000.0,
      },
    },
    {
      type: GameType.DICE,
      name: 'Dice',
      isActive: true,
      houseEdge: new Decimal('0.0200'), // 2%
      minBet: toCentesimi(1.00),
      maxBet: toCentesimi(100000.00),
      config: {
        minWinChance: 1,
        maxWinChance: 98,
      },
    },
  ];

  for (const game of games) {
    await prisma.game.upsert({
      where: { type: game.type },
      update: {
        name: game.name,
        isActive: game.isActive,
        houseEdge: game.houseEdge,
        minBet: game.minBet as any,
        maxBet: game.maxBet as any,
        config: game.config,
      },
      create: game as any,
    });
    console.log(`  ✓ ${game.name}`);
  }

  // ============================================
  // 2. XP CONFIG
  // ============================================
  console.log('⚡ Seeding XP Config...');
  
  const xpConfig = await prisma.xpConfig.upsert({
    where: { id: 'xp-config-1' },
    update: {},
    create: {
      id: 'xp-config-1',
      baseXpRate: new Decimal('0.01'), // 1 XP per 100 FUN
      globalXpMultiplier: new Decimal('1.0'), // Normal speed
      gameMultipliers: {
        MINES: 1.0,
        PLINKO: 1.0,
        CRASH: 1.2,
        DICE: 0.8,
      },
    },
  });
  console.log('  ✓ XP Config created');

  // ============================================
  // 3. LEVEL CONFIG (Levels 1-100)
  // ============================================
  console.log('📊 Seeding Level Configs...');
  
  // Formula: XP required = 100 * level^1.5 (rounded)
  // Rewards: Every 10 levels, with increasing amounts
  const levelConfigs = [];
  
  for (let level = 1; level <= 100; level++) {
    const xpRequired = Math.round(100 * Math.pow(level, 1.5));
    let reward: bigint | null = null;
    
    // Give rewards every 10 levels
    if (level % 10 === 0) {
      reward = toCentesimi(100 * level); // 100 * level FUN
    }
    
    levelConfigs.push({
      level,
      xpRequired: new Decimal(xpRequired.toString()),
      reward,
    });
  }

  for (const config of levelConfigs) {
    await prisma.levelConfig.upsert({
      where: { level: config.level },
      update: config,
      create: config,
    });
  }
  console.log(`  ✓ Created ${levelConfigs.length} level configs`);

  // ============================================
  // 4. REWARD CONFIG
  // ============================================
  console.log('🎁 Seeding Reward Configs...');
  
  // Daily Reward
  await prisma.rewardConfig.upsert({
    where: { type: 'daily' },
    update: {},
    create: {
      type: 'daily',
      config: {
        baseReward: 50, // 50 FUN base
        levelMultiplier: 5, // +5 FUN per level
        minDailyReward: 50, // Minimum 50 FUN
        maxDailyReward: 5000, // Maximum 5000 FUN
      },
    },
  });
  console.log('  ✓ Daily reward config');

  // Faucet Reward
  await prisma.rewardConfig.upsert({
    where: { type: 'faucet' },
    update: {},
    create: {
      type: 'faucet',
      config: {
        baseFaucet: 10, // 10 FUN base
        faucetMultiplier: 0.5, // +0.5 FUN per level
        minFaucet: 10, // Minimum 10 FUN
        maxFaucet: 500, // Maximum 500 FUN
        cooldownHours: 1, // 1 hour cooldown
      },
    },
  });
  console.log('  ✓ Faucet reward config');

  // Quiz Reward
  await prisma.rewardConfig.upsert({
    where: { type: 'quiz' },
    update: {},
    create: {
      type: 'quiz',
      config: {
        questionsPerQuiz: 3,
        baseReward: 50, // 50 FUN for 3/3 correct
        rewardPerCorrect: 16.67, // ~16.67 FUN per correct answer
        minReward: 10, // Minimum 10 FUN for 1 correct
        maxReward: 100, // Maximum 100 FUN for 3/3 correct
      },
    },
  });
  console.log('  ✓ Quiz reward config');

  // Streak Reward
  await prisma.rewardConfig.upsert({
    where: { type: 'streak' },
    update: {},
    create: {
      type: 'streak',
      config: {
        streakMultipliers: {
          1: 1.0, // Day 1: base
          2: 1.1, // Day 2: +10%
          3: 1.2, // Day 3: +20%
          7: 1.5, // Day 7: +50%
          14: 2.0, // Day 14: +100%
          30: 3.0, // Day 30: +200%
        },
        maxStreakBonus: 3.0, // Maximum 3x bonus
      },
    },
  });
  console.log('  ✓ Streak reward config');

  // ============================================
  // 5. AD REWARD CONFIG
  // ============================================
  console.log('📺 Seeding Ad Reward Config...');
  
  const adRewardAmount = toCentesimi(50.00); // 50 FUN per ad
  await prisma.adRewardConfig.upsert({
    where: { id: 'ad-config-1' },
    update: {
      rewardAmount: adRewardAmount as any,
      adsPerHourLimit: 5,
      dailyAdsCap: 30,
      isActive: true,
    },
    create: {
      id: 'ad-config-1',
      rewardAmount: adRewardAmount as any,
      adsPerHourLimit: 5,
      dailyAdsCap: 30,
      isActive: true,
    },
  });
  console.log('  ✓ Ad reward config');

  // ============================================
  // 6. WHEEL CONFIG
  // ============================================
  console.log('🎰 Seeding Wheel Config...');
  
  await prisma.wheelConfig.upsert({
    where: { name: 'default' },
    update: {},
    create: {
      name: 'default',
      isActive: true,
      segments: [
        { rewardType: 'token', amount: 50, probability: 0.25 },
        { rewardType: 'token', amount: 100, probability: 0.25 },
        { rewardType: 'token', amount: 200, probability: 0.125 },
        { rewardType: 'token', amount: 500, probability: 0.125 },
        { rewardType: 'token', amount: 1000, probability: 0.125 },
        { rewardType: 'xp', amount: 100, probability: 0.125 },
        { rewardType: 'none', probability: 0.025 },
      ],
    },
  });
  console.log('  ✓ Wheel config');

  // ============================================
  // 7. RACE CONFIG
  // ============================================
  console.log('🏁 Seeding Race Config...');
  
  const raceEntryFee = toCentesimi(100.00); // 100 FUN entry fee
  await prisma.raceConfig.upsert({
    where: { name: 'default' },
    update: {
      entryFee: raceEntryFee as any,
      isActive: true,
      prizeDistribution: {
        tiers: [
          { rankStart: 1, rankEnd: 1, percentage: 20 },
          { rankStart: 2, rankEnd: 2, percentage: 15 },
          { rankStart: 3, rankEnd: 3, percentage: 10 },
          { rankStart: 4, rankEnd: 10, percentage: 25 },
          { rankStart: 11, rankEnd: 50, percentage: 20 },
          { rankStart: 51, rankEnd: 100, percentage: 10 },
        ],
        topPercentageWinners: 25, // Top 25% of participants win
      },
    },
    create: {
      name: 'default',
      entryFee: raceEntryFee as any,
      isActive: true,
      prizeDistribution: {
        tiers: [
          { rankStart: 1, rankEnd: 1, percentage: 20 },
          { rankStart: 2, rankEnd: 2, percentage: 15 },
          { rankStart: 3, rankEnd: 3, percentage: 10 },
          { rankStart: 4, rankEnd: 10, percentage: 25 },
          { rankStart: 11, rankEnd: 50, percentage: 20 },
          { rankStart: 51, rankEnd: 100, percentage: 10 },
        ],
        topPercentageWinners: 25, // Top 25% of participants win
      },
    },
  });
  console.log('  ✓ Race config');

  // ============================================
  // 8. CONFIG (System-wide settings)
  // ============================================
  console.log('⚙️  Seeding System Config...');
  
  const systemConfigs = [
    {
      key: 'system.initial_bonus',
      value: 1000, // 1000 FUN for new users
      category: 'system',
    },
    {
      key: 'transfer.min_level',
      value: 10, // Minimum level 10 to transfer tokens
      category: 'transfer',
    },
    {
      key: 'transfer.daily_limit',
      value: 10000, // 10,000 FUN daily transfer limit
      category: 'transfer',
    },
    {
      key: 'game.house_edge.mines',
      value: 0.02, // 2% house edge for Mines
      category: 'game',
    },
    {
      key: 'game.house_edge.plinko',
      value: 0.015, // 1.5% house edge for Plinko
      category: 'game',
    },
  ];

  for (const config of systemConfigs) {
    await prisma.config.upsert({
      where: { key: config.key },
      update: config,
      create: config,
    });
  }
  console.log(`  ✓ Created ${systemConfigs.length} system configs`);

  // ============================================
  // 9. FEATURE FLAGS
  // ============================================
  console.log('🚩 Seeding Feature Flags...');
  
  const featureFlags = [
    {
      name: 'daily_rewards',
      enabled: true,
      config: {},
    },
    {
      name: 'faucet',
      enabled: true,
      config: {},
    },
    {
      name: 'quiz',
      enabled: true,
      config: {},
    },
    {
      name: 'wheel',
      enabled: true,
      config: {},
    },
    {
      name: 'races',
      enabled: true,
      config: {},
    },
    {
      name: 'missions',
      enabled: true,
      config: {},
    },
    {
      name: 'token_transfers',
      enabled: true,
      config: {
        minLevel: 10,
      },
    },
  ];

  for (const flag of featureFlags) {
    await prisma.featureFlag.upsert({
      where: { name: flag.name },
      update: flag,
      create: flag,
    });
  }
  console.log(`  ✓ Created ${featureFlags.length} feature flags`);

  console.log('\n✅ Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

