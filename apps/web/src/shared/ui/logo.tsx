import { cn } from '@/shared/lib/utils';

interface LogoProps {
  size?: 'sm' | 'md';
  className?: string;
}

/** Значок «Трекер расходов»: иконка-кошелёк на акцентной плашке + название. */
export function Logo({ size = 'md', className }: LogoProps) {
  const badge = size === 'md' ? 'size-12 rounded-2xl' : 'size-10 rounded-[14px]';
  const icon = size === 'md' ? 24 : 20;
  const text = size === 'md' ? 'text-xl' : 'text-[17px]';

  return (
    <div className={cn('flex items-center gap-3 text-foreground', className)}>
      <div
        className={cn(
          badge,
          'flex shrink-0 items-center justify-center bg-primary shadow-[inset_0_1px_0_rgba(255,255,255,.4),0_10px_24px_rgba(120,40,200,.35)]',
        )}
      >
        <svg
          width={icon}
          height={icon}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#fff"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M3 7a2 2 0 0 1 2-2h13a1 1 0 0 1 1 1v2" />
          <path d="M3 7v11a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1H5a2 2 0 0 1-2-2z" />
          <circle cx="16.5" cy="14.5" r="1" />
        </svg>
      </div>
      <span className={cn(text, 'font-extrabold tracking-tight')}>Трекер расходов</span>
    </div>
  );
}
