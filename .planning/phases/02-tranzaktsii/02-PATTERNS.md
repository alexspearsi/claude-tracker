# Phase 2: Транзакции - Pattern Map

**Mapped:** 2026-09-21
**Files analyzed:** 15 new/modified
**Analogs found:** 15 / 15

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `entities/transaction/api/get-transactions.ts` (extend) | service (entity-api) | request-response | same file (extend in place) | exact |
| `entities/transaction/api/create-transaction.ts` | service (entity-api) | CRUD | `entities/category/api/create-category.ts` | exact |
| `entities/transaction/api/update-transaction.ts` | service (entity-api) | CRUD | `entities/category/api/update-category.ts` | exact |
| `entities/transaction/api/delete-transaction.ts` | service (entity-api) | CRUD | `entities/category/api/delete-category.ts` | exact |
| `features/transaction-form/model/transaction-form-schema.ts` | model (Zod schema) | transform/validation | `packages/shared/src/schemas/category.ts` (style only — new file is local, not shared) | role-match |
| `features/transaction-form/model/types.ts` | model | — | `features/category-form/model/types.ts` | exact |
| `features/transaction-form/model/affected-paths.ts` | config | — | `features/category-form/model/affected-paths.ts` | exact |
| `features/transaction-form/api/create-transaction.action.ts` | controller (Server Action) | request-response | `features/category-form/api/create-category.action.ts` | exact |
| `features/transaction-form/api/update-transaction.action.ts` | controller (Server Action) | request-response | `features/category-form/api/update-category.action.ts` | exact |
| `features/transaction-form/api/delete-transaction.action.ts` | controller (Server Action) | request-response | `features/category-form/api/delete-category.action.ts` (minus 409/blocked branch — Pitfall 3) | role-match |
| `features/transaction-form/ui/transaction-form.tsx` | component (form) | request-response | `features/category-form/ui/category-form.tsx` | exact |
| `features/transaction-form/ui/transaction-delete-dialog.tsx` | component | request-response | `features/category-form/ui/category-delete-dialog.tsx` (minus `blockedMessage`) | role-match |
| `widgets/quick-add-transaction/ui/quick-add-transaction.tsx` | component (widget) | request-response | `widgets/category-list/ui/category-list.tsx` (state-toggle part only — no own Dialog) | role-match |
| `widgets/transaction-filters/ui/transaction-filters.tsx` | component (widget) | request-response | `widgets/recent-transactions/ui/pagination-nav.tsx` (URL-as-source-of-truth philosophy; no direct filter analog exists) | partial |
| `views/expenses/ui/expenses-view.tsx` | component (RSC view) | request-response | `views/categories/ui/categories-view.tsx` + `views/dashboard/ui/dashboard-view.tsx` | exact |
| `widgets/recent-transactions/ui/recent-transactions.tsx` (modify — add `headerAction` prop) | component (widget) | request-response | same file (modify in place); header pattern from `widgets/category-list/ui/category-list.tsx:32-35` | exact |
| `views/dashboard/ui/dashboard-view.tsx` (modify — wire quick-add) | component (RSC view) | request-response | same file (modify in place) | exact |
| `widgets/expenses-list/...` (list+row-actions, if split from view) | component (widget) | CRUD (client state for dialogs) | `widgets/category-list/ui/category-list.tsx` | exact |
| `entities/transaction/api/get-summary.ts` (optional, Phase-3 prep) | service (entity-api) | request-response | `entities/transaction/api/get-transactions.ts` | role-match |

## Pattern Assignments

### `entities/transaction/api/create-transaction.ts` / `update-transaction.ts` / `delete-transaction.ts` (service, CRUD)

**Analog:** `apps/web/src/features/category-form/api/*` pattern is for the Server Action layer; the entity-api layer itself has no committed transaction sibling yet, but the category entity-api shape is implied by every Server Action reading `entities/category/api/{create,update,delete}-category`. Follow `entities/transaction/api/get-transactions.ts` (already tracked, read in full) for the exact conventions of this entity:

