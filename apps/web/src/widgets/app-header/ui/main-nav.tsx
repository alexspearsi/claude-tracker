'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/shared/lib/utils';
import { NAV_ITEMS } from '@/shared/config/navigation';

/** Клиентский компонент только ради usePathname() — бизнес-логики и данных здесь нет. */
export function MainNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-4 text-sm">
      {NAV_ITEMS.map((item) => {
        // Точный матч либо вложенный путь: /expenses/123 тоже подсвечивает «Транзакции».
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'transition-colors hover:text-foreground',
              isActive ? 'font-medium text-foreground' : 'text-muted-foreground',
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
