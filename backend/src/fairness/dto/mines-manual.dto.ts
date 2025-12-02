import { IsNumber, IsPositive, IsString, IsInt, Min } from 'class-validator';

export class MinesManualDto {
  @IsString()
  serverSeed: string;

  @IsString()
  clientSeed: string;

  @IsInt()
  @Min(0)
  nonce: number;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsInt()
  @Min(1)
  rows: number;

  @IsInt()
  @Min(1)
  cols: number;

  @IsInt()
  @Min(1)
  minesCount: number;
}


