import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import {
  CATEGORY_COLOR_PATTERN,
  CATEGORY_ICON_MAX,
  CATEGORY_NAME_MAX,
  messages,
  trim,
} from './category-validation.js';

export class CreateCategoryDto {
  @Transform(trim)
  @IsString({ message: messages.nameString })
  @IsNotEmpty({ message: messages.nameEmpty })
  @MaxLength(CATEGORY_NAME_MAX, { message: messages.nameMax })
  name: string;

  // не передан — сработает default из БД
  @IsOptional()
  @Matches(CATEGORY_COLOR_PATTERN, { message: messages.color })
  color?: string;

  @IsOptional()
  @IsString({ message: messages.iconString })
  @MaxLength(CATEGORY_ICON_MAX, { message: messages.iconMax })
  icon?: string | null;
}
