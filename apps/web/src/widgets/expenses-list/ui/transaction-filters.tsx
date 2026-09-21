'use client';

import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import type { DateRange } from 'react-day-picker';
import type { Category } from '@expense/shared';
import type { TransactionType } from '@/entities/transaction/model/types';
import { ROUTES } from '@/shared/config/routes';
import { Button } from '@/shared/ui/button';
import { Calendar } from '@/shared/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { filtersHref, type TransactionFilters } from '@/widgets/expenses-list/model/filters';

interface TransactionFiltersPanelProps {
  filters: TransactionFilters;
  categories: Category[];
}

/** Radix SelectItem не может иметь пустое value — пункты «Все»/«Все категории» получают
 *  отдельный маркер, который при сборке фильтров (onValueChange ниже) превращается в
 *  отсутствие параметра, а не в буквальное значение маркера. */
const ALL_TYPES_MARKER = '__all-types__';
const ALL_CATEGORIES_MARKER = '__all-categories__';

/**
 * Панель период/тип/категория над таблицей (D-04, TXN-06). Не хранит собственного
 * состояния фильтра — значения читаются из пропа filters (который view прочитал из
 * searchParams), изменение любого контрола сразу пушит новый URL через filtersHref.
 * Один ряд, все три контрола равнозначны (UI-SPEC § Visual Hierarchy — Filter panel).
 */
export function TransactionFiltersPanel({ filters, categories }: TransactionFiltersPanelProps) {
  const router = useRouter();

  function push(next: TransactionFilters) {
    router.push(filtersHref(ROUTES.expenses, next));
  }

  const selectedRange: DateRange | undefined =
    filters.dateFrom || filters.dateTo
      ? {
          from: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
          to: filters.dateTo ? new Date(filters.dateTo) : undefined,
        }
      : undefined;

  const periodLabel = selectedRange
    ? [selectedRange.from, selectedRange.to]
        .filter((date): date is Date => Boolean(date))
        .map((date) => format(date, 'd MMM', { locale: ru }))
        .join(' – ')
    : 'Период';

  return (
    <div className="flex flex-wrap gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="font-normal">
            {periodLabel}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            selected={selectedRange}
            onSelect={(range) =>
              push({
                ...filters,
                // Календарная дата, БЕЗ времени — сервер сам включает весь день
                // целиком для dateTo (buildDateFilter), полный таймстамп обрезал бы
                // выдачу почти всем последним днём периода.
                dateFrom: range?.from ? format(range.from, 'yyyy-MM-dd') : undefined,
                dateTo: range?.to ? format(range.to, 'yyyy-MM-dd') : undefined,
              })
            }
          />
          <div className="border-t p-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => push({ ...filters, dateFrom: undefined, dateTo: undefined })}
            >
              Сбросить период
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <Select
        // key вместо просто value: Radix Select не сбрасывает отображаемое значение при
        // переходе controlled value с реальной строки на undefined (переключение
        // controlled/uncontrolled на лету не поддерживается) — без key триггер продолжал бы
        // показывать последний выбранный пункт вместо плейсхолдера «Тип» после сброса фильтра.
        key={`type-${filters.type ?? 'all'}`}
        value={filters.type}
        onValueChange={(value) =>
          push({
            ...filters,
            type: value === ALL_TYPES_MARKER ? undefined : (value as TransactionType),
          })
        }
      >
        <SelectTrigger>
          <SelectValue placeholder="Тип" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_TYPES_MARKER}>Все</SelectItem>
          <SelectItem value="INCOME">Доход</SelectItem>
          <SelectItem value="EXPENSE">Расход</SelectItem>
        </SelectContent>
      </Select>

      <Select
        key={`category-${filters.categoryId ?? 'all'}`}
        value={filters.categoryId}
        onValueChange={(value) =>
          push({
            ...filters,
            categoryId: value === ALL_CATEGORIES_MARKER ? undefined : value,
          })
        }
      >
        <SelectTrigger>
          <SelectValue placeholder="Категория" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_CATEGORIES_MARKER}>Все категории</SelectItem>
          {categories.map((category) => (
            <SelectItem key={category.id} value={category.id}>
              {category.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
