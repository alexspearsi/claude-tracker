'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/shared/lib/utils';
import { NAV_ITEMS } from '@/shared/config/navigation';

/** Клиентский компонент только ради usePathname() — бизнес-логики и данных здесь нет. */
export function MainNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1 rounded-full border border-white/60 bg-white/28 p-1 dark:border-white/15 dark:bg-white/5">
      {NAV_ITEMS.map((item) => {
        // Точный матч либо вложенный путь: /expenses/123 тоже подсвечивает «Транзакции».
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex h-10 items-center rounded-full px-[18px] text-[15px] font-semibold transition-colors',
              isActive ? 'lg-nav-active text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
