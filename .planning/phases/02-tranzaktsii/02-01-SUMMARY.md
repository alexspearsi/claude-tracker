---
phase: 02-tranzaktsii
plan: 01
subsystem: ui
tags: [nextjs, react-hook-form, zod, shadcn, dialog, server-actions, date-fns]

requires:
  - phase: 01-kategorii
    provides: "extractFieldErrors, CategoryForm/CategoryList как структурные аналоги, паттерн Server Action"
provides:
  - "TransactionForm — общая форма создания/добавления транзакции в собственном Dialog (D-02)"
  - "QuickAddTransaction — кнопка быстрого добавления на /dashboard (TXN-05)"
  - "createTransaction entity-api + createTransactionAction Server Action"
  - "TRANSACTION_AFFECTED_PATHS — конвенция ревалидации для мутаций транзакций"
  - "CreateTransactionInput/UpdateTransactionInput в entities/transaction/model/types.ts"
affects: [02-02-expenses-список, 02-03-редактирование-удаление, 02-04-фильтры]

actuals:
  tokens: 28000
  tasks: 3
  commits: 3

tech-stack:
  added: ["date-fns@4.4.0", "react-day-picker (транзитивный, через shadcn calendar)"]
  patterns:
    - "Дата на проводе — полдень UTC (buildIsoNoon), не toISOString() локальной полуночи — избегает сдвига календарной даты"
    - "Явная сборка payload перед отправкой на api вместо parsed.data целиком — пустая строка не должна уходить как значение опционального поля"

key-files:
  created:
    - apps/web/src/shared/ui/select.tsx
    - apps/web/src/shared/ui/popover.tsx
    - apps/web/src/shared/ui/calendar.tsx
    - apps/web/src/entities/transaction/api/create-transaction.ts
    - apps/web/src/features/transaction-form/model/transaction-form-schema.ts
    - apps/web/src/features/transaction-form/model/types.ts
    - apps/web/src/features/transaction-form/model/affected-paths.ts
    - apps/web/src/features/transaction-form/api/create-transaction.action.ts
    - apps/web/src/features/transaction-form/ui/transaction-form.tsx
    - apps/web/src/widgets/quick-add-transaction/ui/quick-add-transaction.tsx
  modified:
    - apps/web/src/entities/transaction/model/types.ts
    - apps/web/src/widgets/recent-transactions/api/load-recent-transactions.ts
    - apps/web/src/widgets/recent-transactions/ui/recent-transactions.tsx
    - apps/web/src/views/dashboard/ui/dashboard-view.tsx
    - apps/web/package.json

key-decisions:
  - "CreateTransactionInput/UpdateTransactionInput заведены в entities/transaction/model/types.ts, а не импортированы из features (исправление примера из 02-RESEARCH.md, который предлагал импорт вверх по слоям FSD — запрещён CLAUDE.md)"
  - "TransactionActionState не содержит поля blocked (в отличие от CategoryActionState) — у транзакции нет зависимых записей, ветка блокировки была бы мёртвым кодом"

patterns-established:
  - "buildIsoNoon/parseIsoNoon — пара функций для date-picker полей, где сервер ожидает полный ISO-таймстамп, а UI работает с календарным днём; переиспользуемо для будущих date-полей"

requirements-completed: [TXN-01, TXN-05]

coverage:
  - id: D1
    description: "Пользователь на /dashboard нажимает «Добавить транзакцию», получает Dialog с формой (тип-переключатель, сумма, категория, дата, описание)"
    requirement: "TXN-01"
    verification:
      - kind: manual_procedural
        ref: "браузерная UAT после мержа в feature/transactions-crud (bugcheck@test.local, http://localhost:3001/dashboard): Dialog «Новая транзакция» открылся с тип-переключателем (Расход/Доход), полем суммы, Select категории, Popover+Calendar даты (сегодня по умолчанию) и полем описания"
        status: pass
    human_judgment: true
  - id: D2
    description: "Созданная транзакция появляется в списке без перезагрузки (revalidatePath), сумма визуализируется цветом+знаком"
    requirement: "TXN-05"
    verification:
      - kind: manual_procedural
        ref: "та же браузерная сессия: создана транзакция (150.25 ₽, Продукты, «UAT добавления с dashboard»), появилась в «Последних транзакциях» на /dashboard без перезагрузки страницы, знаковой суммой красным цветом с минусом; та же транзакция видна и на /expenses"
        status: pass
    human_judgment: true
  - id: D3
    description: "Пустое описание не отправляется на api пустой строкой; per-field ошибки (включая длину описания) показываются под полем"
    verification:
      - kind: manual_procedural
        ref: "POST /transactions без description -> ответ содержит description: null (не пустую строку); POST с description 501 символ -> 400 {description: [...]}, соответствует контракту extractFieldErrors"
        status: pass
    human_judgment: false

