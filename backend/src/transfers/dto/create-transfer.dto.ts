import { IsNumber, IsPositive, IsString } from 'class-validator';

export class CreateTransferDto {
  @IsString()
  toUsername: string;

  @IsNumber()
  @IsPositive()
  amount: number;
}


