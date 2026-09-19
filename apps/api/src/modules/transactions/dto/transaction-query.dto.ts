import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsISO8601, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { TransactionType } from '../../../generated/prisma/enums.js';
import { LIMIT_MAX, messages } from './transaction-validation.js';

export class TransactionQueryDto {
  @IsOptional()
  @IsISO8601({ strict: true }, { message: messages.dateFrom })
  dateFrom?: string;

  @IsOptional()
  @IsISO8601({ strict: true }, { message: messages.dateTo })
  dateTo?: string;

  @IsOptional()
  @IsEnum(TransactionType, { message: messages.type })
  type?: TransactionType;

  @IsOptional()
  @IsUUID(undefined, { message: messages.categoryId })
  categoryId?: string;

  // Дефолт — в сервисе (query.limit ?? LIMIT_DEFAULT): инициализатор поля здесь
  // не сработает, class-transformer затирает его undefined для отсутствующего ключа.
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: messages.limitInt })
  @Min(1, { message: messages.limitRange })
  @Max(LIMIT_MAX, { message: messages.limitRange })
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: messages.offsetInt })
  @Min(0, { message: messages.offsetMin })
  offset?: number;
}
