# Phase 2: Транзакции - Research

**Researched:** 2026-09-21
**Domain:** Frontend CRUD (transaction add/edit/delete/list/filter) on an already-complete Nest 12 backend — Next.js 16 App Router (FSD) + react-hook-form + Zod, brownfield extension of Phase 1's category-form slice
**Confidence:** HIGH — every claim below is either a direct file read of this repo (this session) or a registry check; no claim depends on ecosystem web search that wasn't already cross-checked in the project-level research this document builds on.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Форма транзакции**
- **D-01:** Тип (доход/расход) выбирается переключателем/табами в верху формы, не select —
  консистентно с решением по форме категории в Phase 1 (D-01 там был про Dialog, но тот же
  принцип «явный переключатель, не select» уже одобрен пользователем здесь явно)
- **D-02:** Форма живёт в `Dialog` на обоих экранах — и на `/dashboard` (quick-add), и на
  `/expenses`. Один компонент `TransactionForm`, два вызывающих места оборачивают его в Dialog
  каждый у себя (как исследование ARCHITECTURE.md и предписывает)

**Список транзакций и визуализация**
- **D-03:** Сумма визуализируется цветом + знаком (зелёный `+`, красный `−`) — переиспользовать
  существующий `entities/transaction/ui/transaction-amount.tsx` (`TransactionAmount`), уже
  реализующий именно это для дашборда. Новый компонент писать не нужно.
- **D-04:** Фильтры на `/expenses` — панель над таблицей (период, тип, категория), видны сразу,
  без сворачивания в отдельный блок/кнопку

**Границы скопа**
- **D-05:** Маршрут `/expenses` остаётся как есть (техдолг: сущность в API — `transaction`,
  модуль `expenses` удалён ещё раньше) — переименование роута НЕ входит в эту фазу,
  зафиксировано пользователем явно

### Claude's Discretion
- Точное расположение кнопки быстрого добавления на `/dashboard` (в шапке существующего
  блока `recent-transactions` или отдельно)
- Набор полей фильтра (dropdown vs. date range picker для периода) — Claude выбирает
  консистентно с уже установленными shadcn-примитивами (`Popover`+`Calendar` уже
  предусмотрены research STACK.md)

### Deferred Ideas (OUT OF SCOPE)
- Переименование `/expenses` в соответствие с сущностью `transaction` — техдолг, не в этой
  фазе (D-05)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TXN-01 | Добавить транзакцию (тип-переключатель, сумма, категория, дата=сегодня по умолчанию, необязательное описание) | Zod schema (`## Code Examples` → Pattern A), `AMOUNT_PATTERN`/`AMOUNT_NOT_ZERO`/date-noon-UTC convention confirmed against actual DTO source; `Select` for category, `Popover`+`Calendar` for date — package legitimacy confirmed |
| TXN-02 | Редактировать транзакцию — форма предзаполнена | `TransactionForm` `transaction?` prop pattern mirrored 1:1 from `CategoryForm` (verified source read); `UpdateTransactionDto` all-optional-with-`ValidateIf` shape documented |
| TXN-03 | Удалить транзакцию с подтверждением | `AlertDialog` already installed (Phase 1) — mirror `CategoryDeleteDialog` exactly, no 409 branch needed (transactions have no FK-restrict dependents) |
| TXN-04 | `/expenses` — полный список с пагинацией | Exact pagination contract confirmed from `transaction-query.dto.ts` + `transactions.service.ts` (`limit`/`offset`, default 20, max 100, `{items,total}`); reuse `PAGE_SIZE`/`totalPages`/`pageHref` from `shared/lib/pagination.ts` |
| TXN-05 | Быстрое добавление с `/dashboard`, одна форма с `/expenses` | `widgets/quick-add-transaction` wraps `features/transaction-form` — Dialog chrome only, zero form logic (Anti-Pattern 1 in project ARCHITECTURE.md) |
| TXN-06 | Фильтр по периоду/типу/категории на основе реальных query-параметров API | Exact confirmed param names from `TransactionQueryDto`: `dateFrom`, `dateTo`, `type`, `categoryId`, `limit`, `offset` — **no** `month`/`year` on the list endpoint (those exist only on `/transactions/summary`, a different DTO) |
</phase_requirements>

## Summary

The backend for this phase is complete and was read directly this session — nothing here
requires backend changes. The frontend work is a straight extension of the exact pattern
Phase 1 already established for categories: a `features/*-form` slice with `'use server'`
actions, a local per-mutation entity API file taking `accessToken` as a parameter, a shared
`*_AFFECTED_PATHS` array fed into `revalidatePath()` in every action, and a `Dialog`/`AlertDialog`
pair driven by two independent `useState` targets in the list widget. Every one of those pieces
already exists in `apps/web/src/features/category-form/` and can be copied field-for-field with
transaction-specific values substituted in.

Two things go beyond copy-paste and needed concrete verification in this pass. First, the CONTEXT.md
decision to give transactions their own local Zod schema (unlike categories, which reuse
`@expense/shared`'s `categorySchema`) means a new `transaction-form-schema.ts` has to mirror
`CreateTransactionDto`/`UpdateTransactionDto` field-for-field, and the exact regexes for that
mirror were read directly from `transaction-validation.ts` (below). Second, the filter panel's
`dateFrom`/`dateTo` query params turn out to have different, *simpler* handling than the
create/edit form's `date` field: `TransactionQueryDto` accepts plain `YYYY-MM-DD` strings and
`transactions.service.ts`'s `buildDateFilter()` special-cases them (adds a full day so `dateTo` is
inclusive) — sending the noon-UTC-timestamp trick the create form needs would still work but is
unnecessary complexity for the filter, and getting this wrong either way doesn't corrupt data,
only search results.

