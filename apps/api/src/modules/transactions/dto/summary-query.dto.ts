import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';
import { YEAR_MAX, YEAR_MIN, messages } from './transaction-validation.js';

/** month и year обязательны — без @IsOptional undefined не пройдёт @IsInt. */
export class SummaryQueryDto {
  @Type(() => Number)
  @IsInt({ message: messages.monthInt })
  @Min(1, { message: messages.monthRange })
  @Max(12, { message: messages.monthRange })
  month: number;

  @Type(() => Number)
  @IsInt({ message: messages.yearInt })
  @Min(YEAR_MIN, { message: messages.yearRange })
  @Max(YEAR_MAX, { message: messages.yearRange })
  year: number;
}
