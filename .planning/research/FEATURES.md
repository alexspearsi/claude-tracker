# Feature Research

**Domain:** Personal expense/income tracker — brownfield milestone (transaction CRUD UI, category CRUD UI, balance/breakdown summary)
**Researched:** 2026-09-20
**Confidence:** MEDIUM (converging web sources across multiple independent searches; no single authoritative spec exists for this UX space — treat specifics as directional, not gospel)

## Scope Note

This milestone is narrowly scoped by `.planning/PROJECT.md`: transaction add/edit/delete (on `/expenses` + dashboard quick-add), category add/edit/delete, balance/income/expense summary, non-chart category breakdown table. Multi-currency, recurring transactions, budgets/limits, CSV import/export, and chart visualizations are explicitly out of scope. This research is filtered accordingly — differentiators the user already deferred are flagged, not re-argued.

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist for *this milestone's surface area*. Missing these makes the CRUD feel incomplete even though it "works."

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Expense/Income toggle in the transaction form | Every expense tracker treats type as the first decision, not a dropdown buried in the form | LOW | Already modeled as `TransactionType.INCOME`/`EXPENSE` in the API — just needs a prominent UI control (segmented control/tabs), not a `<select>` |
| Amount field with clear currency formatting | Users scan for the number first; ambiguous formatting erodes trust immediately | LOW | Reuse `formatMoney`; input should accept comma/decimal naturally, validate as positive number, format on blur |
| Date field defaulted to today | Nearly universal convention — most entries are logged same-day; forcing users to pick today's date every time is friction that measurably hurts "log it now" habits | LOW | Native `<input type="date">` or a date picker component, pre-filled with `new Date()` |
| Category picker scoped to existing categories | Table stakes once categories exist as a first-class entity (this milestone adds category CRUD) | LOW | Dropdown/select fed by `GET /categories`; since categories aren't type-scoped in this schema, show all categories regardless of INCOME/EXPENSE selection |
| Inline field validation with specific messages | Generic "invalid input" toasts feel broken; users expect to know *which* field and *why* | LOW–MEDIUM | Maps directly to existing DTO/class-validator `{ field: [messages] }` grouped error format — surface per-field, not as a single toast |
| Edit form pre-populates existing values | Baseline expectation for any edit flow; users are alarmed if a field appears blank when they know it has a value | LOW | Standard controlled-form pattern; fetch transaction by id, seed react-hook-form defaults |
| Delete confirmation (transaction and category) | Irreversible destructive action without confirmation is a common source of trust-breaking bugs and support complaints | LOW | Simple confirm dialog is sufficient; no need for "type to confirm" at this data sensitivity level |
| Toast/inline feedback on save, update, delete | Users need confirmation an action succeeded, especially with optimistic-feeling flows | LOW | Reuse existing toast infra already used for auth errors (`apiErrorMessage`) |
| Category color swatch shown wherever a category appears | Already partly implemented (category color shown on dashboard transaction rows) — extending CRUD without a color picker would be a regression from what dashboard already displays | LOW–MEDIUM | Simple preset swatch palette (8–12 colors) is sufficient; no need for a full HSB picker |
| "Category in use, can't delete" surfaced as a clear inline/toast message, not a raw error | This is explicitly called out in PROJECT.md as an active requirement — the API already returns 409, only the frontend mapping is missing | LOW | Extend `apiErrorMessage` to special-case 409 on category delete with human copy ("Нельзя удалить категорию — есть связанные транзакции") |
| Transaction list: filter by period (date range or month) and by type | Users expect to narrow "all transactions" down to "this month" or "just expenses" — the API already exposes these filters, only UI is missing | LOW–MEDIUM | `GET /transactions` already supports period/type/category filters; UI is a filter bar, not new backend work |
| Transaction list: pagination controls | API already returns `{ items, total }` with `limit`/`offset` — dashboard already uses `?page=` pagination for the last-10 view; the full list page should follow the same convention | LOW | Reuse the pattern from `widgets/recent-transactions` |
| Balance/income/expense summary at a glance (3 numbers) | The universal minimum for any finance app home/summary view: what came in, what went out, what's left | LOW | Directly backed by existing `GET /transactions/summary?month=&year=` — no new aggregation logic needed, only UI |
| Category breakdown as a sortable/scannable table (amount + likely percent of total) | Explicitly scoped as "simple list/table, no charts" — but a bare unlabeled number list without at least amount-per-category sorted descending feels incomplete even in table form | LOW | `summary` endpoint already returns per-category breakdown; sort by amount descending as the default table order |
| Quick-add reachable from both `/expenses` and `/dashboard` in ≤2 clicks | Explicitly scoped in PROJECT.md Key Decisions ("часто используемое действие должно быть доступно в двух местах") and matches the near-universal pattern (YNAB's multiple entry points, Mint's single prominent button) | MEDIUM | A shared modal/dialog form triggered from both surfaces avoids duplicating form logic — respects FSD by putting the form in `features/transaction` and having both `widgets` trigger it |