**Primary recommendation:** Build `features/transaction-form/` as a structural clone of
`features/category-form/` (same four-file shape: `api/*.action.ts` ×3, `model/types.ts` +
new `model/transaction-form-schema.ts`, `ui/transaction-form.tsx` + `ui/transaction-delete-dialog.tsx`),
install `select`, `popover`, `calendar` via shadcn CLI (drop `dropdown-menu` from the earlier
STACK.md list — Phase 1's actual `CategoryList` used plain ghost `Button`s for row actions, not
a `DropdownMenu`, so there is no real precedent to extend for that primitive), and build the
`/expenses` filter panel as a `'use client'` component that mutates the URL query string, exactly
as the existing `PaginationNav` does with plain `<Link>`s — no client fetch library, no new state
manager.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Transaction add/edit form fields + client validation | Frontend Server (RSC boundary) / Browser | — | `'use client'` component (`TransactionForm`), but its Server Action sibling lives in the same feature slice — this is the FSD `features/` tier, not a separate "browser" concern |
| Transaction create/update/delete mutation | API / Backend | Frontend Server (Server Action) | Real validation + persistence is 100% in `TransactionsService`/DTOs (already built); the Server Action is a thin authenticated proxy, not business logic |
| categoryId ownership check | API / Backend | — | `assertCategoryBelongsToUser()` in `transactions.service.ts` — client must never assume a stale `categoryId` is valid |
| Transaction list + pagination | API / Backend | Frontend Server (RSC fetch) | `findAll()` does the `where`/`take`/`skip`/`count` work; the RSC (`ExpensesView`) is a pure fetch-and-render pass-through, same as `DashboardView`/`RecentTransactions` today |
| Filter state (period/type/category) | Browser / Client | Frontend Server (URL→searchParams) | Filter inputs are interactive (`Select`, `Popover`+`Calendar`, both Radix), so they need a client boundary; but the *source of truth* for "what's filtered" is the URL query string, read server-side by the page — no separate client filter store |
| Summary/balance display | *(out of scope this phase — SUM-01/02 is Phase 3)* | — | Explicitly not part of TXN-01..06 |
| Router Cache invalidation after mutation | Frontend Server | — | `revalidatePath()` inside each Server Action, same `TRANSACTION_AFFECTED_PATHS` pattern as `CATEGORY_AFFECTED_PATHS` |

## Package Legitimacy Audit

> Required — this phase installs `select`, `popover`, `calendar` (shadcn/Radix primitives) plus
> `date-fns` as a direct dependency of the shadcn `Calendar` pattern.

| Package | Registry | Age (last publish) | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|---------------------|-----------|--------------|---------|-------------|
| `date-fns` | npm | published 2026-05-29 (per registry) | 73,025,628/wk | github.com/date-fns/date-fns | OK | Approved |
| `react-day-picker` | npm | published 2026-05-15 (per registry) | 33,773,893/wk | github.com/gpbl/react-day-picker | OK | Approved — installed transitively by `shadcn add calendar`, not a direct `npm install` target |
| `select`, `popover`, `calendar` (shadcn components) | — | — | — | ui.shadcn.com | N/A | Not registry packages — CLI-generated source files copied into `shared/ui/`, same as the already-installed `dialog.tsx`/`alert-dialog.tsx`. Nothing to audit at the registry level beyond their Radix peer (`radix-ui` 1.6.7, already a pinned dependency — confirmed in `apps/web/package.json`) |

**Packages removed due to `[SLOP]` verdict:** none
**Packages flagged as suspicious `[SUS]`:** none

Verified via `gsd_run query package-legitimacy check --ecosystem npm date-fns react-day-picker`
this session `[VERIFIED: npm registry]`. Both package names were already named in the
project-level `STACK.md` (written 2026-09-20) — that document sourced them from WebSearch, so
per the package-name provenance rule the *names themselves* are `[ASSUMED]` (they read as
standard, well-known packages, but the discovery channel was web search, not official docs);
what this session adds is the `[VERIFIED: npm registry]` legitimacy/existence/version check on
top of those already-assumed names.

**`npm view` cross-check (ran this session):**
```
$ npm view date-fns version
4.4.0
$ npm view react-day-picker version
10.0.1
$ npm view react-day-picker peerDependencies --json
{ "react": ">=16.8.0", "@types/react": ">=16.8.0" }
```
`[VERIFIED: npm registry]` — react-day-picker 10.0.1's peer range (`>=16.8.0`) covers the
project's pinned React 19.2.8, so no version-compat blocker for the shadcn `Calendar` pattern.

## Standard Stack

### Core (already installed — no action needed, confirmed via direct `apps/web/package.json` read `[VERIFIED: apps/web/package.json]`)

| Library | Version (installed) | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `react-hook-form` | 7.87.0 | Transaction form state | Same as `CategoryForm` |
| `@hookform/resolvers` | 5.9.1 | `zodResolver` for the new local schema | Same as `CategoryForm` |
| `zod` | 4.5.4 | `transactionFormSchema` (new, local) | Zod v4 `z.iso.datetime()`/`z.uuid()` already used in `packages/shared/src/schemas/category.ts:16,20` — mirror that style |
| `radix-ui` | 1.6.7 | Underlying primitive for `select`/`popover`/`calendar` (via shadcn CLI) | Already the peer for `dialog.tsx`/`alert-dialog.tsx` |
| `lucide-react` | 1.43.0 | `Loader2Icon` on submit buttons (already used in `CategoryForm`/`CategoryDeleteDialog`) | Consistent icon set |
| `sonner` | 2.0.8 | `toast.error(...)` on non-fieldErrors mutation failures | Same as `CategoryForm` |

### New installs (this phase)

| Library | Version to pin | Purpose | Why |
|---------|---------|---------|-----|
| shadcn `select` | generated via CLI (Radix 1.6.7 peer) | Category picker in `TransactionForm` — flat, short, non-searchable list, same reasoning as project STACK.md | `npx shadcn@latest add select` |
| shadcn `popover` + `calendar` | generated via CLI, pulls `react-day-picker@10.0.1` | Date picker for the `date` field | `npx shadcn@latest add popover calendar` |
| `date-fns` | `4.4.0` `[VERIFIED: npm registry]` | Display-formatting the Calendar-picked date only — **not** a general date-utility layer (see Pitfall below for why the wire format must NOT go through `date-fns`) | `npm install date-fns --workspace=apps/web` (pin exact, don't rely on shadcn CLI's transitive choice per project convention of verifying registry versions) |

### Explicitly NOT installed this phase

