import Link from 'next/link';
import { cn } from '@/shared/lib/utils';
import { pageHref } from '@/shared/lib/pagination';

interface PaginationNavProps {
  basePath: string;
  page: number;
  pages: number;
  /** Активные фильтры (см. filtersToParams) — без них переход по страницам их бы терял. */
  params?: URLSearchParams;
}

const linkClassName =
  'lg-glass-soft inline-flex h-11 items-center rounded-full px-5 text-sm font-semibold transition-colors hover:bg-white/70 dark:hover:bg-white/10';
const disabledClassName = 'pointer-events-none opacity-40';

/**
 * Ссылки, а не кнопки: верно для RSC (без клиентского состояния) и заодно обходит
 * известную на этой машине проблему — Chrome обнуляет фон у <button> (см. память
 * chrome-overrides-button-colors), <a> она не касается.
 */
export function PaginationNav({ basePath, page, pages, params }: PaginationNavProps) {
  const hasPrev = page > 1;
  const hasNext = page < pages;

  return (
    <nav className="flex items-center justify-between gap-4">
      {hasPrev ? (
        <Link href={pageHref(basePath, page - 1, params)} className={linkClassName}>
          Назад
        </Link>
      ) : (
        <span className={cn(linkClassName, disabledClassName)}>Назад</span>
      )}

      <span className="text-sm font-semibold text-muted-foreground">
        Страница {page} из {pages}
      </span>

      {hasNext ? (
        <Link href={pageHref(basePath, page + 1, params)} className={linkClassName}>
          Вперёд
        </Link>
      ) : (
        <span className={cn(linkClassName, disabledClassName)}>Вперёд</span>
      )}
    </nav>
  );
}
