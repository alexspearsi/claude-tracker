---
phase: 02-tranzaktsii
plan: 04
subsystem: ui
tags: [nextjs, url-state, shadcn, radix-select, react-day-picker, fsd]

requires:
  - phase: 02-tranzaktsii
    provides: "widgets/expenses-list (ExpensesList, ExpensesTable, PaginationNav), getTransactions, TransactionForm (планы 02-01..02-03)"
provides:
  - "TransactionFilters/parseTransactionFilters/hasActiveFilters/filtersToParams/filtersHref — модуль разбора и сборки URL-фильтров списка транзакций"
  - "TransactionFiltersPanel — всегда видимая панель период/тип/категория над таблицей /expenses (TXN-06, D-04)"
  - "getTransactions с необязательными type/categoryId/dateFrom/dateTo, обратно совместимый с loadRecentTransactions"
  - "pageHref/PaginationNav с необязательным params — пагинация сохраняет активные фильтры"
  - "Различение «Ничего не найдено» (активный фильтр) и «Пока нет транзакций» (без фильтров) на /expenses"
affects: [02-05-приёмка]

actuals:
  tokens: 5618
  tasks: 2
  commits: 2
  plan_head_before: 3137c4c44b6bbabbea949ef3b9d67bad42cbebad

tech-stack:
  added: []
  patterns:
    - "URL searchParams — единственный источник правды для фильтра: клиентский компонент не хранит useState, только читает проп filters (пришедший из RSC) и пушет новый URL"
    - "Испорченный параметр фильтра в URL трактуется как «фильтр не задан» — тот же принцип, что уже принят для кривого ?page (parsePage)"
    - "Непустое значение-маркер для пунктов «Все»/«Все категории» в Radix Select — Radix не допускает пустой value у SelectItem"

key-files:
  created:
    - apps/web/src/widgets/expenses-list/model/filters.ts
    - apps/web/src/widgets/expenses-list/ui/transaction-filters.tsx
  modified:
    - apps/web/src/entities/transaction/api/get-transactions.ts
    - apps/web/src/shared/lib/pagination.ts
    - apps/web/src/shared/ui/pagination-nav.tsx
    - apps/web/src/widgets/expenses-list/api/load-transactions.ts
    - apps/web/src/widgets/expenses-list/ui/expenses-list.tsx
    - apps/web/src/views/expenses/ui/expenses-view.tsx
    - "apps/web/src/app/(dashboard)/expenses/page.tsx"

key-decisions:
  - "parseTransactionFilters проверяет каждое поле независимо и молча роняет невалидное значение в undefined — как и parsePage, это осознанное закрытие нерешённого пункта UI-SPEC (испорченный параметр фильтра), а не ошибка на человека"
  - "Пагинация периода использует plain YYYY-MM-DD, а не noon-UTC таймстамп формы создания/редактирования — сервис различает их по .includes('T') и по-разному округляет верхнюю границу (Pitfall 2, 02-RESEARCH.md); прямой curl-тест подтвердил инклюзивность последнего дня периода"
  - "Проброс filters-пропа в ExpensesList выполнен в задаче 2, а не в задаче 1 — задача 1 намеренно ограничена файлами из её <files>, чтобы typecheck оставался зелёным на каждом коммите (ExpensesList не мог принять непредусмотренный проп до того, как сам получил его в задаче 2)"

patterns-established:
  - "Клиентский виджет над серверным списком читает состояние из URL-пропа и только пушет router.push — без собственного useState для того, что уже есть в адресной строке"

requirements-completed: [TXN-06]

