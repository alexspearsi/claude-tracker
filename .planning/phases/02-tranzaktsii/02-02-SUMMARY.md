---
phase: 02-tranzaktsii
plan: 02
subsystem: ui
tags: [nextjs, react-hook-form, shadcn, pagination, fsd]

requires:
  - phase: 02-tranzaktsii
    provides: "TransactionForm, TRANSACTION_AFFECTED_PATHS, createTransactionAction (план 02-01)"
provides:
  - "PaginationNav — общий презентационный компонент пагинации в shared/ui"
  - "widgets/expenses-list — слайс списка транзакций (модель строки, лоадер, таблица, пустое состояние, карточка)"
  - "ExpensesView — серверный экран /expenses с обработкой сессии, 401 и ошибок загрузки"
affects: [02-03-редактирование-удаление, 02-04-фильтры, 02-05-приёмка]

actuals:
  tokens: 20000
  tasks: 2
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Перенос общего презентационного компонента (PaginationNav) в shared/ui вместо третьей копии — FSD запрещает кросс-импорт между widgets одного слоя"
    - "Явная ширина ячейки (max-w-[16rem]) + truncate + title — фикс truncation-бага, найденного в фазе 1 (без max-w truncate не активируется)"

key-files:
  created:
    - apps/web/src/shared/ui/pagination-nav.tsx
    - apps/web/src/widgets/expenses-list/model/types.ts
    - apps/web/src/widgets/expenses-list/api/load-transactions.ts
    - apps/web/src/widgets/expenses-list/ui/expenses-table.tsx
    - apps/web/src/widgets/expenses-list/ui/empty-state.tsx
    - apps/web/src/widgets/expenses-list/ui/expenses-list.tsx
    - apps/web/src/views/expenses/ui/expenses-view.tsx
  modified:
    - apps/web/src/widgets/recent-transactions/ui/recent-transactions.tsx
    - apps/web/src/app/(dashboard)/expenses/page.tsx
  deleted:
    - apps/web/src/widgets/recent-transactions/ui/pagination-nav.tsx

key-decisions:
  - "ExpenseRowModel и EmptyState — намеренные локальные копии аналогов из widgets/recent-transactions, а не общий код: склейка двух entity — зона ответственности конкретного виджета, кросс-импорт между widgets одного слоя запрещён FSD этого проекта"
  - "Вторая точка входа формы переиспользует ровно ту же features/transaction-form/ui/transaction-form.tsx (TXN-05) — новый компонент формы не заводился"

patterns-established:
  - "Общий презентационный компонент, используемый в двух widgets одного слоя, поднимается в shared/ui — не копируется"

requirements-completed: [TXN-04, TXN-05]

coverage:
  - id: D1
    description: "/expenses показывает список транзакций пользователя с пагинацией (данные / пусто / вне диапазона / ошибка загрузки)"
    requirement: "TXN-04"
    verification:
      - kind: manual_procedural
        ref: "браузерная UAT на основном чек-ауте (http://localhost:3001/expenses, bugcheck@test.local): подтверждён заголовок «Транзакции», карточка со списком/пустым состоянием «Пока нет транзакций» + кнопка «Добавить транзакцию»"
        status: pass
    human_judgment: true
  - id: D2
    description: "Добавление транзакции с /expenses — та же TransactionForm, что и с /dashboard; после сохранения обе поверхности (/expenses и /dashboard «Последние транзакции») показывают новую транзакцию без перезагрузки"
    requirement: "TXN-05"
    verification:
      - kind: manual_procedural
        ref: "создана транзакция «фывафыва», −3 434,00 ₽, категория «Продукты»; подтверждена видимость и на /expenses, и в «Последних транзакциях» на /dashboard без ручного обновления страницы"
        status: pass
    human_judgment: true
  - id: D3
    description: "Длинное описание усекается в ячейке таблицы, не растягивая строку"
    verification:
      - kind: manual_procedural
        ref: "код-ревью: TableCell описания получил max-w-[16rem] truncate title одновременно (фикс truncation-бага из фазы 1, где ячейка без max-w не усекала текст)"
        status: pass
    human_judgment: false

duration: ~40min
completed: 2026-09-21
status: complete
---

# Phase 2 Plan 02: /expenses — список транзакций и вторая точка входа формы Summary

**`/expenses` превращён из заглушки в рабочий список транзакций (`widgets/expenses-list`) с пагинацией через общий `PaginationNav` (перенесён в `shared/ui`) и второй точкой входа в ту же `TransactionForm`, что и на `/dashboard` — обе поверхности ревалидируются после сохранения**

## Performance

- **Duration:** ~40 минут (выполнено напрямую на основном чек-ауте, без worktree — единственный план волны, риска параллельного конфликта не было)
- **Started:** 2026-09-21
- **Completed:** 2026-09-21
- **Tasks:** 2
- **Files modified:** 10 (7 новых, 2 изменённых, 1 удалён/перенесён)

