'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Loader2Icon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { Category } from '@expense/shared';
import type { Transaction } from '@/entities/transaction/model/types';
import { createTransactionAction } from '@/features/transaction-form/api/create-transaction.action';
import { updateTransactionAction } from '@/features/transaction-form/api/update-transaction.action';
import {
  transactionFormSchema,
  type TransactionFormValues,
} from '@/features/transaction-form/model/transaction-form-schema';
import { Button } from '@/shared/ui/button';
import { Calendar } from '@/shared/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/ui/form';
import { Input } from '@/shared/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';

interface TransactionFormProps {
  /** Категории приходят пропом — entities/transaction не может импортировать entities/category
   *  (кросс-импорт между entities запрещён), склейку делает вызывающий widget/view. */
  categories: Category[];
  /** undefined → создание; заполненная транзакция → редактирование (D-02, TXN-02). */
  transaction?: Transaction;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Полдень UTC для выбранной календарной даты — см. комментарий у buildIsoNoon ниже:
 *  toISOString() локальной полуночи в положительных зонах даёт предыдущие сутки UTC. */
function buildIsoNoon(date: Date): string {
  return `${format(date, 'yyyy-MM-dd')}T12:00:00.000Z`;
}

/** Обратный разбор: достаём календарную дату из хранимого полдень-UTC таймстампа,
 *  чтобы подпись кнопки триггера и Calendar показывали именно выбранный день. */
function parseIsoNoon(value: string): Date {
  return new Date(value);
}

function todayIsoNoon(): string {
  return buildIsoNoon(new Date());
}

export function TransactionForm({ categories, transaction, open, onOpenChange }: TransactionFormProps) {
  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: transaction
      ? {
          type: transaction.type,
          amount: transaction.amount,
          categoryId: transaction.categoryId,
          date: transaction.date,
          description: transaction.description ?? '',
        }
      : {
          type: 'EXPENSE',
          amount: '',
          categoryId: '',
          date: todayIsoNoon(),
          description: '',
        },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    const result = transaction
      ? await updateTransactionAction(transaction.id, values)
      : await createTransactionAction(values);

    // TransactionActionState — не дискриминированный по общему полю union, сужаем через 'in'.
    if (result && 'error' in result) {
      if (result.fieldErrors) {
        // Per-field ошибки DTO-валидации (400, grouped) — под конкретным полем,
        // без тоста и без закрытия модалки; неизвестные имена молча пропускаем.
        for (const [field, message] of Object.entries(result.fieldErrors)) {
          if (
            field === 'amount' ||
            field === 'type' ||
            field === 'categoryId' ||
            field === 'date' ||
            field === 'description'
          ) {
            form.setError(field, { message });
          }
        }
        return;
      }
      toast.error(result.error);
      return;
    }

    form.reset();
    onOpenChange(false);
  });

  const { isSubmitting } = form.formState;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{transaction ? 'Изменить транзакцию' : 'Новая транзакция'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={onSubmit} className="grid gap-4" noValidate>
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <div
                    className="grid grid-cols-2 gap-2"
                    role="radiogroup"
                    aria-label="Тип транзакции"
                  >
                    <Button
                      type="button"
                      variant={field.value === 'EXPENSE' ? 'default' : 'outline'}
                      onClick={() => field.onChange('EXPENSE')}
                    >
                      Расход
                    </Button>
                    <Button
                      type="button"
                      variant={field.value === 'INCOME' ? 'default' : 'outline'}
                      onClick={() => field.onChange('INCOME')}
                    >
                      Доход
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Сумма</FormLabel>
                  <FormControl>
                    <Input
                      inputMode="decimal"
                      autoComplete="off"
                      placeholder="0.00"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Категория</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Категория" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Дата</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button variant="outline" className="w-full justify-start font-normal">
                          {format(parseIsoNoon(field.value), 'd MMMM yyyy', { locale: ru })}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={parseIsoNoon(field.value)}
                        onSelect={(date) => {
                          if (date) {
                            field.onChange(buildIsoNoon(date));
                          }
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Описание</FormLabel>
                  <FormControl>
                    <Input maxLength={500} className="w-full" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="mt-2 w-full" disabled={isSubmitting}>
              {isSubmitting ? <Loader2Icon className="animate-spin" /> : null}
              {transaction ? 'Сохранить' : 'Добавить'}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