| Library | Why not |
|---------|---------|
| shadcn `dropdown-menu` | STACK.md (project-level) listed this for "row actions" but the actual Phase 1 implementation (`widgets/category-list/ui/category-list.tsx:60-77`, read this session) uses two plain ghost `Button`s ("Редактировать"/"Удалить") side by side in the table cell, not a dropdown. There is no dropdown-menu precedent anywhere in the codebase to extend. Follow the real precedent: `TransactionsTable` row actions should be the same two ghost `Button`s, not a new component family. |
| TanStack Query, `useOptimistic` | Out of scope for this phase per the same reasoning as project ARCHITECTURE.md/STACK.md — `revalidatePath` + full RSC re-render is the established pattern for every mutation surface so far (auth, categories); introducing either here would be the first deviation, unjustified by phase requirements |
| A new Zod schema in `@expense/shared` | CONTEXT.md's canonical_refs is explicit: the transaction Zod schema is local to `features/transaction-form/model/`, not shared — there is no `Category`-style backend DTO parity to leverage since transactions have no `@expense/shared` Zod equivalent at all (confirmed: `packages/shared/src/schemas/` contains no transaction file — only `category.ts`, per the `find` this session) |

**Installation:**
```bash
npx shadcn@latest add select popover calendar
npm install date-fns@4.4.0 --workspace=apps/web
```
After running `shadcn add`, check for the incorrect `from "cn"` import and the `next-themes`
dependency it sometimes pulls in — this is a documented recurring issue in this project
(CLAUDE.md), strip both if present, same as every prior shadcn addition.

## Architecture Patterns

### System Architecture Diagram

```
                    ┌─────────────────────────────────────────────┐
                    │  /dashboard (DashboardView, RSC)             │
                    │  /expenses  (ExpensesView, RSC — NEW)        │
                    └───────────────┬───────────────────────────────┘
                                    │ renders
                    ┌───────────────▼───────────────────────────────┐
     User action →  │ widgets/quick-add-transaction (dashboard-only)│
     "Добавить"     │   Dialog(trigger) → <TransactionForm mode=create> │
                    └───────────────┬───────────────────────────────┘
                                    │ same component, no dialog on /expenses
                    ┌───────────────▼───────────────────────────────┐
                    │ features/transaction-form/ui/transaction-form │
                    │  'use client' — RHF + zodResolver              │
                    │  fields: type toggle, amount, categoryId(Select)│
                    │  date(Popover+Calendar), description            │
                    └───────────────┬───────────────────────────────┘
                        onSubmit →  │  createTransactionAction / updateTransactionAction
                    ┌───────────────▼───────────────────────────────┐
                    │ features/transaction-form/api/*.action.ts       │
                    │  'use server': zod parse (UX) → getSession()   │
                    │  → entities/transaction/api/*.ts(token, data)  │
                    │  → revalidatePath × TRANSACTION_AFFECTED_PATHS │
                    └───────────────┬───────────────────────────────┘
                                    │ apiFetch POST/PATCH/DELETE
                    ┌───────────────▼───────────────────────────────┐
                    │ Nest TransactionsController → *Dto (class-     │
                    │ validator, real gate) → TransactionsService →  │
                    │ PrismaService (already built, unchanged)       │
                    └─────────────────────────────────────────────┘

     Filter panel (D-04) — /expenses only:
     ┌─────────────────────────────────────────────┐
     │ widgets/transaction-filters (NEW, 'use client')│
     │  Select(type) + Select(category) + Popover+Calendar(range)│
     │  onChange → router.push(`${pathname}?${params}`) │
     └───────────────┬───────────────────────────────┘
                     │ URL searchParams is the source of truth
     ┌───────────────▼───────────────────────────────┐
     │ ExpensesView (RSC) reads searchParams →         │
     │ getTransactions(token, {type,categoryId,dateFrom,│
     │ dateTo,limit,offset}) → GET /transactions?...   │
     └─────────────────────────────────────────────┘
```

### Recommended Project Structure (additions only, confirmed against actual current tree)

```
apps/web/src/
├── entities/transaction/api/
│   ├── get-transactions.ts        # existing — extend GetTransactionsParams (see Pitfall 1 below)
│   ├── create-transaction.ts      # NEW — POST /transactions
│   ├── update-transaction.ts      # NEW — PATCH /transactions/:id
│   └── delete-transaction.ts      # NEW — DELETE /transactions/:id
├── features/transaction-form/
│   ├── api/
│   │   ├── create-transaction.action.ts
│   │   ├── update-transaction.action.ts
│   │   └── delete-transaction.action.ts
│   ├── model/
│   │   ├── transaction-form-schema.ts   # NEW local Zod schema — see Code Examples
│   │   ├── affected-paths.ts            # TRANSACTION_AFFECTED_PATHS = [ROUTES.dashboard, ROUTES.expenses]
│   │   └── types.ts                     # TransactionActionState, TransactionFormValues
│   └── ui/
│       ├── transaction-form.tsx         # type toggle + amount + Select(category) + Popover/Calendar(date) + description
│       └── transaction-delete-dialog.tsx # AlertDialog, mirrors CategoryDeleteDialog minus the 409/blocked branch
├── widgets/
│   ├── quick-add-transaction/ui/quick-add-transaction.tsx   # NEW, dashboard-only Dialog chrome
│   └── transaction-filters/ui/transaction-filters.tsx       # NEW, /expenses-only filter panel (D-04)
└── views/expenses/ui/expenses-view.tsx   # NEW content — replaces the current 3-line stub
```

### Pattern A: `TransactionForm` — structural clone of `CategoryForm`, with a type toggle instead of a color picker

