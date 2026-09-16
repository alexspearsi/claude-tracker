import Link from 'next/link';

interface EmptyStateProps {
  title: string;
  description: string;
  backHref?: string;
  backLabel?: string;
}

/** Общий вид для «транзакций нет» и «страница за пределами списка». */
export function EmptyState({ title, description, backHref, backLabel }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center">
      <p className="font-medium">{title}</p>
      <p className="text-sm text-muted-foreground">{description}</p>
      {backHref ? (
        <Link href={backHref} className="text-sm text-primary underline-offset-4 hover:underline">
          {backLabel}
        </Link>
      ) : null}
    </div>
  );
}
