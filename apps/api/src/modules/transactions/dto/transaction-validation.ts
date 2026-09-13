import type { TransformFnParams } from 'class-transformer';

/** Сумма ходит строкой: JSON-число теряет точность, а Decimal(12,2) её требует. */
export const AMOUNT_PATTERN = /^\d{1,10}(\.\d{1,2})?$/;
/** Отсекает 0 и 0.00 — транзакция на нулевую сумму бессмысленна. */
export const AMOUNT_NOT_ZERO = /[1-9]/;
export const DESCRIPTION_MAX = 500;
export const YEAR_MIN = 2000;
export const YEAR_MAX = 2100;

export const messages = {
  amountString: 'Сумма должна быть строкой вида 1234.56',
  amountFormat: 'Ожидается сумма вида 1234.56: до 10 цифр и не более 2 знаков после точки',
  amountZero: 'Сумма должна быть больше нуля',
  type: 'Тип должен быть INCOME или EXPENSE',
  categoryId: 'categoryId должен быть UUID',
  date: 'Дата в формате ISO 8601, например 2026-09-13T12:00:00.000Z',
  descriptionString: 'Описание должно быть строкой',
  descriptionMax: `Описание — не длиннее ${DESCRIPTION_MAX} символов`,
  dateFrom: 'dateFrom — дата в формате ISO 8601',
  dateTo: 'dateTo — дата в формате ISO 8601',
  monthInt: 'month — целое число',
  monthRange: 'month — от 1 до 12',
  yearInt: 'year — целое число',
  yearRange: `year — от ${YEAR_MIN} до ${YEAR_MAX}`,
} as const;

/** Обрезает пробелы по краям; нестроковые значения отдаёт как есть — их отсечёт @IsString. */
export const trim = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() : value;

/**
 * Число в JSON превращаем в строку без округления: 12.345 станет "12.345" и не пройдёт
 * AMOUNT_PATTERN — лучше явная ошибка 400, чем молча округлённая сумма.
 */
export const toMoneyString = ({ value }: TransformFnParams): unknown => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : value;
  }
  return typeof value === 'string' ? value.trim() : value;
};

/** Пропускает только отсутствующее поле. @IsOptional пропустил бы и null, а колонки NOT NULL. */
export const isPresent = (_dto: object, value: unknown): boolean => value !== undefined;
