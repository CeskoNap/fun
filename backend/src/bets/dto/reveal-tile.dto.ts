import { IsString, IsNumber, Min, Max } from 'class-validator';

export class RevealTileDto {
  @IsString()
  betId: string;

  @IsNumber()
  @Min(0)
  tileIndex: number;
}




