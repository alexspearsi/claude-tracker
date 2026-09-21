import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
}

/**
 * Собственная копия для виджета категорий: кросс-импорты внутри слоя `widgets`
 * запрещены FSD, поэтому переиспользовать `widgets/recent-transactions/ui/empty-state.tsx`
 * нельзя. По D-07 кнопка должна открывать модалку создания, а не вести по ссылке —
 * состоянием модалки владеет `category-list.tsx`, поэтому кнопку передаёт он.
 */
export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center">
      <p className="font-medium">{title}</p>
      <p className="text-sm text-muted-foreground">{description}</p>
      {action ?? null}
    </div>
  );
}
