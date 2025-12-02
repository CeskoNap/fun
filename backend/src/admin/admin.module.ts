import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PrismaModule } from '../prisma/prisma.module';
import { LevelsModule } from '../levels/levels.module';
import { AdminRacesController } from './admin-races.controller';
import { RacesModule } from '../races/races.module';

@Module({
  imports: [PrismaModule, LevelsModule, RacesModule],
  controllers: [AdminController, AdminRacesController],
  providers: [AdminService],
})
export class AdminModule {}