### Differentiators (Competitive Advantage — Consider, Not Required)

Genuinely optional polish that would exceed table stakes for this milestone without expanding scope into deferred territory.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Last-used category memory (pre-select the category used most recently, or most recently used for that transaction type) | Speeds up repeat entry — YNAB's category suggestion pattern exists specifically because re-selecting the same category every time is the single biggest source of logging friction | LOW–MEDIUM | Can be done client-side (remember last selection in local state/localStorage) without any backend change — cheap win if time allows, but not required for MVP of this milestone |
| Keyboard-friendly quick-add (submit on Enter, autofocus amount field) | Power users log many small transactions; keyboard flow removes mouse trips | LOW | Pure frontend affordance, no new endpoints |
| Optimistic UI update on add/edit/delete (list updates before server round-trip confirms) | Makes CRUD feel instant rather than waiting on network | MEDIUM | Nice but adds rollback-on-error complexity; reasonable to defer to a later phase if it risks scope creep |
| Sortable columns on transaction list (click header to sort by date/amount) | Table-stakes in generic data tables, but "differentiator" specifically for *this* milestone since PROJECT.md only commits to filtering, not sorting | LOW–MEDIUM | Cheap to add given API likely supports `orderBy`-style params or client-side sort of a page of results — verify API support before committing to server-side sort |

### Anti-Features (Explicitly Deferred — Do Not Scope Back In)

These are exactly the kind of "seems good, seems small" additions that a roadmapper or future-you might be tempted to fold into this milestone. PROJECT.md already excludes them; listed here so the roadmap doesn't accidentally reintroduce them under a different name (e.g., "quick chart" or "simple recurring toggle").

| Feature | Why It's Tempting | Why It's Out of Scope Here | Alternative for This Milestone |
|---------|--------------------|-----------------------------|---------------------------------|
| Chart visualization of category breakdown (pie/bar) | Nearly every competitor screenshot shows a chart; feels like the "real" version of a breakdown | PROJECT.md explicitly scopes this milestone to a plain table — "начинаем с простого табличного представления, графики можно добавить позже" | Sortable/scannable table with amount + percent-of-total columns; visually differentiate rows with the existing category color swatch instead of a chart |
| Recurring/scheduled transactions ("repeat monthly") | Natural to suggest once add/edit exists — "just add a repeat toggle" | Explicitly deferred as a separate future task; touches scheduling, background jobs, and edit-semantics ("edit this one or all future ones?") that are a project of their own | None needed this milestone — single one-off transactions only |
| Budgets/limits per category | Follows naturally from category breakdown — "just add a limit field and a progress bar" | Explicitly deferred; requires its own data model, alerting/threshold UX, and period-rollover logic | Category breakdown stays informational only, no limit/threshold concept |
| CSV import/export | Common request once a list view exists ("just add an export button") | Explicitly deferred; export needs a defined schema/format decision, import needs validation/dedup logic disproportionate to this milestone | None — users interact only through the UI CRUD |
| Multi-currency / currency conversion | Category color picker and amount formatting work naturally invite "what if user has multiple currencies" | Explicitly deferred; conversion rates, display formatting per-currency, and storage precision are a substantial sub-project | Single implicit currency, `Decimal(12,2)` as already modeled |
| Full custom color picker (HSB/RGB wheel) for categories | Feels more "complete" than a preset palette | Disproportionate complexity for a personal tracker with a handful of categories; preset palette covers the real need (visual distinction, not brand-matching) | Fixed swatch palette (8–12 curated colors), consistent with what dashboard already renders |
| Infinite scroll on transaction list | Feels modern, avoids "page 2" clicks | For financial data, users want to reason about a bounded, countable list ("this month has 23 transactions"), and infinite scroll makes total counts and page-jumping harder; also conflicts with the pagination convention already established on the dashboard | Keep numbered/paged pagination consistent with `widgets/recent-transactions` |

