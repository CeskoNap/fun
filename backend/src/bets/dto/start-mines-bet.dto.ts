import { IsNumber, IsOptional, IsString } from 'class-validator';

export class StartMinesBetDto {
  @IsNumber()
  amount: number;

  @IsNumber()
  rows: number;

  @IsNumber()
  cols: number;

  @IsNumber()
  minesCount: number;

  @IsOptional()
  @IsString()
  clientSeed?: string;
}


