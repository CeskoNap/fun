import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RacesService } from '../races/races.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { CurrentUser } from '../common/decorators/user.decorator';
import { RaceStatus } from '@prisma/client';

@Controller('admin/races')
@UseGuards(AuthGuard, AdminGuard)
export class AdminRacesController {
  constructor(
    private prisma: PrismaService,
    private racesService: RacesService,
  ) {}

  @Get()
  async listRaces() {
    // Check and activate/end races automatically when listing
    const now = new Date();
    await this.racesService.activateDueRaces(now);
    await this.racesService.endDueRaces(now);
    
    const races = await this.prisma.race.findMany({
      orderBy: { startsAt: 'desc' },
    });
    
    // Convert BigInt fields to strings for JSON serialization
    return races.map(race => ({
      ...race,
      entryFee: race.entryFee.toString(),
      prizePool: race.prizePool.toString(),
    }));
  }

  @Post()
  async createRace(
    @CurrentUser() adminId: string,
    @Body()
    body: {
      name: string;
      description?: string;
      gameType?: string | null;
      startsAt: string;
      endsAt: string;
      raceConfigName?: string;
      entryFee?: number; // Entry fee in centesimi (optional, defaults to config or 100)
      prizePool?: number; // Prize pool in centesimi (required)
    },
  ) {
    // Detailed date validation
    const startsAt = new Date(body.startsAt);
    const endsAt = new Date(body.endsAt);
    const now = new Date();

    // Check if dates are valid
    if (isNaN(startsAt.getTime())) {
      throw new BadRequestException('Invalid start date format. Expected ISO 8601 format.');
    }

    if (isNaN(endsAt.getTime())) {
      throw new BadRequestException('Invalid end date format. Expected ISO 8601 format.');
    }

    // Check if start date is in the future (at least 1 minute from now)
    const oneMinuteFromNow = new Date(now.getTime() + 60000);
    if (startsAt < oneMinuteFromNow) {
      throw new BadRequestException('Start date must be at least 1 minute in the future.');
    }

    // Check if end date is after start date
    if (endsAt <= startsAt) {
      throw new BadRequestException('End date must be after start date.');
    }

    // Check minimum duration (at least 1 hour)
    const minDuration = 60 * 60 * 1000; // 1 hour in milliseconds
    if (endsAt.getTime() - startsAt.getTime() < minDuration) {
      throw new BadRequestException('The race must last at least 1 hour.');
    }

    // Validate gameType if provided
    if (body.gameType && !['MINES', 'PLINKO', 'CRASH', 'DICE'].includes(body.gameType)) {
      throw new BadRequestException(`Invalid gameType. Must be one of: MINES, PLINKO, CRASH, DICE, or null for all games.`);
    }

    const cfg = body.raceConfigName
      ? await this.prisma.raceConfig.findUnique({
          where: { name: body.raceConfigName },
        })
      : null;

    // Determine entry fee: use provided value, or config, or default to 100 FUN
    let entryFee: bigint;
    if (body.entryFee !== undefined) {
      // Entry fee provided in centesimi
      if (body.entryFee < 0 || !Number.isInteger(body.entryFee)) {
        throw new BadRequestException('Entry fee must be a non-negative integer (in centesimi).');
      }
      entryFee = BigInt(body.entryFee);
    } else if (cfg?.entryFee) {
      entryFee = cfg.entryFee as bigint;
    } else {
      entryFee = 100n; // Default: 100 FUN (10000 centesimi)
    }

    // Validate and set prize pool: must be provided and positive
    let prizePool: bigint;
    if (body.prizePool === undefined || body.prizePool === null) {
      throw new BadRequestException('Prize pool is required and must be a positive number (in centesimi).');
    }
    if (body.prizePool < 0 || !Number.isInteger(body.prizePool)) {
      throw new BadRequestException('Prize pool must be a non-negative integer (in centesimi).');
    }
    prizePool = BigInt(body.prizePool);

    // Create race with validated dates
    const race = await this.prisma.race.create({
      data: {
        name: body.name,
        description: body.description,
        gameType: (body.gameType as any) ?? null,
        status: RaceStatus.UPCOMING,
        entryFee: entryFee,
        startsAt: startsAt, // Already validated Date object
        endsAt: endsAt, // Already validated Date object
        prizePool: prizePool,
        config: {}, // Required field
      } as any, // Type assertion to handle Prisma type checking
    });

    await this.prisma.adminActionLog.create({
      data: {
        adminId,
        action: 'create_race',
        details: { raceId: race.id },
      },
    });

    // Convert BigInt fields to strings for JSON serialization
    return {
      ...race,
      entryFee: race.entryFee.toString(),
      prizePool: race.prizePool.toString(),
    };
  }