## Feature Dependencies

```
Category CRUD UI (create/edit/delete)
    └──requires──> Category list/read UI (to select what to edit/delete)
                       └──enhances──> Transaction form (category picker needs categories to exist)

Transaction add/edit form
    └──requires──> Category CRUD UI (at minimum, category read — can't pick a category that doesn't exist yet)

Quick-add (dashboard) ──shares-code-with──> Full add form (/expenses)
    (same features/transaction form component, two trigger points — do NOT build two separate forms)

Balance/summary display ──requires──> existing GET /transactions/summary (already built, backend complete)

Category breakdown table ──requires──> Balance/summary display
    (same endpoint response, different section of the same view)

"Category in use" delete-block UX ──requires──> Category delete UI
    (can't surface the 409 message until delete action exists in the UI)

Transaction list filtering ──enhances──> Transaction list page
    (list page can ship first with just pagination; filters can layer in after)
```

### Dependency Notes

- **Transaction form requires Category CRUD (read, at minimum):** the transaction form's category picker is empty and untestable until categories can be created through the UI. If category CRUD and transaction CRUD are split into separate phases, category CRUD (or at least create+read) must land first.
- **Quick-add shares code with the full form:** PROJECT.md commits to quick-add existing on both dashboard and `/expenses`. Building two independent form implementations would violate the project's own FSD conventions (`features/` owns the form, `widgets/` merely trigger it) and double the maintenance surface. Plan this as one `features/transaction` form component reused via a modal/dialog from both call sites, not two features.
- **Balance/summary and category breakdown are the same data source:** both read from `GET /transactions/summary`. There's no reason to sequence them into separate phases from a data-dependency standpoint — the split, if any, should be about UI complexity (a 3-number summary strip ships fast; a sortable breakdown table is marginally more UI work), not about backend readiness.
- **"Category in use" error handling conflicts with nothing** but has a hard prerequisite: category delete UI must exist before this message has anywhere to appear. Don't schedule it as an independent phase item — it's a UX detail *within* the category delete work, not a separate feature.

## MVP Definition

Framed against this milestone's already-narrow scope — this is "what's minimum within the milestone," not "what's minimum for the whole product."

### Launch With (v1 of this milestone)

- [ ] Transaction add form (type toggle, amount, category picker, date pre-filled to today, optional description) — core value proposition ("быстро зафиксировать доход или расход")
- [ ] Transaction edit form (same fields, pre-populated)
- [ ] Transaction delete with confirmation
- [ ] `/expenses` page showing full transaction list with pagination
- [ ] Quick-add accessible from dashboard (reusing the same form)
- [ ] Category create/edit form (name + color swatch picker)
- [ ] Category delete with confirmation, including the "in use, can't delete" message mapped from the API's 409
- [ ] Categories page as a real CRUD list (not the current stub)
- [ ] Balance/income/expense summary strip (3 numbers, current month by default)
- [ ] Category breakdown table (amount + category name/color, sorted by amount descending)

### Add After Validation (v1.x — only if time remains within this milestone)

- [ ] Transaction list filtering by period/type/category (API already supports it — pure frontend addition once the base list page ships)
- [ ] Last-used category memory on the add form
- [ ] Sortable columns on the transaction list

### Future Consideration (v2+ — separate milestones, already agreed in PROJECT.md)

- [ ] Chart visualizations of category breakdown — deferred, do not build a "simple chart" as a compromise
- [ ] Recurring transactions
- [ ] Budgets/limits per category
- [ ] CSV import/export
- [ ] Multi-currency support

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|----------------------|----------|
| Transaction add/edit/delete UI | HIGH | MEDIUM | P1 |
| Category add/edit/delete UI | HIGH | LOW–MEDIUM | P1 |
| "Category in use" delete-block message | MEDIUM | LOW | P1 |
| `/expenses` full list page with pagination | HIGH | LOW–MEDIUM | P1 |
| Quick-add from dashboard (shared form) | HIGH | MEDIUM | P1 |
| Balance/income/expense summary | HIGH | LOW | P1 |
| Category breakdown table | MEDIUM–HIGH | LOW | P1 |
| Transaction list filtering (period/type/category) | MEDIUM | LOW–MEDIUM | P2 |
| Last-used category memory | LOW–MEDIUM | LOW | P2 |
| Sortable list columns | LOW | LOW–MEDIUM | P3 |
| Optimistic UI updates | LOW–MEDIUM | MEDIUM | P3 |