coverage:
  - id: D1
    description: "getTransactions принимает четыре необязательных фильтра (type/categoryId/dateFrom/dateTo) под именами, которые ждёт TransactionQueryDto, и не ломает существующий вызов loadRecentTransactions"
    requirement: "TXN-06"
    verification:
      - kind: unit
        ref: "typecheck (apps/web/src/entities/transaction/api/get-transactions.ts): loadRecentTransactions (widgets/recent-transactions) продолжает вызывать getTransactions с {limit, offset} без ошибок компиляции"
        status: pass
    human_judgment: false
  - id: D2
    description: "Фильтры type/categoryId/dateFrom/dateTo, включая их комбинации, реально сужают выдачу GET /transactions под тем же контрактом, что строит getTransactions"
    requirement: "TXN-06"
    verification:
      - kind: manual_procedural
        ref: "прямой curl против API этого worktree (порт 4099, тестовый пользователь txn04verify+*@test.local, 4 транзакции в двух категориях): type=INCOME -> 1 запись, type=EXPENSE -> 3, categoryId=Транспорт -> 2, комбинация type=EXPENSE&categoryId=Транспорт&dateFrom=2026-09-01&dateTo=2026-09-30 -> ровно 1 (искомая), заведомо пустой фильтр (type=INCOME&categoryId=Продукты) -> {items:[],total:0}"
        status: pass
    human_judgment: false
  - id: D3
    description: "dateTo включает весь последний день периода целиком — транзакция, датированная 2026-09-30T23:59:00Z, попадает в выдачу dateFrom=2026-09-01&dateTo=2026-09-30"
    requirement: "TXN-06"
    verification:
      - kind: manual_procedural
        ref: "curl GET /transactions?dateFrom=2026-09-01&dateTo=2026-09-30 вернул транзакцию от 2026-09-30T23:59:00.000Z в выдаче (total:3, все три сентябрьские, транзакция от 2026-10-01 исключена)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Панель из трёх равнозначных контролов (период, тип, категория) видна сразу над таблицей на /expenses, без сворачивания, и рендерится даже при нулевой выдаче (D-04)"
    requirement: "TXN-06"
    verification: []
    human_judgment: true
    rationale: "Визуальная компоновка и факт рендера панели при пустой выдаче требуют браузера — в этой worktree-сессии нет инструмента браузерной автоматизации. Код-ревью подтверждает: TransactionFiltersPanel — первый дочерний элемент CardContent, рендерится безусловно (вне ветвления rows.length === 0), см. apps/web/src/widgets/expenses-list/ui/expenses-list.tsx"
  - id: D5
    description: "Смена любого фильтра в панели пушет новый URL через filtersHref без номера страницы (сброс на первую страницу), переход по страницам сохраняет активные фильтры через PaginationNav params"
    requirement: "TXN-06"
    verification: []
    human_judgment: true
    rationale: "Клиентское поведение router.push и визуальное подтверждение сброса страницы требуют браузера — не выполнено в этой сессии. Код-ревью подтверждает: filtersHref никогда не кладёт page, PaginationNav получает params={filtersToParams(filters)} третьим аргументом в pageHref"
  - id: D6
    description: "Отфильтрованная пустая выдача показывает «Ничего не найдено» / «Попробуйте изменить период, тип или категорию» без кнопки добавления; выдача без фильтров по-прежнему показывает «Пока нет транзакций» с кнопкой"
    requirement: "TXN-06"
    verification: []
    human_judgment: true
    rationale: "Визуальное различение двух пустых состояний и текста лучше подтвердить в браузере. Код-ревью подтверждает ветвление isOutOfRange -> isFiltered (hasActiveFilters) -> дефолт в expenses-list.tsx, включая отсутствие action-пропа у «Ничего не найдено»"
  - id: D7
    description: "Испорченный параметр фильтра в URL (?type=МУСОР, нечисловая/неполная дата, не-UUID categoryId) отбрасывается при разборе — список отображается как без этого фильтра, без ошибки"
    requirement: "TXN-06"
    verification:
      - kind: unit
        ref: "код-ревью apps/web/src/widgets/expenses-list/model/filters.ts: type принимается только при строгом равенстве 'INCOME'/'EXPENSE', categoryId — только по UUID_PATTERN, dateFrom/dateTo — только по /^\\d{4}-\\d{2}-\\d{2}$/; всё остальное -> undefined, что означает отсутствие ключа в query к api (forbidNonWhitelisted тем самым не задет)"
        status: pass
    human_judgment: false