  @Put(':id')
  async updateRace(
    @CurrentUser() adminId: string,
    @Param('id') raceId: string,
    @Body() body: any,
  ) {
    const race = await this.prisma.race.findUnique({ where: { id: raceId } });
    if (!race) throw new NotFoundException('Race not found');
    if (race.status !== RaceStatus.UPCOMING) {
      throw new BadRequestException('Only UPCOMING races can be modified');
    }

    const updated = await this.prisma.race.update({
      where: { id: raceId },
      data: {
        name: body.name ?? race.name,
        description: body.description ?? race.description,
        startsAt: body.startsAt ? new Date(body.startsAt) : race.startsAt,
        endsAt: body.endsAt ? new Date(body.endsAt) : race.endsAt,
      },
    });

    await this.prisma.adminActionLog.create({
      data: {
        adminId,
        action: 'update_race',
        details: { raceId },
      },
    });

    // Convert BigInt fields to strings for JSON serialization
    return {
      ...updated,
      entryFee: updated.entryFee.toString(),
      prizePool: updated.prizePool.toString(),
    };
  }

  @Post(':id/activate')
  async activateRace(@CurrentUser() adminId: string, @Param('id') raceId: string) {
    const race = await this.prisma.race.update({
      where: { id: raceId },
      data: { status: RaceStatus.ACTIVE },
    });

    await this.prisma.adminActionLog.create({
      data: {
        adminId,
        action: 'activate_race',
        details: { raceId },
      },
    });

    // Convert BigInt fields to strings for JSON serialization
    return {
      ...race,
      entryFee: race.entryFee.toString(),
      prizePool: race.prizePool.toString(),
    };
  }

  @Post(':id/cancel')
  async cancelRace(@CurrentUser() adminId: string, @Param('id') raceId: string) {
    const race = await this.prisma.race.update({
      where: { id: raceId },
      data: { status: RaceStatus.CANCELLED },
    });

    await this.prisma.adminActionLog.create({
      data: {
        adminId,
        action: 'cancel_race',
        details: { raceId },
      },
    });

    // Convert BigInt fields to strings for JSON serialization
    return {
      ...race,
      entryFee: race.entryFee.toString(),
      prizePool: race.prizePool.toString(),
    };
  }

  @Delete(':id')
  async deleteRace(@CurrentUser() adminId: string, @Param('id') raceId: string) {
    const race = await this.prisma.race.findUnique({
      where: { id: raceId },
    });

    if (!race) {
      throw new NotFoundException('Race not found');
    }

    // Only allow deletion of UPCOMING or CANCELLED races
    if (race.status === RaceStatus.ACTIVE) {
      throw new BadRequestException('Cannot delete an active race. Cancel it first.');
    }

    await this.prisma.race.delete({
      where: { id: raceId },
    });

    await this.prisma.adminActionLog.create({
      data: {
        adminId,
        action: 'delete_race',
        details: { raceId },
      },
    });

    return { message: 'Race deleted successfully' };
  }

