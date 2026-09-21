import type { ReactNode } from 'react';
import Link from 'next/link';

interface EmptyStateProps {
  title: string;
  description: string;
  backHref?: string;
  backLabel?: string;
  /** Произвольное действие (например, кнопка «Добавить транзакцию») — рендерится
   *  последним, после ссылки backHref, если оба заданы одновременно (на практике
   *  не пересекаются: backHref — для «страница вне диапазона», action — для «пусто»). */
  action?: ReactNode;
}

/** Локальная копия — кросс-импорт из widgets/recent-transactions запрещён FSD. */
export function EmptyState({ title, description, backHref, backLabel, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center">
      <p className="font-medium">{title}</p>
      <p className="text-sm text-muted-foreground">{description}</p>
      {backHref ? (
        <Link href={backHref} className="text-sm text-primary underline-offset-4 hover:underline">
          {backLabel}
        </Link>
      ) : null}
      {action ?? null}
    </div>
  );
}
