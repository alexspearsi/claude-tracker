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
      - kind: manual_procedural
        ref: "браузерная UAT после мержа в feature/monthly-summary (bugcheck@test.local, http://localhost:3001/dashboard): значения карточек (Баланс −650,24 ₽, Доходы 500,00 ₽, Расходы 1 150,24 ₽) сверены байт-в-байт с прямым curl GET /api/transactions/summary?month=9&year=2026 с тем же Bearer-токеном — совпадение полное; карточка рендерится над «Последними транзакциями»"
        status: pass
    human_judgment: true
  - id: D2
    description: "Таблица разбивки по категориям (сумма, категория, цвет) отсортирована по убыванию суммы без графиков, в одной объединённой таблице (без отдельной колонки «Тип»)"
    requirement: "SUM-02"
    verification:
      - kind: manual_procedural
        ref: "та же сессия: три строки (Транспорт 999,99 > Продукты 500,00 > Продукты 150,25) отсортированы по убыванию суммы, у каждой точка цвета категории; категория «Продукты», использованная и как доход (+500,00 зелёным), и как расход (−150,25 красным) в одном месяце, дала две отдельные строки без React-предупреждения о дублирующихся ключах в консоли (Pitfall 2 подтверждён на живом DOM)"
        status: pass
    human_judgment: true
  - id: D4
    description: "Баланс окрашен нейтральным цветом текста даже при отрицательном значении (D-03); пустой месяц показывает три нулевых значения как есть и текст «Нет данных за текущий месяц» вместо пустой таблицы (D-07)"
    requirement: "SUM-01"
    verification:
      - kind: manual_procedural
        ref: "отрицательный баланс −650,24 ₽ у bugcheck@test.local отрисован белым/нейтральным цветом (не красным); отдельный свежезарегистрированный пользователь (sum03verify@test.local, без транзакций за текущий месяц) показал три карточки с 0,00 ₽ (Доходы зелёным, Расходы красным даже при нуле, Баланс нейтральным) и текст «Нет данных за текущий месяц» вместо таблицы"
        status: pass
    human_judgment: true
  - id: D3
    description: "npm run typecheck, npm run lint и npm run build проходят кодом 0"
    verification:
      - kind: unit
        ref: "npm run typecheck (0), npm --prefix apps/web run lint (0), npm run build (0, /dashboard подтверждён динамическим маршрутом ƒ)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Протухшая access-кука на загрузке сводки уводит на /session-expired; ошибка только от /transactions/summary показывается рядом текстом, не блокируя рендер «Последних транзакций» (D-08)"
    requirement: "SUM-01"
    verification:
      - kind: manual_procedural
        ref: "закрыто координатором после первого прохода gsd-verifier (изначально status: human_needed) через временную, немедленно откаченную правку get-summary.ts на feature/monthly-summary: (a) getSummary принудительно бросал ApiError('...', 401, null) — /dashboard корректно провёл через /session-expired на /login, что соответствует задокументированному в CLAUDE.md потоку очистки кук; (b) URL запроса временно указывал на несуществующий путь — карточка сводки заменилась текстом «Не удалось загрузить сводку: …», «Последние транзакции» отрисовались нормально независимо. git diff после отката — пусто (байт-в-байт восстановлено), npm run typecheck/lint перепрогнаны и зелёные"
        status: pass
    human_judgment: true

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

**Браузерная UAT-проверка не была выполнена исполнителем в worktree-сессии** — не было инструмента браузерной автоматизации, попытка поднять `npm run dev` привела к зависанию первого запуска executor'а.

**Дополнено после мержа в `feature/monthly-summary`.** Координатор прошёл визуальную UAT в браузере (`http://localhost:3001/dashboard`) на пяти из шести сценариев `03-VALIDATION.md`:
1. Базовый рендер + сверка с прямым curl-вызовом api — точное совпадение (D1)
2. Знак и нейтральный цвет отрицательного баланса — подтверждено (D4)
3. Пустой месяц (свежий пользователь `sum03verify@test.local`) — три нуля + текст пустого состояния (D4)
4. Сортировка ≥3 строк по убыванию суммы — подтверждено с реальными данными двух категорий (D2)
5. Дубли `categoryId`+`type` — две отдельные строки, без React-предупреждений в консоли (D2)

**Сценарий 6 (ошибка/авторизация сводки) закрыт отдельно, после первого прохода gsd-verifier.** Верификатор изначально отметил его `human_needed` (подтверждён только код-ревью структурной идентичности с `loadRecentTransactions`, не прогнан вживую). Координатор закрыл разрыв безопасным способом: временной, немедленно откаченной правкой `get-summary.ts` на живом dev-сервере (HMR) — принудительный `ApiError(401)` подтвердил редирект через `/session-expired` на `/login`, принудительный неверный путь запроса подтвердил независимый рендер ошибки только сводки без поломки «Последних транзакций». Откат подтверждён пустым `git diff`. См. D5 в `coverage` и `03-VERIFICATION.md` (обновлён до `status: passed`, 7/7 truths).

## User Setup Required
None - no external service configuration required. `apps/api/.env` был создан только для локальной верификации сборки в этом worktree и не отслеживается git — при мерже ветки он уже существует в основном чек-ауте.

## Next Phase Readiness
- Весь скоуп фазы 3 (SUM-01, SUM-02) реализован в коде, документация актуализирована, продакшн-сборка зелёная
- Все 6 ручных сценариев `03-VALIDATION.md` подтверждены визуально (D1/D2/D4/D5 в `coverage`)
- `03-VERIFICATION.md`: `status: passed`, 7/7 truths, human_verification пуст
- Фаза 3 готова к PR и мержу в `master` без дополнительных условий

---
*Phase: 03-svodka-i-balans*
*Completed: 2026-09-21*
