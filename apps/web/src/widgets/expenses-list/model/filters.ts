import type { TransactionType } from '@/entities/transaction/model/types';

export interface TransactionFilters {
  type?: TransactionType;
  categoryId?: string;
  dateFrom?: string;
  dateTo?: string;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function firstValue(raw: string | string[] | undefined): string | undefined {
  return Array.isArray(raw) ? raw[0] : raw;
}

/**
 * Разбирает и проверяет фильтры из searchParams. Испорченное значение трактуется как
 * «фильтр не задан» — тот же принцип, что уже принят в проекте для кривого ?page
 * (см. parsePage, shared/lib/pagination.ts): отбрасывание на границе гарантирует, что на
 * api (forbidNonWhitelisted + строгие DTO-валидаторы) уйдут только валидные значения, а не
 * ошибка запроса. Повторяющийся ключ в URL (массив) сводится к первому элементу, как и
 * parsePage.
 */
export function parseTransactionFilters(
  searchParams: Record<string, string | string[] | undefined>,
): TransactionFilters {
  const type = firstValue(searchParams.type);
  const categoryId = firstValue(searchParams.categoryId);
  const dateFrom = firstValue(searchParams.dateFrom);
  const dateTo = firstValue(searchParams.dateTo);

  return {
    type: type === 'INCOME' || type === 'EXPENSE' ? type : undefined,
    categoryId: categoryId && UUID_PATTERN.test(categoryId) ? categoryId : undefined,
    dateFrom: dateFrom && DATE_PATTERN.test(dateFrom) ? dateFrom : undefined,
    dateTo: dateTo && DATE_PATTERN.test(dateTo) ? dateTo : undefined,
  };
}

export function hasActiveFilters(filters: TransactionFilters): boolean {
  return Boolean(filters.type || filters.categoryId || filters.dateFrom || filters.dateTo);
}

/** Только заданные поля — под теми же именами, что ждёт TransactionQueryDto. */
export function filtersToParams(filters: TransactionFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.type) params.set('type', filters.type);
  if (filters.categoryId) params.set('categoryId', filters.categoryId);
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.set('dateTo', filters.dateTo);
  return params;
}

/** Номер страницы сюда не кладётся: смена фильтра всегда возвращает на первую страницу. */
export function filtersHref(basePath: string, filters: TransactionFilters): string {
  const query = filtersToParams(filters).toString();
  return query ? `${basePath}?${query}` : basePath;
}
