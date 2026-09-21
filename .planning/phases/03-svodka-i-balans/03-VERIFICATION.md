---
phase: 03-svodka-i-balans
verified: 2026-09-21T00:00:00Z
status: passed
score: 7/7 must-haves verified
covered_files: [".claude/CLAUDE.md", ".claude/docs/architecture.md", ".planning/REQUIREMENTS.md", ".planning/ROADMAP.md", ".planning/phases/03-svodka-i-balans/03-01-PLAN.md", ".planning/phases/03-svodka-i-balans/03-01-SUMMARY.md", ".planning/phases/03-svodka-i-balans/03-CONTEXT.md", ".planning/phases/03-svodka-i-balans/03-PATTERNS.md", ".planning/phases/03-svodka-i-balans/03-RESEARCH.md", ".planning/phases/03-svodka-i-balans/03-UI-SPEC.md", ".planning/phases/03-svodka-i-balans/03-VALIDATION.md", "apps/web/src/entities/transaction/api/get-summary.ts", "apps/web/src/entities/transaction/model/types.ts", "apps/web/src/views/dashboard/ui/dashboard-view.tsx", "apps/web/src/widgets/monthly-summary/api/load-monthly-summary.ts", "apps/web/src/widgets/monthly-summary/ui/monthly-summary.tsx", "apps/web/src/widgets/monthly-summary/ui/summary-category-table.tsx"]
covered_digest: "v1:sha256:6b4e6c7c890f0cc60f3095e98c9aecb353fe76f0572df8f289ca6b2992b58d3f"
behavior_unverified: 0
overrides_applied: 0
human_verification: []
---

# Phase 3: Сводка и баланс — Verification Report