duration: ~35min
completed: 2026-09-21
status: complete
---

# Phase 2 Plan 04: Фильтры на /expenses — период, тип, категория Summary

**Панель `TransactionFiltersPanel` (период через `Calendar mode="range"`, тип и категория через `Select`) читает и пишет фильтр строго через URL — `getTransactions` расширен четырьмя необязательными query-параметрами, а `parseTransactionFilters` отбрасывает испорченные значения на границе по прецеденту `parsePage`**

## Performance

- **Duration:** ~35 мин
- **Started:** 2026-09-21
- **Completed:** 2026-09-21
- **Tasks:** 2
- **Files modified:** 9 (2 новых, 7 изменённых)

## Accomplishments
- `entities/transaction/api/get-transactions.ts` — `GetTransactionsParams` расширен необязательными `type`/`categoryId`/`dateFrom`/`dateTo`; `limit`/`offset` остались обязательными, `loadRecentTransactions` не тронут и продолжает вызывать функцию с двумя параметрами
- `widgets/expenses-list/model/filters.ts` — `parseTransactionFilters` (строгая проверка каждого поля с отбрасыванием мусора в `undefined`, тот же принцип, что уже принят для `?page` в `parsePage`), `hasActiveFilters`, `filtersToParams`, `filtersHref` (номер страницы туда никогда не кладётся — смена фильтра всегда возвращает на первую страницу)
- `shared/lib/pagination.ts`/`shared/ui/pagination-nav.tsx` — `pageHref`/`PaginationNav` получили необязательный `params: URLSearchParams`; вызов с двумя аргументами (как на `/dashboard`) даёт побайтово то же поведение, что и раньше
- `widgets/expenses-list/ui/transaction-filters.tsx` — `TransactionFiltersPanel`: период (`Popover`+`Calendar mode="range"`, границы собираются `format(date, 'yyyy-MM-dd')` — БЕЗ времени, кнопка «Сбросить период»), тип и категория (`Select` с непустым значением-маркером для пунктов «Все»/«Все категории», как того требует Radix); без единого `useState` — все значения из пропа `filters`, любое изменение сразу `router.push(filtersHref(...))`
- `widgets/expenses-list/ui/expenses-list.tsx` — панель рендерится первым элементом `CardContent`, безусловно (в т.ч. при пустой выдаче — иначе фильтр, обнуливший список, нечем было бы снять, D-04); различает «Ничего не найдено» (`hasActiveFilters`, без кнопки добавления) и «Пока нет транзакций» (без фильтров, с кнопкой); `PaginationNav` получает `params={filtersToParams(filters)}`
- `views/expenses/ui/expenses-view.tsx`/`app/(dashboard)/expenses/page.tsx` — разбор `searchParams` (страница + фильтры) выполняется во вью, `page.tsx` остался тонким делегированием без собственной логики разбора

## Task Commits

Each task was committed atomically:

1. **Задача 1: Фильтры из URL доезжают до запроса — разбор, белый список, пагинация с фильтрами (TXN-06)** - `de1085b` (feat)
2. **Задача 2: Панель фильтров над таблицей и состояние «Ничего не найдено» (TXN-06, D-04)** - `7ec9388` (feat)

**Plan metadata:** commit создаётся отдельно после этого SUMMARY (см. `<final_commit>` execute-plan workflow)

