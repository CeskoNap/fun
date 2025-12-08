import { Test, TestingModule } from '@nestjs/testing';
import { LevelsService } from './levels.service';
import { PrismaService } from '../prisma/prisma.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { Decimal } from '@prisma/client/runtime/library';
import { GameType } from '@prisma/client';

describe('LevelsService', () => {
  let service: LevelsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    xpConfig: {
      findFirst: jest.fn(),
    },
    levelConfig: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    userLevel: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    xpLog: {
      create: jest.fn(),
    },
    levelUpReward: {
      create: jest.fn(),
    },
    transaction: {
      create: jest.fn(),
    },
    userBalance: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockWebsocketGateway = {
    emitToUser: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LevelsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: WebsocketGateway,
          useValue: mockWebsocketGateway,
        },
      ],
    }).compile();

    service = module.get<LevelsService>(LevelsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateXPFromBet', () => {
    it('should calculate XP correctly with default multipliers', async () => {
      mockPrismaService.xpConfig.findFirst.mockResolvedValue({
        id: '1',
        baseXpRate: new Decimal(0.01),
        globalXpMultiplier: new Decimal(1.0),
        gameMultipliers: { MINES: 1.0, PLINKO: 1.0 },
        updatedAt: new Date(),
        updatedBy: null,
      });

      const betAmount = 1000;
      const xp = await service.calculateXPFromBet(betAmount, GameType.MINES);

      // XP = 1000 * 1.0 * 0.01 * 1.0 = 10
      expect(xp.toNumber()).toBe(10);
    });

    it('should apply global multiplier correctly', async () => {
      mockPrismaService.xpConfig.findFirst.mockResolvedValue({
        id: '1',
        baseXpRate: new Decimal(0.01),
        globalXpMultiplier: new Decimal(2.0), // Double XP event
        gameMultipliers: { MINES: 1.0 },
        updatedAt: new Date(),
        updatedBy: null,
      });

      const betAmount = 1000;
      const xp = await service.calculateXPFromBet(betAmount, GameType.MINES);

      // XP = 1000 * 1.0 * 0.01 * 2.0 = 20
      expect(xp.toNumber()).toBe(20);
    });

    it('should apply game-specific multiplier', async () => {
      mockPrismaService.xpConfig.findFirst.mockResolvedValue({
        id: '1',
        baseXpRate: new Decimal(0.01),
        globalXpMultiplier: new Decimal(1.0),
        gameMultipliers: { MINES: 1.5 }, // Mines gives 1.5x XP
        updatedAt: new Date(),
        updatedBy: null,
      });

      const betAmount = 1000;
      const xp = await service.calculateXPFromBet(betAmount, GameType.MINES);

      // XP = 1000 * 1.5 * 0.01 * 1.0 = 15
      expect(xp.toNumber()).toBe(15);
    });
  });

  describe('calculateLevelFromXP', () => {
    it('should return level 1 for 0 XP', async () => {
      mockPrismaService.levelConfig.findUnique.mockResolvedValue(null);

      const level = await service.calculateLevelFromXP(new Decimal(0));
      expect(level).toBe(1);
    });

    it('should calculate level correctly from cumulative XP', async () => {
      // Mock level configs
      mockPrismaService.levelConfig.findUnique
        .mockResolvedValueOnce({ xpRequired: new Decimal(500) }) // Level 2
        .mockResolvedValueOnce({ xpRequired: new Decimal(1000) }) // Level 3
        .mockResolvedValueOnce({ xpRequired: new Decimal(2000) }) // Level 4
        .mockResolvedValueOnce(null); // No more levels

      const level = await service.calculateLevelFromXP(new Decimal(1500));
      expect(level).toBe(3); // Should be level 3 (1500 >= 1000, but < 2000)
    });
  });

  describe('addXpForUser', () => {
    it('should add XP and update level', async () => {
      // Mock XP config
      mockPrismaService.xpConfig.findFirst.mockResolvedValue({
        id: '1',
        baseXpRate: new Decimal(0.01),
        globalXpMultiplier: new Decimal(1.0),
        gameMultipliers: {},
        updatedAt: new Date(),
        updatedBy: null,
      });

      // Mock user level
      mockPrismaService.userLevel.findUnique.mockResolvedValue({
        userId: 'user1',
        level: 1,
        xp: new Decimal(0),
        totalXpEarned: new Decimal(0),
        xpToNextLevel: null,
      });

      // Mock level configs
      mockPrismaService.levelConfig.findUnique
        .mockResolvedValueOnce({ xpRequired: new Decimal(500), reward: new Decimal(1000) }) // Level 2
        .mockResolvedValueOnce({ xpRequired: new Decimal(1000), reward: null }) // Level 3
        .mockResolvedValueOnce(null); // No more levels

      // Mock balance update
      mockPrismaService.userBalance.findUnique.mockResolvedValue({
        userId: 'user1',
        balance: new Decimal(1000),
        lockedBalance: new Decimal(0),
        version: 0,
      });

      mockPrismaService.userBalance.update.mockResolvedValue({
        userId: 'user1',
        balance: new Decimal(2000),
        version: 1,
      });

      mockPrismaService.transaction.create.mockResolvedValue({ id: 'tx1' });
      mockPrismaService.levelUpReward.create.mockResolvedValue({ id: 'reward1' });
      mockPrismaService.xpLog.create.mockResolvedValue({ id: 'log1' });
      mockPrismaService.userLevel.update.mockResolvedValue({
        userId: 'user1',
        level: 2,
        xp: new Decimal(500),
        totalXpEarned: new Decimal(500),
      });

      const result = await service.addXpForUser('user1', new Decimal(500), 'bet', 'bet1');

      expect(result.newLevel).toBe(2);
      expect(result.levelsGained).toBe(1);
      expect(result.levelUpRewards).toHaveLength(1);
      expect(result.levelUpRewards[0].level).toBe(2);
      expect(mockWebsocketGateway.emitToUser).toHaveBeenCalledWith(
        'user1',
        'level:up',
        expect.objectContaining({
          oldLevel: 1,
          newLevel: 2,
        }),
      );
    });

    it('should handle multiple level jumps correctly', async () => {
      // Mock user at level 1 with 0 XP
      mockPrismaService.userLevel.findUnique.mockResolvedValue({
        userId: 'user1',
        level: 1,
        xp: new Decimal(0),
        totalXpEarned: new Decimal(0),
        xpToNextLevel: null,
      });

      // Mock level configs for levels 2, 3, 4
      mockPrismaService.levelConfig.findUnique
        .mockResolvedValueOnce({ xpRequired: new Decimal(500), reward: new Decimal(100) })
        .mockResolvedValueOnce({ xpRequired: new Decimal(1000), reward: new Decimal(200) })
        .mockResolvedValueOnce({ xpRequired: new Decimal(2000), reward: null })
        .mockResolvedValueOnce(null);

      mockPrismaService.userBalance.findUnique.mockResolvedValue({
        userId: 'user1',
        balance: new Decimal(1000),
        version: 0,
      });

      mockPrismaService.userBalance.update.mockResolvedValue({
        userId: 'user1',
        balance: new Decimal(1300), // 1000 + 100 + 200
        version: 1,
      });

      mockPrismaService.transaction.create.mockResolvedValue({ id: 'tx1' });
      mockPrismaService.levelUpReward.create.mockResolvedValue({ id: 'reward1' });
      mockPrismaService.xpLog.create.mockResolvedValue({ id: 'log1' });
      mockPrismaService.userLevel.update.mockResolvedValue({
        userId: 'user1',
        level: 3,
        xp: new Decimal(1500),
        totalXpEarned: new Decimal(1500),
      });

      // Add 1500 XP (should jump from level 1 to 3)
      const result = await service.addXpForUser('user1', new Decimal(1500), 'bet', 'bet1');

      expect(result.newLevel).toBe(3);
      expect(result.levelsGained).toBe(2);
      expect(result.levelUpRewards).toHaveLength(2); // Rewards for level 2 and 3
    });
  });
});