duration: ~70min
completed: 2026-09-21
status: complete
---

# Phase 2 Plan 01: Сквозной путь добавления транзакции Summary

**Общая форма `TransactionForm` (RHF + zodResolver, тип-переключатель, полдень-UTC даты) в собственном `Dialog`, используемая с `/dashboard` через `QuickAddTransaction`, создаёт транзакцию через `POST /api/transactions` с нормализованным payload — пустое описание не отправляется пустой строкой**

## Performance

- **Duration:** ~70 минут (Task 1-2 выполнены предыдущим запуском executor'а, прерванным лимитом сессии дважды; Task 3 и SUMMARY.md — этим продолжением)
- **Started:** 2026-09-21
- **Completed:** 2026-09-21
- **Tasks:** 3
- **Files modified:** 15 (10 новых, 5 изменённых)

## Accomplishments
- Сгенерированы shadcn `Select`, `Popover`, `Calendar`; `date-fns@4.4.0` закреплён точно, `react-day-picker` подтянулся транзитивно — оба проверены в `## Package Legitimacy Audit`
- `entities/transaction/model/types.ts` расширен `CreateTransactionInput`/`UpdateTransactionInput` — с исправлением направления импорта относительно черновика в RESEARCH.md (тип живёт в entity, не импортируется из features)
- `TransactionForm` — боевая форма в собственном `Dialog`: тип-переключатель из двух кнопок (не `Select`), сумма, категория (`Select`), дата (`Popover`+`Calendar`, дата на проводе — полдень UTC во избежание сдвига календарного дня), описание
- `QuickAddTransaction` — кнопка «Добавить транзакцию» в шапке `RecentTransactions` на `/dashboard`, условно монтирует `TransactionForm` со свежими `defaultValues` при каждом открытии
- `createTransactionAction` собирает payload явно (не `parsed.data` целиком) — `description` включается в тело только при непустом значении после `trim()`, подтверждено через прямой API-вызов: `description: null` в ответе при пустом поле
- Per-field ошибки (`extractFieldErrors` → `form.setError`) работают для всех 5 полей формы, включая длину описания (>500 символов) — подтверждено через прямой POST с grouped-ответом `{description: [...]}`

## Task Commits

Each task was committed atomically:

1. **Задача 1: Примитивы select/popover/calendar и date-fns@4.4.0** - `6f43cf7` (feat)
2. **Задача 2 (tracer): Сквозной путь «добавить транзакцию» с /dashboard** - `d964e1f` (feat)
3. **Задача 3: Нормализация полезной нагрузки и per-field ошибки api** - `b1d4d78` (feat)

## Files Created/Modified
- `apps/web/src/shared/ui/{select,popover,calendar}.tsx` - shadcn примитивы, импорты `cn` из `@/shared/lib/utils`
- `apps/web/src/entities/transaction/api/create-transaction.ts` - `createTransaction(accessToken, input)`
- `apps/web/src/features/transaction-form/model/transaction-form-schema.ts` - `transactionFormSchema`, зеркало `transaction-validation.ts`
- `apps/web/src/features/transaction-form/model/types.ts` - `TransactionActionState` (без поля `blocked`)
- `apps/web/src/features/transaction-form/model/affected-paths.ts` - `TRANSACTION_AFFECTED_PATHS`
- `apps/web/src/features/transaction-form/api/create-transaction.action.ts` - Server Action с явной сборкой payload
- `apps/web/src/features/transaction-form/ui/transaction-form.tsx` - `TransactionForm`
- `apps/web/src/widgets/quick-add-transaction/ui/quick-add-transaction.tsx` - `QuickAddTransaction`
- `apps/web/src/entities/transaction/model/types.ts` - добавлены `CreateTransactionInput`, `UpdateTransactionInput`
- `apps/web/src/widgets/recent-transactions/{api/load-recent-transactions,ui/recent-transactions}.tsx` - проп `headerAction`, поле `categories` в результате
- `apps/web/src/views/dashboard/ui/dashboard-view.tsx` - подключение `QuickAddTransaction`

## Decisions Made
- Тип входа (`CreateTransactionInput`) заведён в `entities/transaction/model/types.ts`, а не импортирован из `features/transaction-form` — исправление направления импорта относительно примера в `02-RESEARCH.md`, который нарушал бы правило FSD «только вниз»
- `TransactionActionState` не содержит поле `blocked` (в отличие от `CategoryActionState`) — у транзакции нет зависимых записей, которые могли бы заблокировать мутацию

## Deviations from Plan

None по содержанию плана — все 3 задачи выполнены как написано. Единственное отклонение процесса: выполнение прерывалось дважды из-за лимита сессии Claude (после Task 2 на чекпоинте, и снова в процессе Task 3); в обоих случаях работа была продолжена без потери прогресса — закоммиченные задачи не переделывались.

## Issues Encountered

**Средовая аномалия, не связанная с изменениями этого плана.** В изолированном git worktree этой сессии `GET /transactions?limit=10&offset=0` стабильно возвращает 400 (grouped-ошибка по `limit`/`offset`, как будто `@Type(() => Number)` не применяется к query-параметрам), хотя:
- Диагностика через `tsx` напрямую (реальный файл `TransactionQueryDto`, реальные `class-validator`/`class-transformer`) показала **0 ошибок** валидации для `{limit:'10',offset:'0'}` — DTO корректен.
- `POST /transactions` (собственно deliverable этого плана) работает полностью корректно — подтверждено множественными прямыми вызовами (создание с/без описания, с длинным описанием).
- Идентичный GET-запрос против **основного чек-аута** (тот же код, независимый процесс на порту 4001) отвечает `200 {"items":[],"total":0}` без проблем.
- Полная переустановка `dist/`, перезапуск процессов API и Web с нуля, проверка `tsconfig.json`/`nest-cli.json`/версий пакетов — везде идентично рабочему чек-ауту.

Причина не найдена; аномалия воспроизводится только в этом конкретном ephemeral worktree и только для GET-эндпоинта с query-параметрами, трансформируемыми в числа. **Она блокирует только браузерную/визуальную UAT-проверку** (список транзакций на `/dashboard` не рендерится из-за ошибки загрузки) — сама фича (создание транзакции, включая per-field ошибки и нормализацию payload) подтверждена напрямую через API и не задета этой аномалией. GET-эндпоинт и его DTO не входят в изменения этого плана.

**Дополнено после мержа в `feature/transactions-crud`:** визуальный сценарий TXN-01/TXN-05 перепроверен координатором на основном чек-ауте (`http://localhost:3001`, пользователь `bugcheck@test.local`) — Dialog добавления открылся и сохранил транзакцию, видимую без перезагрузки и на `/dashboard`, и на `/expenses`. См. D1/D2 в `coverage`, оба теперь `status: pass`.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Архитектура среза (`shared/ui → entities → features → widgets → views`) доказана на живом API-пути; план 02-02 (`/expenses` список) может опираться на неё без пересмотра
- `TRANSACTION_AFFECTED_PATHS`, `createTransactionAction`'s payload-паттерн и `buildIsoNoon`/`parseIsoNoon` готовы к переиспользованию планами 02-02..02-04
- Визуальная браузерная UAT-проверка формы пройдена после мержа — см. D1/D2 (`status: pass`)

---
*Phase: 02-tranzaktsii*
*Completed: 2026-09-21*
