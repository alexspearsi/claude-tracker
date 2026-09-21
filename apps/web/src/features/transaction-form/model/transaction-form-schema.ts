import { z } from 'zod';

// Зеркало apps/api/src/modules/transactions/dto/transaction-validation.ts — менять оба места
// вручную, Zod-дубликата в @expense/shared для транзакций нет (см. 02-CONTEXT.md canonical_refs).
const AMOUNT_PATTERN = /^\d{1,10}(\.\d{1,2})?$/;
const AMOUNT_NOT_ZERO = /[1-9]/;
const DESCRIPTION_MAX = 500;

const amountSchema = z
  .string()
  .regex(AMOUNT_PATTERN, 'Ожидается сумма вида 1234.56')
  .regex(AMOUNT_NOT_ZERO, 'Сумма должна быть больше нуля');

export const transactionFormSchema = z.object({
  amount: amountSchema,
  type: z.enum(['INCOME', 'EXPENSE']),
  categoryId: z.uuid('categoryId должен быть UUID'),
  // Полный ISO-таймстамп (полдень UTC, собирается в transaction-form.tsx) — не z.iso.date(),
  // это только календарная дата без времени, а DTO ждёт полную строку.
  date: z.iso.datetime(),
  description: z.string().max(DESCRIPTION_MAX, `Не длиннее ${DESCRIPTION_MAX} символов`).optional(),
});

export type TransactionFormValues = z.infer<typeof transactionFormSchema>;
