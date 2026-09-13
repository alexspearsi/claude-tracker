import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Хелпер cn, на который опираются компоненты shadcn/ui. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Суммы приходят с бэкенда строкой (Decimal), форматируем без потери точности. */
export function formatMoney(amount: string, currency = 'RUB'): string {
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency }).format(Number(amount));
}