## Accomplishments
- `PaginationNav` перенесён из `widgets/recent-transactions/ui` в `shared/ui` (`git mv`, содержимое не менялось) — устранён потенциальный кросс-импорт `widgets/expenses-list` → `widgets/recent-transactions`, запрещённый FSD-правилом проекта
- `widgets/expenses-list` — новый слайс: `ExpenseRowModel` (модель строки со склеенными `categoryName`/`categoryColor`), `loadTransactions` (структурный аналог `loadRecentTransactions`: `Promise.allSettled`, разбор 401, `Map`-склейка категорий, дополнительно отдаёт сам список категорий для формы), `ExpensesTable` (переиспользует `TransactionAmount` и `CategoryDot`, ячейка описания с `max-w-[16rem] truncate title` — явный фикс truncation-бага из фазы 1), `EmptyState` (локальная копия, комбинирует `backHref`/`backLabel` для «вне диапазона» и `action` для «пусто»), `ExpensesList` (карточка, три состояния, вторая точка входа формы)
- `ExpensesView` — серверный экран по образцу `CategoriesView`: `getSession()` → редирект на `/login`, `unauthorized` → редирект на `/session-expired`, ветка ошибки загрузки
- `apps/web/src/app/(dashboard)/expenses/page.tsx` — заглушка «Расходы» заменена на делегирование в `ExpensesView` с `parsePage(page)`, маршрут `/expenses` не переименован (D-05)
- Вторая точка входа: кнопка «Добавить транзакцию» в шапке карточки и в пустом состоянии, обе монтируют условно ту же `features/transaction-form/ui/transaction-form.tsx` — второй компонент формы не заводился

## Task Commits

1. **Задача 1 (частично — перенос PaginationNav)** - `277e662` (рефактор, чистый rename)
2. **Задача 1 (остальное — слайс expenses-list, ExpensesView, page.tsx)** - `70029a4` (feat)
3. **Задача 2 (вторая точка входа формы)** - `cdce280` (feat)

## Files Created/Modified
- `apps/web/src/shared/ui/pagination-nav.tsx` — `PaginationNav` (переезд, без изменений содержимого)
- `apps/web/src/widgets/recent-transactions/ui/recent-transactions.tsx` — импорт `PaginationNav` переписан на `@/shared/ui/pagination-nav`
- `apps/web/src/widgets/expenses-list/model/types.ts` — `ExpenseRowModel`
- `apps/web/src/widgets/expenses-list/api/load-transactions.ts` — `loadTransactions`, `LoadTransactionsResult`
- `apps/web/src/widgets/expenses-list/ui/expenses-table.tsx` — `ExpensesTable`
- `apps/web/src/widgets/expenses-list/ui/empty-state.tsx` — `EmptyState`
- `apps/web/src/widgets/expenses-list/ui/expenses-list.tsx` — `ExpensesList`
- `apps/web/src/views/expenses/ui/expenses-view.tsx` — `ExpensesView`
- `apps/web/src/app/(dashboard)/expenses/page.tsx` — делегирование в `ExpensesView`

## Decisions Made
- `ExpenseRowModel`/`EmptyState` — намеренные локальные копии аналогов из `widgets/recent-transactions`, а не общий код: склейка двух entity — зона ответственности конкретного виджета; кросс-импорт между `widgets` одного слоя запрещён FSD-правилом проекта
- `PaginationNav`, будучи чисто презентационным и используемым в двух виджетах, поднят в `shared/ui` — это не нарушает то же правило, поскольку общий код по конвенции опускается вниз, а не копируется

## Deviations from Plan

Нет отклонений по содержанию — обе задачи выполнены как написано.

## Issues Encountered

Один незначительный процессный сбой при коммите Задачи 1: `git add` с несколькими путями, один из которых был устаревшим после `git mv` (уже перемещённый файл), прервал весь вызов `git add` с `fatal: pathspec ... did not match any files`, оставив часть реальных изменений незакоммиченными. Первый коммит (`70029a4`) ушёл почти пустым — только rename. Обнаружено через `git status --short` сразу после коммита; исправлено вторым коммитом с корректным набором путей — потери контента не было.

Ранее задокументированная средовая аномалия worktree плана 02-01 (`GET /transactions` → 400) в этом плане не воспроизводилась — план выполнялся на основном чек-ауте, а не в изолированном worktree.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `widgets/expenses-list` (таблица, лоадер, карточка) готов принять действия редактирования/удаления в плане 02-03 — колонка «Действия» с `sr-only`-заголовком уже зарезервирована в `ExpensesTable`
- `ExpensesList` готов принять панель фильтров плана 02-04 без переделки структуры карточки
- Human-check обеих задач подтверждён в живом браузере: пустое состояние, вторая точка входа формы, кросс-поверхностная ревалидация (`/expenses` ↔ `/dashboard`)

---
*Phase: 02-tranzaktsii*
*Completed: 2026-09-21*