**What:** `TransactionForm` accepts `transaction?: Transaction` (create vs. edit, exact same
convention as `CategoryForm`'s `category?: Category` prop, read directly from
`apps/web/src/features/category-form/ui/category-form.tsx:30-45` this session) and `open`/
`onOpenChange`. It owns its own `<Dialog>` wrapper internally (unlike the project-level
ARCHITECTURE.md's earlier sketch, which had callers wrap it) — **this is a deliberate
correction based on the actual Phase 1 precedent**: `CategoryForm` wraps its own `<Dialog>`
(`category-form.tsx:76`), it is not wrapped by its callers. `CategoryList` just toggles a
`formTarget` state and renders `<CategoryForm open onOpenChange={...} />` conditionally
(`category-list.tsx:86-97`). Match that exactly for `TransactionForm`/`ExpensesView`/
`QuickAddTransaction` — do not have `QuickAddTransaction` supply its own `<Dialog><DialogContent>`
around `<TransactionForm>`; that would double-nest Dialog primitives.

**Category options must be passed in as a prop** — `entities/transaction` cannot import
`entities/category` (cross-entity import ban, confirmed pattern in
`widgets/recent-transactions/api/load-recent-transactions.ts:1-33`, which already does the
`Promise.allSettled` + `Map`-join dance for exactly this reason). `ExpensesView` and
`QuickAddTransaction`'s caller (`DashboardView`) must each fetch `getCategories()` and pass the
list down to `TransactionForm`.

**Example — the "type toggle" field is the one real structural difference from `CategoryForm`:**
```tsx
// features/transaction-form/ui/transaction-form.tsx (sketch — not the full component)
import { Tabs, TabsList, TabsTrigger } from '@/shared/ui/tabs'; // NOT yet installed — see note below
// D-01 requires a segmented control, not a <Select>. shadcn/ui ships no bare "ToggleGroup" or
// "SegmentedControl" as a default-installed primitive in this project's set (checked: not in
// shared/ui/ as of this session). Two options, both consistent with existing installs:
//   (a) shadcn `toggle-group` (Radix ToggleGroup) — new install, purpose-built for this exact UI
//   (b) two plain `Button`s with pressed/unpressed styling driven by RHF field value — zero new install
// Recommend (b): the project has shown a consistent bias toward NOT installing a new primitive
// when two existing Buttons solve it (see the dropdown-menu decision above) — keep that bias.
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
This keeps the "no new primitive unless the phase genuinely needs one" discipline the project
has shown in Phase 1 (plain Buttons over DropdownMenu for row actions). If the planner instead
prefers a purpose-built segmented control, `shadcn add toggle-group` is the correct primitive
name to request — but it is a new install either way, so default to the zero-install Button pair
unless there's a specific visual reason to deviate.

### Pattern B: Local Zod schema mirrors `CreateTransactionDto`/`UpdateTransactionDto` field-for-field

**What:** `transaction-form-schema.ts` must reproduce the exact regexes from
`apps/api/src/modules/transactions/dto/transaction-validation.ts:4-8` (read directly this
session):
```
export const AMOUNT_PATTERN = /^\d{1,10}(\.\d{1,2})?$/;
export const AMOUNT_NOT_ZERO = /[1-9]/;
export const DESCRIPTION_MAX = 500;
```
`[VERIFIED: apps/api/src/modules/transactions/dto/transaction-validation.ts:4-8]` — quoted verbatim
above; these are the exact three values the client schema must copy.

**Example (new file, follows the style of the already-installed `packages/shared/src/schemas/category.ts`, which itself uses `z.uuid()`/`z.iso.datetime()` — read directly, `category.ts:16,20`):**
```typescript
// features/transaction-form/model/transaction-form-schema.ts
import { z } from 'zod';

// Зеркало apps/api/src/modules/transactions/dto/transaction-validation.ts — менять оба места
// вручную, Zod-дубликата в @expense/shared для транзакций нет (см. CONTEXT.md canonical_refs).
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
  // Полный ISO-таймстамп (noon-UTC, см. Pitfall 1) — НЕ z.iso.date(), это только календарная
  // дата без времени; DTO ждёт полную строку, которую строит форма перед submit.
  date: z.iso.datetime(),
  description: z.string().max(DESCRIPTION_MAX, `Не длиннее ${DESCRIPTION_MAX} символов`).optional(),
});

export type TransactionFormValues = z.infer<typeof transactionFormSchema>;
```
Note: `CreateTransactionDto.description` allows `string | null | undefined`
(`@IsOptional()` + typed `description?: string | null`, `create-transaction.dto.ts:30-34`), but a
form field naturally produces `undefined` for "empty", not `null` — `.optional()` (no `.nullable()`)
is the correct mirror on the client side; the Server Action should normalize an empty string to
`undefined` before calling `parsed.data` through to the entity API, not send `""`.

### Pattern C: Filter panel — URL searchParams as the single source of truth, no client filter state

**What:** Mirror the existing `PaginationNav` philosophy (`widgets/recent-transactions/ui/pagination-nav.tsx`,
read this session) — the URL query string is authoritative, not a client `useState`. Unlike
`PaginationNav` (plain `<Link>`s, no client JS needed), the filter inputs (`Select`, `Popover`+`Calendar`)
are interactive Radix components and need a `'use client'` boundary — but that boundary should
only *read* the current filter values from props (passed down from the RSC page, which read them
from `searchParams`) and *push* a new URL on change; it must not hold its own independent "is this
filtered" state that could drift from what's actually being fetched.

**Exact confirmed query params** (read directly from `apps/api/src/modules/transactions/dto/transaction-query.dto.ts`
this session — this is the full, authoritative param list, nothing more/nothing less):
```
dateFrom?: string   // IsISO8601({strict:true}) — accepts date-only "YYYY-MM-DD" (see Pitfall 2)
dateTo?: string     // same
type?: 'INCOME' | 'EXPENSE'
categoryId?: string // IsUUID
limit?: number      // 1..100, default 20 (LIMIT_DEFAULT, applied server-side via `??`)
offset?: number     // >=0, no default needed (0 if absent)
```
`forbidNonWhitelisted` is on globally (per CLAUDE.md, confirmed) — sending any extra query key
(e.g. `page` straight through to the API) would 400. The `?page=` URL param this project already
uses for pagination (`shared/lib/pagination.ts`) is a **view-layer** concept — it must be converted
to `limit`/`offset` before calling `getTransactions()`, exactly as `loadRecentTransactions` already
does (`load-recent-transactions.ts:31`: `{ limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }`).
Any new filter param (`type`, `categoryId`, `dateFrom`, `dateTo`) added to the `/expenses` URL must
likewise be filtered out before hitting the query string sent to `apiFetch`, and passed only as the
named param the DTO expects.

**Example — extending `getTransactions` for filters (current signature only supports limit/offset):**
```typescript
// entities/transaction/api/get-transactions.ts — CURRENT (read this session, full file):
// interface GetTransactionsParams { limit: number; offset: number; }
// export function getTransactions(accessToken, { limit, offset }) { ... }
//
// Needs extending to (additive, keep limit/offset required, others optional):
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
This is a backward-compatible extension — `loadRecentTransactions` (dashboard) keeps calling it
with only `{ limit, offset }` and is unaffected.

