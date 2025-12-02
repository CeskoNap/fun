import { Module } from '@nestjs/common';
import { FairnessService } from './fairness.service';
import { FairnessController } from './fairness.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [FairnessService],
  controllers: [FairnessController],
})
export class FairnessModule {}


