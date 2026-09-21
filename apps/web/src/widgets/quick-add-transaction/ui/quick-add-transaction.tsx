'use client';

import { useState } from 'react';
import type { Category } from '@expense/shared';
import { TransactionForm } from '@/features/transaction-form/ui/transaction-form';
import { Button } from '@/shared/ui/button';

interface QuickAddTransactionProps {
  categories: Category[];
}

/** Кнопка-триггер быстрого добавления транзакции для /dashboard (TXN-05). Собственную
 *  обёртку диалога не рендерит — она уже внутри TransactionForm (D-02), второй слой
 *  дал бы вложенные примитивы Radix. */
export function QuickAddTransaction({ categories }: QuickAddTransactionProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>Добавить транзакцию</Button>
      {open && (
        <TransactionForm
          categories={categories}
          open
          onOpenChange={(next) => {
            if (!next) {
              setOpen(false);
            }
          }}
        />
      )}
    </>
  );
}
