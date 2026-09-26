'use client';

import { useState, type MouseEvent } from 'react';
import { Loader2Icon } from 'lucide-react';
import { toast } from 'sonner';
import type { Transaction } from '@/entities/transaction/model/types';
import { deleteTransactionAction } from '@/features/transaction-form/api/delete-transaction.action';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/alert-dialog';

interface TransactionDeleteDialogProps {
  transaction: Transaction;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransactionDeleteDialog({ transaction, open, onOpenChange }: TransactionDeleteDialogProps) {
  const [isPending, setIsPending] = useState(false);

  const handleConfirm = async (event: MouseEvent) => {
    // Radix закрывает AlertDialog сразу после клика — без preventDefault пользователь
    // не увидит ни индикатора, ни ошибки до ответа сервера.
    event.preventDefault();
    setIsPending(true);
    const result = await deleteTransactionAction(transaction.id);
    setIsPending(false);

    // У транзакции нет состояния блокировки (в отличие от категорий) — любая ошибка
    // просто тостом закрывает диалог.
    if (result && 'error' in result) {
      toast.error(result.error);
      onOpenChange(false);
      return;
    }

    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Удалить транзакцию?</AlertDialogTitle>
          <AlertDialogDescription>Это действие нельзя отменить.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Отмена</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={handleConfirm} disabled={isPending}>
            {isPending ? <Loader2Icon className="animate-spin" /> : null}
            Удалить
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
