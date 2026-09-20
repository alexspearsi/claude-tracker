# Pitfalls Research

**Domain:** Transaction/category CRUD forms + summary display on Nest 12 (ESM) + Prisma 7 + Next.js 16 App Router (FSD) + JWT-cookie auth with rotating refresh
**Researched:** 2026-09-20
**Confidence:** HIGH (codebase-grounded findings — read directly from source); MEDIUM (general Next.js/money-input patterns cross-checked against current docs/community sources)

## Critical Pitfalls

### Pitfall 1: Amount field has no sign — a "negative for expense" UI will 400 against the real API

**What goes wrong:**
A natural first instinct for a combined income/expense form is "one amount field, negative = expense, positive = income" (spreadsheet mental model). That directly breaks against this API: `AMOUNT_PATTERN = /^\d{1,10}(\.\d{1,2})?$/` in `apps/api/src/modules/transactions/dto/transaction-validation.ts` has **no minus sign** in the character class. Sign is carried entirely by the separate `type: TransactionType` (`INCOME`/`EXPENSE`) field. A form that lets a user type `-500` and submits that string will get a 400 `amountFormat` error that the current `apiErrorMessage()` will surface (correctly) but the form's number input may not, depending on how it's wired.

**Why it happens:**
The API design intentionally keeps `amount` an unsigned magnitude and moves sign semantics to `type`, which is the right domain model — but it's a different model than a naive single-field mental model, and nothing in the form layer enforces it unless the UI is deliberately built as "amount (always positive) + type toggle."

**How to avoid:**
Build the amount input as an unsigned magnitude field paired with an explicit INCOME/EXPENSE segmented control or toggle (this mirrors the DB/API model exactly — see `TransactionType` enum). Never allow a leading `-` to reach the string sent to `amount`. Add a client-side Zod/regex check mirroring `AMOUNT_PATTERN` before submit so bad input never reaches the Server Action → API round trip.

**Warning signs:**
Any form component named something like `AmountInput` that accepts negative values, or a submit handler that does `type: value < 0 ? 'EXPENSE' : 'INCOME'`.

**Phase to address:**
Transaction add/edit form phase — bake the amount+type coupling into the form schema from the start, not as a post-hoc fix.

---

### Pitfall 2: Comma decimal separator (ru-RU locale) breaks `AMOUNT_PATTERN` silently as a 400, not a friendly inline error

**What goes wrong:**
`formatMoney()` in `apps/web/src/shared/lib/utils.ts` renders amounts with `Intl.NumberFormat('ru-RU', …)`, which uses a comma as the decimal separator and a non-breaking space as the thousands separator (e.g. `1 234,56 ₽`). If the edit form pre-fills an amount input with this *displayed* string (or a user copies a formatted number and pastes it in), the raw string contains a comma and possibly NBSP grouping characters. The API regex `^\d{1,10}(\.\d{1,2})?$` only accepts a literal dot — a comma-containing string fails validation as a 400, not a domain-friendly "use a dot" message unless `apiErrorMessage()`'s Zod/class-validator message surfacing is wired up (it is, via `messages.amountFormat`, but only if the DTO validation path is hit — client-side should never let it get that far).
This is a textbook locale pitfall independent of this codebase too: `parseFloat` and native regex-based amount parsing assume `.` as decimal separator, and naively stripping "," → "." breaks the moment a thousands-grouped string like `"1.234,56"` is involved.

**Why it happens:**
The *display* format (locale-aware, comma decimal) and the *wire* format (`AMOUNT_PATTERN`, dot decimal, no grouping) are two different string shapes that look almost identical to a developer typing test data in English locale, but diverge immediately for real Russian input, and diverge again if the edit form seeds the input value from the already-formatted display string instead of the raw API value.

