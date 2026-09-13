import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength, ValidateIf } from 'class-validator';
import {
  CATEGORY_COLOR_PATTERN,
  CATEGORY_ICON_MAX,
  CATEGORY_NAME_MAX,
  messages,
  trim,
} from './category-validation.js';

/**
 * Пропускает только отсутствующее поле. @IsOptional пропустил бы и null, а name/color —
 * NOT NULL-колонки: вместо 400 получили бы 500 от БД.
 */
const isPresent = (_dto: object, value: unknown): boolean => value !== undefined;

export class UpdateCategoryDto {
  @ValidateIf(isPresent)
  @Transform(trim)
  @IsString({ message: messages.nameString })
  @IsNotEmpty({ message: messages.nameEmpty })
  @MaxLength(CATEGORY_NAME_MAX, { message: messages.nameMax })
  name?: string;

  @ValidateIf(isPresent)
  @Matches(CATEGORY_COLOR_PATTERN, { message: messages.color })
  color?: string;

  // null сбрасывает иконку — колонка nullable
  @IsOptional()
  @IsString({ message: messages.iconString })
  @MaxLength(CATEGORY_ICON_MAX, { message: messages.iconMax })
  icon?: string | null;
}
