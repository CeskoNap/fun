import { IsString } from 'class-validator';

export class CashOutDto {
  @IsString()
  betId: string;
}


