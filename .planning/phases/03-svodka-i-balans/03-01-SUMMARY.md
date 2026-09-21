---
phase: 03-svodka-i-balans
plan: 01
subsystem: ui
tags: [nextjs, server-component, transaction-summary, fsd]

requires:
  - phase: 02-tranzaktsii
    provides: "GET /transactions/summary API (уже реализован), TransactionAmount, CategoryDot, formatMoney"
provides:
  - "getSummary entity-api (GET /transactions/summary?month=&year=)"
  - "TransactionSummary/SummaryCategoryItem зеркальные типы в entities/transaction/model/types.ts"
  - "loadMonthlySummary — серверный лоадер с UTC-вычислением текущего месяца"
  - "widgets/monthly-summary — виджет «Сводка за месяц» (три карточки статистики + таблица разбивки по категориям)"
affects: []

actuals:
  tokens: 12000
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Простой try/catch вместо Promise.allSettled для лоадера с одним запросом (в отличие от loadRecentTransactions с двумя параллельными запросами)"
    - "Composite React key `${categoryId}-${type}` для строк, полученных через groupBy(['categoryId','type']) на api"
    - "Нейтральный цвет для агрегата (баланс), в отличие от знаковой суммы одной транзакции (TransactionAmount)"

key-files:
  created:
    - apps/web/src/entities/transaction/api/get-summary.ts
    - apps/web/src/widgets/monthly-summary/api/load-monthly-summary.ts
    - apps/web/src/widgets/monthly-summary/ui/monthly-summary.tsx
    - apps/web/src/widgets/monthly-summary/ui/summary-category-table.tsx
  modified:
    - apps/web/src/entities/transaction/model/types.ts
    - apps/web/src/views/dashboard/ui/dashboard-view.tsx
    - .claude/CLAUDE.md
    - .claude/docs/architecture.md

key-decisions:
  - "loadMonthlySummary — простой try/catch, не Promise.allSettled: ровно один запрос к getSummary, SummaryCategoryItem уже содержит name/color от сервера, второй запрос категорий не нужен"
  - "Месяц/год вычисляются через getUTCMonth()+1/getUTCFullYear() — api считает границы месяца через Date.UTC, локальное время процесса могло бы разойтись на стыке месяца"
  - "Баланс не имеет цветовой семантики (нейтральный текст даже при отрицательном значении) — в отличие от Доходов/Расходов, которые окрашены по конвенции TransactionAmount"

patterns-established:
  - "React key `${categoryId}-${type}` для строк агрегата, где groupBy может дать дубль categoryId с разным type"

requirements-completed: [SUM-01, SUM-02]

coverage:
  - id: D1
    description: "Виджет «Сводка за месяц» на /dashboard показывает баланс/доходы/расходы за текущий месяц, основанные на GET /transactions/summary, и рендерится перед «Последними транзакциями»"
    requirement: "SUM-01"
    verification:
      - kind: unit
        ref: "grep/awk-гейты плана: getUTCMonth присутствует в load-monthly-summary.ts, MonthlySummary рендерится раньше RecentTransactions в dashboard-view.tsx (awk-проверка порядка)"
        status: pass
    human_judgment: true
    rationale: "Визуальный рендер трёх карточек, сверка значений с прямым вызовом api, знак и нейтральный цвет отрицательного баланса, пустой месяц — требуют браузера. В worktree-сессии исполнителя не было инструмента браузерной автоматизации; координатор проходит визуальную UAT после мержа, по прецеденту всех планов фазы 2."
  - id: D2
    description: "Таблица разбивки по категориям (сумма, категория, цвет) отсортирована по убыванию суммы без графиков, в одной объединённой таблице (без отдельной колонки «Тип»)"
    requirement: "SUM-02"
    verification:
      - kind: unit
        ref: "grep-гейт: composite key `${item.categoryId}-${item.type}` присутствует в summary-category-table.tsx (Pitfall 2, дубли categoryId у категории с обоими типами транзакций)"
        status: pass
    human_judgment: true
    rationale: "Визуальная сортировка, цвет строк, поведение при дублях categoryId+type в реальном DOM — требуют браузера. Не пройдено в этой worktree-сессии по той же причине, что D1."
  - id: D3
    description: "npm run typecheck, npm run lint и npm run build проходят кодом 0"
    verification:
      - kind: unit
        ref: "npm run typecheck (0), npm --prefix apps/web run lint (0), npm run build (0, /dashboard подтверждён динамическим маршрутом ƒ)"
        status: pass
    human_judgment: false

duration: ~35min
completed: 2026-09-21
status: complete
---

# Phase 3 Plan 01: Сквозной путь «Сводка за месяц» Summary

**`widgets/monthly-summary` — карточка «Сводка за месяц» на `/dashboard` (три показателя баланс/доходы/расходы + таблица разбивки по категориям) поверх уже существующего `GET /transactions/summary`, без нового API**

## Performance