**How to avoid:**
Keep the amount `<input>` un-formatted while focused (raw digits + one separator, `inputMode="decimal"`), normalize on blur/submit only: strip any grouping character, replace a trailing/only comma with a dot, then validate against a client mirror of `AMOUNT_PATTERN` before calling the Server Action. When pre-filling the edit form, seed the input from the raw API decimal string (already dot-separated, e.g. `"1234.56"`), never from `formatMoney()`'s locale-formatted output.

**Warning signs:**
Edit form defaultValue wired to `formatMoney(transaction.amount)` instead of `transaction.amount`; no client-side normalization step between `<input>` and the value handed to `zodResolver`/Server Action.

**Phase to address:**
Transaction add/edit form phase.

---

### Pitfall 3: `IsISO8601({ strict: true })` rejects the exact kind of string a naive date-picker→API bridge produces on timezone-negative machines

**What goes wrong:**
`transaction-validation.ts` explicitly documents why `strict: true` is set: it rejects impossible calendar dates like `2026-02-31`. That's working as intended. The real pitfall is upstream of it: a `<input type="date">` gives you a plain calendar string like `"2026-09-20"` with **no timezone info**. If the form does `new Date(dateInputValue).toISOString()` to build the payload, `new Date("2026-09-20")` is parsed as **UTC midnight**, then formatting/display code that converts back to local time (e.g. anything using `toLocaleDateString()` in a UTC+ locale like Moscow, UTC+3) is fine going forward — but a user in a UTC-negative timezone picking "Sep 20" can get `2026-09-19T21:00:00.000Z` if the date is instead built from a local-time `Date` object (`new Date(year, month, day)`) and then `.toISOString()`'d, silently shifting the calendar date by one day before it ever reaches the strict ISO validator (which will happily accept the shifted date — it's still a valid ISO8601 string, just the *wrong day*).

**Why it happens:**
`new Date(dateOnlyString)` (UTC) and `new Date(y, m, d)` (local) are both idiomatic ways to build a `Date` from a date-only picker value, and they resolve differently depending on which one you reach for, which timezone the browser is in, and near-midnight edge cases. Both eventually produce valid-looking ISO strings, so `strict: true` cannot catch a drifted-but-valid date — it only catches genuinely impossible calendar dates.

**How to avoid:**
Never round-trip through a local-timezone `Date` object for a date-only value. Build the ISO string directly from the date-picker's `YYYY-MM-DD` value (e.g. `` `${dateOnlyString}T12:00:00.000Z` `` — noon UTC avoids drifting to the previous/next calendar day in any real-world timezone) instead of `new Date(y,m,d).toISOString()`. On display, format the *date-only part* of the stored ISO string directly (slice `YYYY-MM-DD` or use a UTC-aware formatter) rather than constructing a local `Date` from the full ISO timestamp and calling a locale date formatter that reinterprets it in browser-local time.

**Warning signs:**
Any transaction whose displayed date is one day off from what the user picked, especially reported by users far from UTC+3; a form default date computed via `new Date().toISOString().split('T')[0]` (this one is actually safe for "today" in UTC but will show "yesterday" during the last hours of the day for users west of UTC).

**Phase to address:**
Transaction add/edit form phase — pin down the date-only-string convention once and reuse it for both the picker→payload direction and the API→display direction.

---

### Pitfall 4: Category delete 409 (P2003) reaching the UI as a raw error toast instead of a domain message

**What goes wrong:**
`categories.service.ts` already translates the Prisma `P2003` (foreign key restrict — category still referenced by transactions) into `ConflictException('Нельзя удалить категорию, пока по ней есть транзакции')`. That's correctly HIGH-confidence groundwork already in place. The pitfall is purely on the frontend: `apiErrorMessage()` does correctly extract `body.error.message` for any 4xx (including 409) and returns it as a string, so a plain `toast.error(apiErrorMessage(err))` on delete failure *will* show the right Russian message — but only if the delete action is wired through the same `apiFetch`/`ApiError` machinery `apiErrorMessage()` expects. A delete implemented as a raw `fetch()` bypassing `apiFetch`, or a Server Action that doesn't catch and doesn't call `apiErrorMessage`, will surface Next.js's generic Server Action error boundary or an unhandled rejection instead.
The deeper UX pitfall: even with the *message* right, a bare toast for "can't delete, has transactions" is a dead end for the user — no path to actually delete the category (reassign or bulk-delete transactions first). This is the same category of problem as any "restrict" FK in a UI: the error message alone doesn't give the user their next action.

**Why it happens:**
The API layer's job (return a meaningful 409) is already done; the failure mode is a new Server Action for category delete not reusing the existing `apiFetch` + `ApiError` + `apiErrorMessage()` pipeline that auth actions already use, plus nobody designing the "now what" UX for a blocked delete.

**How to avoid:**
Implement category delete as a Server Action that calls `apiFetch` (so failures are `ApiError` instances) and routes the catch through `apiErrorMessage()`, exactly like `loginAction`. For UX, treat the 409 as a distinct, expected outcome (check `error.status === 409`, not just message string matching) and show a message that also names the way out (e.g. "reassign or delete the transactions in this category first" — or, if the roadmap includes it, link to a filtered `/expenses?category=` view). Don't let the raw Prisma/Nest message be the only affordance for a blocked action the user will hit constantly (any category with even one transaction can never be deleted, only edited).

**Warning signs:**
A delete button with no confirmation/error-state UI at all (silent failure until someone reads DevTools); error handling that string-matches the Russian message instead of checking `error.status`.

**Phase to address:**
Category CRUD form phase — design the "delete blocked" state as a first-class UI state, not an afterthought toast.

---

### Pitfall 5: `revalidatePath` calls scoped to only one surface leave the other stale (dashboard quick-add vs. `/expenses` list)

**What goes wrong:**
This milestone explicitly has two independent surfaces reading the same transaction data: the dashboard's `recent-transactions` widget (`/dashboard`) and the full `/expenses` list page. Both currently fetch with `cache: 'no-store'` (see `get-transactions.ts`), so there's no Next.js Data Cache staleness today — but as soon as mutation Server Actions are added, the natural move is `revalidatePath('/dashboard')` inside the quick-add action and `revalidatePath('/expenses')` inside the `/expenses` page's own mutations. If a developer only revalidates the path the action's form happens to live on (e.g. dashboard quick-add only revalidates `/dashboard`), a user who adds a transaction from the dashboard widget and then navigates to `/expenses` via client-side navigation may see the router cache's segment for `/expenses` (unaffected by the dashboard's revalidation) still holding pre-mutation data until a hard reload or an explicit revalidation of that path too. The same applies to any future summary/balance widget shown in the shared dashboard layout — revalidating `/dashboard` doesn't revalidate a layout that's also mounted under `/expenses` unless that layout's owning path is revalidated too.
`revalidatePath` is per-path, not per-data-shape: there's no single call that says "anything that reads transactions is now stale."