**Full current file** (`apps/web/src/entities/transaction/api/get-transactions.ts`):
```typescript
import 'server-only';
import { apiFetch } from '@/shared/api/api-client';
import type { TransactionList } from '@/entities/transaction/model/types';

interface GetTransactionsParams {
  limit: number;
  offset: number;
}

/**
 * Токен приходит параметром, а не читается изнутри entity: entities/session — соседний
 * слайс, кросс-импорты внутри entities запрещены правилами FSD проекта.
 */
export function getTransactions(
  accessToken: string,
  { limit, offset }: GetTransactionsParams,
): Promise<TransactionList> {
  // Только известные ключи: у api forbidNonWhitelisted — лишний query даст 400.
  const query = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  return apiFetch<TransactionList>(`/transactions?${query}`, {
    accessToken,
    cache: 'no-store',
  });
}
```

**Extension for filters (additive, per RESEARCH.md Pitfall 1 — keep `limit`/`offset` required, add four optional params, existing call sites keep compiling):**
```typescript
interface GetTransactionsParams {
  limit: number;
  offset: number;
  type?: TransactionType;
  categoryId?: string;
  dateFrom?: string;
  dateTo?: string;
}
export function getTransactions(
  accessToken: string,
  { limit, offset, type, categoryId, dateFrom, dateTo }: GetTransactionsParams,
): Promise<TransactionList> {
  const query = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (type) query.set('type', type);
  if (categoryId) query.set('categoryId', categoryId);
  if (dateFrom) query.set('dateFrom', dateFrom);
  if (dateTo) query.set('dateTo', dateTo);
  return apiFetch<TransactionList>(`/transactions?${query}`, { accessToken, cache: 'no-store' });
}
```

**`create/update/delete` — mirror the entity-api shape used one layer up by the category Server Actions** (imports observed from `apps/web/src/features/category-form/api/{delete,update}-category.action.ts`, both fully read):
```typescript
import { deleteCategory } from '@/entities/category/api/delete-category';
import { updateCategory } from '@/entities/category/api/update-category';
```
Same `'server-only'` + `apiFetch<T>(url, { method, accessToken, body: JSON.stringify(input) })` shape as `get-transactions.ts` above — `create-transaction.ts` is `POST /transactions`, `update-transaction.ts` is `PATCH /transactions/:id` with `Partial<TransactionFormValues>`, `delete-transaction.ts` is `DELETE /transactions/:id` returning `Promise<void>`, no body.

---

### `features/transaction-form/api/create-transaction.action.ts` (controller/Server Action, request-response)

**Analog:** `apps/web/src/features/category-form/api/update-category.action.ts` (full file read above)

**Imports pattern:**
```typescript
'use server';

import { revalidatePath } from 'next/cache';
import { getSession } from '@/entities/session/api/session';
import { updateCategory } from '@/entities/category/api/update-category';
import { apiErrorMessage, extractFieldErrors } from '@/shared/api/error-message';
import { CATEGORY_AFFECTED_PATHS } from '@/features/category-form/model/affected-paths';
import type { CategoryActionState } from '@/features/category-form/model/types';
```

