import { IsIn, IsInt, IsOptional, Min } from 'class-validator';

export class HistoryQueryDto {
  @IsOptional()
  @IsIn(['sent', 'received', 'all'])
  direction?: 'sent' | 'received' | 'all';

  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;
}