**Why it happens:**
`revalidatePath(path)` only marks the given path (and, per Next's current docs, the layout chain *of that path*) for revalidation. Since both `/dashboard` and `/expenses` live under the same `(dashboard)` route group but are still distinct paths, a mutation triggered from one surface has no automatic effect on the other's cached RSC payload. This is Next's documented behavior, not a bug, but it's exactly the shape of gotcha that "add a form once" implementations miss because they only test the surface the form is on.

**How to avoid:**
Any Server Action that mutates a transaction or category must call `revalidatePath()` for **every** surface that displays that data — at minimum both `/dashboard` and `/expenses`, and `/categories` too if the mutation is category-level (since category name/color changes affect how transactions render everywhere). Prefer a single shared constant (e.g. `TRANSACTION_AFFECTED_PATHS = [ROUTES.dashboard, ROUTES.expenses]`) imported by every mutation action, so adding a third surface later is a one-line change instead of an audit of every action. If a future summary/balance widget is added to a shared layout, revalidate the layout's segment explicitly (`revalidatePath(path, 'layout')`) rather than assuming the page-level call covers it.

**Warning signs:**
A newly added transaction not appearing in the `/expenses` list until a manual browser refresh, despite appearing correctly on `/dashboard` (or vice versa); a category rename not reflected in already-rendered transaction rows on the other page.

**Phase to address:**
Both the transaction form phase and the category form phase — establish the shared "affected paths" list in whichever phase ships first, reuse it in the other.

---

### Pitfall 6: A mutation Server Action fired during proxy's refresh-token exchange gets caught in the no-parallel-refresh trap

**What goes wrong:**
CLAUDE.md and `CONCERNS.md` both flag this as a known fragile area: the API rotates (revokes) the refresh token on every `/auth/refresh` call, so two concurrent refresh attempts mean the second one 401s and the session is torn down. New mutation Server Actions (add/edit/delete transaction or category) don't call `refreshSession()` directly — they use `apiFetch` with the access token from `getSession()`, which doesn't refresh anything. The actual risk is narrower than "any mutation trips this" but real: if a user's access token expires *while they're mid-interaction* (e.g. sitting on the `/expenses` page with a stale 15-minute-old access cookie, then submitting an edit form), the mutation's `apiFetch` call will get a 401 from `JwtAuthGuard` — not a silent race, but the action needs to handle "API says 401" gracefully instead of showing a generic error toast, because the *real* fix (refresh) already happened or will happen on next navigation via proxy, not inside the Server Action itself.
The genuinely dangerous version of this pitfall is if a future contributor "fixes" a 401-on-mutation by having the mutation action call `refreshSession()` itself to retry — that's exactly the parallel-refresh case CLAUDE.md warns is reserved for proxy and `logoutAction` only, and doing it from a mutation action risks colliding with a concurrent proxy-driven refresh from another in-flight navigation/prefetch, tearing down the session mid-edit.

**Why it happens:**
The 15-minute access token lifetime is short enough that a user idling on a form (writing a long description, double-checking an amount) before submitting can plausibly cross the expiry boundary, and the "obvious" fix — retry with a fresh token — is the one specifically prohibited by the existing architecture.

**How to avoid:**
Mutation Server Actions should treat a 401 from `apiFetch` as a distinct, expected error case (via `ApiError.status === 401`) and surface a message that tells the user to reload/retry (e.g. "session updated, please try again") rather than a generic failure toast — the retry will pick up the refreshed cookies proxy already wrote on the next navigation. Do **not** call `refreshSession()` from any new mutation action; that capability stays reserved for proxy and `logoutAction` per the existing architecture note in CLAUDE.md.

**Warning signs:**
A mutation action importing `refreshSession` from `entities/session/api/session.ts`; user reports of "randomly logged out" clustering around form submissions rather than page loads.

**Phase to address:**
Both form phases — establish the 401-handling convention for mutation actions once (likely worth a small shared helper) rather than reinventing it per form.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|-----------------|-------------|-------------|
| Skipping client-side amount/date normalization, relying on API 400s surfaced via `apiErrorMessage()` | Less form code to write up front | Clunky UX: full round-trip to server for input errors a client regex could catch instantly (comma separator, negative sign) | Never for amount/date — these are the two fields users mistype most; acceptable only for genuinely rare edge cases |
| Revalidating only the path the form lives on, not all affected surfaces | Ships faster, works in manual testing (dev usually tests one surface at a time) | Stale data bugs that only show up when a real user bounces between dashboard and `/expenses` — hard to reproduce, easy to dismiss as "just refresh" | Never — cost of listing all affected paths is one array, cost of the bug is a confusing "did my transaction save?" support question |
| String-matching the 409 category-delete message on the frontend instead of checking `error.status` | Works today, message is stable Russian text | Breaks silently if the backend message copy ever changes (i18n, wording tweak) — becomes a generic error toast with no warning | Never; `ApiError.status` is already available on the error object, checking it costs nothing |
| Treating amount `<input type="number">` as sufficient validation | Free browser-native numeric keypad/validation | `type="number"` mangles locale input (blocks comma entirely in some browsers, silently clears invalid partial input like a trailing dot), and doesn't stop pasted multi-decimal or scientific-notation strings | Only as the outer wrapper with `inputMode="decimal"`; never as the sole validation layer — mirror `AMOUNT_PATTERN` in the Zod schema regardless |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| `apiFetch` + Server Action for mutations | Bypassing `apiFetch` with a raw `fetch()` for a "quick" delete/patch, losing `ApiError` typing and `apiErrorMessage()` compatibility | Always route mutations through `apiFetch`, matching the pattern in `features/auth/api/login.action.ts` |
| Category `color`/`icon` fields shared between `packages/shared` Zod schema and API `class-validator` DTO | Editing only one of `packages/shared/src/schemas/category.ts` or `apps/api/.../category-validation.ts` when adding a new rule (e.g. tightening `CATEGORY_NAME_MAX`) | CLAUDE.md already flags this: category rules are duplicated, not shared — always update both files together, in the same commit |
| `revalidatePath` across dashboard + `/expenses` + `/categories` | Assuming one `revalidatePath` call covers "all pages showing this data" | Maintain a shared list of affected paths per mutation type (transaction vs. category) and revalidate all of them |
| Decimal amount from API (`Prisma.Decimal` serialized as string) into a form's numeric state | Coercing to JS `number` anywhere in the mutation round-trip (e.g. `Number(amount)` before sending back to the API) | Keep amount as a string end-to-end in the form; only convert to `Number` for `formatMoney()`-style *display*, never for the value handed to the Server Action/API |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Refetching `GET /categories` on every transaction row render to resolve name/color (already the pattern used in `recent-transactions`) | Extra network round-trip per widget mount even though categories rarely change within a session | Fetch categories once per page load into a `Map`, as `recent-transactions` already does — replicate this exact pattern in the new `/expenses` list and any quick-add widget rather than re-inventing per-row lookups | Noticeable at even moderate transaction-list sizes (20+ rows) if the lookup is done per-row instead of once |
| Category list fetched without pagination (`GET /api/categories` has no `limit`/`offset` — flagged in CONCERNS.md) | Category `<select>` in the transaction form silently renders however many categories exist, no virtualization | Not a blocker for a personal-use app at expected scale (dozens of categories); revisit only if categories start being bulk-imported | Irrelevant at personal-tracker scale; documented in CONCERNS.md as a non-issue for now |
| Summary/balance display recomputing client-side from a full transaction fetch instead of using `GET /transactions/summary` | Extra data transferred, and client-side aggregation can drift from the server's month/year boundary logic (`buildDateFilter`) | Always use the existing `/transactions/summary?month=&year=` endpoint for balance/summary display — it already returns income/expense/balance as strings with category breakdown; don't re-derive it from a paginated transaction list | Breaks correctness immediately if the transaction list is paginated (summary computed from only the visible page) — this isn't a scale issue, it's a correctness bug from day one |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Trusting a `categoryId` selected in a stale form (e.g. category deleted in another tab while the transaction form was open) | Submitting a transaction with a `categoryId` that no longer belongs to the user (or no longer exists) relies entirely on the API's `assertCategoryBelongsToUser()` check — already flagged in CONCERNS.md as not DB-enforced | Treat the API's 4xx response as the source of truth (it will reject a stale/foreign categoryId); surface that rejection as "this category no longer exists, pick another" rather than a generic error, and don't try to validate categoryId ownership client-side (the client has no way to know it's stale without asking the server anyway) |
| Rendering category `color` as inline CSS/style from user-controlled input | `CATEGORY_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/` is already enforced server-side, so this is low risk today, but any new client-side color picker must not bypass that pattern (e.g. accepting `rgb()`/named colors client-side that the API would then reject, or worse, accepting arbitrary CSS if the pattern is ever loosened) | Keep the client-side color input constrained to the same hex pattern; don't widen it without updating both `packages/shared/src/schemas/category.ts` and the API DTO together (per the existing dual-maintenance note in CLAUDE.md) |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Generic error toast for category-delete 409 | User can't tell whether the delete failed because of a network issue, a permissions issue, or "this category has transactions" — dead end with no next step | Distinct, actionable message for the 409 case specifically (see Pitfall 4); ideally a confirmation dialog that already warns "N transactions use this category" before the delete is even attempted, using a count the API could return or that's inferable from an existing transactions-by-category fetch |
| Optimistic UI update on transaction add without reconciling against the real API-assigned `id`/`createdAt` | Row briefly shows client-generated placeholder data (e.g. `Date.now()` id) that then "jumps" once the real response arrives, or worse, duplicates if the widget also revalidates | Either skip optimistic updates for the first version (simpler, matches "no tests yet" project maturity) or use React Query's proper optimistic-update + rollback pattern with the real mutation response reconciled in, not just revalidated over |
| Balance/summary widget silently showing `0.00` while the summary request is still loading (no skeleton/loading state) | Reads as "you have no money" for a split second, which is alarming for a finance app specifically | Explicit loading skeleton or `null`-state rendering for the summary numbers, never a literal `0` as the loading placeholder for money values |
| Date picker defaulting to browser-local "today" without accounting for the UTC-noon convention used server-side | Edge case where a transaction dated "today" near midnight local time saves as "yesterday" from the server's perspective (see Pitfall 3) | Use the same date-only-string convention for the default value as for user-picked values — compute "today" as a local `YYYY-MM-DD` string (not through `Date.toISOString()`, which is UTC-based) |

