# Phase 3: Сводка и баланс - Pattern Map

**Mapped:** 2026-09-21
**Files analyzed:** 6 (2 new files that combine into fewer physical files per RESEARCH.md
recommended structure, 1 modified type file, 1 modified integration file, widget UI files
optionally split into up to 3)
**Analogs found:** 6 / 6

All analog paths below are git-tracked (`git ls-files` verified this session — no gitignored
mirrors involved).

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `entities/transaction/api/get-summary.ts` | service (entity-api) | request-response | `entities/transaction/api/get-transactions.ts` | exact (same role, same accessToken-param convention, same `apiFetch` call shape) |
| `entities/transaction/model/types.ts` (MODIFIED — add `TransactionSummary`, `SummaryCategoryItem`) | model | transform (type mirror of api response) | same file, existing `Transaction`/`TransactionList` block | exact (already the pattern to extend, not a separate analog) |
| `widgets/monthly-summary/api/load-monthly-summary.ts` | service (server loader) | request-response | `widgets/recent-transactions/api/load-recent-transactions.ts` | role-match, NOT data-flow-exact — see divergence note below |
| `widgets/monthly-summary/ui/monthly-summary.tsx` (Card wrapper + stat row + divider + table/empty-state) | component | request-response (pure presentation) | `widgets/recent-transactions/ui/recent-transactions.tsx` | exact (Card/CardHeader/CardTitle/CardContent shape, empty-state inline branch) |
| `widgets/monthly-summary/ui/summary-category-table.tsx` (optional split) | component | CRUD-read (list render) | `widgets/recent-transactions/ui/transactions-table.tsx` | exact (Table/TableHeader/TableBody row loop, `CategoryDot` + `TransactionAmount` reuse) |
| `views/dashboard/ui/dashboard-view.tsx` (MODIFIED — third parallel call) | controller (RSC view) | request-response | same file, existing `Promise.all([loadRecentTransactions, getCurrentUser])` block | exact (already the integration point to extend) |

## Pattern Assignments

### `entities/transaction/api/get-summary.ts` (service, request-response)

**Analog:** `apps/web/src/entities/transaction/api/get-transactions.ts` (whole file, 33 lines — tracked)

**Imports pattern** (lines 1-3):
```typescript
import 'server-only';
import { apiFetch } from '@/shared/api/api-client';
import type { TransactionList, TransactionType } from '@/entities/transaction/model/types';
```
For the new file, swap the type import to `TransactionSummary`.