- **Duration:** ~35 минут (Task 1 выполнен предыдущим запуском executor'а до прерывания при попытке поднять dev-сервер для UAT; Task 2 и этот SUMMARY — продолжением координатора)
- **Started:** 2026-09-21
- **Completed:** 2026-09-21
- **Tasks:** 2
- **Files modified:** 8 (4 новых, 4 изменённых)

## Accomplishments
- `TransactionSummary`/`SummaryCategoryItem` дословно зеркалированы в `entities/transaction/model/types.ts` из `apps/api/src/modules/transactions/transaction.types.ts`
- `getSummary(accessToken, { month, year })` — entity-api, оба query-параметра передаются безусловно (api не помечает их `@IsOptional`)
- `loadMonthlySummary` — серверный лоадер: `getUTCMonth()+1`/`getUTCFullYear()` для вычисления текущего периода (согласовано с `Date.UTC` на api), простой `try/catch` вокруг одного запроса
- `MonthlySummary` — одна `Card`: строка из трёх `SummaryStat` (Баланс нейтральный, Доходы `text-emerald-600 dark:text-emerald-400`, Расходы `text-destructive`), под разделителем — `SummaryCategoryTable` или текст пустого состояния «Нет данных за текущий месяц»
- `SummaryCategoryTable` переиспользует `TransactionAmount`/`CategoryDot` напрямую, React-ключ `${categoryId}-${type}` защищает от дублей при groupBy на api
- `DashboardView` — `loadMonthlySummary` третьим параллельным вызовом в существующем `Promise.all`, `<MonthlySummary>` рендерится перед `<RecentTransactions>` (D-01)
- Документация (`.claude/CLAUDE.md`, `.claude/docs/architecture.md`) актуализирована новым подразделом «Срез сводки (только чтение)», продакшн-сборка (`npm run build`) зелёная

## Task Commits

1. **Задача 1 (tracer): Сквозной путь «Сводка за месяц» — от GET /transactions/summary до /dashboard** - `711a928` (feat)
2. **Задача 2: Документация и продакшн-сборка** - `62d6d90` (docs)

## Files Created/Modified
- `apps/web/src/entities/transaction/api/get-summary.ts` - `getSummary`
- `apps/web/src/entities/transaction/model/types.ts` - `TransactionSummary`, `SummaryCategoryItem`
- `apps/web/src/widgets/monthly-summary/api/load-monthly-summary.ts` - `loadMonthlySummary`, `LoadMonthlySummaryResult`
- `apps/web/src/widgets/monthly-summary/ui/monthly-summary.tsx` - `MonthlySummary`
- `apps/web/src/widgets/monthly-summary/ui/summary-category-table.tsx` - `SummaryCategoryTable`
- `apps/web/src/views/dashboard/ui/dashboard-view.tsx` - третий параллельный вызов + рендер `MonthlySummary` перед `RecentTransactions`
- `.claude/CLAUDE.md` - раздел «Состояние» дополнен упоминанием карточки сводки
- `.claude/docs/architecture.md` - новый подраздел «Срез сводки (только чтение)»

## Decisions Made
- `loadMonthlySummary` — простой `try/catch`, не `Promise.allSettled`: `SummaryCategoryItem` уже содержит `name`/`color` от сервера, второй запрос категорий (как в `loadRecentTransactions`) не нужен
- Месяц/год — UTC-вычисление, не локальное время процесса, чтобы не разойтись с границами месяца на api (`Date.UTC`)
- Баланс намеренно без цветовой семантики — нейтральный текст даже при отрицательном значении, в отличие от `TransactionAmount`

## Deviations from Plan

Нет отклонений по содержанию плана — обе задачи выполнены как написано. Процессное отклонение: первый запуск executor'а прервался (stall) при попытке поднять `npm run dev` для человеческой проверки; координатор продолжил с Task 2 напрямую, без повторного запуска dev-сервера в worktree — что и стало причиной прерывания (см. Issues Encountered).

## Issues Encountered

**Продакшн-сборка в worktree изначально падала** с `Error: Could not find the Next.js package` — Turbopack требует собственных `node_modules` для резолюции workspace-root при `next build`, в отличие от `typecheck`/`lint`, которые резолвятся через обычную Node-резолюцию модулей вверх по дереву каталогов (тот же класс проблемы, что задокументирован в `02-04-SUMMARY.md`/`02-05-SUMMARY.md` для этого worktree-паттерна). Исправлено: `npm install --prefer-offline` в корне worktree + `npx prisma generate` с явным `DATABASE_URL` (тот же docker Postgres на 5433, что использовался в предыдущих worktree-сессиях фазы). После этого `npm run build` прошёл кодом 0, `/dashboard` подтверждён динамическим маршрутом (`ƒ`).

**Браузерная UAT-проверка (`<human-check>` обеих задач) не выполнена в этой worktree-сессии.** У исполнителя не было инструмента браузерной автоматизации; попытка поднять `npm run dev` для последующей ручной проверки привела к зависанию (stall) первого запуска. Вместо визуальной проверки подтверждены: точный код всех шести файлов (соответствует `03-01-PLAN.md` построчно), все grep/awk-гейты плана (`getUTCMonth`, composite key, порядок рендера, упоминания в документации), `npm run typecheck`/`lint`/`build` кодом 0. Шесть ручных сценариев из `03-VALIDATION.md` НЕ прогнаны в браузере в рамках этого плана — координатор проведёт полную визуальную UAT после мержа в `feature/monthly-summary` на основном чек-ауте, по тому же паттерну, что уже применялся для всех планов фазы 2 (`02-01-SUMMARY.md`, `02-03-SUMMARY.md`, `02-04-SUMMARY.md`).

## User Setup Required
None - no external service configuration required. `apps/api/.env` был создан только для локальной верификации сборки в этом worktree и не отслеживается git — при мерже ветки он уже существует в основном чек-ауте.

## Next Phase Readiness
- Весь скоуп фазы 3 (SUM-01, SUM-02) реализован в коде, документация актуализирована, продакшн-сборка зелёная
- **Не выполнена:** визуальная браузерная UAT-проверка шести сценариев из `03-VALIDATION.md` — координатор проведёт её после мержа, аналогично прецеденту фазы 2
- После подтверждения UAT — фаза 3 готова к финальному verify-work и мержу в `master`

---
*Phase: 03-svodka-i-balans*
*Completed: 2026-09-21*
