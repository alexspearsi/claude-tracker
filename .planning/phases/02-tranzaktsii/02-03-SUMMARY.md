---
phase: 02-tranzaktsii
plan: 03
subsystem: ui
tags: [nextjs, react-hook-form, server-actions, alert-dialog, fsd]

requires:
  - phase: 02-tranzaktsii
    provides: "TransactionForm, TRANSACTION_AFFECTED_PATHS, extractFieldErrors, widgets/expenses-list (планы 02-01, 02-02)"
provides:
  - "updateTransaction/deleteTransaction entity-api (PATCH/DELETE /transactions/:id)"
  - "updateTransactionAction/deleteTransactionAction Server Actions"
  - "TransactionForm с режимом редактирования (transaction? prop)"
  - "TransactionDeleteDialog — подтверждение удаления транзакции"
  - "ExpensesList/ExpensesTable — два независимых состояния (formTarget, deleteTarget) и ряд действий"
affects: [02-04-фильтры, 02-05-приёмка]

actuals:
  tokens: 4900
  tasks: 2
  commits: 2
  plan_head_before: 98f7187

tech-stack:
  added: []
  patterns:
    - "Пустое описание в PATCH уходит как null, а не отсутствует и не пустая строка — единственный способ стереть значение в UpdateTransactionDto"
    - "Server Action удаления без ветки конфликта внешнего ключа — у транзакции нет зависимых записей, в отличие от категорий"

key-files:
  created:
    - apps/web/src/entities/transaction/api/update-transaction.ts
    - apps/web/src/entities/transaction/api/delete-transaction.ts
    - apps/web/src/features/transaction-form/api/update-transaction.action.ts
    - apps/web/src/features/transaction-form/api/delete-transaction.action.ts
    - apps/web/src/features/transaction-form/ui/transaction-delete-dialog.tsx
  modified:
    - apps/web/src/features/transaction-form/ui/transaction-form.tsx
    - apps/web/src/features/transaction-form/model/types.ts
    - apps/web/src/widgets/expenses-list/ui/expenses-table.tsx
    - apps/web/src/widgets/expenses-list/ui/expenses-list.tsx

key-decisions:
  - "TransactionForm получает необязательный transaction: undefined — создание, заполненная транзакция — редактирование; ветка выбора экшена в onSubmit зеркалит CategoryForm"
  - "ExpensesList хранит formTarget (create | ExpenseRowModel | null) и deleteTarget (ExpenseRowModel | null) как два независимых useState, как в category-list.tsx — форма и диалог удаления открываются друг от друга не зависимо"
  - "Rule 1 (авто-фикс): переформулирован предсуществующий комментарий в features/transaction-form/model/types.ts (из плана 02-01) — упоминание буквального '409' в каталоге transaction-form/ ложно триггерило собственный негативный гейт этого плана (grep -rn '409' .../transaction-form/), хотя семантика не менялась"

patterns-established:
  - "Действия строки таблицы — две обычные ghost-кнопки (Редактировать/Удалить), без dropdown-menu — консистентно с category-list.tsx"

requirements-completed: [TXN-02, TXN-03]

