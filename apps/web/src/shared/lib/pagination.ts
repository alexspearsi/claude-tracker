export const PAGE_SIZE = 10;

/** Верхняя граница для page: без неё вычисленный offset переполнил бы Int в Postgres
 *  и дал 500 от Prisma вместо пустой страницы. */
const MAX_PAGE = 100_000;

/**
 * searchParams отдаёт string | string[] | undefined. Любой мусор (нечисловое, ноль,
 * отрицательное, дробное, слишком большое) трактуется как страница 1 — показывать 404
 * на кривом ?page пользователю бессмысленно.
 */
export function parsePage(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === undefined) {
    return 1;
  }
  const page = Number(value);
  return Number.isInteger(page) && page >= 1 && page <= MAX_PAGE ? page : 1;
}

export function totalPages(total: number): number {
  return Math.max(1, Math.ceil(total / PAGE_SIZE));
}

/**
 * Страница 1 — без query-параметра page в URL. Необязательный params — активные
 * фильтры (например, из filtersToParams), которые должны пережить переход по страницам;
 * без них фильтр терялся бы при клике «Вперёд»/«Назад» (см. 02-04-PLAN.md, задача 1).
 */
export function pageHref(basePath: string, page: number, params?: URLSearchParams): string {
  const query = new URLSearchParams(params);
  if (page > 1) {
    query.set('page', String(page));
  }
  const queryString = query.toString();
  return queryString ? `${basePath}?${queryString}` : basePath;
}