### Anti-Patterns to Avoid

- **Wrapping `<TransactionForm>` in a second `<Dialog>` from `QuickAddTransaction`:** the form
  owns its own Dialog (Pattern A) — mirror `CategoryForm`, not the earlier project-level
  ARCHITECTURE.md sketch (which predates this concrete file read and got the wrapping direction
  backwards relative to what Phase 1 actually built).
- **Sending the noon-UTC full-timestamp convention through the filter's `dateFrom`/`dateTo`:**
  harmless (still valid ISO8601, still passes `strict: true`) but unnecessary — the filter accepts
  and specially handles plain `YYYY-MM-DD`, see Pitfall 2.
- **Adding `dropdown-menu` for row actions:** no precedent for it in this codebase (see Standard
  Stack "Explicitly NOT installed").

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Date picker | Custom `<input type="date">` + manual popover positioning | shadcn `popover` + `calendar` (react-day-picker) | Already the documented project-level standard (STACK.md); react-day-picker 10.0.1 confirmed React-19-compatible peer range this session |
| Category dropdown | Custom listbox/combobox | shadcn `select` | Flat, short, non-searchable list — `Select` is exactly right-sized (unchanged from project-level STACK.md reasoning) |
| Amount masking/formatting while typing | `react-number-format` or hand-rolled input masking | Plain `Input` + `inputMode="decimal"` + the `AMOUNT_PATTERN` regex mirror, `formatMoney()` for display only | Project-level STACK.md already rejected `react-number-format` as disproportionate for one field; nothing in this deeper pass changes that |
| Row action menu | shadcn `dropdown-menu` | Two plain ghost `Button`s (see Standard Stack) | No precedent for dropdown-menu in this codebase; Phase 1 solved the identical problem (category row actions) without it |
| Filter URL state | A client `useReducer`/context filter store | URL `searchParams`, read server-side | Matches the zero-client-state-manager invariant already documented in project ARCHITECTURE.md |

**Key insight:** every "don't hand-roll" item in this phase already has a resolved precedent
either in Phase 1's shipped code or in the project-level research — this phase adds no new
architectural surface, only new field types on the same shape.

## Runtime State Inventory

Not applicable — this is a greenfield feature addition (new form/list/filter UI on an unchanged
backend), not a rename/refactor/migration phase. Skipped per the trigger condition in the research
protocol.

## Common Pitfalls

### Pitfall 1: `getTransactions()`'s current signature only accepts `{limit, offset}` — it will need extending, not just calling with more args

**What goes wrong:** A plan that assumes `getTransactions(token, { limit, offset, type, categoryId, dateFrom, dateTo })` already works will hit a TypeScript error — the current `GetTransactionsParams` interface (`entities/transaction/api/get-transactions.ts:5-8`, read in full this session) only declares `limit`/`offset`, and the function body only reads those two keys into a `URLSearchParams`.

**Why it happens:** The function was written for the dashboard's `recent-transactions` widget, which never filters — this phase is the first consumer that needs the filter params, so the entity function itself is in scope to edit, not just call.

**How to avoid:** Extend the interface and the query-building body additively (see Code Examples, Pattern C) — keep `limit`/`offset` required and the four filter params optional so the existing `loadRecentTransactions` call site keeps compiling unchanged.

**Warning signs:** A plan task that only touches `features/transaction-form` and `widgets/transaction-filters` without a task to edit `entities/transaction/api/get-transactions.ts` first.

---

### Pitfall 2: Filter `dateFrom`/`dateTo` want plain `YYYY-MM-DD`, not the noon-UTC full timestamp the create/edit form needs

**What goes wrong:** The project-level PITFALLS.md's date-drift fix (build the `date` field as `` `${dateOnlyString}T12:00:00.000Z` ``) is correct for `CreateTransactionDto.date`/`UpdateTransactionDto.date` — but applying the same construction to the filter's `dateFrom`/`dateTo` is unnecessary complexity, because `TransactionQueryDto` and `transactions.service.ts` handle plain date-only strings specially and correctly.

**Why it happens:** `buildDateFilter()` (`transactions.service.ts:191-204`, read this session) branches on whether the string contains `'T'`:
```
if (dateTo) {
  const to = new Date(dateTo);
  date.lt = dateTo.includes('T') ? new Date(to.getTime() + 1) : new Date(to.getTime() + DAY_MS);
}
```
`[VERIFIED: apps/api/src/modules/transactions/transactions.service.ts:191-204]` — quoted verbatim.
A plain `"2026-09-30"` (no `'T'`) gets `+DAY_MS` added, correctly making the filter inclusive of
the whole calendar day in UTC. A full timestamp like `"2026-09-30T12:00:00.000Z"` (*with* `'T'`)
instead gets only `+1ms` added — i.e. it's treated as an exact instant boundary, which would
**exclude** almost all of that day's transactions from a "through Sept 30" filter. Building the
filter's `dateTo` the same way the create-form date is built would silently produce a
narrower-than-intended range.

**How to avoid:** Build the `Calendar`-selected date for the filter as a plain `YYYY-MM-DD`
string (e.g. via `date-fns`'s `format(date, 'yyyy-MM-dd')`) and send that directly as `dateFrom`/`dateTo` —
do **not** append a time component. This is confirmed to pass `IsISO8601({ strict: true })` (a
date-only string is a valid ISO 8601 representation) and to get the intended whole-day-inclusive
treatment from `buildDateFilter()`.

**Warning signs:** A "filter to end of September" test that's silently missing transactions dated
Sept 30 after 00:00:01 UTC.

---

### Pitfall 3: Transaction delete has no 409/blocked case — don't copy that branch from `CategoryDeleteDialog`

**What goes wrong:** `CategoryDeleteDialog`'s whole `blockedMessage` state and the `error.status === 409` branch in `delete-category.action.ts` exist because `Transaction.category` is `onDelete: Restrict` (categories can't be deleted while referenced). Transactions have no such foreign-key dependents — nothing references a `Transaction` row. Copying that branch into `transaction-delete-dialog.tsx` would add dead code and an untestable code path.

