import { Module } from '@nestjs/common';
import { BetsService } from './bets.service';
import { BetsController } from './bets.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { LevelsModule } from '../levels/levels.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { RacesModule } from '../races/races.module';
import { MissionsModule } from '../missions/missions.module';
import { AchievementsModule } from '../achievements/achievements.module';

@Module({
  imports: [PrismaModule, LevelsModule, WebsocketModule, RacesModule, MissionsModule, AchievementsModule],
  controllers: [BetsController],
  providers: [BetsService],
  exports: [BetsService],
})
export class BetsModule {}


