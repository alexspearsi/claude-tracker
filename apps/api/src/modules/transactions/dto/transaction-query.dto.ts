import { IsEnum, IsISO8601, IsOptional, IsUUID } from 'class-validator';
import { TransactionType } from '../../../generated/prisma/enums.js';
import { messages } from './transaction-validation.js';

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
}