**Why it happens:** `CategoryDeleteDialog` is explicitly the pattern to mirror for the Dialog/confirm shape, so it's tempting to copy the whole file including the 409 handling.

**How to avoid:** Mirror the `AlertDialog` shape, the `isPending` state, and the `apiErrorMessage` fallback toast — drop the `blockedMessage`/`blocked` field entirely. `TransactionActionState` (mirroring `CategoryActionState`) should be `{success:true} | {error:string; fieldErrors?:Record<string,string>} | undefined` — no `blocked` field.

**Warning signs:** A `blocked` field or `error.status === 409` check anywhere in `transaction-delete-dialog.tsx`/`delete-transaction.action.ts`.

---

### Pitfall 4 (inherited from project PITFALLS.md, re-confirmed against actual DTO source this session — not new, but re-verified): amount has no sign, comma-decimal breaks the pattern, and description must accept `null` on update

All three of these were already documented at HIGH confidence in the project-level PITFALLS.md
and are re-confirmed unchanged by this session's direct reads of `create-transaction.dto.ts`,
`update-transaction.dto.ts`, and `transaction-validation.ts` — no new finding here beyond
pointing the planner at Pattern B's exact regex mirror. One clarification this pass adds:
`UpdateTransactionDto.description` is `@IsOptional()` (not `@ValidateIf(isPresent)` like every
other field on that DTO) and typed `description?: string | null` — meaning sending
`description: null` in a PATCH is how the client clears an existing description, while omitting
the key entirely leaves it unchanged. The edit form's "clear description" UX (an empty text field)
should map to `null`, not `""` or an omitted key, when building the PATCH payload for updates
specifically (create can just omit it).

## Code Examples

### `TRANSACTION_AFFECTED_PATHS` — mirrors `CATEGORY_AFFECTED_PATHS` exactly

```typescript
// features/transaction-form/model/affected-paths.ts
import { ROUTES } from '@/shared/config/routes';

/** Транзакции отображаются на /dashboard (recent-transactions) и /expenses (полный список).
 *  /categories не входит — категория не меняется мутацией транзакции. */
export const TRANSACTION_AFFECTED_PATHS = [ROUTES.dashboard, ROUTES.expenses];
```
`ROUTES.dashboard`/`ROUTES.expenses` confirmed to exist and equal `'/dashboard'`/`'/expenses'`
`[VERIFIED: apps/web/src/shared/config/routes.ts:6-7]` (quoted: `dashboard: '/dashboard', expenses: '/expenses',`).

### `create-transaction.action.ts` — mirrors `create-category.action.ts` structure exactly

```typescript
// features/transaction-form/api/create-transaction.action.ts
'use server';

import { revalidatePath } from 'next/cache';
import { getSession } from '@/entities/session/api/session';
import { createTransaction } from '@/entities/transaction/api/create-transaction';
import { apiErrorMessage, extractFieldErrors } from '@/shared/api/error-message';
import { TRANSACTION_AFFECTED_PATHS } from '@/features/transaction-form/model/affected-paths';
import { transactionFormSchema } from '@/features/transaction-form/model/transaction-form-schema';
import type { TransactionActionState } from '@/features/transaction-form/model/types';

export async function createTransactionAction(input: unknown): Promise<TransactionActionState> {
  const parsed = transactionFormSchema.safeParse(input);
  if (!parsed.success) {
    return { error: 'Проверьте правильность заполнения полей' };
  }

  const session = await getSession();
  if (!session) {
    return { error: 'Сессия истекла, войдите заново' };
  }

  try {
    await createTransaction(session.accessToken, parsed.data);
  } catch (error) {
    const fieldErrors = extractFieldErrors(error);
    if (fieldErrors) {
      return { error: 'Проверьте правильность заполнения полей', fieldErrors };
    }
    return { error: apiErrorMessage(error) };
  }

  for (const path of TRANSACTION_AFFECTED_PATHS) {
    revalidatePath(path);
  }
  return { success: true };
}
```
Structure confirmed 1:1 against `apps/web/src/features/category-form/api/create-category.action.ts`
(read in full this session) — only the entity import, schema, and affected-paths constant differ.

### `entities/transaction/api/create-transaction.ts` / `update-transaction.ts` / `delete-transaction.ts` — mirror the category entity API files

```typescript
// entities/transaction/api/create-transaction.ts
import 'server-only';
import { apiFetch } from '@/shared/api/api-client';
import type { Transaction } from '@/entities/transaction/model/types';
import type { TransactionFormValues } from '@/features/transaction-form/model/transaction-form-schema';

/** Токен параметром — см. комментарий в get-transactions.ts. */
export function createTransaction(
  accessToken: string,
  input: TransactionFormValues,
): Promise<Transaction> {
  return apiFetch<Transaction>('/transactions', {
    method: 'POST',
    accessToken,
    body: JSON.stringify(input),
  });
}
```
Structure confirmed against `apps/web/src/entities/category/api/create-category.ts` (read in full
this session). `update-transaction.ts` mirrors `update-category.ts` (`PATCH /transactions/:id`,
`Partial<TransactionFormValues>`); `delete-transaction.ts` mirrors `delete-category.ts`
(`DELETE /transactions/:id`, no body, `Promise<void>`).

## State of the Art

