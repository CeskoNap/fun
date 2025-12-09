import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { LevelsModule } from './levels/levels.module';
import { RewardsModule } from './rewards/rewards.module';
import { AdminModule } from './admin/admin.module';
import { WebsocketModule } from './websocket/websocket.module';
import { MeModule } from './me/me.module';
import { TransfersModule } from './transfers/transfers.module';
import { RacesModule } from './races/races.module';
import { BetsModule } from './bets/bets.module';
import { FairnessModule } from './fairness/fairness.module';
import { WheelModule } from './wheel/wheel.module';
import { MissionsModule } from './missions/missions.module';
import { AchievementsModule } from './achievements/achievements.module';
import { AuthModule } from './auth/auth.module';
import { GamesModule } from './games/games.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    LevelsModule,
    RewardsModule,
    AdminModule,
    WebsocketModule,
    MeModule,
    TransfersModule,
    RacesModule,
    BetsModule,
    FairnessModule,
    WheelModule,
    MissionsModule,
    AchievementsModule,
    AuthModule,
    GamesModule,
    NotificationsModule,
  ],
})
export class AppModule {}