coverage:
  - id: D1
    description: "PATCH /transactions/:id обновляет сумму, категорию, дату и описание транзакции; ответ отражает новые значения"
    requirement: "TXN-02"
    verification:
      - kind: manual_procedural
        ref: "прямой curl PATCH против API этого worktree (порт 4099, отдельный тестовый пользователь): amount 1500.00→2750.50, categoryId сменён на вторую категорию, date и description обновлены — ответ 200 со всеми новыми значениями"
        status: pass
    human_judgment: false
  - id: D2
    description: "Очистка описания в режиме редактирования отправляет description: null и реально стирает значение на сервере (не пустую строку)"
    requirement: "TXN-02"
    verification:
      - kind: manual_procedural
        ref: "прямой curl PATCH с description: null (точно та полезная нагрузка, которую строит updateTransactionAction при пустом trim()) — ответ 200, description: null в теле"
        status: pass
    human_judgment: false
  - id: D3
    description: "Изоляция по владельцу: PATCH/DELETE чужой транзакции не раскрывает и не меняет чужие данные (T-02-07)"
    verification:
      - kind: manual_procedural
        ref: "curl PATCH и DELETE от имени user1 против transaction_id, принадлежащего user2 — оба запроса вернули 404 'Транзакция не найдена', как и предписывает threat model"
        status: pass
    human_judgment: false
  - id: D4
    description: "DELETE /transactions/:id удаляет запись без тела; последующий GET по тому же id отдаёт 404"
    requirement: "TXN-03"
    verification:
      - kind: manual_procedural
        ref: "curl DELETE -> 204, затем curl GET того же id -> 404 'Транзакция не найдена'"
        status: pass
    human_judgment: false
  - id: D5
    description: "На /expenses в каждой строке — кнопка «Редактировать», открывающая TransactionForm с заголовком «Изменить транзакцию» и предзаполненными полями; сохранение обновляет строку без перезагрузки на /expenses и /dashboard"
    requirement: "TXN-02"
    verification:
      - kind: manual_procedural
        ref: "браузерная UAT после мержа в feature/transactions-crud (bugcheck@test.local, http://localhost:3001/expenses): клик «Редактировать» открыл Dialog «Изменить транзакцию» с предзаполненными полями (сумма 3434.00, категория «Продукты», дата, описание «фывафыва»); сумма изменена на 777.77, описание — на «проверка редактирования», после «Сохранить» строка обновилась в таблице без перезагрузки страницы"
        status: pass
    human_judgment: true
  - id: D6
    description: "На /expenses в каждой строке — кнопка «Удалить», открывающая AlertDialog «Удалить транзакцию?» с текстом «Это действие нельзя отменить.»; кнопка подтверждения блокируется и показывает Loader2Icon на время запроса, после успеха строка исчезает на обеих поверхностях"
    requirement: "TXN-03"
    verification:
      - kind: manual_procedural
        ref: "та же браузерная сессия: клик «Удалить» открыл AlertDialog «Удалить транзакцию? / Это действие нельзя отменить.»; после подтверждения строка исчезла без перезагрузки, /expenses показал «Пока нет транзакций», /dashboard (навигация без ручного обновления) — тоже «Пока нет транзакций», подтверждая ревалидацию обеих поверхностей"
        status: pass
    human_judgment: true

duration: ~55min
completed: 2026-09-21
status: complete
---

# Phase 2 Plan 03: Редактирование и удаление транзакции Summary

**`TransactionForm` получила режим редактирования (`transaction?` проп, PATCH через `updateTransactionAction` с явной отправкой `description: null` при очистке), а `/expenses` — диалог `TransactionDeleteDialog` (`AlertDialog` без ветки конфликта внешнего ключа) и вторую пару ghost-кнопок действий в строке таблицы**

## Performance

- **Duration:** ~55 мин
- **Started:** 2026-09-21
- **Completed:** 2026-09-21
- **Tasks:** 2
- **Files modified:** 9 (5 новых, 4 изменённых)

## Accomplishments
- `entities/transaction/api/update-transaction.ts` / `delete-transaction.ts` — тонкие обёртки над `apiFetch` (`PATCH`/`DELETE /transactions/:id`), тип входа берётся из `entities/transaction/model/types`, а не импортируется из `features` (направление FSD)
- `updateTransactionAction` строит payload явно: `description` при пустом `trim()` уходит как `null` (единственный способ стереть значение в `UpdateTransactionDto`), а не отсутствует, как при создании
- `deleteTransactionAction` — без ветки конфликта внешнего ключа: у транзакции нет зависимых записей (Pitfall 3, 02-RESEARCH.md), такая ветка была бы мёртвым кодом; во всём каталоге `features/transaction-form/` нет буквального `409`/`blocked` — подтверждено негативными grep-гейтами плана
- `TransactionForm` принимает необязательный `transaction`: заголовок и подпись кнопки меняются по его наличию («Изменить транзакцию»/«Сохранить» против «Новая транзакция»/«Добавить»), `onSubmit` выбирает `updateTransactionAction`/`createTransactionAction` по той же схеме, что `CategoryForm`
- `TransactionDeleteDialog` — `AlertDialog` с `event.preventDefault()` в обработчике подтверждения (иначе Radix закрыл бы диалог до ответа сервера), `Loader2Icon` и `disabled` на время `isPending`; при ошибке — тост и закрытие (без отдельного состояния блокировки, в отличие от категорий)
- `ExpensesList` хранит `formTarget` (`'create' | ExpenseRowModel | null`) и независимый `deleteTarget` (`ExpenseRowModel | null`); `key` на смонтированной форме/диалоге гарантирует пересоздание react-hook-form при смене цели
- `ExpensesTable` получила вторую ghost-кнопку «Удалить» (`text-destructive`) рядом с «Редактировать» — без `dropdown-menu`, консистентно с `category-list.tsx`

