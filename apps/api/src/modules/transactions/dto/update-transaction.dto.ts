import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { TransactionType } from '../../../generated/prisma/enums.js';
import {
  AMOUNT_NOT_ZERO,
  AMOUNT_PATTERN,
  DESCRIPTION_MAX,
  isPresent,
  messages,
  toMoneyString,
  trim,
} from './transaction-validation.js';

export class UpdateTransactionDto {
  @ValidateIf(isPresent)
  @Transform(toMoneyString)
  @IsString({ message: messages.amountString })
  @Matches(AMOUNT_PATTERN, { message: messages.amountFormat })
  @Matches(AMOUNT_NOT_ZERO, { message: messages.amountZero })
  amount?: string;

  @ValidateIf(isPresent)
  @IsEnum(TransactionType, { message: messages.type })
  type?: TransactionType;

  @ValidateIf(isPresent)
  @IsUUID(undefined, { message: messages.categoryId })
  categoryId?: string;

  @ValidateIf(isPresent)
  @IsISO8601({ strict: true }, { message: messages.date })
  date?: string;

  // null сбрасывает описание — колонка nullable
  @IsOptional()
  @Transform(trim)
  @IsString({ message: messages.descriptionString })
  @MaxLength(DESCRIPTION_MAX, { message: messages.descriptionMax })
  description?: string | null;
}