## Files Created/Modified
- `apps/web/src/entities/transaction/api/get-transactions.ts` - `GetTransactionsParams` + четыре необязательных фильтра
- `apps/web/src/widgets/expenses-list/model/filters.ts` - `TransactionFilters`, `parseTransactionFilters`, `hasActiveFilters`, `filtersToParams`, `filtersHref`
- `apps/web/src/shared/lib/pagination.ts` - `pageHref(basePath, page, params?)`
- `apps/web/src/shared/ui/pagination-nav.tsx` - проп `params?: URLSearchParams`
- `apps/web/src/widgets/expenses-list/api/load-transactions.ts` - второй аргумент `{ page, filters }`
- `apps/web/src/app/(dashboard)/expenses/page.tsx` - `searchParams` целиком передаётся во `ExpensesView`
- `apps/web/src/views/expenses/ui/expenses-view.tsx` - `parsePage`/`parseTransactionFilters`, проброс `filters` в `ExpensesList`
- `apps/web/src/widgets/expenses-list/ui/transaction-filters.tsx` - `TransactionFiltersPanel`
- `apps/web/src/widgets/expenses-list/ui/expenses-list.tsx` - панель над таблицей, различение пустых состояний, `params` в `PaginationNav`

## Decisions Made
- `parseTransactionFilters` не бросает ошибку и не редиректит на испорченный параметр — трактует его как отсутствие фильтра, закрывая нерешённый пункт UI-SPEC по прецеденту `parsePage`
- Проброс `filters`-пропа в `ExpensesList` сделан в задаче 2, а не в задаче 1: задача 1 ограничена ровно файлами из своего `<files>`, поэтому `ExpensesView` в задаче 1 вычисляет `filters` только для `loadTransactions` (запрос к api), а сам проп появляется у `ExpensesList` только вместе с задачей, которая делает компонент способным его принять — так `npm run typecheck` остаётся зелёным на каждом отдельном коммите
- Значение-маркер для «Все»/«Все категории» в `Select` не показывается пользователю как отдельный лейбл: контролируемое `value` компонента — сам `filters.type`/`filters.categoryId` (может быть `undefined`), поэтому выбор «Все» приводит к пуш URL без параметра и следующий рендер снова показывает плейсхолдер («Тип»/«Категория»), а не текст «Все» — то есть визуально «сброс фильтра» и «явный выбор Все» неотличимы, что и требовалось

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Восстановлено окружение api этого worktree (`.env` + сгенерированный Prisma-клиент) для верификации**
- **Found during:** Задача 1, верификация (`npm run typecheck`)
- **Issue:** В этом ephemeral worktree нет `apps/api/.env` и сгенерированного Prisma-клиента (тот же средовой пробел, что уже документирован в `02-03-SUMMARY.md` — не связан с изменениями этого плана, план трогает только `apps/web`). Без него `npm run typecheck` падал на `@expense/api` с `Cannot find module '.../generated/prisma/client.js'`.
- **Fix:** `cp apps/api/.env.example apps/api/.env`, затем `prisma generate` с явным `DATABASE_URL` в командной строке (тот же docker Postgres на 5433, что и в предыдущих планах фазы).
- **Files modified:** нет отслеживаемых git-файлов — `apps/api/.env` не в git (подтверждено `git status --short`), `src/generated/prisma/**` тоже игнорируется.
- **Verification:** `npm run typecheck` стал полностью зелёным во всех трёх воркспейсах; `npm --prefix apps/web run lint` — без ошибок.
- **Committed in:** не коммитился (файл вне git, как и в плане 02-03)

---

**Total deviations:** 1 авто-фикс (Rule 3, средовая инфраструктура, не код плана)
**Impact on plan:** Не затрагивает содержание фичи — только восстанавливает возможность прогнать `typecheck` в изолированном worktree.

## Issues Encountered