**Core request-response pattern** (`update-category.action.ts:11-37`, full function):
```typescript
export async function updateCategoryAction(id: string, input: unknown): Promise<CategoryActionState> {
  // Server Action доступен прямым POST, поэтому валидация клиента здесь не защита (T-01-08).
  const parsed = updateCategorySchema.safeParse(input);
  if (!parsed.success) {
    return { error: 'Проверьте правильность заполнения полей' };
  }

  const session = await getSession();
  if (!session) {
    return { error: 'Сессия истекла, войдите заново' };
  }

  try {
    await updateCategory(session.accessToken, id, parsed.data);
  } catch (error) {
    const fieldErrors = extractFieldErrors(error);
    if (fieldErrors) {
      return { error: 'Проверьте правильность заполнения полей', fieldErrors };
    }
    return { error: apiErrorMessage(error) };
  }

  for (const path of CATEGORY_AFFECTED_PATHS) {
    revalidatePath(path);
  }
  return { success: true };
}
```
For transactions: replace `updateCategorySchema` with `transactionFormSchema` (local, see Pattern below), `updateCategory` with `updateTransaction`, `CATEGORY_AFFECTED_PATHS` with `TRANSACTION_AFFECTED_PATHS`, `CategoryActionState` with `TransactionActionState`. `create-transaction.action.ts` is the same shape with `createTransaction`/no `id` param (see RESEARCH.md's already-written full example, verified against this same source).

---

### `features/transaction-form/api/delete-transaction.action.ts` (controller, request-response)

**Analog:** `apps/web/src/features/category-form/api/delete-category.action.ts` (full file read above) — **but drop the `error.status === 409` / `blocked: true` branch** (Pitfall 3: transactions have no FK-restrict dependents).

**Pattern to keep (session check + try/catch + revalidatePath loop), pattern to drop (the `ApiError`/409 special-case):**
```typescript
'use server';

import { revalidatePath } from 'next/cache';
import { getSession } from '@/entities/session/api/session';
import { deleteTransaction } from '@/entities/transaction/api/delete-transaction';
import { apiErrorMessage } from '@/shared/api/error-message';
import { TRANSACTION_AFFECTED_PATHS } from '@/features/transaction-form/model/affected-paths';
import type { TransactionActionState } from '@/features/transaction-form/model/types';

export async function deleteTransactionAction(id: string): Promise<TransactionActionState> {
  const session = await getSession();
  if (!session) {
    return { error: 'Сессия истекла, войдите заново' };
  }

  try {
    await deleteTransaction(session.accessToken, id);
  } catch (error) {
    return { error: apiErrorMessage(error) };
  }

  for (const path of TRANSACTION_AFFECTED_PATHS) {
    revalidatePath(path);
  }
  return { success: true };
}
```
Note: no `ApiError` import needed here (unlike the category analog) — there is no 409 branch to special-case.

---

### `features/transaction-form/model/types.ts` (model)

**Analog:** `apps/web/src/features/category-form/model/types.ts` (full file read above)

```typescript
export type CategoryActionState =
  | { success: true }
  | { error: string; fieldErrors?: Record<string, string>; blocked?: boolean }
  | undefined;

export type CategoryFormValues = { name: string; color?: string };
```
For transactions (per RESEARCH.md Pitfall 3, no `blocked` field):
```typescript
export type TransactionActionState =
  | { success: true }
  | { error: string; fieldErrors?: Record<string, string> }
  | undefined;
```
`TransactionFormValues` is exported from `transaction-form-schema.ts` (via `z.infer`) rather than declared separately in `types.ts`, unlike categories — see Pattern B below (schema is local here, whereas `createCategorySchema` comes from `@expense/shared`).

---

### `features/transaction-form/model/affected-paths.ts` (config)

**Analog:** `apps/web/src/features/category-form/model/affected-paths.ts` (full file read above)

```typescript
import { ROUTES } from '@/shared/config/routes';

/**
 * Имя и цвет категории рендерятся в строках транзакций на `/dashboard` и `/expenses`,
 * поэтому ревалидировать только `/categories` недостаточно — иначе на соседних экранах
 * останется старое имя.
 */
export const CATEGORY_AFFECTED_PATHS = [ROUTES.categories, ROUTES.dashboard, ROUTES.expenses];
```
Transaction version (from RESEARCH.md, verified `ROUTES.dashboard`/`ROUTES.expenses` exist at `apps/web/src/shared/config/routes.ts:6-7`):
```typescript
import { ROUTES } from '@/shared/config/routes';

/** Транзакции отображаются на /dashboard (recent-transactions) и /expenses (полный список).
 *  /categories не входит — категория не меняется мутацией транзакции. */
export const TRANSACTION_AFFECTED_PATHS = [ROUTES.dashboard, ROUTES.expenses];
```

---

### `features/transaction-form/ui/transaction-form.tsx` (component/form, request-response)

**Analog:** `apps/web/src/features/category-form/ui/category-form.tsx` (full file read above, 125 lines)

**Imports pattern** (lines 1-28):
```typescript
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2Icon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { createCategorySchema, type Category, type CreateCategoryInput } from '@expense/shared';
import { createCategoryAction } from '@/features/category-form/api/create-category.action';
import { updateCategoryAction } from '@/features/category-form/api/update-category.action';
import type { CategoryFormValues } from '@/features/category-form/model/types';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/ui/form';
import { Input } from '@/shared/ui/input';
```
For transactions: `transactionFormSchema` comes from local `features/transaction-form/model/transaction-form-schema.ts` (not `@expense/shared` — see RESEARCH.md "Explicitly NOT installed"), everything else mirrors 1:1 (`createTransactionAction`/`updateTransactionAction`, `TransactionFormValues`).

**Core pattern — own-Dialog + create/edit branch + submit handler** (lines 30-124, structure to copy exactly):
```typescript
interface CategoryFormProps {
  /** undefined → создание; заполненный → редактирование (D-02). */
  category?: Category;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CategoryForm({ category, open, onOpenChange }: CategoryFormProps) {
  const form = useForm<CategoryFormValues, unknown, CreateCategoryInput>({
    resolver: zodResolver(createCategorySchema),
    defaultValues: category
      ? { name: category.name, color: category.color }
      : { name: '', color: CATEGORY_COLORS[0] },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    const result = category
      ? await updateCategoryAction(category.id, values)
      : await createCategoryAction(values);

    if (result && 'error' in result) {
      if (result.fieldErrors) {
        for (const [field, message] of Object.entries(result.fieldErrors)) {
          if (field === 'name' || field === 'color') {
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
          <DialogTitle>{category ? 'Изменить категорию' : 'Новая категория'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={onSubmit} className="grid gap-4" noValidate>
            {/* FormField per field, Button type="submit" with Loader2Icon while isSubmitting */}
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
```

**Critical structural note (from RESEARCH.md, verified against this exact file):** the form owns its own `<Dialog>` internally (line 76) — callers (`QuickAddTransaction`, `ExpensesView`'s list widget) must NOT wrap `<TransactionForm>` in a second `<Dialog>`. `CategoryList` (below) just toggles state and renders the form conditionally.

**Type-toggle field (D-01, new vs. `CategoryForm`'s color picker) — two plain `Button`s, no new primitive:**
```tsx
<div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Тип транзакции">
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
```

**Submit copy per UI-SPEC:** create → "Добавить" / "Новая транзакция"; edit → "Сохранить" / "Изменить транзакцию" (differs from `CategoryForm`'s "Создать"/"Изменить категорию" — use UI-SPEC's exact copy table, not the category analog's copy).

---

### `features/transaction-form/ui/transaction-delete-dialog.tsx` (component, request-response)

**Analog:** `apps/web/src/features/category-form/ui/category-delete-dialog.tsx` (full file read above, 76 lines)

**Full structure to mirror minus the blocked branch:**
```typescript
'use client';

import { useState, type MouseEvent } from 'react';
import { Loader2Icon } from 'lucide-react';
import { toast } from 'sonner';
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
import type { Transaction } from '@/entities/transaction/model/types';

interface TransactionDeleteDialogProps {
  transaction: Transaction;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransactionDeleteDialog({ transaction, open, onOpenChange }: TransactionDeleteDialogProps) {
  const [isPending, setIsPending] = useState(false);

  const handleConfirm = async (event: MouseEvent) => {
    // Radix закрывает AlertDialog сразу после клика.
    event.preventDefault();
    setIsPending(true);
    const result = await deleteTransactionAction(transaction.id);
    setIsPending(false);

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
```
Dropped vs. analog: `blockedMessage` state, the `result.blocked` branch, the `{blockedMessage ? ... : null}` render — no FK dependents for transactions (Pitfall 3). No item-name interpolation in the title (UI-SPEC: transactions have no short display name) — unlike `category.name` in the analog's title.

---

### `widgets/expenses-list` / delete-row-actions wiring (component, CRUD via client state)

**Analog:** `apps/web/src/widgets/category-list/ui/category-list.tsx` (full file read above, 114 lines)

**Core pattern — two independent `useState` targets, conditional dialog rendering:**
```typescript
'use client';

export function CategoryList({ categories }: CategoryListProps) {
  const [formTarget, setFormTarget] = useState<Category | 'create' | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Категории</CardTitle>
        <Button onClick={() => setFormTarget('create')}>Создать категорию</Button>
      </CardHeader>
      <CardContent>
        {/* table with per-row ghost Button pair: Редактировать / Удалить (text-destructive) */}
      </CardContent>

      {formTarget !== null && (
        <CategoryForm
          key={formTarget === 'create' ? 'create' : formTarget.id}
          category={formTarget === 'create' ? undefined : formTarget}
          open
          onOpenChange={(next) => { if (!next) setFormTarget(null); }}
        />
      )}

      {deleteTarget !== null && (
        <CategoryDeleteDialog
          key={deleteTarget.id}
          category={deleteTarget}
          open
          onOpenChange={(next) => { if (!next) setDeleteTarget(null); }}
        />
      )}
    </Card>
  );
}
```
Row actions (lines 62-77, exact ghost `Button` pair — **no `dropdown-menu`**, confirmed no precedent exists in this codebase):
```tsx
<Button variant="ghost" size="sm" onClick={() => setFormTarget(category)}>Редактировать</Button>
<Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDeleteTarget(category)}>Удалить</Button>
```
Table cell layout for transaction rows should reuse `CategoryDot` + `TransactionAmount` exactly as `widgets/recent-transactions/ui/transactions-table.tsx` already does (see below) — this is the direct analog for the `/expenses` table body, `category-list.tsx` is the analog for the dialog-state-management wrapper around it.

---

### `views/expenses/ui/expenses-view.tsx` (component/RSC view, request-response)

**Analog A (session/error/redirect skeleton):** `apps/web/src/views/categories/ui/categories-view.tsx` (full file read above)
```typescript
export async function CategoriesView() {
  const session = await getSession();
  if (!session) {
    redirect(ROUTES.login);
  }

  let categories: Category[] = [];
  let loadError: string | null = null;

  try {
    categories = await getCategories(session.accessToken);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      redirect(ROUTES.sessionExpired);
    }
    loadError = apiErrorMessage(error);
  }

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">Категории</h1>
      {loadError ? (
        <p className="text-sm text-destructive">Не удалось загрузить категории: {loadError}</p>
      ) : (
        <CategoryList categories={categories} />
      )}
    </main>
  );
}
```

**Analog B (searchParams-driven pagination + Promise.allSettled category join):** `apps/web/src/widgets/recent-transactions/api/load-recent-transactions.ts` (full file read above) — `ExpensesView` needs the same `Promise.allSettled([getTransactions(...), getCategories(...)])` pattern, but additionally reading `type`/`categoryId`/`dateFrom`/`dateTo` out of `searchParams` (Phase 2's new addition, no existing analog for the filter-param passthrough itself — see Pattern C in RESEARCH.md, already verified against `transaction-query.dto.ts`).

**True-empty vs. filtered-empty distinction (new this phase, no analog):** check whether any of `type`/`categoryId`/`dateFrom`/`dateTo` is present in `searchParams` to choose between "Пока нет транзакций" (with CTA) and "Ничего не найдено" (no CTA) — per UI-SPEC Copywriting Contract, this branching logic has no Phase-1 precedent (categories have no filters) and must be written fresh in `ExpensesView`.

---

### `widgets/transaction-filters/ui/transaction-filters.tsx` (component, request-response — URL-driven)

**Analog:** `apps/web/src/widgets/recent-transactions/ui/pagination-nav.tsx` (full file read above) — for the *philosophy* only (URL searchParams as sole source of truth, no independent client state that could drift). No direct UI analog exists in the codebase (first filter panel), but the update-URL mechanics should mirror `pageHref`'s pattern of building a URL from `basePath` + params:
```typescript
import Link from 'next/link';
import { pageHref } from '@/shared/lib/pagination';
// pageHref(basePath, page) builds `${basePath}?page=${page}` — transaction-filters needs an
// equivalent helper (new, e.g. `filterHref`/`useRouter().push`) building `${basePath}?type=...&categoryId=...&dateFrom=...&dateTo=...`,
// since the inputs (Select, Popover+Calendar) are interactive and need 'use client' + router.push,
// unlike PaginationNav's plain server-rendered <Link>.
```
Because the filter's `Select`/`Popover`+`Calendar` are Radix client components, this widget needs a `'use client'` boundary that reads initial values from props (passed down from `ExpensesView`'s `searchParams` read) and calls `router.push` on change — it must not hold independent "active filter" state.

---

### `widgets/recent-transactions/ui/recent-transactions.tsx` (modify — add `headerAction` prop)

**Analog:** `apps/web/src/widgets/category-list/ui/category-list.tsx:32-35` (`CardHeader className="flex flex-row items-center justify-between"` + `CardTitle` + `Button` side by side)

**Current file** (full file read above, 51 lines) — header currently has only `CardTitle`:
```tsx
<CardHeader>
  <CardTitle>Последние транзакции</CardTitle>
</CardHeader>
```
Change to accept `headerAction?: ReactNode` and render it next to the title, same `flex justify-between` treatment as `CategoryList`, so the widget stays presentation-agnostic (does not import `QuickAddTransaction` itself — caller `DashboardView` passes it in):
```tsx
<CardHeader className="flex flex-row items-center justify-between">
  <CardTitle>Последние транзакции</CardTitle>
  {headerAction}
</CardHeader>
```

---

### `views/dashboard/ui/dashboard-view.tsx` (modify — wire quick-add)

**Analog:** same file, current full content read above (52 lines) — add `<QuickAddTransaction categories={...} />` as the `headerAction` prop passed to `<RecentTransactions>`. `DashboardView` will additionally need `getCategories(session.accessToken)` (mirrors the `Promise.allSettled` category-join already done in `loadRecentTransactions`, per cross-entity-import ban — `entities/transaction` cannot import `entities/category`).

## Shared Patterns

### Authentication / Session
**Source:** `apps/web/src/entities/session/api/session.ts` `getSession()` — used identically in every Server Action and RSC view above (`getSession()` → `redirect(ROUTES.login)` if RSC, or `{ error: 'Сессия истекла, войдите заново' }` if Server Action).
**Apply to:** All new Server Actions (`create/update/delete-transaction.action.ts`) and `expenses-view.tsx`.

### Error Handling
**Source:** `apps/web/src/shared/api/error-message.ts` — `apiErrorMessage(error)` (full file read above) and `extractFieldErrors(error)`.
```typescript
export function apiErrorMessage(error: unknown): string { /* ApiError → FALLBACK/500/zod-issue/message */ }
export function extractFieldErrors(error: unknown): Record<string, string> | null { /* 400 grouped-body only */ }
```
**Apply to:** All three Server Actions (`extractFieldErrors` called before `apiErrorMessage` in `catch`, exact order as `update-category.action.ts:26-30`) and both `TransactionForm`/`TransactionDeleteDialog` (toast fallback).

### Revalidation
**Source:** `apps/web/src/features/category-form/model/affected-paths.ts` pattern — `for (const path of X_AFFECTED_PATHS) revalidatePath(path)` after every successful mutation.
**Apply to:** All three transaction Server Actions, using `TRANSACTION_AFFECTED_PATHS = [ROUTES.dashboard, ROUTES.expenses]`.

### Cross-entity category join (Promise.allSettled + Map)
**Source:** `apps/web/src/widgets/recent-transactions/api/load-recent-transactions.ts` (full file read above) — `entities/transaction` cannot import `entities/category` (cross-entity-import ban), so callers fetch both and join by `Map`.
**Apply to:** `ExpensesView`, `DashboardView` (for `QuickAddTransaction`'s category `<Select>` options), any widget needing category name/color alongside a transaction.

### Amount display
**Source:** `apps/web/src/entities/transaction/ui/transaction-amount.tsx` (full file read above, D-03 already implemented) — reuse verbatim, no new component.
```typescript
export function TransactionAmount({ amount, type, className }: TransactionAmountProps) {
  const isExpense = type === 'EXPENSE';
  return (
    <span className={cn('font-medium tabular-nums', isExpense ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400', className)}>
      {isExpense ? '−' : '+'}{formatMoney(amount)}
    </span>
  );
}
```
**Apply to:** `/expenses` table rows (same as `TransactionsTable`), any transaction-amount display.

### Table row rendering (category dot + date + description + amount)
**Source:** `apps/web/src/widgets/recent-transactions/ui/transactions-table.tsx` (full file read above) — direct template for `/expenses` table body, add row-action `Button` pair (ghost, per `CategoryList`) as an extra `TableCell`.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `widgets/transaction-filters/ui/transaction-filters.tsx` | component | request-response | First filter panel in the codebase — `Select`×2 + `Popover`+`Calendar mode="range"` combo has no prior instance; only the URL-source-of-truth *philosophy* has a precedent (`PaginationNav`). Planner should follow RESEARCH.md Pattern C's exact query-param contract instead of a code analog. |
| `features/transaction-form/model/transaction-form-schema.ts` | model | transform | No local (non-`@expense/shared`) Zod schema precedent exists yet in `features/*/model/` — `packages/shared/src/schemas/category.ts` only provides *style* (Zod v4 conventions: `z.uuid()`, `z.iso.datetime()`), not a structural analog, since categories' schema lives in the shared package, not locally. Use RESEARCH.md Pattern B's fully-written example (already mirrors `transaction-validation.ts` regexes verbatim). |

## Metadata

**Analog search scope:** `apps/web/src/features/category-form/`, `apps/web/src/widgets/{category-list,recent-transactions}/`, `apps/web/src/views/{categories,dashboard}/`, `apps/web/src/entities/transaction/`, `apps/web/src/shared/{api,config,lib,ui}/`
**Files scanned:** 22 tracked source files (all confirmed via `git ls-files`, none are gitignored mirrors)
**Pattern extraction date:** 2026-09-21
