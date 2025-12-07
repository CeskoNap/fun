import { Controller, Get, Post, Put, Param, Body, UseGuards, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService, Prisma } from '../prisma/prisma.service';
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
    return this.prisma.race.findMany({
      orderBy: { startsAt: 'desc' },
    });
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
    },
  ) {
    const cfg = body.raceConfigName
      ? await this.prisma.raceConfig.findUnique({
          where: { name: body.raceConfigName },
        })
      : null;

    const race = await this.prisma.race.create({
      data: {
        name: body.name,
        description: body.description,
        gameType: (body.gameType as any) ?? null,
        status: RaceStatus.UPCOMING,
        entryFee: cfg?.entryFee ?? new Prisma.Decimal(100),
        startsAt: new Date(body.startsAt),
        endsAt: new Date(body.endsAt),
        prizePool: new Prisma.Decimal(0),
      },
    });

    await this.prisma.adminActionLog.create({
      data: {
        adminId,
        action: 'create_race',
        details: { raceId: race.id },
      },
    });

    return race;
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

    return updated;
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

    return race;
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

    return race;
  }

  @Get(':id/participants')
  async getParticipants(@Param('id') raceId: string) {
    const participants = await this.prisma.raceParticipant.findMany({
      where: { raceId },
      orderBy: { volume: 'desc' },
      include: { user: true },
    });

    return participants.map((p) => ({
      username: p.user.username,
      volume: p.volume.toString(),
      xpEarned: p.xpEarned.toString(),
      joinedAt: p.joinedAt,
      rank: p.rank,
      prize: p.prize ? p.prize.toString() : null,
    }));
  }

  @Post(':id/settle')
  async settle(@CurrentUser() adminId: string, @Param('id') raceId: string) {
    return this.racesService.settleRace(raceId, adminId);
  }
}