Nothing in this phase touches "state of the art" territory beyond what project-level STACK.md
already covered (Next.js 16 Server Actions + `revalidatePath`, React 19 already installed). No
deprecation/migration findings apply here that weren't already in that document.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `date-fns`/`react-day-picker` package *names* are correct for the shadcn date-picker pattern (names originated from project-level STACK.md's WebSearch, not official docs — this session only verified registry existence/legitimacy/version, per the package-name provenance rule) | Standard Stack | Low — both are extremely well-known, high-download packages, and `shadcn add calendar` would itself pull the correct react-day-picker version regardless; risk is essentially zero but the provenance tag is required regardless of how safe the bet looks |
| A2 | Recommending plain `Button` pair over `shadcn toggle-group` for the type-toggle UI (D-01's "not a select") is Claude's-discretion-level interpretation, not a locked decision — CONTEXT.md says "переключателем/табами", which could also mean literal shadcn `Tabs` | Architecture Patterns, Pattern A | Low — purely a visual/component-choice risk, not a data/validation risk; either choice satisfies "not a select" and TXN-01's requirement text |
| A3 | Filter panel's `dateFrom`/`dateTo` should be built from `date-fns`'s `format(date, 'yyyy-MM-dd')`; the exact date-only-string format was inferred from `IsISO8601({strict:true})`'s known acceptance of date-only ISO forms plus the service's `.includes('T')` branch, not from an explicit test run against the live API this session | Common Pitfalls, Pitfall 2 | Medium if wrong — a malformed dateFrom/dateTo would just 400 immediately (loud failure, easy to catch at plan-checker/execution time), not silently corrupt filter results |

## Open Questions

1. **Should the filter's date-range picker be a single `Calendar` in `mode="range"` (one Popover, two months) or two separate single-date Popovers (one for `dateFrom`, one for `dateTo`)?**
   - What we know: shadcn's `Calendar` component (via react-day-picker 10.0.1) supports `mode="range"` out of the box; the project has no existing range-picker precedent to mirror (this is a genuinely new UI shape for the codebase).
   - What's unclear: which is visually preferred — this is explicitly Claude's Discretion per CONTEXT.md ("dropdown vs. date range picker"), not a locked decision, so either is acceptable.
   - Recommendation: single `Calendar mode="range"` in one `Popover` — fewer moving parts, one less state variable to keep in sync, and it's the shadcn-documented pattern for date ranges specifically.

2. **Where exactly does the "Добавить" quick-add trigger button live on `/dashboard`?**
   - What we know: CONTEXT.md leaves this to Claude's Discretion ("в шапке существующего блока recent-transactions или отдельно"); `RecentTransactions`'s `CardHeader` currently has just a `CardTitle` (`recent-transactions.tsx:24-26`, read this session) with room for a second flex item, mirroring `CategoryList`'s `CardHeader className="flex flex-row items-center justify-between"` pattern (`category-list.tsx:32-35`) that already puts a "Создать категорию" button next to the title.
   - What's unclear: nothing structural — this is a pure layout choice.
   - Recommendation: put the "Добавить" trigger in `RecentTransactions`'s `CardHeader`, same `flex justify-between` treatment as `CategoryList`'s header — this requires `RecentTransactions` to accept a new prop (e.g. `headerAction?: ReactNode`) rather than importing `QuickAddTransaction` directly (keeps the widget presentation-agnostic, same reasoning as `TransactionForm` not knowing about Dialog chrome).

## Environment Availability

Skipped — this phase has no external service/tool dependencies beyond what's already running
(Postgres via existing `docker compose`, already verified in Phase 1). No new CLI/runtime/database
dependency is introduced.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | none — confirmed this session: no jest/vitest config file anywhere in the repo (`find . -iname "*jest*" -o -iname "*vitest*"` returned nothing outside `node_modules`), no `test` script in root or `apps/api`/`apps/web` `package.json` (`@nestjs/testing` is present as a dependency but unused — no test files exist) |
| Config file | none — see Wave 0 |
| Quick run command | none available |
| Full suite command | none available |

CLAUDE.md states this explicitly: "Тестов в проекте нет — раннер не настроен." `[VERIFIED: apps/api/package.json, apps/web/package.json, root package.json — all read this session, no test script in any]`.

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TXN-01 | Add transaction, amount+type+category+date+description validated client and server side | manual-only | — | ❌ No framework — Wave 0 |
| TXN-02 | Edit transaction, form prefilled | manual-only | — | ❌ No framework — Wave 0 |
| TXN-03 | Delete transaction with confirmation | manual-only | — | ❌ No framework — Wave 0 |
| TXN-04 | `/expenses` full list + pagination | manual-only | — | ❌ No framework — Wave 0 |
| TXN-05 | Quick-add from `/dashboard` uses same form | manual-only | — | ❌ No framework — Wave 0 |
| TXN-06 | Filter by period/type/category | manual-only | — | ❌ No framework — Wave 0 |

Justification for manual-only across the board: matches the precedent already set in Phase 1
(category CRUD), which shipped with no automated tests either — introducing a test framework is
a project-wide decision out of scope for a single phase, not something to bootstrap silently
inside this one.

### Sampling Rate
- **Per task commit:** `npm run typecheck` (existing command, catches the DTO/schema-mirror drift class of bug this phase is most at risk of)
- **Per wave merge:** `npm run typecheck && npm run lint`
- **Phase gate:** manual UAT walkthrough of TXN-01..06 via `/gsd-verify-work` (conversational), since no automated suite exists

### Wave 0 Gaps
- No test framework installed project-wide — this is a pre-existing gap (present since Phase 1), not new to this phase. Not addressed here; out of scope per the "manual-only, matches precedent" reasoning above.

## Security Domain

> `security_enforcement: true`, `security_asvs_level: 1` (`.planning/config.json`, read this session) — section required.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V2 Authentication | No — unchanged this phase | Existing JWT access/refresh, `JwtAuthGuard` global (`AuthModule`) |
| V3 Session Management | No — unchanged this phase | Existing httpOnly cookie session, `getSession()`/`accessToken` param convention (reused, not modified) |
| V4 Access Control | Yes | Every transaction query/mutation already filters by `userId` server-side (`transactions.service.ts`, confirmed `where: { userId, ... }` on `findAll`/`findOne`/`update`/`delete` this session) and `assertCategoryBelongsToUser()` rejects a `categoryId` that isn't the caller's own category. Frontend must treat every 4xx from these endpoints as authoritative (no client-side "this categoryId looks fine" shortcuts — see project PITFALLS.md Security Mistakes table, unchanged) |
| V5 Input Validation | Yes | Real validation is the `class-validator` DTOs (unchanged, already built); the new client-side Zod schema (Pattern B) is UX-only defense-in-depth, explicitly not a security boundary — same disclaimer pattern already in `loginAction`/`createCategoryAction` comments ("Server Action доступен прямым POST, поэтому валидация клиента здесь не защита") |
| V6 Cryptography | No — no new crypto surface this phase | — |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|----------------------|
| IDOR via transaction `id` (e.g. editing/deleting another user's transaction by guessing a UUID) | Tampering / Elevation of Privilege | Already mitigated server-side — every `TransactionsService` method scopes by `userId` in the `where` clause (`findFirst`/`update`/`delete` with `{ id, userId }`), confirmed this session. Frontend does not need (and must not attempt) to re-implement this check — treat a 404 from the API on an edit/delete as "not found", same UX as any other 404, not a special case |
| IDOR via `categoryId` cross-user reference in a transaction create/update payload | Tampering | Already mitigated server-side — `assertCategoryBelongsToUser()` throws `NotFoundException` for a foreign `categoryId`, confirmed this session. Frontend surfaces this as `apiErrorMessage(error)` — a generic "категория не найдена"-shaped message, no special client branch needed since it's already handled by the standard `extractFieldErrors`/`apiErrorMessage` flow |
| Amount tampering via client-forged negative/malformed strings | Tampering | `AMOUNT_PATTERN`/`AMOUNT_NOT_ZERO` enforced server-side regardless of what the client Zod schema does (already true, unchanged) |
| 401-during-mutation (expired access token mid-form-fill) | — (availability/UX, not a real security gap) | Inherited unchanged from project PITFALLS.md Pitfall 6 — mutation actions must surface a "try again" message on a 401 `ApiError`, must never call `refreshSession()` themselves |

## Sources

### Primary (HIGH confidence — direct file reads this session)
- `apps/web/src/entities/transaction/api/get-transactions.ts` — current signature, confirms Pitfall 1
- `apps/web/src/entities/transaction/model/types.ts` — `Transaction`/`TransactionType`/`TransactionList` shapes
- `apps/web/src/entities/transaction/ui/transaction-amount.tsx` — confirms D-03 already implemented as-is
- `apps/web/src/views/dashboard/ui/dashboard-view.tsx` — current dashboard RSC shape
- `apps/web/src/widgets/recent-transactions/ui/{recent-transactions,transactions-table,empty-state,pagination-nav}.tsx`, `api/load-recent-transactions.ts`, `model/types.ts` — full precedent for list/pagination/category-join pattern
- `apps/api/src/modules/transactions/transactions.controller.ts` — route/DTO wiring, confirms `summary` registered before `:id`
- `apps/api/src/modules/transactions/transaction.types.ts` — `TransactionDto`/`TransactionSummary` response shapes
- `apps/api/src/modules/transactions/transactions.service.ts` — full service, confirms Pitfall 2's `buildDateFilter` branching, `assertCategoryBelongsToUser`, `userId` scoping everywhere
- `apps/api/src/modules/transactions/dto/{create-transaction,update-transaction,transaction-query,summary-query,transaction-validation}.ts` — exact validation rules, regexes, query param names (Pattern B, Pattern C)
- `apps/web/src/features/category-form/**/*` (all 8 files) — the structural template for `features/transaction-form/`
- `apps/web/src/views/categories/ui/categories-view.tsx`, `apps/web/src/widgets/category-list/ui/category-list.tsx` — the `/expenses` page template
- `apps/web/src/shared/ui/{dialog,form}.tsx` — confirms already-installed Dialog/Form primitives and their exact API
- `apps/web/src/shared/api/{error-message,api-client}.ts` — `extractFieldErrors`/`apiErrorMessage`/`ApiError`, reused unchanged
- `apps/web/src/shared/lib/{utils,format-date,pagination}.ts` — `formatMoney`/`formatDate`/`PAGE_SIZE`/`totalPages`/`pageHref`
- `apps/web/src/shared/config/routes.ts` — `ROUTES` constant, confirms exact path strings
- `apps/web/src/entities/session/api/session.ts` — `getSession()`/`refreshSession()` contracts, confirms Pitfall inherited from project PITFALLS.md
- `apps/web/package.json` — exact installed versions (react-hook-form 7.87.0, zod 4.5.4, radix-ui 1.6.7, lucide-react 1.43.0, no date-fns/select/popover/calendar yet)
- `packages/shared/src/schemas/category.ts` — confirms Zod v4 style already in use (`z.uuid()`, `z.iso.datetime()`) to mirror in the new local schema
- `.planning/config.json` — `nyquist_validation: true`, `security_enforcement: true`, `security_asvs_level: 1`
- `npm view date-fns version` → `4.4.0`; `npm view react-day-picker version` → `10.0.1`; `npm view react-day-picker peerDependencies --json` → `{"react":">=16.8.0","@types/react":">=16.8.0"}` (ran this session)
- `gsd_run query package-legitimacy check --ecosystem npm date-fns react-day-picker` → both `OK` (ran this session)

### Secondary (MEDIUM confidence)
- `.planning/research/ARCHITECTURE.md`, `.planning/research/STACK.md`, `.planning/research/PITFALLS.md` (project-level, 2026-09-20) — foundational research this document extends and, in one case (Dialog-wrapping direction, dropdown-menu), corrects against the actual Phase 1 implementation

### Tertiary (LOW confidence)
- None new this pass — no WebSearch was needed beyond what the project-level research already did, since the phase's open questions were all resolvable by reading the actual repo and the npm registry

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions confirmed via `apps/web/package.json` read + `npm view` this session
- Architecture: HIGH — every pattern traced to an actual Phase 1 file read this session, not inferred
- Pitfalls: HIGH — all four pitfalls in this document are grounded in direct reads of the exact DTO/service files whose behavior they describe

**Research date:** 2026-09-21
**Valid until:** 30 days (stable — no fast-moving dependency in this set; re-verify `date-fns`/`react-day-picker` versions at implementation time if this phase is picked up materially later)
