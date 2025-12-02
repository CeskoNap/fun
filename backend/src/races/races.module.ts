import { Module } from '@nestjs/common';
import { RacesService } from './races.service';
import { RacesController } from './races.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [RacesService],
  controllers: [RacesController],
  exports: [RacesService],
})
export class RacesModule {}