**Phase Goal:** Пользователь видит своё финансовое положение одним взглядом — баланс, доходы и
расходы за текущий месяц, а также разбивку по категориям.
**Verified:** 2026-09-21
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Виджет «Сводка за месяц» отображается на `/dashboard` ПЕРЕД «Последними транзакциями» (D-01, ROADMAP SC1) | ✓ VERIFIED | `dashboard-view.tsx` L44-59: `<MonthlySummary>` block precedes `<RecentTransactions>` block in JSX; independently confirmed by plan's own `<automated>` check (`awk` line-order check) which is part of the passing build/lint/typecheck gate, and by live browser UAT in 03-01-SUMMARY.md D1 coverage |
| 2 | Три показателя — Баланс, Доходы, Расходы — в одной `Card` как строка из трёх карточек, совпадают со значениями `GET /transactions/summary` за текущий месяц (SUM-01, ROADMAP SC1) | ✓ VERIFIED | `monthly-summary.tsx` L37-46: single `<Card>`, `grid-cols-3` row of 3 `SummaryStat`; values come directly from `summary.balance/income/expense` — traced to `TransactionsService.summary()` (`transactions.service.ts` L117-170), a real Prisma `groupBy` query scoped by `userId`, not a static/mock value. Live UAT (03-01-SUMMARY.md D1): dashboard values byte-matched against direct `curl GET /api/transactions/summary` with same Bearer token |
| 3 | Баланс — нейтральный цвет текста (даже отрицательный); Доходы — `text-emerald-600 dark:text-emerald-400`; Расходы — `text-destructive` (D-03) | ✓ VERIFIED | `monthly-summary.tsx` L39 (`SummaryStat label="Баланс"` — no `colorClassName`), L40-44 (Доходы emerald), L45 (Расходы destructive). Live UAT (03-01-SUMMARY.md D4): negative balance −650,24 ₽ rendered neutral/white, not red |
| 4 | Под тремя карточками — одна таблица разбивки по категориям (точка цвета + имя, знаковая сумма), отсортированная по убыванию суммы без повторной фронтовой сортировки, без колонок «Тип»/«% от общего», без графиков (SUM-02, D-05, D-06, ROADMAP SC2) | ✓ VERIFIED | `summary-category-table.tsx`: exactly 2 columns (Категория, Сумма), `items.map` renders in server-provided order without any `.sort()` call — server order trusted per code comment L17. Server-side sort confirmed real: `transactions.service.ts` L147-158 `.sort((a,b) => Number(b.total) - Number(a.total))`. Live UAT (03-01-SUMMARY.md D2): 3 rows in real descending order (999.99 > 500.00 > 150.25) |
| 5 | Категория, использованная и как доход, и как расход в одном месяце, даёт в таблице две отдельные строки без предупреждения о дублирующихся React-ключах (Pitfall 2, ключ `${categoryId}-${type}`) | ✓ VERIFIED | `summary-category-table.tsx` L31: `key={\`${item.categoryId}-${item.type}\`}`. Matches `groupBy(['categoryId','type'])` on the API side (`transactions.service.ts` L126-130) which can legitimately emit two rows for one `categoryId`. Live UAT (03-01-SUMMARY.md D2): confirmed on live DOM, no React key-collision warning in console |
| 6 | Пустой месяц показывает три карточки с нулевыми значениями как есть и текст «Нет данных за текущий месяц» вместо пустой таблицы (D-07) | ✓ VERIFIED | `monthly-summary.tsx` L50-54: `summary.byCategory.length === 0 ? <p>...Нет данных за текущий месяц</p> : <SummaryCategoryTable ...>`. Three stat cards always render (`formatMoney` on `"0.00"` strings, not hidden). Live UAT (03-01-SUMMARY.md D4): fresh user with no transactions showed three zero cards + empty-state text |
| 7 | Протухшая access-кука на загрузке сводки уводит на `/session-expired`; ошибка только от `/transactions/summary` показывается рядом текстом «Не удалось загрузить сводку: …», не блокируя рендер «Последних транзакций» (D-08) | ✓ VERIFIED | `load-monthly-summary.ts` L26-31: `error instanceof ApiError && error.status === 401` → `{status:'unauthorized'}`, else `{status:'error', message: ...}`. `dashboard-view.tsx` L34-36 redirects on `result.status === 'unauthorized' \|\| summaryResult.status === 'unauthorized'`; L44-48 and L50-60 render the summary error and the transaction list error as two fully independent conditional branches. **Live-exercised post-verification** by the coordinator via a temporary, immediately-reverted HMR edit on `feature/monthly-summary` (not on the SUMMARY's original worktree): (a) `getSummary` made to throw `new ApiError('...', 401, null)` — `/dashboard` correctly redirected through `/session-expired` to `/login` (matching the documented cookie-clearing flow in CLAUDE.md), confirming the unauthorized branch fires for real; (b) `getSummary`'s URL pointed at a nonexistent path to force a real 4xx from the live api — the dashboard rendered "Не удалось загрузить сводку: Сводка: Validation failed (uuid is expected)" next to an unaffected, fully-rendered «Последние транзакции» table, confirming the independent-error-branch requirement on live DOM, not just by inspection. `git diff` confirmed byte-identical revert of `get-summary.ts` after each test; `npm run typecheck`/`lint` re-run clean afterward |

**Score:** 7/7 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/web/src/entities/transaction/api/get-summary.ts` | `getSummary(accessToken, {month, year})` — GET /transactions/summary, both params always sent | ✓ VERIFIED | Present, substantive, wired. `URLSearchParams({month: String(month), year: String(year)})` built unconditionally (not via `if`), matches plan requirement exactly |
| `apps/web/src/entities/transaction/model/types.ts` | `TransactionSummary`, `SummaryCategoryItem` — mirror of api types | ✓ VERIFIED | Field-for-field identical to `apps/api/src/modules/transactions/transaction.types.ts` (verified by direct diff of both files: `categoryId/name/color/type/total` and `month/year/from/to/income/expense/balance/byCategory`) |
| `apps/web/src/widgets/monthly-summary/api/load-monthly-summary.ts` | `loadMonthlySummary(accessToken)` — single request, simple try/catch, UTC month calc | ✓ VERIFIED | `getUTCMonth()+1`/`getUTCFullYear()` used (not local time), single `try/catch` around one `getSummary` call |
| `apps/web/src/widgets/monthly-summary/ui/monthly-summary.tsx` | `MonthlySummary` — one Card, 3-stat row + table/empty-state | ✓ VERIFIED | Matches UI-SPEC layout exactly (Card → CardHeader/CardTitle → CardContent → 3-col grid → border-t divider → table/empty text) |
| `apps/web/src/widgets/monthly-summary/ui/summary-category-table.tsx` | `SummaryCategoryTable` — reuses `TransactionAmount`/`CategoryDot` directly | ✓ VERIFIED | Both imported and used verbatim, matching prop shapes (`{amount, type}` via `total`→`amount`, `{color}`) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `dashboard-view.tsx` | `load-monthly-summary.ts` | `loadMonthlySummary(session.accessToken)` — 3rd parallel call in `Promise.all` | ✓ WIRED | L22-29: `Promise.all([loadRecentTransactions, loadMonthlySummary, getCurrentUser.catch])` |
| `load-monthly-summary.ts` | `get-summary.ts` | `getSummary(accessToken, {month, year})` | ✓ WIRED | L24 |
| `dashboard-view.tsx` | `monthly-summary.tsx` | `<MonthlySummary summary={summaryResult.summary}/>` rendered before `<RecentTransactions>` | ✓ WIRED | L44-48 (summary block) precedes L50-60 (transactions block) |
| `monthly-summary.tsx` | `summary-category-table.tsx` | `<SummaryCategoryTable items={summary.byCategory}/>` | ✓ WIRED | L53 |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|---------------------|--------|
| `MonthlySummary` | `summary.balance/income/expense` | `DashboardView` → `loadMonthlySummary` → `getSummary` → `GET /transactions/summary` → `TransactionsController.summary` → `TransactionsService.summary()` → real Prisma `groupBy` on `Transaction`, filtered `where: {userId, date: {gte, lt}}` | Yes | ✓ FLOWING |
| `SummaryCategoryTable` | `summary.byCategory` | Same chain; `byCategory` built from a second Prisma `groupBy(['categoryId','type'])` joined against real `Category` rows (`categoryById` map), sorted server-side by `total` desc | Yes | ✓ FLOWING |

No hardcoded/static fallback values found in any of the phase's new files.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|--------------|--------|----------|
| SUM-01 | 03-01 | Баланс/доходы/расходы за текущий месяц на дашборде, на основе `GET /transactions/summary` | ✓ SATISFIED | Truths 1-3, 6 (and 7 for the error-path half of SUM-01's contract, present but not live-verified) |
| SUM-02 | 03-01 | Разбивка по категориям таблицей (сумма, категория, цвет), отсортирована по убыванию, без графиков | ✓ SATISFIED | Truths 4-5 |

No orphaned requirements — REQUIREMENTS.md traceability table maps only SUM-01/SUM-02 to Phase 3, both claimed by 03-01-PLAN.md.

### Decision Coverage

All 8 trackable `03-CONTEXT.md` decisions (D-01 through D-08) are honored by shipped artifacts — verified via `gsd_run query check.decision-coverage-verify`: `{total: 8, honored: 8, not_honored: []}`.

### Anti-Patterns Found

None. Scanned all 6 phase-created/modified source files (`get-summary.ts`, `types.ts` addition, `load-monthly-summary.ts`, `monthly-summary.tsx`, `summary-category-table.tsx`, `dashboard-view.tsx` diff) for `TODO|FIXME|XXX|TBD|placeholder|not implemented|coming soon` — zero matches. No empty-return stubs, no hardcoded empty props feeding rendered output, no console-log-only handlers.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Monorepo typecheck (shared → api → web) | `npm run typecheck` | Exit 0, no `error TS` output | ✓ PASS |
| ESLint (api + web) | `npm run lint` | Exit 0, no errors reported | ✓ PASS |
| Production build (shared → api → web) | `npm run build` | Exit 0; `/dashboard` confirmed as dynamic route (`ƒ`) in Next.js route summary | ✓ PASS |

All three commands were re-run independently by this verifier (not taken from SUMMARY.md claims) and confirmed green on the current `feature/monthly-summary` working tree.

### Probe Execution

N/A — no `scripts/*/tests/probe-*.sh` convention in this project; `03-VALIDATION.md` documents no test runner is configured (project-wide, consistent with Phases 1-2).

### Documentation Verification

- `.claude/CLAUDE.md` §«Состояние»: mentions `widgets/monthly-summary` card, both stat computation and category breakdown, sourced from existing `GET /transactions/summary` with no new API — confirmed via `grep -c 'monthly-summary'` (non-zero)
- `.claude/docs/architecture.md`: new subsection «Срез сводки (только чтение)» present at L279, explains single-request `try/catch` loader pattern vs. the two-request `Promise.allSettled` pattern — confirmed via `grep -c 'widgets/monthly-summary'` (non-zero)

## Human Verification Required

None. The sole open item from the initial pass (D-08 error/auth scenario, truth #7) was closed by the coordinator via a live, isolated, immediately-reverted UAT — see truth #7 evidence above and the Gaps Summary below.

## Gaps Summary

Ни один must-have не FAILED, ни один артефакт не MISSING/STUB, ни один key link не NOT_WIRED —
реализация полностью соответствует ROADMAP Phase 3 Goal и требованиям SUM-01/SUM-02. Собственная
проверка верификатора (typecheck, lint, build — все перезапущены независимо, не взяты на веру из
SUMMARY.md) подтверждает зелёный статус сборки.

Изначально единственный открытый пункт (сценарий 6 из `03-VALIDATION.md`, ошибка/авторизация
сводки) закрыт координатором после первого прохода верификации: обе половины сценария
(unauthorized-редирект и независимая ошибка только сводки) прогнаны на живом dev-стенде через
временную, немедленно откаченную правку `get-summary.ts` (принудительный `ApiError(401)` и
принудительный неверный путь запроса) — оба результата совпали с ожидаемым поведением. Откат
подтверждён `git diff` (пусто) и повторным `npm run typecheck`/`lint`. Все 7/7 truths фазы теперь
VERIFIED, `status: passed`, фаза готова к PR и мержу в `master` без дополнительных условий.

---

*Verified: 2026-09-21*
*Verifier: Claude (gsd-verifier)*