  @Put(':id/dates')
  async updateRaceDates(
    @CurrentUser() adminId: string,
    @Param('id') raceId: string,
    @Body() body: { startsAt?: string; endsAt?: string; prizePool?: number },
  ) {
    const race = await this.prisma.race.findUnique({
      where: { id: raceId },
    });

    if (!race) {
      throw new NotFoundException('Race not found');
    }

    const wantsPrizePoolUpdate = body.prizePool !== undefined && body.prizePool !== null;
    const wantsStartUpdate = body.startsAt !== undefined;
    const wantsEndUpdate = body.endsAt !== undefined;

    // Only allow date updates for UPCOMING races.
    // Allow prize pool updates for ACTIVE races as long as dates are not modified.
    const isPrizeOnlyUpdate = wantsPrizePoolUpdate && !wantsStartUpdate && !wantsEndUpdate;
    const isAllowedForActive = race.status === RaceStatus.ACTIVE && isPrizeOnlyUpdate;
    if (race.status !== RaceStatus.UPCOMING && !isAllowedForActive) {
      throw new BadRequestException('Can only update dates for UPCOMING races. Prize pool can be updated for ACTIVE races only if dates are unchanged.');
    }

    const updateData: any = {};
    const now = new Date();
    let startsAt = race.startsAt;
    let endsAt = race.endsAt;

    if (body.startsAt) {
      startsAt = new Date(body.startsAt);
      if (isNaN(startsAt.getTime())) {
        throw new BadRequestException('Invalid start date format. Expected ISO 8601 format.');
      }
      // For updates, allow past dates if race hasn't started yet
      // But if race is already past, require future date
      if (race.startsAt < now && startsAt < now) {
        throw new BadRequestException('Cannot set start date in the past for an already scheduled race.');
      }
      updateData.startsAt = startsAt;
    }

    if (body.endsAt) {
      endsAt = new Date(body.endsAt);
      if (isNaN(endsAt.getTime())) {
        throw new BadRequestException('Invalid end date format. Expected ISO 8601 format.');
      }
      updateData.endsAt = endsAt;
    }

    if (body.prizePool !== undefined && body.prizePool !== null) {
      // Prize pool provided in centesimi
      if (body.prizePool < 0 || !Number.isInteger(body.prizePool)) {
        throw new BadRequestException('Prize pool must be a non-negative integer (in centesimi).');
      }
      updateData.prizePool = BigInt(body.prizePool);
    }

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('No fields provided to update');
    }

    // Validate that end date is after start date
    if (endsAt <= startsAt) {
      throw new BadRequestException('End date must be after start date.');
    }

    // Check minimum duration (at least 1 hour)
    const minDuration = 60 * 60 * 1000; // 1 hour in milliseconds
    if (endsAt.getTime() - startsAt.getTime() < minDuration) {
      throw new BadRequestException('The race must last at least 1 hour.');
    }

    const updated = await this.prisma.race.update({
      where: { id: raceId },
      data: updateData,
    });

    await this.prisma.adminActionLog.create({
      data: {
        adminId,
        action: 'update_race_dates',
        details: { raceId, ...updateData },
      },
    });