## "Looks Done But Isn't" Checklist

- [ ] **Transaction amount field:** Often missing — client-side rejection of negative signs and comma separators *before* submit; verify by typing `-100` and `100,50` into the field and confirming an inline error, not a round-trip 400.
- [ ] **Category delete flow:** Often missing — a distinct UI state for the 409 "has transactions" case; verify by deleting a category that has at least one transaction and confirming the message names the reason and a next step, not a raw error string.
- [ ] **Cross-surface revalidation:** Often missing — dashboard quick-add and `/expenses` list both refreshed after any mutation; verify by adding a transaction from the dashboard widget, then client-side navigating (not hard refresh) to `/expenses` and confirming it appears.
- [ ] **Date round-trip:** Often missing — a transaction dated "today" saves and displays as the same calendar day regardless of the tester's OS timezone; verify by temporarily setting the system timezone to something UTC-negative (e.g. US Pacific) and re-testing add/edit near local midnight.
- [ ] **Summary display correctness:** Often missing — balance/summary numbers sourced from `GET /transactions/summary`, not re-derived from a paginated transaction list; verify by adding enough transactions to exceed one page (20+) and confirming the summary still reflects all of them, not just the visible page.
- [ ] **401-during-mutation handling:** Often missing — a mutation submitted with an expired access token shows a "try again" message instead of a generic failure or infinite spinner; verify by manually expiring/clearing the access cookie (keep refresh) mid-form and submitting.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|-----------------|
| Amount field accepting negative/comma input reaching production | LOW | Add client-side normalization + Zod regex matching `AMOUNT_PATTERN`; no data migration needed since the API already rejects bad input at the boundary — worst case is a bad UX window, not bad data |
| Stale cross-surface data (revalidatePath gaps) | LOW | Add the missing `revalidatePath()` calls to the affected mutation actions; no data corruption, purely a caching/display issue |
| Date drift on saved transactions (wrong calendar day) | MEDIUM | Requires a one-off data fix for already-drifted rows (identify via `date` values inconsistent with `createdAt`) plus the form-layer fix from Pitfall 3; harder to detect retroactively since a drifted date still looks "valid" |
| Category delete UX shipped as raw error toast | LOW | Pure frontend fix — swap the catch handler to branch on `error.status === 409` with a better message; no backend or data changes needed |
| A mutation action calling `refreshSession()` directly (reintroducing the parallel-refresh bug) | MEDIUM | Remove the call, replace with 401-surfacing-as-retry-prompt (Pitfall 6); if this shipped and caused user-visible logouts, no data is lost (refresh rotation is designed to fail safe by clearing cookies) but it does erode user trust — worth a changelog/support note if it reached production |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|-------------------|--------------|
| Amount sign/negative handling (Pitfall 1) | Transaction add/edit form phase | Form rejects `-100` client-side; submitted payload for an EXPENSE always has an unsigned `amount` string and `type: 'EXPENSE'` |
| Comma decimal separator (Pitfall 2) | Transaction add/edit form phase | Typing `100,50` either auto-normalizes to `100.50` before submit or shows an inline error; edit form pre-fills from raw API string, not `formatMoney()` output |
| Date timezone drift (Pitfall 3) | Transaction add/edit form phase | Adding a transaction dated "today" under a non-UTC+3 system timezone saves and displays the same calendar date |
| Category delete 409 UX (Pitfall 4) | Category CRUD form phase | Deleting a referenced category shows a specific, actionable message (not a raw toast) and doesn't crash the delete button's state |
| Cross-surface `revalidatePath` gaps (Pitfall 5) | Both transaction and category form phases | Mutating from one surface (dashboard widget) is visible on the other (`/expenses`, `/categories`) after client-side navigation, no hard refresh needed |
| 401-during-mutation handling (Pitfall 6) | Both form phases | Submitting a mutation with an expired access cookie (refresh cookie intact) shows a retry-oriented message, not a crash or silent failure, and does not call `refreshSession()` from within the action |

