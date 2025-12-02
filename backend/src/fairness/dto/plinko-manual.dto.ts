import { IsIn, IsNumber, IsPositive, IsString, IsInt, Min } from 'class-validator';

export class PlinkoManualDto {
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

  @IsString()
  @IsIn(['low', 'medium', 'high'])
  risk: string;
}


