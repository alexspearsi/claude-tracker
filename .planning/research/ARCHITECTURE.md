# Architecture Research

**Domain:** Brownfield feature addition — transaction/category CRUD forms + summary widget, inside an existing Next.js 16 (FSD) + Nest 12 monorepo
**Researched:** 2026-09-20
**Confidence:** HIGH on all FSD/layering/convention claims (grounded directly in the actual codebase — `.planning/codebase/ARCHITECTURE.md`/`STRUCTURE.md` plus current-code reads of `get-transactions.ts`, `login.action.ts`, `routes.ts`). MEDIUM on the two Next.js caching claims (revalidatePath vs revalidateTag semantics, explicit-call requirement) — websearch-sourced but corroborated against official `nextjs.org/docs` pages found directly in results (classify-confidence: MEDIUM, verified/cross-checked).

This is not generic Next.js advice — every recommendation below is a direct extension of patterns **already implemented** in this repo (`features/auth`, `entities/transaction`, `entities/session`). Where a new pattern is genuinely needed (it isn't, for any of the four questions), that is called out explicitly.

## Standard Architecture

### System Overview (delta only — full system diagram already in `.planning/codebase/ARCHITECTURE.md`)

```
┌──────────────────────────── apps/web/src ─────────────────────────────────┐
│ views/expenses/ui/expenses-view.tsx        views/dashboard/ui/dashboard-view.tsx │
│        │ imports                                   │ imports                     │
│        ▼                                            ▼                             │
│ features/transaction-form/ui/transaction-form.tsx  (SAME component, both callers) │
│        │ imports (down)                                                           │
│        ▼                                                                          │
│ entities/transaction/api/{create,update,delete}-transaction.ts (accessToken param)│
│        │                                                                          │
│        ▼                                                                          │
│                      apiFetch() → POST/PATCH/DELETE /api/transactions             │
│                                                                                     │
│ widgets/quick-add-transaction/ui/*.tsx  →  wraps features/transaction-form in a   │
│   Dialog, lives only on the dashboard, adds NO form logic of its own              │
│                                                                                     │
│ widgets/balance-summary/ui/balance-summary.tsx  (Server Component, RSC fetch)     │
│        │ imports                                                                   │
│        ▼                                                                          │
│ entities/transaction/api/get-summary.ts (accessToken param, cache: 'no-store')    │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|-------------------------|
| `features/transaction-form/` | Owns the transaction create/edit form — fields, client-side zod validation, submit → Server Action | react-hook-form + local zod schema + `'use server'` actions, mirrors `features/auth` exactly |
| `features/category-form/` | Owns the category create/edit form | Same shape, reuses the **existing** `@expense/shared` `categorySchema` for zodResolver (already exists — no new schema needed) |
| `entities/transaction/api/*` | Thin fetch wrappers per mutation, `accessToken` param, `cache: 'no-store'` | New files: `create-transaction.ts`, `update-transaction.ts`, `delete-transaction.ts`, `get-summary.ts`, added beside the existing `get-transactions.ts` |
| `entities/category/api/*` | Same for categories | New files: `create-category.ts`, `update-category.ts`, `delete-category.ts`, added beside existing `get-categories.ts` |
| `widgets/quick-add-transaction/` | Dashboard-only chrome (trigger button + Dialog/Sheet) around the shared feature form | No form logic — pure composition |
| `widgets/balance-summary/` | Renders income/expense/balance + category breakdown | Server Component, calls `entities/transaction/api/get-summary.ts` directly (no client fetch library) |
| `views/expenses/ui/expenses-view.tsx` | Full `/expenses` screen: list + add/edit entry point | Imports `features/transaction-form` directly (views are allowed to import features per the existing FSD layer table) |

## Recommended Project Structure (additions only)

```
apps/web/src/
├── entities/
│   ├── transaction/
│   │   └── api/
│   │       ├── get-transactions.ts        # existing
│   │       ├── get-summary.ts             # NEW — GET /transactions/summary, accessToken param, cache:'no-store'
│   │       ├── create-transaction.ts      # NEW — POST /transactions
│   │       ├── update-transaction.ts      # NEW — PATCH /transactions/:id
│   │       └── delete-transaction.ts      # NEW — DELETE /transactions/:id
│   └── category/
│       └── api/
│           ├── get-categories.ts          # existing
│           ├── create-category.ts         # NEW
│           ├── update-category.ts         # NEW
│           └── delete-category.ts         # NEW
├── features/
│   ├── auth/                              # existing, unchanged — the reference pattern
│   ├── transaction-form/                  # NEW
│   │   ├── api/
│   │   │   ├── create-transaction.action.ts   # 'use server' — reads session, calls entity api, revalidatePath()
│   │   │   ├── update-transaction.action.ts
│   │   │   └── delete-transaction.action.ts
│   │   ├── model/
│   │   │   ├── transaction-form-schema.ts     # local zod schema, CLIENT-SIDE UX ONLY (see Pattern 2)
│   │   │   └── types.ts                       # ActionState shape, mirrors features/auth/model/types.ts
│   │   └── ui/
│   │       └── transaction-form.tsx           # 'use client', react-hook-form + zodResolver — THE shared component
│   └── category-form/                     # NEW — identical shape, reuses @expense/shared categorySchema
│       ├── api/
│       │   ├── create-category.action.ts
│       │   ├── update-category.action.ts
│       │   └── delete-category.action.ts
│       ├── model/types.ts
│       └── ui/category-form.tsx
├── widgets/
│   ├── recent-transactions/               # existing, unchanged
│   ├── quick-add-transaction/             # NEW — dashboard-only
│   │   └── ui/
│   │       └── quick-add-transaction.tsx  # Dialog trigger, wraps <TransactionForm mode="create" />
│   ├── balance-summary/                   # NEW
│   │   └── ui/
│   │       └── balance-summary.tsx        # Server Component, calls get-summary.ts
│   └── category-list/                     # NEW, for /categories page
│       └── ui/
│           └── category-list.tsx
└── views/
    ├── dashboard/ui/dashboard-view.tsx     # add <BalanceSummary /> + <QuickAddTransaction />
    ├── expenses/ui/expenses-view.tsx       # NEW content — imports features/transaction-form directly
    └── categories/ui/categories-view.tsx   # NEW content — imports features/category-form + widgets/category-list
```

### Structure Rationale

- **`features/transaction-form/` (not `widgets/`, not duplicated per-page):** the project's own precedent for "one form, consumed by multiple screens" is `features/auth` — `login-view` and `register-view` each import a *different* form from the same feature slice, and both `login.action.ts`/`register.action.ts` already read the session/token boundary themselves. A shared transaction form used by both the dashboard quick-add and the `/expenses` page is the same shape of problem, so it gets the same answer: it lives in `features/`, and both a `widget` (dashboard) and a `view` (expenses) import it directly. This is standard FSD guidance too — reusable business-action UI belongs in the lowest layer that all its consumers can import from without crossing the "same layer" prohibition, and `features` sits below both `widgets` and `views` in this project's declared hierarchy.
- **`entities/transaction/api/create-transaction.ts` etc. take `accessToken` as a parameter, not read session themselves:** this is not a new decision — it is the existing, documented convention (`entities/transaction/api/get-transactions.ts` already does this), extended to the three new verbs. Entities never import `entities/session` (cross-entity import ban).
- **`widgets/quick-add-transaction/` holds zero form logic:** it exists only to own the Dialog/Sheet chrome and the trigger button — a widget that reused the feature's fields would duplicate `features/transaction-form`, which is exactly the anti-pattern FSD calls out ("large blocks of UI that ARE reused across pages belong in a lower shared layer, not copied into each widget").
- **`features/category-form/` reuses `@expense/shared`'s existing `categorySchema` for the client zodResolver**, not a new local schema — the project already established this exact split for categories (CLAUDE.md: "Правила категорий дублируют `packages/shared/src/schemas/category.ts` — меняй оба места"). The backend DTO class remains the actual authority; the shared Zod schema is duplicated validation for frontend UX only. No architectural change needed here, just wiring a form to an already-existing schema.
- **`features/transaction-form/model/transaction-form-schema.ts` is a genuinely new local schema** (transactions have no `@expense/shared` equivalent — CLAUDE.md is explicit that "у транзакций Zod-дубликата нет"). This is new territory but follows the exact shape of the categories exception: a local zod schema for `zodResolver` client UX, kept manually in sync with `CreateTransactionDto`/`UpdateTransactionDto` (`apps/api/src/modules/transactions/dto/`) — it is not sent anywhere, not the source of truth, and must never replace the backend DTO validation. Flag this file with a comment (Russian, per CLAUDE.md convention) noting it must be updated in lockstep with the DTO, exactly as the categories rule already requires.

## Architectural Patterns

### Pattern 1: One feature form, two callers (widget composition vs. duplication)

**What:** `features/transaction-form/ui/transaction-form.tsx` accepts an optional `transaction` prop (undefined = create mode, populated = edit mode) and an optional `onSuccess` callback (e.g., to close a Dialog). It does not know or care whether it's rendered inside a dialog (dashboard quick-add) or inline on a page (`/expenses`).

**When to use:** Any time two+ FSD consumers at different layers (a `widget` and a `view`, or two `widgets`) need the identical user-action UI. This is the project's established shape (`features/auth`).

**Trade-offs:** The feature component must stay presentation-agnostic (no Dialog/Sheet wrapper baked in) — that chrome belongs to the caller. This is a small extra prop-drilling cost but avoids the alternative (a widget importing another widget, which is a same-layer cross-import and forbidden here).

**Example:**
```typescript
// features/transaction-form/ui/transaction-form.tsx
'use client';
export function TransactionForm({
  transaction,       // undefined → create; populated → edit
  onSuccess,          // caller decides what "done" means (close dialog vs. router refresh)
}: TransactionFormProps) {
  const form = useForm({ resolver: zodResolver(transactionFormSchema), defaultValues: transaction });
  // ... submit calls createTransactionAction or updateTransactionAction from features/transaction-form/api
}

// widgets/quick-add-transaction/ui/quick-add-transaction.tsx — dashboard only
'use client';
export function QuickAddTransaction() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button>Добавить</Button></DialogTrigger>
      <DialogContent>
        <TransactionForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

// views/expenses/ui/expenses-view.tsx — full page, no dialog wrapper needed
export function ExpensesView() {
  return (
    <>
      <TransactionForm />
      <TransactionsWidgetOrList />
    </>
  );
}
```

### Pattern 2: Server Action placement + accessToken boundary for new mutations

**What:** Mutation Server Actions (`'use server'`) live in `features/transaction-form/api/*.action.ts` (and `features/category-form/api/*.action.ts`), never in `entities/`. Each action: (1) calls `getSession()` from `entities/session/api/session.ts` to read the access token — this is the one place in the whole chain allowed to do so, exactly as `features/auth/api/login.action.ts` already does for `setSession()`; (2) parses/validates input against the local zod schema for a friendly error message (defense-in-depth only — the real validation is the Nest DTO, same disclaimer as the existing `loginAction` comment: "Server Action доступен прямым POST, поэтому валидация клиента здесь не защита"); (3) calls the corresponding `entities/transaction/api/*.ts` function, passing the token; (4) on success, calls `revalidatePath()` (see Pattern 3) — NOT `redirect()`, since these actions don't navigate, unlike auth's login/register.

**When to use:** Any new CRUD mutation feature in this codebase.

**Trade-offs:** None beyond what's already accepted project-wide — this is literally copy-the-pattern, not a new decision.

**Example:**
```typescript
// features/transaction-form/api/create-transaction.action.ts
'use server';
import { getSession } from '@/entities/session/api/session';
import { createTransaction } from '@/entities/transaction/api/create-transaction';
import { apiErrorMessage } from '@/shared/api/error-message';
import { revalidatePath } from 'next/cache';
import { ROUTES } from '@/shared/config/routes';
import { transactionFormSchema } from '@/features/transaction-form/model/transaction-form-schema';
import type { TransactionActionState } from '@/features/transaction-form/model/types';

export async function createTransactionAction(input: unknown): Promise<TransactionActionState> {
  const parsed = transactionFormSchema.safeParse(input);
  if (!parsed.success) return { error: 'Проверьте правильность заполнения полей' };

  const session = await getSession();
  if (!session) return { error: 'Сессия истекла, войдите заново' };

  try {
    await createTransaction(session.accessToken, parsed.data);
  } catch (error) {
    return { error: apiErrorMessage(error) };
  }

  // Обе страницы показывают транзакции/баланс — гасим Router Cache на обеих.
  revalidatePath(ROUTES.dashboard);
  revalidatePath(ROUTES.expenses);
  return { success: true };
}
```

### Pattern 3: Revalidation strategy — `revalidatePath`, not `revalidateTag`, and why

**What:** Every existing authenticated GET in this project (`get-transactions.ts`, and every new `get-summary.ts`/`get-categories.ts` call) already sets `cache: 'no-store'`. That means **Next's fetch Data Cache is never populated for user data in this app** — there is nothing for `revalidateTag` to invalidate, because nothing was ever tagged or cached at the fetch layer in the first place. `revalidatePath(path)` operates on a different cache — the client-side **Router Cache** (the cached RSC payload for a visited route) — and that is the one that goes stale after a mutation: if a user is on `/dashboard`, adds a transaction via the quick-add dialog, then navigates to `/expenses`, the `/expenses` route's RSC payload (if previously visited and cached client-side) would still show the old list without an explicit `revalidatePath(ROUTES.expenses)` call.

**When to use:** Call `revalidatePath()` for every route whose rendered data could be affected by the mutation, inside the Server Action, right after the mutation succeeds and before returning. For this feature set that means at minimum `ROUTES.dashboard` (recent list + summary) and `ROUTES.expenses` (full list) after any transaction mutation; `ROUTES.categories`, `ROUTES.dashboard`, and `ROUTES.expenses` after any category mutation (category name/color feeds the transaction row mapping on both screens, per the existing `Map`-based join documented in CLAUDE.md).

**Trade-offs:**
- `revalidatePath` is coarser than `revalidateTag` (invalidates a whole route's cache, not a specific query), but that coarseness is irrelevant here since no fine-grained fetch tagging exists to lose — introducing `revalidateTag` would require switching these fetches off `cache: 'no-store'` onto the Next Data Cache, which is a bad idea for per-user JWT-scoped data: Next's Data Cache is shared across requests at the deployment/server level, not automatically per-user, so tagging live financial data risks a cache key collision leaking one user's numbers to another unless every tag/key is manually salted with `userId`. Given the project's small scale (personal tracker) and existing `no-store` convention, this added complexity is not worth it — do not introduce `revalidateTag` for this feature.
- Confirmed via Next.js documentation and community sources (Next.js official docs, plus cross-checked community writeups): revalidation is **not automatic** on Server Action completion — you must call `revalidatePath`/`revalidateTag` explicitly inside the action. Do not assume the summary widget will "just update" after a quick-add without the explicit call.

### Pattern 4: Summary widget — Server Component fetch, not client-side SWR/fetch

**What:** `widgets/balance-summary/ui/balance-summary.tsx` is an `async` Server Component. It receives `month`/`year` (or defaults to current) via its caller (`views/dashboard/ui/dashboard-view.tsx`, itself a Server Component per the existing pattern used by `dashboard-view.tsx` today), calls `getSession()` for the token, then `getSummary(accessToken, { month, year })` from the new `entities/transaction/api/get-summary.ts`, exactly mirroring how `recent-transactions` widget already fetches server-side.

**When to use:** Always, for this project. Reasons specific to this codebase (not generic advice):
1. **No client state manager exists** — `.planning/codebase/ARCHITECTURE.md` explicitly documents "no global client-side state manager... server-centric with Server Components." Introducing SWR/React Query solely for one summary widget would be the first client-data-fetching library in the project, a real dependency + pattern addition for a single widget.
2. **The access token is only readable server-side.** `getSession()` lives in a `'server-only'`-guarded file; a client-fetching hook would need a Route Handler proxy just to read the cookie, adding a network hop and a new API surface that doesn't exist anywhere else in the app.
3. **Precedent parity** — `recent-transactions` (the closest existing analog) is already RSC-fetched with `?page=` in the URL for pagination, not client-fetched with revalidation hooks. A summary widget fetched a different way on the same page would be an inconsistent, unexplained deviation.

**Trade-offs:** Server Component fetch means the summary only updates on a full route re-render (navigation, or the Router-Cache purge from Pattern 3's `revalidatePath` call) — there's no live/optimistic update while the quick-add dialog is open. For a personal finance tracker at this scale that's an acceptable trade; if a future milestone needs the summary to update *instantly* inside the still-open dialog (optimistic UI), reach for React's `useOptimistic` inside the feature form rather than adding a client data-fetching library — that keeps the "no client cache library" invariant intact.

**Example:**
```typescript
// widgets/balance-summary/ui/balance-summary.tsx
import { getSession } from '@/entities/session/api/session';
import { getSummary } from '@/entities/transaction/api/get-summary';

export async function BalanceSummary({ month, year }: { month: number; year: number }) {
  const session = await getSession();
  if (!session) return null; // layout уже перенаправит на /login выше по дереву
  const summary = await getSummary(session.accessToken, { month, year });
  return <SummaryCards income={summary.income} expense={summary.expense} balance={summary.balance} />;
}
```

## Data Flow

### Request Flow — Transaction Create (Dashboard Quick Add)

```
User clicks "Добавить" (widgets/quick-add-transaction)
    ↓ opens Dialog, renders <TransactionForm> (features/transaction-form/ui)
User fills form, submits
    ↓ react-hook-form onSubmit → createTransactionAction(data) (features/transaction-form/api, 'use server')
Server Action: zod parse (UX only) → getSession() (entities/session) → createTransaction(token, data) (entities/transaction/api)
    ↓ apiFetch POST /api/transactions
Nest Controller → CreateTransactionDto (class-validator, real validation) → TransactionsService → PrismaService
    ↓ 201 response
Server Action: revalidatePath(ROUTES.dashboard), revalidatePath(ROUTES.expenses) → return { success: true }
    ↓
Dialog onSuccess closes; Next re-renders dashboard route (recent-transactions + balance-summary both re-fetch fresh, no-store)
```

### Request Flow — Summary Widget (Read)

```
views/dashboard/ui/dashboard-view.tsx (Server Component)
    ↓ renders <BalanceSummary month={} year={} />  (widgets/balance-summary — also Server Component)
    ↓ getSession() → getSummary(token, {month, year})  (entities/transaction/api/get-summary.ts, cache:'no-store')
    ↓ apiFetch GET /api/transactions/summary?month=&year=
Nest Controller → TransactionsService.summary(userId, month, year) → Prisma groupBy → { income, expense, balance, byCategory }
    ↓ JSON response (Decimal fields as strings, per project money convention)
BalanceSummary component formats via formatMoney() (shared/lib/utils.ts) and renders
```

### Key Data Flows

1. **Mutation → Router Cache invalidation → fresh RSC render:** every transaction/category Server Action ends with explicit `revalidatePath()` calls for every route that displays affected data; there is no automatic or fetch-tag-based invalidation in this app (see Pattern 3).
2. **accessToken is always sourced server-side, one hop above the entity being called:** `entities/session` → read by `features/*/api/*.action.ts` or by a `widget`/`view` Server Component → passed down as a plain string parameter into `entities/transaction|category/api/*.ts`. No entity ever imports `entities/session`.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Single user / personal use (current) | Exactly the plan above — `no-store` + `revalidatePath` is simplest-correct, no caching library needed |
| Small multi-user (family/shared budget, tens of users) | Still fine as-is; if summary queries get slow, add a Postgres index on `(userId, date)` on `Transaction` before touching the frontend caching model |
| Much larger multi-tenant scale (not this project's trajectory) | Only then would `revalidateTag` + Next Data Cache with per-user-salted tags become worth the added complexity — not a near-term concern |

### Scaling Priorities

1. **First bottleneck (if any):** `TransactionsService.summary()` aggregation query as transaction count per user grows — solved with a DB index, not a frontend caching change.
2. **Second bottleneck:** none anticipated at personal-tracker scale; revisit only if a milestone explicitly adds multi-user/shared accounts.

## Anti-Patterns

### Anti-Pattern 1: Duplicating the transaction form inside `widgets/quick-add-transaction`

**What people do:** Build the dashboard quick-add dialog with its own copy of the form fields/validation/submit logic "because it's small," instead of importing `features/transaction-form`.

**Why it's wrong:** Two divergent sources of truth for the same validation rules and submit behavior; a DTO field change now requires updating two form components instead of one; violates the project's own established "one feature, many callers" pattern (`features/auth`).

**Do this instead:** `widgets/quick-add-transaction` imports and wraps `features/transaction-form`, contributing only Dialog/trigger chrome.

### Anti-Pattern 2: Reading the session token inside `entities/transaction/api/create-transaction.ts`

**What people do:** Call `getSession()` directly inside the new entity API function, for convenience, instead of accepting `accessToken` as a parameter.

**Why it's wrong:** This is the exact anti-pattern already documented in `.planning/codebase/ARCHITECTURE.md` ("Reading session in entity API instead of passing accessToken as parameter") — breaks if the entity function is ever called from a context where `getSession()` (server-only) isn't valid, and couples the entity to session implementation details it shouldn't know about.

**Do this instead:** Keep the existing convention — `accessToken` is always a parameter, provided by the caller (a `feature` Server Action or a `widget`/`view` Server Component).

### Anti-Pattern 3: Adding `revalidateTag` + switching fetches off `cache: 'no-store'` to make the summary widget "properly cached"

**What people do:** See `no-store` on every fetch and assume it's an oversight, "fix" it by adding `next: { tags: ['transactions'] }` and calling `revalidateTag('transactions')` in the mutation action for a Next.js-idiomatic look.

**Why it's wrong:** Next's Data Cache is not automatically scoped per-user; a shared tag across all users' summary requests risks cache collisions unless every cache key/tag encodes `userId`, which none of the current code does. This would be a real security-adjacent regression (one user's balance briefly shown to another) for zero benefit at this project's scale, since `revalidatePath` already fully solves the "stale after mutation" problem via the Router Cache.

**Do this instead:** Keep `cache: 'no-store'` everywhere authenticated user data is fetched (as already done); use `revalidatePath()` for post-mutation freshness (Pattern 3).

## Integration Points

### External Services

None new — this research only concerns the existing internal Next.js ↔ Nest.js boundary via `apiFetch` (`apps/web/src/shared/api/api-client.ts`), unchanged by these additions.

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `widgets/quick-add-transaction` ↔ `features/transaction-form` | Direct import (widget → feature, allowed downward) | Widget supplies only Dialog chrome + `onSuccess` callback |
| `views/expenses` ↔ `features/transaction-form` | Direct import (view → feature, allowed downward) | Same component as dashboard, no Dialog wrapper |
| `features/transaction-form/api/*.action.ts` ↔ `entities/session` | Direct import (feature → entity, allowed downward) | Only place a token is read for this flow, same as `features/auth` today |
| `features/transaction-form/api/*.action.ts` ↔ `entities/transaction/api/*.ts` | Direct import, `accessToken` passed as parameter | No new boundary type — extends existing convention |
| `widgets/balance-summary` ↔ `entities/transaction/api/get-summary.ts` | Direct import from Server Component | Same shape as `widgets/recent-transactions` ↔ `get-transactions.ts` |
| Server Action ↔ Next.js Router Cache | `revalidatePath(ROUTES.dashboard | ROUTES.expenses | ROUTES.categories)` | Explicit call required every time; not automatic on action completion |

## Sources

- `.planning/codebase/ARCHITECTURE.md` (this repo, mapped 2026-09-20) — HIGH confidence, primary source for all FSD layering and existing-convention claims
- `.planning/codebase/STRUCTURE.md` (this repo, mapped 2026-09-20) — HIGH confidence, file/folder layout precedent
- Direct reads (2026-09-20) of `apps/web/src/entities/transaction/api/get-transactions.ts`, `apps/web/src/features/auth/api/login.action.ts`, `apps/web/src/shared/config/routes.ts` — HIGH confidence, ground truth for accessToken-param and `cache: 'no-store'` conventions
- [Next.js Docs — Getting Started: Revalidating](https://nextjs.org/docs/app/getting-started/revalidating) — MEDIUM confidence (websearch, cross-checked against official docs), revalidatePath vs revalidateTag semantics and scope
- [Next.js Docs — revalidateTag API reference](https://nextjs.org/docs/app/api-reference/functions/revalidateTag) — MEDIUM confidence (websearch, official docs)
- [Next.js Docs — revalidatePath API reference](https://nextjs.org/docs/app/api-reference/functions/revalidatePath) — MEDIUM confidence (websearch, official docs)
- [App Router: Mutating Data — Next.js Learn](https://nextjs.org/learn/dashboard-app/mutating-data) — MEDIUM confidence, confirms revalidation is an explicit call inside the Server Action, not automatic
- [Feature-Sliced Design — official docs/blog on UI composition](https://feature-sliced.design/blog/ui-composition-patterns) — MEDIUM confidence (community-maintained spec site), confirms "reused-across-pages UI belongs in a shared/lower layer, not duplicated per-widget" guidance used in Pattern 1 and Anti-Pattern 1

---
*Architecture research for: personal expense/income tracker — subsequent milestone (transaction/category CRUD UI + summary widget)*
*Researched: 2026-09-20*
