'use client';

import { Menu } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { NAV_ITEMS } from '@/shared/config/navigation';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/shared/ui/sheet';

type MobileNavProps = {
  userName: string;
  logoutButton: ReactNode;
};

/**
 * Бургер-меню для узких экранов: дублирует пункты MainNav и блок профиля/выхода,
 * которые в горизонтальной шапке не помещаются и обрезаются.
 */
export function MobileNav({ userName, logoutButton }: MobileNavProps) {
  const pathname = usePathname();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Открыть меню">
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex flex-col">
        <SheetHeader>
          <SheetTitle>Трекер расходов</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-1 px-4">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <SheetClose asChild key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'rounded-md px-2 py-2 text-sm transition-colors hover:bg-accent',
                    isActive ? 'font-medium text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {item.label}
                </Link>
              </SheetClose>
            );
          })}
        </nav>
        <div className="mt-auto flex items-center justify-between border-t px-4 py-4">
          <span className="truncate text-sm text-muted-foreground">{userName}</span>
          {logoutButton}
        </div>
      </SheetContent>
    </Sheet>
  );
}
