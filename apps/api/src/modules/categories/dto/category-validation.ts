import type { TransformFnParams } from 'class-transformer';

/** Правила повторяют createCategorySchema из @expense/shared — при правке менять оба места. */
export const CATEGORY_NAME_MAX = 50;
export const CATEGORY_ICON_MAX = 50;
export const CATEGORY_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

export const messages = {
  nameString: 'Название должно быть строкой',
  nameEmpty: 'Название не может быть пустым',
  nameMax: `Название — не длиннее ${CATEGORY_NAME_MAX} символов`,
  color: 'Цвет в формате #RRGGBB',
  iconString: 'Иконка должна быть строкой',
  iconMax: `Иконка — не длиннее ${CATEGORY_ICON_MAX} символов`,
} as const;

/** Обрезает пробелы по краям; нестроковые значения отдаёт как есть — их отсечёт @IsString. */
export const trim = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() : value;