    return {
      ...updated,
      entryFee: updated.entryFee.toString(),
      prizePool: updated.prizePool.toString(),
    };
  }

  @Get(':id/participants')
  async getParticipants(@Param('id') raceId: string) {
    const participants = await this.prisma.raceParticipant.findMany({
      where: { raceId },
      orderBy: { volume: 'desc' },
      include: { user: true },
    });

    return participants.map((p) => ({
      id: p.id,
      userId: p.userId,
      username: p.user.username,
      volume: (p.volume as bigint).toString(),
      xpEarned: p.xpEarned.toString(),
      joinedAt: p.joinedAt,
      rank: p.rank,
      prize: p.prize ? (p.prize as bigint).toString() : null,
    }));
  }

  @Post(':id/participants')
  async addParticipant(
    @CurrentUser() adminId: string,
    @Param('id') raceId: string,
    @Body() body: { username: string; volume?: string },
  ) {
    const race = await this.prisma.race.findUnique({
      where: { id: raceId },
    });

    if (!race) {
      throw new NotFoundException('Race not found');
    }

    // Find user by username (case-insensitive)
    const user = await this.prisma.user.findFirst({
      where: {
        username: {
          equals: body.username,
          mode: 'insensitive',
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with username "${body.username}" not found`);
    }

    const volume = body.volume ? BigInt(Math.round(parseFloat(body.volume) * 100)) : 0n;

    const existing = await this.prisma.raceParticipant.findUnique({
      where: {
        raceId_userId: {
          raceId,
          userId: user.id,
        },
      },
    });

    if (existing) {
      // Update existing participant
      const updated = await this.prisma.raceParticipant.update({
        where: { id: existing.id },
        data: { volume },
      });

      await this.prisma.adminActionLog.create({
        data: {
          adminId,
          action: 'update_participant',
          details: { raceId, userId: user.id, username: body.username, volume: volume.toString() },
        },
      });

      return {
        ...updated,
        volume: (updated.volume as bigint).toString(),
      };
    } else {
      // Create new participant
      const participant = await this.prisma.raceParticipant.create({
        data: {
          raceId,
          userId: user.id,
          volume,
          xpEarned: 0,
        },
        include: { user: true },
      });

      await this.prisma.adminActionLog.create({
        data: {
          adminId,
          action: 'add_participant',
          details: { raceId, userId: user.id, username: body.username, volume: volume.toString() },
        },
      });

      return {
        id: participant.id,
        userId: participant.userId,
        username: participant.user.username,
        volume: (participant.volume as bigint).toString(),
        xpEarned: participant.xpEarned.toString(),
        joinedAt: participant.joinedAt,
        rank: participant.rank,
        prize: participant.prize ? (participant.prize as bigint).toString() : null,
      };
    }
  }

  @Put(':id/participants/:participantId')
  async updateParticipantVolume(
    @CurrentUser() adminId: string,
    @Param('id') raceId: string,
    @Param('participantId') participantId: string,
    @Body() body: { volume: string },
  ) {
    const participant = await this.prisma.raceParticipant.findUnique({
      where: { id: participantId },
      include: { user: true },
    });

    if (!participant || participant.raceId !== raceId) {
      throw new NotFoundException('Participant not found');
    }

    const volume = BigInt(Math.round(parseFloat(body.volume) * 100));

    const updated = await this.prisma.raceParticipant.update({
      where: { id: participantId },
      data: { volume },
      include: { user: true },
    });

    await this.prisma.adminActionLog.create({
      data: {
        adminId,
        action: 'update_participant_volume',
        details: { raceId, participantId, volume: volume.toString() },
      },
    });

    return {
      id: updated.id,
      userId: updated.userId,
      username: updated.user.username,
      volume: (updated.volume as bigint).toString(),
      xpEarned: updated.xpEarned.toString(),
      joinedAt: updated.joinedAt,
      rank: updated.rank,
      prize: updated.prize ? (updated.prize as bigint).toString() : null,
    };
  }

  @Delete(':id/participants/:participantId')
  async removeParticipant(
    @CurrentUser() adminId: string,
    @Param('id') raceId: string,
    @Param('participantId') participantId: string,
  ) {
    const participant = await this.prisma.raceParticipant.findUnique({
      where: { id: participantId },
    });

    if (!participant || participant.raceId !== raceId) {
      throw new NotFoundException('Participant not found');
    }

    await this.prisma.raceParticipant.delete({
      where: { id: participantId },
    });

    await this.prisma.adminActionLog.create({
      data: {
        adminId,
        action: 'remove_participant',
        details: { raceId, participantId },
      },
    });

    return { message: 'Participant removed successfully' };
  }

  @Post(':id/settle')
  async settle(@CurrentUser() adminId: string, @Param('id') raceId: string) {
    return this.racesService.settleRace(raceId, adminId);
  }
}


