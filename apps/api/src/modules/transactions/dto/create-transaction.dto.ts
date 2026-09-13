import { Transform } from 'class-transformer';
import { IsEnum, IsISO8601, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';
import { TransactionType } from '../../../generated/prisma/enums.js';
import {
  AMOUNT_NOT_ZERO,
  AMOUNT_PATTERN,
  DESCRIPTION_MAX,
  messages,
  toMoneyString,
  trim,
} from './transaction-validation.js';

export class CreateTransactionDto {
  @Transform(toMoneyString)
  @IsString({ message: messages.amountString })
  @Matches(AMOUNT_PATTERN, { message: messages.amountFormat })
  @Matches(AMOUNT_NOT_ZERO, { message: messages.amountZero })
  amount: string;

  @IsEnum(TransactionType, { message: messages.type })
  type: TransactionType;

  @IsUUID(undefined, { message: messages.categoryId })
  categoryId: string;

  // strict: true отсекает несуществующие даты вроде 2026-02-31; в Date превращаем в сервисе.
  @IsISO8601({ strict: true }, { message: messages.date })
  date: string;

  @IsOptional()
  @Transform(trim)
  @IsString({ message: messages.descriptionString })
  @MaxLength(DESCRIPTION_MAX, { message: messages.descriptionMax })
  description?: string | null;
}
