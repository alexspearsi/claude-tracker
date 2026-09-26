/**
 * Что возвращает Server Action формы транзакции. В отличие от CategoryActionState
 * дополнительного поля-флага для конфликта внешнего ключа здесь нет: у транзакции нет
 * зависимых записей (Pitfall 3, 02-RESEARCH.md) — такая ветка была бы мёртвым кодом.
 */
export type TransactionActionState =
  | { success: true }
  | { error: string; fieldErrors?: Record<string, string> }
  | undefined;