**Human-check обеих задач не выполнен вживую в браузере.** В этой сессии нет инструмента браузерной автоматизации. Вместо визуальной проверки:
- Поднят `apps/api` этого worktree на изолированном порту (4099, тот же docker Postgres 5433, что использовался в плане 02-03), создан тестовый пользователь `txn04verify+*@test.local`, две категории («Продукты», «Транспорт») и четыре транзакции (две в сентябре разных типов, одна на 2026-09-30T23:59:00Z специально для проверки инклюзивности последнего дня периода, одна в октябре как контроль границы).
- Прямыми `curl`-запросами к `GET /transactions` с точно теми же именами параметров, которые строит `getTransactions`/`filtersToParams`, подтверждены: `type=INCOME`/`type=EXPENSE` (1 и 3 записи соответственно), `categoryId` (2 записи в «Транспорт»), комбинация `type&categoryId&dateFrom&dateTo` (ровно 1 искомая запись), заведомо пустая комбинация (`{items:[],total:0}`), и главное — диапазон `dateFrom=2026-09-01&dateTo=2026-09-30` включает транзакцию от `2026-09-30T23:59:00.000Z` целиком (Pitfall 2 закрыт корректно на реальном API, а не только по коду).
- Это подтверждает серверный контракт, на котором строится вся панель фильтров, но НЕ подтверждает: визуальную раскладку панели (D-04), клиентское поведение `router.push` (сброс страницы при смене фильтра, сохранение фильтров при переходе по страницам), фактический рендер `Calendar mode="range"`/`Select` в браузере, и точный текст/отсутствие кнопки в состоянии «Ничего не найдено». Эти пункты помечены в `coverage` как `human_judgment: true` и добавлены в `.planning/WINDOWS.md` (`kind: unrun-verify`) — координатор пройдёт визуальную UAT в браузере после мержа, как и для предыдущих планов этой фазы (см. `02-03-SUMMARY.md`, где ровно такой же пробел был закрыт после мержа).

Тестовые данные (пользователь, категории, транзакции) остались в docker-контейнере `expense-tracker-db` — изолированы отдельным email-префиксом (`txn04verify+*@test.local`), не пересекаются с данными предыдущих проверок.

**Обнаружена (не исправлялась — не связана с планом) особенность окружения worktree:** в этой worktree-директории нет собственного `node_modules` ни на одном уровне (`apps/web`, `apps/api`, корень) — `npm run typecheck`/`lint`/`npx prisma generate` тем не менее отработали корректно, потому что Node-резолюция модулей проходит мимо worktree (у него просто нет своего `node_modules`) до `node_modules` основного чекаута репозитория тремя каталогами выше (`.claude/worktrees/<id>` вложен внутрь самого репозитория). Совпадение путей, а не намеренная настройка; отмечено на будущее как потенциальный источник путаницы, если структура каталогов изменится.

## User Setup Required
None - no external service configuration required. `apps/api/.env` создавался только для локальной верификации в этом worktree и не отслеживается git — при мерже ветки его нужно создать заново по `apps/api/.env.example`, как и в предыдущих планах фазы.

## Next Phase Readiness
- TXN-01..06 — весь скоуп фазы 2 — реализован в коде; фаза готова к финальной приёмке (план 02-05)
- Серверный контракт фильтров (все четыре параметра, их комбинации, инклюзивность последнего дня периода) подтверждён напрямую и не требует пересмотра
- Открыт визуальный UAT для D-04/D-05/D-06 этого плана (панель фильтров, сброс страницы, два пустых состояния) — как и D5/D6 плана 02-03, ожидается прогон координатором после мержа в `feature/transactions-crud`
- Остаётся открытым визуальный чекпоинт формы добавления транзакции на `/dashboard` из плана 02-01, если он ещё не был закрыт (см. `02-03-SUMMARY.md`)

## Self-Check: PASSED

Все 9 файлов из `key-files`/`Files Created/Modified` и сам файл SUMMARY найдены на диске (проверено `[ -f ... ]` по каждому пути). Оба коммита задач (`de1085b`, `7ec9388`) найдены в `git log --oneline -5`.

---
*Phase: 02-tranzaktsii*
*Completed: 2026-09-21*