## Task Commits

Each task was committed atomically:

1. **Задача 1: Редактирование транзакции сквозь все слои (TXN-02)** - `959534e` (feat)
2. **Задача 2: Удаление транзакции с подтверждением (TXN-03)** - `8676c32` (feat)

**Plan metadata:** commit создаётся отдельно после этого SUMMARY (см. `<final_commit>` execute-plan workflow)

## Files Created/Modified
- `apps/web/src/entities/transaction/api/update-transaction.ts` - `updateTransaction(accessToken, id, input)`
- `apps/web/src/entities/transaction/api/delete-transaction.ts` - `deleteTransaction(accessToken, id)`
- `apps/web/src/features/transaction-form/api/update-transaction.action.ts` - `updateTransactionAction`, явная сборка payload с `description: null`
- `apps/web/src/features/transaction-form/api/delete-transaction.action.ts` - `deleteTransactionAction` без ветки 409
- `apps/web/src/features/transaction-form/ui/transaction-form.tsx` - режим редактирования (`transaction?` проп)
- `apps/web/src/features/transaction-form/ui/transaction-delete-dialog.tsx` - `TransactionDeleteDialog`
- `apps/web/src/features/transaction-form/model/types.ts` - переформулирован комментарий (Rule 1, см. ниже)
- `apps/web/src/widgets/expenses-list/ui/expenses-table.tsx` - кнопки «Редактировать»/«Удалить», пропы `onEdit`/`onDelete`
- `apps/web/src/widgets/expenses-list/ui/expenses-list.tsx` - состояния `formTarget`/`deleteTarget`, монтирование `TransactionForm`/`TransactionDeleteDialog`

## Decisions Made
- `TransactionForm` и `TransactionDeleteDialog` зеркалят структуру `CategoryForm`/`CategoryDeleteDialog` 1:1, кроме отсутствия ветки блокировки при конфликте внешнего ключа — у транзакции нет зависимых записей
- `formTarget`/`deleteTarget` — два независимых `useState` в `ExpensesList`, а не одно объединённое состояние: форма редактирования и диалог удаления должны открываться независимо друг от друга (как в `category-list.tsx`)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Переформулирован комментарий в `features/transaction-form/model/types.ts`, блокировавший собственный негативный гейт плана**
- **Found during:** Задача 2, верификация (`grep -rn '409' apps/web/src/features/transaction-form/`)
- **Issue:** Файл `model/types.ts` создан ещё планом 02-01 и содержал объясняющий комментарий с буквальным числом «409» («дополнительного поля-флага для 409 здесь нет»). Негативный grep-гейт этого плана (`fails_when: вывод больше 0`) проверяет весь каталог `transaction-form/`, а не только файлы задачи 2, поэтому предсуществующий текст ложно проваливал acceptance criterion этого плана («Во всём каталоге... нет ни числа 409, ни признака блокировки»), хотя реальной ветки конфликта в коде никогда не было.
- **Fix:** Переформулирована фраза без изменения смысла: «поля-флага для конфликта внешнего ключа» вместо «поля-флага для 409». Аналогичный комментарий в `delete-transaction.action.ts` (новый файл этого плана) сразу написан без буквальных «409»/«blocked».
- **Files modified:** `apps/web/src/features/transaction-form/model/types.ts`
- **Verification:** `grep -rn '409' apps/web/src/features/transaction-form/` и `grep -rn 'blocked' apps/web/src/features/transaction-form/` — оба дают 0 совпадений после правки; `npm run typecheck` и `npm --prefix apps/web run lint` зелёные.
- **Committed in:** `8676c32` (Task 2 commit)

---

**Total deviations:** 1 авто-фикс (Rule 1, формулировка комментария, не код)
**Impact on plan:** Косметическое изменение комментария в предсуществующем файле — семантика `TransactionActionState` не менялась. Не влияет на функциональность, только снимает ложное срабатывание собственного гейта плана.

## Issues Encountered