**Auth pattern:** none inside the entity-api file itself — `accessToken` is a plain function
parameter (see comment lines 15-18 of the analog: "Токен приходит параметром, а не читается
изнутри entity — кросс-импорты внутри entities запрещены").

**Core request-response pattern** (lines 19-33):
```typescript
export function getTransactions(
  accessToken: string,
  { limit, offset, type, categoryId, dateFrom, dateTo }: GetTransactionsParams,
): Promise<TransactionList> {
  const query = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (type) query.set('type', type);
  if (categoryId) query.set('categoryId', categoryId);
  if (dateFrom) query.set('dateFrom', dateFrom);
  if (dateTo) query.set('dateTo', dateTo);
  return apiFetch<TransactionList>(`/transactions?${query}`, {
    accessToken,
    cache: 'no-store',
  });
}
```
**What to copy:** the `URLSearchParams` + `apiFetch(<path>?<query>, { accessToken, cache: 'no-store' })`
shape verbatim.
**What to change:** both `month`/`year` are ALWAYS set (never conditional `if`) — `SummaryQueryDto`
on the api has no `@IsOptional` (see RESEARCH.md Pitfall 3), unlike this analog's four optional
filters. Function signature becomes `getSummary(accessToken: string, { month, year }: { month: number; year: number }): Promise<TransactionSummary>`.
**No error handling / validation inside this file** — same as the analog, errors bubble to the
caller (the widget loader) as `ApiError` thrown by `apiFetch`.

---

### `entities/transaction/model/types.ts` (MODIFIED — model)

**Analog:** same file, existing block (whole file, 33 lines — tracked). Add after `UpdateTransactionInput`:
```typescript
export interface SummaryCategoryItem {
  categoryId: string;
  name: string;
  color: string;
  type: TransactionType;
  total: string;
}

export interface TransactionSummary {
  month: number;
  year: number;
  from: string;
  to: string;
  income: string;
  expense: string;
  balance: string;
  byCategory: SummaryCategoryItem[];
}
```
**What to copy:** field-for-field mirror of `apps/api/src/modules/transactions/transaction.types.ts`
lines 19-36 — comment convention at top of file ("Зеркало ... — менять оба места") already
covers this addition, no new comment needed per-type, just keep the block inside the existing
mirrored section.
**Reuses existing `TransactionType`** already declared at line 5 of this file — do not redeclare.

---

### `widgets/monthly-summary/api/load-monthly-summary.ts` (service, server loader)

**Analog:** `apps/web/src/widgets/recent-transactions/api/load-recent-transactions.ts` (whole file, 62 lines — tracked)

**Imports pattern** (lines 1-8 of analog, adapted):
```typescript
import 'server-only';
import { getTransactions } from '@/entities/transaction/api/get-transactions';
import { ApiError } from '@/shared/api/api-client';
import { apiErrorMessage } from '@/shared/api/error-message';
import { PAGE_SIZE } from '@/shared/lib/pagination';
import type { TransactionRowModel } from '@/widgets/recent-transactions/model/types';
```
New file swaps to: `getSummary` from `@/entities/transaction/api/get-summary`, `ApiError`/`apiErrorMessage`
unchanged, and `TransactionSummary` type instead of `TransactionRowModel`. No `PAGE_SIZE`/`getCategories` import needed.

**Discriminated-union result type** (lines 10-13):
```typescript
export type LoadRecentTransactionsResult =
  | { status: 'ok'; rows: TransactionRowModel[]; total: number; categories: Category[] }
  | { status: 'unauthorized' }
  | { status: 'error'; message: string };
```
New file: `LoadMonthlySummaryResult = { status: 'ok'; summary: TransactionSummary } | { status: 'unauthorized' } | { status: 'error'; message: string }`.

**CRITICAL DIVERGENCE — do not copy `Promise.allSettled`:** the analog uses `Promise.allSettled`
(lines 31-49) because it fires TWO parallel requests (`getTransactions` + `getCategories`) and
must disambiguate which one failed. `loadMonthlySummary` fires exactly ONE request (`getSummary`)
— `SummaryCategoryItem` already carries `name`/`color` from the server join, so no second
`getCategories` call exists to race against. Use a plain `try/catch` instead:
```typescript
export async function loadMonthlySummary(accessToken: string): Promise<LoadMonthlySummaryResult> {
  const now = new Date();
  const month = now.getUTCMonth() + 1; // UTC, not local — matches Date.UTC in transactions.service.ts
  const year = now.getUTCFullYear();

  try {
    const summary = await getSummary(accessToken, { month, year });
    return { status: 'ok', summary };
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return { status: 'unauthorized' };
    }
    return { status: 'error', message: `Сводка: ${apiErrorMessage(error)}` };
  }
}
```
**401 detection pattern to keep** (mirrors analog lines 36-39's `instanceof ApiError && .status === 401`
check, just simplified from an array-of-results `.some()` to a single `instanceof` check since
there is only one result to inspect).
**Error-message prefix convention to keep:** analog prefixes messages per-source (`` `Транзакции: ${...}` ``,
`` `Категории: ${...}` ``, lines 45/48) — new file uses a single prefix `` `Сводка: ${...}` `` since
there's only one possible failing call.

---

### `widgets/monthly-summary/ui/monthly-summary.tsx` (component, Card wrapper)

**Analog:** `apps/web/src/widgets/recent-transactions/ui/recent-transactions.tsx` (whole file, 62 lines — tracked)

**Imports pattern** (lines 1-7, adapted):
```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import type { TransactionSummary } from '@/entities/transaction/model/types';
// no PaginationNav/EmptyState import — this widget has neither pagination nor the shared EmptyState component
```

**Core Card structure pattern** (lines 32-61, adapted per UI-SPEC's exact layout):
```typescript
export function MonthlySummary({ summary }: { summary: TransactionSummary }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Сводка за месяц</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {/* Zone 1: stat row, Zone 2: border-t pt-4 divider + table/empty-state — see 03-UI-SPEC.md Layout */}
      </CardContent>
    </Card>
  );
}
```
**What to copy:** `Card`/`CardHeader`/`CardTitle`/`CardContent className="flex flex-col gap-4"`
container shape verbatim — same visual idiom as `RecentTransactions`.
**What NOT to copy:** the analog's conditional `rows.length === 0 ? <EmptyState .../> : <>...</>`
branch uses the shared `EmptyState` component from the SAME widget slice — cross-slice import
of `widgets/recent-transactions/ui/empty-state.tsx` into `widgets/monthly-summary` is forbidden
by the FSD "no cross-imports within a layer" rule (explicitly called out as an anti-pattern in
03-RESEARCH.md). Inline a plain `<p className="text-sm text-muted-foreground">Нет данных за
текущий месяц</p>` instead, scoped only to the `byCategory` empty branch (not the whole widget —
the three stat cards still render even when `byCategory` is empty, per D-07).
**Pagination (`totalPages`/`PaginationNav`, analog lines 3-4, 28, 56) does not apply** — this
widget has no pagination, omit entirely.

---

### `widgets/monthly-summary/ui/summary-category-table.tsx` (component, list render)

**Analog:** `apps/web/src/widgets/recent-transactions/ui/transactions-table.tsx` (whole file, 48 lines — tracked)

**Imports pattern** (lines 1-11, adapted — drop `formatDate`, it doesn't apply here):
```typescript
import { CategoryDot } from '@/entities/category/ui/category-dot';
import { TransactionAmount } from '@/entities/transaction/ui/transaction-amount';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/shared/ui/table';
import type { SummaryCategoryItem } from '@/entities/transaction/model/types';
```

**Core row pattern** (lines 18-48, adapted):
```typescript
export function SummaryCategoryTable({ items }: { items: SummaryCategoryItem[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Категория</TableHead>
          <TableHead className="text-right">Сумма</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={`${item.categoryId}-${item.type}`}>
            <TableCell>
              <span className="flex items-center gap-2">
                <CategoryDot color={item.color} />
                {item.name}
              </span>
            </TableCell>
            <TableCell className="text-right">
              <TransactionAmount amount={item.total} type={item.type} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```
**What to copy:** `CategoryDot` + name in a `<span className="flex items-center gap-2">` (analog
lines 33-38) verbatim, and `<TransactionAmount amount=... type=.../>` in the right-aligned cell
(analog line 41) verbatim — proп-shape matches `SummaryCategoryItem` 1:1 (`total`→`amount`).
**What to change:** analog's row `key={row.id}` (line 31) is NOT sufficient here — use
`` key={`${item.categoryId}-${item.type}`} ``. Reason: `groupBy(['categoryId', 'type'])` on the
api can produce two rows sharing the same `categoryId` (once as INCOME, once as EXPENSE) for a
category used both ways in one month — plain `categoryId` key would collide (RESEARCH.md Pitfall 2).
Drop the "Дата"/"Описание" columns entirely (analog lines 23, 25, 32, 39) — table has exactly two
columns per D-06.

---

### `views/dashboard/ui/dashboard-view.tsx` (MODIFIED — controller/RSC view)

**Analog:** same file, existing block (whole file, 55 lines — tracked)

**Current integration point** (lines 6-8, 20-26, 41-51):
```typescript
import { loadRecentTransactions } from '@/widgets/recent-transactions/api/load-recent-transactions';
import { RecentTransactions } from '@/widgets/recent-transactions/ui/recent-transactions';
// ...
const [result, profile] = await Promise.all([
  loadRecentTransactions(session.accessToken, page),
  getCurrentUser(session.accessToken).catch(() => null),
]);
// ...
if (result.status === 'unauthorized') {
  redirect(ROUTES.sessionExpired);
}
// ...
{result.status === 'error' ? (
  <p className="text-sm text-destructive">Не удалось загрузить данные: {result.message}</p>
) : (
  <RecentTransactions ... />
)}
```
**What to copy:** the `Promise.all` array shape, the `redirect` unauthorized check placed OUTSIDE
any try/catch (comment at analog lines 28-30 explains why — `redirect` throws `NEXT_REDIRECT`,
a catch would swallow it), and the ternary error-branch-vs-component-branch idiom.
**What to change:**
1. Add `loadMonthlySummary` import (`@/widgets/monthly-summary/api/load-monthly-summary`) and
   `MonthlySummary` UI import (`@/widgets/monthly-summary/ui/monthly-summary`).
2. Extend `Promise.all` to three entries: `[result, summaryResult, profile]` — order matters
   only for destructuring, not for parallelism.
3. Extend the unauthorized guard: `if (result.status === 'unauthorized' || summaryResult.status === 'unauthorized')`.
4. Add a second independent ternary block for `summaryResult`, placed BEFORE the existing
   `RecentTransactions` block per D-01 (summary renders first in reading order), using the
   parallel error copy `` `Не удалось загрузить сводку: ${summaryResult.message}` `` (mirrors the
   exact "Не удалось загрузить данные: …" structural pattern already used for the transactions branch).
   The two error/success branches are INDEPENDENT — a summary error does not block the
   transactions list rendering, and vice versa (no shared catch).

---

## Shared Patterns

### `server-only` + accessToken-param entity-api convention
**Source:** `apps/web/src/entities/transaction/api/get-transactions.ts` lines 1, 15-18
**Apply to:** `entities/transaction/api/get-summary.ts`
```typescript
import 'server-only';
// Токен приходит параметром, а не читается изнутри entity: entities/session — соседний
// слайс, кросс-импорты внутри entities запрещены правилами FSD проекта.
export function getSummary(accessToken: string, params: { month: number; year: number }) { /* ... */ }
```

### Discriminated-union server loader result + 401 disambiguation
**Source:** `apps/web/src/widgets/recent-transactions/api/load-recent-transactions.ts` lines 10-13, 36-42
**Apply to:** `widgets/monthly-summary/api/load-monthly-summary.ts` (simplified to try/catch, see
Pattern Assignments divergence note above — do not carry over `Promise.allSettled`)

### Money formatting — `formatMoney`
**Source:** `apps/web/src/shared/lib/utils.ts` (`formatMoney`, `Intl.NumberFormat('ru-RU', { style: 'currency', currency })`)
**Apply to:** stat-card values (`monthly-summary.tsx`) — the ONLY formatter in the project (D-04);
never write a second `toFixed`/manual formatter. Negative `balance` renders its own `−` via
`Intl.NumberFormat`, no manual prefix needed (see RESEARCH.md Pitfall 4 / Pattern 5).

### Card container convention
**Source:** `apps/web/src/shared/ui/card.tsx` + usage in `recent-transactions.tsx` lines 33, 38
**Apply to:** `monthly-summary.tsx` — single `Card` wraps stat row + table (not three separate `Card`s, D-03)

### Signed/colored amount — `TransactionAmount` reused directly (not just its color convention)
**Source:** `apps/web/src/entities/transaction/ui/transaction-amount.tsx` (whole file, 25 lines)
**Apply to:** `summary-category-table.tsx` rows directly (`{amount, type}` prop-shape matches
`SummaryCategoryItem` 1:1). Do NOT reuse for the three stat cards — `TransactionAmount` requires
`type: TransactionType`, which the "Баланс"/"Доходы"/"Расходы" aggregates don't semantically have
(RESEARCH.md Pitfall 4). Stat cards need a small bespoke component using `formatMoney` +
explicit `colorClassName` prop instead (see 03-UI-SPEC.md `SummaryStat` — `text-2xl font-semibold
tabular-nums` + `cn(..., colorClassName)`, no `+`/`−` prefix added).

### Category color dot
**Source:** `apps/web/src/entities/category/ui/category-dot.tsx` (whole file, 15 lines)
**Apply to:** `summary-category-table.tsx` rows, identical usage to `transactions-table.tsx` line 35 (`<CategoryDot color={item.color} />`)

## No Analog Found

None — every new file in this phase has a matched analog above (RESEARCH.md confirms this phase
introduces no new architectural shape, only recombines existing patterns from Phases 1-2).

## Metadata

**Analog search scope:** `apps/web/src/entities/transaction`, `apps/web/src/entities/category`,
`apps/web/src/widgets/recent-transactions`, `apps/web/src/views/dashboard`, `apps/web/src/shared/ui`,
`apps/web/src/shared/lib`
**Files scanned:** 11 (all confirmed git-tracked via `git ls-files`, no gitignored mirrors)
**Pattern extraction date:** 2026-09-21
