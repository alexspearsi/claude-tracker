# Stack Research

**Domain:** Frontend CRUD forms for a personal expense/income tracker (Next.js 16 App Router + Nest 12 + Prisma 7, brownfield milestone)
**Researched:** 2026-09-20
**Confidence:** MEDIUM (community best practices, cross-checked across multiple independent web sources; no Context7/official-docs MCP available this run — see Sources)

No new stack is being chosen here. This document recommends **which already-decided or already-available
building blocks to reach for, in what pattern**, for the four form/CRUD screens this milestone adds
(add/edit/delete transaction, add/edit/delete category, balance summary). Nothing here replaces
react-hook-form, class-validator DTOs, or the FSD layering — those are fixed constraints from
`.planning/PROJECT.md`.

## Recommended Stack

### Core Technologies (already in the project — confirmed applicable, no change)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| React Hook Form | 7.87.0 | Form state for add/edit transaction & category forms | Already the project's only form library (auth forms); `useForm` + `<FormField>`/`Controller` pattern from `shared/ui/form.tsx` extends cleanly to non-Zod DTO-backed forms — no new library needed |
| Next.js Server Actions | 16.3.4 (built-in) | Mutations: create/update/delete transaction, create/update/delete category | Matches the existing `features/auth/api/*.action.ts` pattern exactly (redirect outside try/catch, `apiErrorMessage` for toasts); works without a client cache layer, which this milestone doesn't need |
| shadcn/ui `Select` (Radix) | not yet installed | Category picker in the transaction form | Categories are a flat, short, non-searchable list — `Select` is the right-sized primitive; a `Combobox` (Popover+Command+cmdk) would add a dependency for a problem this data shape doesn't have |
| shadcn/ui `Popover` + `Calendar` + `date-fns` | not yet installed | Date picker for transaction `date` field | shadcn/ui ships no single `DatePicker` — this Popover+Calendar composition is the documented, standard pattern; wires into RHF the same way `Select` does |
| `revalidatePath` (Next.js built-in) | 16.3.4 | Refresh `/expenses`, `/dashboard`, category list after a mutation | Standard companion to Server Actions for CRUD; no query keys or client cache to manage, consistent with "no TanStack Query for these mutations" below |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `useOptimistic` (React 19, built-in) | 19.2.8 | Optimistic add/edit/delete in `recent-transactions` / future `/expenses` list widget | Use for the two lists that feel sluggish without it (dashboard quick-add, `/expenses` table). Not required for category management (low-frequency, no UX pressure) — skip there to avoid unnecessary complexity |
| `shadcn/ui` `Dialog` or `Sheet` | not yet installed | Edit/delete confirmation modals, quick-add from dashboard | Needed because there's no modal primitive in the repo yet (only `card`, `form`, `input`, `button`, `label`, `checkbox`, `table`, `sonner`) — required for "quick add from dashboard" (Active requirement) without a full page navigation |
| `shadcn/ui` `AlertDialog` | not yet installed | Delete confirmation (transaction and category) | Distinct from `Dialog` — use for destructive-action confirmation specifically (shadcn's own convention); needed for the 409-on-category-delete UX requirement (show the blocking message clearly, not a silent toast) |
| `shadcn/ui` `DropdownMenu` | not yet installed | Row actions (edit/delete) in the transaction/category tables | Standard shadcn row-actions pattern for `Table`-based lists, which this project already uses (`shared/ui/table.tsx`) |
| `date-fns` | latest 3.x/4.x (check registry) | Formatting the Calendar-picked date for display and for building the ISO string the API expects | Pulled in automatically by the shadcn date-picker pattern; keep it thin — only for the picker's display format, not a general date-utility layer |

### What NOT to Add

| Library | Why Not | Use Instead |
|---------|---------|-------------|
| TanStack Query for these new mutations | Already installed for reads elsewhere, but its own docs advise against driving Server Actions through a `queryFn`/`useMutation` (Server Actions run serially from the client, conflicting with React Query's model); adds query-key bookkeeping this milestone doesn't need | Server Actions + `revalidatePath`, matching the existing `features/auth` pattern |
| Zod for transaction/category forms | Explicitly out of scope per `PROJECT.md` constraints — these two entities are DTO/class-validator on the backend and have no Zod schema; introducing `zodResolver` here would fork the validation source of truth | Local TS types (mirroring the pattern already used in `entities/transaction/model/types.ts`) + a client-side mirror of the DTO's regex/shape (`AMOUNT_PATTERN`, ISO date, `IsUUID`) for pre-submit UX validation, with the server DTO remaining the real gate |
| `react-number-format` / `currency.js` / `Dinero.js` | Correct libraries in general, but adding a new dependency for one numeric field is disproportionate here, and the project's amount contract is already a plain validated string, not a currency-object abstraction | Plain `Input` with `inputMode="decimal"`, a regex mirroring the API's `AMOUNT_PATTERN` (`/^\d{1,10}(\.\d{1,2})?$/`) for client-side pre-validation, `formatMoney()` (already in `shared/lib/utils.ts`) for display only |
| `parseFloat`/`Number()` on the amount field for anything but final display | Reintroduces float precision loss the project deliberately avoids (`Decimal(12,2)` + string-over-the-wire is a documented project invariant) | Keep amount as a string end-to-end in the form; convert to `Number` only inside `formatMoney`/`Intl.NumberFormat` for rendering |
| A new `Combobox`/`cmdk`-based category picker | Category lists in this domain are short and flat (no search need) | `Select` |

## Installation

```bash
# shadcn/ui primitives needed for this milestone (none of these exist in src/shared/ui yet)
npx shadcn@latest add select popover calendar dialog alert-dialog dropdown-menu

# date-fns comes in as a shadcn calendar-pattern dependency; pin explicitly, don't rely on shadcn CLI's version choice
npm install date-fns --workspace=apps/web
```

No other new runtime dependencies are required — react-hook-form, Sonner, Recharts (if a later phase
adds charts, currently out of scope), and TanStack Query are already present and cover everything else.

**shadcn CLI note (carried over from existing CLAUDE.md convention):** after `npx shadcn add`, check for
the incorrect `from "cn"` import and the `next-themes` dependency it sometimes pulls in — strip both,
same as previous component additions in this repo.

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|--------------------------|
| Server Actions + `revalidatePath` for all CRUD | TanStack Query `useMutation` + optimistic cache updates | If a future milestone needs real-time sync across tabs/devices or background refetching independent of navigation — not needed for a single-user, single-tab expense tracker |
| `useOptimistic` for transaction list mutations | Plain `revalidatePath` + loading state (no optimism) | If the list is small enough and mutations rare enough that a brief loading flash is acceptable — reasonable fallback for category CRUD specifically, given its low interaction frequency |
| shadcn `Select` for category picker | shadcn `Combobox` (Popover+Command+cmdk) | If category count grows large (tens+) or search becomes necessary — not the case per `PROJECT.md` (categories have no hierarchy or bulk-import feature planned) |
| Plain regex-validated string `Input` for amount | `react-number-format` `NumericFormat` | If the UX requirement expands to live thousand-separator formatting while typing — current requirements only need a valid decimal amount, not live masking |
| shadcn `Dialog`/`AlertDialog` for quick-add and delete confirm | Dedicated `/expenses/new` and `/expenses/[id]/edit` pages | If deep-linking to a specific "new transaction" or "edit transaction" URL becomes a requirement — not stated in `PROJECT.md`; dashboard quick-add explicitly wants an in-place modal, not a navigation |

## Stack Patterns by Variant

**If building the transaction add/edit form:**
- Reuse the `shared/ui/form.tsx` (`Form`, `FormField`, `FormItem`, `FormControl`, `FormMessage`) wrapper exactly as `register-form.tsx` does, but back it with `useForm<TransactionFormValues>()` and no `zodResolver` — validate with a plain resolver function or manual `form.setError` calls that mirror the DTO's `class-validator` rules (amount pattern, ISO date, category UUID, description max length)
- Server Action submits, catches `apiErrorMessage`-shaped API errors, and on the 400 grouped-error format (`{ field: [messages] }`) from `ValidationPipe`, maps each key onto `form.setError(field, { message })` rather than a single toast — this is the more informative option and the API already returns field-grouped errors
- Because `entities/transaction` cannot import `entities/category`, the category `Select`'s options must be fetched/passed in by the `widget`/`view` that renders the form (same rule already documented for the recent-transactions list)

**If building optimistic list updates for `/expenses`:**
- Use `useOptimistic` keyed by a client-generated temp id, carried through the Server Action call and matched on success/failure — do this only where the UX benefit is clear (add, delete from a visible list); for edit-in-place, a simple pending/disabled state during the Server Action call is adequate and lower-risk
- Category CRUD does not need `useOptimistic` — it's a low-frequency admin-style action; a loading state on submit is enough

**If displaying the balance/summary:**
- Fetch `GET /transactions/summary` in a Server Component (same pattern as `recent-transactions`), not via TanStack Query — it's a single read tied to the page render, no client interactivity requiring cache/refetch
- No new charting library needed — `PROJECT.md` explicitly defers visualization; a plain table (existing `shared/ui/table.tsx`) covers the category breakdown requirement

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|------------------|-------|
| shadcn/ui `Calendar` (react-day-picker under the hood) | React 19.2.8 | Confirm the shadcn CLI installs a react-day-picker version with React 19 peer support at add-time — check `npm view react-day-picker version` per this project's stated convention of verifying registry versions, not memory |
| `useOptimistic` | React 19.2.8, Next.js 16.3.4 App Router | Built into React 19, already satisfied by the project's pinned React version — no install needed |
| shadcn `Select`/`Dialog`/`AlertDialog`/`DropdownMenu` | Radix UI 1.6.7 (already a dependency) | These all compose on top of the already-installed Radix primitives version; CLI add should not bump the pinned Radix version unexpectedly — verify `package.json` diff after running `shadcn add` |

## Sources

- Web search (multiple independent results, cross-checked, confidence MEDIUM — see `gsd_run query classify-confidence --provider websearch --verified`):
  - React Hook Form + Server Actions pattern: Markus Oberlehner's guide, nehalist.io, Aurora Scharff, buildwithmatija.com, Next.js official forms guide
  - shadcn date picker composition pattern: ui.shadcn.com/docs/components (base date-picker), shadcndeck.com, shadcnstore.com
  - `useOptimistic` for list mutations: thevalleyofcode.com, dev.to (React useOptimistic 2026 patterns), shubhra.dev (rollback-bug postmortem)
  - Server Actions vs TanStack Query: TanStack Query official advanced-SSR docs, peerlist.io deep dive, dev.to (TanStack Query in 2026)
  - Money/float precision: dev.to (financial precision guide), currency.js docs, honeybadger.io blog
  - shadcn `Select` + react-hook-form `Controller`: ui.shadcn.com/docs/forms/react-hook-form, GitHub shadcn-ui/ui issue #1253
  - `react-number-format` integration (considered and rejected for this milestone): npmjs.com, react-hook-form GitHub discussions #2200/#9161
  - Server-side field errors → `setError`: react-hook-form.com advanced-usage docs, carlrippon.com
- Codebase (read directly, HIGH confidence — ground truth for what's already installed/decided):
  - `.planning/PROJECT.md`, `.planning/codebase/STACK.md`
  - `apps/web/src/shared/lib/utils.ts` (`formatMoney`), `apps/web/src/shared/ui/*` (current shadcn inventory — no Select/Dialog/Popover/Calendar/DropdownMenu/AlertDialog yet)
  - `apps/web/src/features/auth/ui/register-form.tsx`, `apps/web/src/features/auth/api/register.action.ts` (existing RHF + Server Action pattern to mirror)
  - `apps/api/src/modules/transactions/dto/create-transaction.dto.ts`, `transaction-validation.ts` (amount regex, ISO date rule, description max — the client-side mirror target)
  - `apps/api/src/modules/categories/dto/create-category.dto.ts` (category validation rules)
  - `apps/api/src/modules/transactions/transaction.types.ts` (`TransactionDto`, `TransactionSummary` shapes)

---
*Stack research for: Frontend CRUD forms + dashboard summary, personal expense/income tracker milestone*
*Researched: 2026-09-20*