## Sources

- `apps/api/src/modules/transactions/dto/transaction-validation.ts`, `create-transaction.dto.ts`, `update-transaction.dto.ts` (read directly — HIGH confidence, curated/primary source)
- `apps/api/src/modules/categories/dto/category-validation.ts`, `categories.service.ts` (read directly — HIGH confidence)
- `apps/api/src/prisma/prisma-errors.ts` (read directly — HIGH confidence)
- `apps/web/src/shared/api/error-message.ts`, `apps/web/src/shared/lib/utils.ts` (read directly — HIGH confidence)
- `apps/web/src/entities/session/api/session.ts`, `apps/web/src/proxy.ts` (read directly — HIGH confidence)
- `apps/web/src/features/auth/api/login.action.ts`, `apps/web/src/entities/transaction/api/get-transactions.ts` (read directly — HIGH confidence, established patterns to replicate)
- `.planning/codebase/CONCERNS.md` (project's own known-issues audit, 2026-09-20 — HIGH confidence, curated)
- Root `.claude/CLAUDE.md` (project conventions/constraints — HIGH confidence, curated)
- [How to Fix 'revalidatePath' Not Working in Next.js](https://oneuptime.com/blog/post/2026-01-24-nextjs-revalidatepath-not-working/view) — MEDIUM confidence, community source, cross-checked against Next.js official docs behavior description
- [Next.js `revalidatePath` API reference](https://nextjs.org/docs/app/api-reference/functions/revalidatePath) — MEDIUM confidence, official docs (per-path scoping behavior)
- [Understanding revalidatePath vs current documentation — vercel/next.js Discussion #81385](https://github.com/vercel/next.js/discussions/81385) — MEDIUM confidence, maintainer/community discussion
- Parsing/locale pitfalls for `parseFloat` and decimal separators — MEDIUM confidence, general web-dev community sources (cross-checked against the concrete `AMOUNT_PATTERN` regex already in this codebase)

---
*Pitfalls research for: personal expense/income tracker — transaction & category CRUD forms, summary display*
*Researched: 2026-09-20*
