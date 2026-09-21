# Project Research Summary

**Project:** Personal Expense/Income Tracker — frontend CRUD milestone
**Domain:** Brownfield feature addition — transaction/category CRUD forms + balance summary, on an existing Next.js 16 (FSD) + Nest 12 + Prisma 7 monorepo
**Researched:** 2026-09-20
**Confidence:** MEDIUM-HIGH

## Executive Summary

This milestone adds the missing frontend layer on top of an already-complete backend: transaction CRUD, category CRUD, a `/expenses` list page with pagination, and a balance/income/expense summary with category breakdown on `/dashboard`. No backend work is needed. The recommended approach extends existing patterns: one shared `features/transaction-form` consumed by both the dashboard quick-add dialog and `/expenses` (mirroring `features/auth`), Server Actions + `revalidatePath` for all mutations, and Server Component fetches for the summary widget (mirroring `recent-transactions`). New shadcn/ui primitives needed: `Select`, `Popover`+`Calendar`, `Dialog`, `AlertDialog`, `DropdownMenu`. Categories reuse the existing `@expense/shared` Zod schema; transactions get a new local Zod schema for UX only.

The dominant risk cluster is data-shape mismatches: a signed "negative for expense" amount field will 400 against the unsigned `AMOUNT_PATTERN`; `formatMoney`'s ru-RU comma-decimal output must never feed back into the edit form; naive local-`Date` round-tripping of date-only values can drift the calendar day across timezones; and `revalidatePath` must cover every surface (`/dashboard`, `/expenses`, `/categories`) or one goes stale after a mutation on another.

## Key Findings

**Stack:** No new core stack. Add shadcn `Select`, `Popover`+`Calendar`+`date-fns`, `Dialog`/`AlertDialog`, `DropdownMenu`. Reject TanStack Query for these mutations, Zod for transactions (local schema for UX only), any currency library, `Combobox`/`cmdk`.

**Features (P1):** Transaction add/edit/delete (type toggle, amount, category, date default-today, description); `/expenses` paginated list; shared quick-add form (dashboard + `/expenses`); category add/edit/delete with color swatch; 409 "in use" delete-block message; balance summary + category breakdown table. Deferred: charts, recurring, budgets, CSV import/export, multi-currency, infinite scroll.

**Architecture:** `features/transaction-form`/`features/category-form` presentation-agnostic, shared by widget and view. Entity API functions take `accessToken` as a parameter. Server Actions call `getSession()`, then entity fn, then `revalidatePath()`. No `revalidateTag` (would risk cross-user cache collisions on JWT-scoped `no-store` data).

**Top pitfalls:**
1. Signed amount vs. unsigned `AMOUNT_PATTERN` + separate `type` field
2. ru-RU comma decimal separator must not leak into form input value
3. Date timezone drift — build ISO as noon-UTC (`T12:00:00.000Z`), never round-trip local `Date`
4. Category delete 409 must be a distinct actionable UI state, checked via `error.status`, not raw toast
5. `revalidatePath` must cover all affected routes via a shared constant, or one surface goes stale

## Implications for Roadmap

**Phase 1 — Category CRUD:** hard dependency for transaction form's category picker; reuses existing shared Zod schema; must implement 409 delete-block as first-class UI.

**Phase 2 — Transaction CRUD (shared form + `/expenses`):** core value proposition; highest pitfall density (amount sign, decimal separator, date drift); establish shared `TRANSACTION_AFFECTED_PATHS` revalidation constant here.

**Phase 3 — Balance/Summary widget:** no backend work, lowest risk; source strictly from `/transactions/summary`, never re-derive from a paginated list; avoid literal `0.00` loading placeholder.

**Research flags:** Phase 2 needs a focused pass on amount/date field implementation. Phases 1 and 3 have well-established patterns — skip research-phase.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM | Community sources cross-checked; codebase facts HIGH |
| Features | MEDIUM | Converging competitor/community sources, no peer-reviewed UX research |
| Architecture | HIGH | Grounded directly in codebase reads |
| Pitfalls | HIGH | Derived from actual DTO regexes and `CONCERNS.md`; locale advice MEDIUM |

**Overall confidence:** MEDIUM-HIGH

**Gaps:** verify `react-day-picker` + React 19 compatibility at install time; `useOptimistic` scope is a judgment call (P2/P3 stretch, not required); category-count assumption (flat, short list) underlies the `Select`-over-`Combobox` choice.

## Sources

**Primary (HIGH):** `.planning/PROJECT.md`, `.planning/codebase/{ARCHITECTURE,STRUCTURE,CONCERNS}.md`, direct reads of `entities/transaction/api/get-transactions.ts`, `features/auth/api/*.action.ts`, `shared/config/routes.ts`, `shared/lib/utils.ts`, `shared/api/error-message.ts`, transaction/category DTOs, `prisma-errors.ts`, root `CLAUDE.md`.

**Secondary (MEDIUM):** Next.js official revalidation docs, React Hook Form + Server Actions community guides, shadcn date-picker pattern docs, Feature-Sliced Design blog, YNAB/Mint UX sources.

**Tertiary (LOW):** general locale/decimal-parsing community advice, cross-checked against the actual `AMOUNT_PATTERN` regex.