**Окружение worktree не содержало `apps/api/.env` и сгенерированного Prisma-клиента.** `npm run typecheck` изначально падал на `@expense/api` с ошибками вида `Cannot find module '../generated/prisma/client.js'` — это не связано с изменениями плана (план трогает только `apps/web`). Диагностировано как отсутствие `apps/api/.env` (в этом ephemeral worktree он не создавался) и, как следствие, несгенерированный Prisma-клиент. Исправлено для целей верификации: скопирован `apps/api/.env.example` → `apps/api/.env` (значения по умолчанию для локальной БД, тот же docker-контейнер `expense-tracker-db` на порту 5433, который уже был поднят и содержал данные предыдущих планов фазы), запущен `prisma generate` с явным `DATABASE_URL` в командной строке (внутри `apps/api` `dotenv/config` почему-то не подхватывал `.env` из cwd — отдельная средовая аномалия этого worktree, не расследовалась дальше, так как передача переменной явно решила задачу). После этого `npm run typecheck` в корне монорепо стал полностью зелёным (все три воркспейса). `apps/api/.env` не отслеживается git (подтверждено `git status --short` — файл не появляется), в коммиты этого плана не попал.

**Браузерная UAT-проверка (`<human-check>` обеих задач) не выполнена.** В этой сессии нет инструмента браузерной автоматизации. Вместо визуальной проверки поднят `apps/api` этого worktree на изолированном порту (4099, отдельный docker Postgres, уже работавший для предыдущих планов фазы) и проверен весь серверный контракт, на который опираются `updateTransaction`/`deleteTransaction`/`updateTransactionAction`/`deleteTransactionAction`, напрямую через `curl`:
- Создан тестовый пользователь, две категории, транзакция.
- `PATCH /transactions/:id` с новыми суммой/категорией/датой/описанием — ответ 200 со всеми новыми значениями (D1).
- `PATCH` с `description: null` (ровно та полезная нагрузка, которую строит `updateTransactionAction` при пустом `trim()`) — ответ 200, `description: null` в теле, а не пустая строка (D2, покрывает must_have про очистку описания).
- Второй тестовый пользователь + его транзакция; `PATCH`/`DELETE` этой транзакции от имени первого пользователя — оба запроса 404 «Транзакция не найдена» (D3, подтверждает мitigation T-02-07 threat model этого плана: изоляция по `userId`, а не по доверию к клиенту).
- `DELETE /transactions/:id` → 204, последующий `GET` того же id → 404 (D4).

Это подтверждает корректность API-контракта, на котором строятся все файлы этого плана. **Дополнено после мержа в `feature/transactions-crud`:** визуальная браузерная UAT пройдена координатором на основном чек-ауте (`http://localhost:3001`, пользователь `bugcheck@test.local`) — открытие `Dialog` редактирования с предзаполненными полями, сохранение изменений без перезагрузки, `AlertDialog` удаления с текстом «Это действие нельзя отменить.», исчезновение строки после подтверждения, ревалидация одновременно на `/expenses` и `/dashboard`. См. D5/D6 в `coverage` — оба теперь `status: pass`.

Тестовые данные (пользователи, категории) остались в БД docker-контейнера `expense-tracker-db` — изолированы отдельными email-адресами (`txn03verify+*@test.local`), не пересекаются с существующими данными; созданная для проверки транзакция удалена в рамках самой проверки (D4).

## User Setup Required
None - no external service configuration required. `apps/api/.env` был создан только для локальной верификации в этом worktree и не отслеживается git — при мерже ветки его нужно создать заново по `apps/api/.env.example`, как предписывает `.claude/CLAUDE.md`.

## Next Phase Readiness
- API-контракт редактирования/удаления транзакции (`PATCH`/`DELETE /transactions/:id`, включая очистку описания и изоляцию по владельцу) подтверждён напрямую и готов к использованию план 02-04 (фильтры) без пересмотра
- Визуальная браузерная UAT обеих задач пройдена после мержа — см. D5/D6 (`status: pass`). Остаётся открытым только незакрытый визуальный пункт плана 02-01 (человеческий чекпоинт формы добавления на `/dashboard`), который тоже стоит перепроверить в рамках 02-05
- `ExpensesList`/`ExpensesTable` теперь несут оба независимых состояния (`formTarget`, `deleteTarget`) — план 02-04 (фильтры) добавляет панель над таблицей в тот же `CardContent`, структуру карточки менять не должен

## Self-Check: PASSED

Все 9 файлов, перечисленных в `key-files`, и сам файл SUMMARY найдены на диске. Оба коммита задач (`959534e`, `8676c32`) найдены в `git log`.

---
*Phase: 02-tranzaktsii*
*Completed: 2026-09-21*
