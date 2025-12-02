import { IsEnum, IsNumber, IsOptional, IsObject, IsString } from 'class-validator';
import { GameType } from '@prisma/client';
import { PlinkoRisk } from '../../common/types/game.types';

export class CreateBetDto {
  @IsEnum(GameType)
  gameType: GameType;

  @IsNumber()
  amount: number;

  @IsOptional()
  @IsString()
  clientSeed?: string;

  @IsOptional()
  @IsObject()
  params?: {
    // Mines params
    rows?: number;
    cols?: number;
    minesCount?: number;
    // Plinko params
    plinkoRows?: number;
    risk?: PlinkoRisk;
  };
}


