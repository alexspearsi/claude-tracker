/**
 * Что возвращает Server Action формы категории: в отличие от auth-экшенов здесь нет
 * `redirect()` — `Dialog` должен сам решить, закрываться ли, поэтому экшен возвращает
 * значение. Поля `fieldErrors` (per-field ошибки grouped-формата ValidationPipe) и
 * `blocked` (409 при удалении категории со связанными транзакциями) дозаполняются
 * задачей 2 этого плана и планом 01-02 соответственно — объявлены сразу.
 */
export type CategoryActionState =
  | { success: true }
  | { error: string; fieldErrors?: Record<string, string>; blocked?: boolean }
  | undefined;

/**
 * Значения формы `CategoryForm`. Новую Zod-схему не заводим (валидатор —
 * `createCategorySchema` из `@expense/shared`), этот тип нужен только для `useForm`,
 * потому что у `color` в схеме есть `.default('#64748b')` и входной тип схемы
 * отличается от выходного.
 */
export type CategoryFormValues = { name: string; color?: string };