**Priority key:**
- P1: Must have — directly named in PROJECT.md Active requirements
- P2: Should have if capacity allows within this milestone — API already supports it, pure frontend cost
- P3: Nice to have, defer without hesitation if the milestone is tight

## Competitor Feature Analysis

| Feature | Mint (traditional) | YNAB | Our Approach |
|---------|---------------------|------|--------------|
| Quick-add entry points | Single "Add a Transaction" button on transactions page | Multiple: home widget, per-tab button, category long-press, OS shortcuts | Two entry points as scoped (dashboard + `/expenses`), sharing one form component — matches YNAB's philosophy at a fraction of the surface |
| Category picker in form | Dropdown/select of existing categories | Category selection integrated into budget structure (categories are budget lines) | Simple dropdown/grid fed by `GET /categories` — no budget coupling since budgets are out of scope |
| Delete-in-use handling | Not clearly documented in available sources | N/A (categories tied to budget, reassignment flows exist) | Blocked delete with explicit message, consistent with API's existing 409 — simplest safe option, no forced reassignment flow |
| Breakdown view | Chart-first (pie charts prominent) | Chart-first (category spending bars) | Table-first by explicit scope decision — visually differentiate via existing category color swatches instead of chart color coding |

## Sources

- [Expense Tracking Best Practices & Feature Plan (research) — Nautilus-Techlabs/expense_tracker Issue #9](https://github.com/Nautilus-Techlabs/expense_tracker/issues/9)
- [Expense Tracker App - UI/UX Design Concept — Ramotion Agency](https://www.ramotion.com/expense-tracker-app-ui-ux-design-concept/)
- [Designing a finance tracker app — UI/UX case study — Medium/Muzli](https://medium.muz.li/designing-a-finance-tracker-app-be24ad13ea0f?gi=2ce1dc86e415)
- [Pagination and Filtering (How To) — UX Design Patterns, Treehouse](https://teamtreehouse.com/library/ux-design-patterns-2/pagination-and-filtering)
- [TX-009 — Search and filter transactions with bounded pagination — tblt-gr/cadran Issue #171](https://github.com/tblt-gr/cadran/issues/171)
- [Fase 2 — Categorias: bloquear exclusão em uso — ettoreMB/personal_finance_control Issue #26](https://github.com/ettoreMB/personal_finance_control/issues/26)
- [Category management: icon selection, search, Saved Color — SimonOneNineEight/daily-wlog Issue #43](https://github.com/SimonOneNineEight/daily-wlog/issues/43)
- [Typed Categories, Default Categories, Category update/delete — agudlc/finanzas Issue #5](https://github.com/agudlc/finanzas/issues/5)
- [Personal finance web app — UX case study — Medium](https://medium.com/@vikaskumar_2178/personal-finance-web-app-ux-case-study-ed939d17b57f)
- [Budgeting Apps UX Patterns for Trustworthy Finance Products — Appthetics Blog](https://www.appthetics.com/blog/budgeting-apps-ux-patterns)
- [Finance App Design: UI/UX Blueprint & Best Practices — Fuselab Creative](https://fuselabcreative.com/finance-app-design-101-a-complete-blueprint/)
- [Adding Transactions Without Direct Import — YNAB Support](https://support.ynab.com/en_us/adding-transactions-without-direct-import-B1kBALVaxx)
- [How to Add Transactions in YNAB — YNAB Support](https://support.ynab.com/en_us/how-to-add-transactions-in-ynab-HyDwA_byi)
- [YNAB User Flow — Web UX/UI Patterns, Pageflows](https://pageflows.com/web/products/ynab/)
- `.planning/PROJECT.md` (this project's scoped Active/Out-of-Scope requirements — primary source for what counts as table stakes vs anti-feature *here*)

**Confidence caveat:** All web sources above are community blog posts, GitHub issue trackers of small hobby projects, and vendor support docs (not peer-reviewed UX research or large-scale usability studies). Findings converged consistently across independent searches (form fields, filter/pagination conventions, delete-block handling, summary conventions), which is why overall confidence is rated MEDIUM rather than LOW — but treat specific numeric/visual details (e.g., "8-tile category grid," exact swatch counts) as illustrative, not prescriptive.

---
*Feature research for: personal expense/income tracker — transaction & category CRUD UI, balance/summary milestone*
*Researched: 2026-09-20*
