'use client';

import { Menu } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { NAV_ITEMS } from '@/shared/config/navigation';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { Logo } from '@/shared/ui/logo';
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
  const initial = userName.trim().charAt(0).toUpperCase() || '?';

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Открыть меню">
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex flex-col">
        <SheetHeader>
          <SheetTitle asChild>
            <Logo size="sm" />
          </SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-1 px-4">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <SheetClose asChild key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'rounded-full px-4 py-2.5 text-[15px] font-semibold transition-colors hover:bg-white/70 dark:hover:bg-white/10',
                    isActive ? 'lg-nav-active text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {item.label}
                </Link>
              </SheetClose>
            );
          })}
        </nav>
        <div className="mt-auto flex items-center justify-between gap-3 border-t border-white/40 px-4 py-4 dark:border-white/10">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#a78bfa] to-[#60a5fa] text-[13px] font-extrabold text-white">
              {initial}
            </div>
            <span className="truncate text-sm font-semibold">{userName}</span>
          </div>
          {logoutButton}
        </div>
      </SheetContent>
    </Sheet>
  );
}
