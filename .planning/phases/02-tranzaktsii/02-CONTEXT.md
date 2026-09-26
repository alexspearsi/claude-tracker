# Phase 2: Транзакции - Context

**Gathered:** 2026-09-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Фронтенд-CRUD для транзакций: общая форма `TransactionForm`, используемая и на быстром
добавлении с `/dashboard`, и на странице `/expenses` (сейчас заглушка), плюс фильтры по
периоду/типу/категории. Backend полностью готов (`POST/PATCH/DELETE/GET /api/transactions`,
фильтры, пагинация) — новых серверных изменений не требуется.

</domain>

<decisions>
## Implementation Decisions

### Форма транзакции
- **D-01:** Тип (доход/расход) выбирается переключателем/табами в верху формы, не select —
  консистентно с решением по форме категории в Phase 1 (D-01 там был про Dialog, но тот же
  принцип «явный переключатель, не select» уже одобрен пользователем здесь явно)
- **D-02:** Форма живёт в `Dialog` на обоих экранах — и на `/dashboard` (quick-add), и на
  `/expenses`. Один компонент `TransactionForm`, два вызывающих места оборачивают его в Dialog
  каждый у себя (как исследование ARCHITECTURE.md и предписывает)

### Список транзакций и визуализация
- **D-03:** Сумма визуализируется цветом + знаком (зелёный `+`, красный `−`) — переиспользовать
  существующий `entities/transaction/ui/transaction-amount.tsx` (`TransactionAmount`), уже
  реализующий именно это для дашборда. Новый компонент писать не нужно.
- **D-04:** Фильтры на `/expenses` — панель над таблицей (период, тип, категория), видны сразу,
  без сворачивания в отдельный блок/кнопку

### Границы скопа
- **D-05:** Маршрут `/expenses` остаётся как есть (техдолг: сущность в API — `transaction`,
  модуль `expenses` удалён ещё раньше) — переименование роута НЕ входит в эту фазу,
  зафиксировано пользователем явно

### Claude's Discretion
- Точное расположение кнопки быстрого добавления на `/dashboard` (в шапке существующего
  блока `recent-transactions` или отдельно)
- Набор полей фильтра (dropdown vs. date range picker для периода) — Claude выбирает
  консистентно с уже установленными shadcn-примитивами (`Popover`+`Calendar` уже
  предусмотрены research STACK.md)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Требования и роадмап
- `.planning/REQUIREMENTS.md` — TXN-01..06
- `.planning/ROADMAP.md` — Phase 2 (Транзакции)

### Research (проектная итерация, project-level)
- `.planning/research/ARCHITECTURE.md` — полная архитектура среза транзакций: размещение
  `features/transaction-form`, `widgets/quick-add-transaction`, `widgets/balance-summary`,
  паттерн Server Action + `revalidatePath` (ROUTES.dashboard + ROUTES.expenses на каждую
  мутацию транзакции), обоснование `no revalidateTag`
- `.planning/research/STACK.md` — недостающие shadcn-примитивы (`Select`, `Popover`+`Calendar`
  + `date-fns`), рекомендация против `react-number-format`/`TanStack Query` для этих мутаций
- `.planning/research/PITFALLS.md` — сумма без знака в API (направление только через `type`),
  timezone-дрейф дат (строить ISO как noon-UTC), `revalidatePath` должен покрывать
  `/dashboard` И `/expenses` на каждую мутацию транзакции

### Контракты API
- `apps/api/src/modules/transactions/dto/create-transaction.dto.ts`,
  `update-transaction.dto.ts`, `transaction-validation.ts` — `AMOUNT_PATTERN`
  (`/^\d{1,10}(\.\d{1,2})?$/`, без знака), `AMOUNT_NOT_ZERO`, `IsISO8601({strict: true})`
- `apps/api/src/modules/transactions/transaction.types.ts` — контракт ответа (нет Zod-дубликата
  в `@expense/shared` — локальная схема для `zodResolver` должна быть заведена в
  `features/transaction-form/model/`, синхронизируется с DTO вручную)

### Существующие паттерны Phase 1 (переиспользовать без изменений)
- `apps/web/src/shared/api/error-message.ts` — `extractFieldErrors` (готов, без изменений)
- `apps/web/src/features/category-form/model/affected-paths.ts` — образец для
  `TRANSACTION_AFFECTED_PATHS` (тот же паттерн, другой список путей)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `apps/web/src/entities/transaction/ui/transaction-amount.tsx` — `TransactionAmount`, уже
  реализует D-03 (цвет + знак), переиспользовать как есть
- `apps/web/src/entities/transaction/api/get-transactions.ts` — `getTransactions(accessToken, params)`,
  уже читает `GET /transactions` с фильтрами и пагинацией
- `apps/web/src/entities/transaction/model/types.ts` — `Transaction`, `TransactionType`,
  `TransactionList` — зеркало api-типов, использовать как есть
- `apps/web/src/widgets/recent-transactions/` — полный образец таблицы транзакций
  (`transactions-table.tsx`, `empty-state.tsx`) — прямой аналог для `/expenses`
- `apps/web/src/shared/api/error-message.ts` — `extractFieldErrors` + `apiErrorMessage`,
  готовы к переиспользованию без изменений
- `apps/web/src/features/category-form/` — весь Phase 1 срез (Dialog + Server Action +
  entity-api + `*_AFFECTED_PATHS`) — прямой шаблон для `features/transaction-form/`

### Established Patterns
- Server Actions читают `getSession()`, вызывают entity-функцию с `accessToken`, затем
  `revalidatePath` по списку затронутых путей, возвращают `{success}`/`{error, fieldErrors?}`
  без `redirect()`
- `extractFieldErrors` вызывается в `catch` раньше `apiErrorMessage` для DTO-роутов
- Entities не читают сессию сами — `accessToken` параметром

### Integration Points
- Новый `entities/transaction/api/{create,update,delete}-transaction.ts`, `get-summary.ts`
  (последнее пригодится Phase 3, но можно завести здесь по аналогии)
- Новый `features/transaction-form/` (api Server Actions, model/types.ts +
  transaction-form-schema.ts + affected-paths.ts, ui/transaction-form.tsx)
- Новый `widgets/quick-add-transaction/` — Dialog-обёртка для дашборда
- `apps/web/src/app/(dashboard)/expenses/page.tsx` — заменить заглушку на `ExpensesView`
- `apps/web/src/views/dashboard/ui/dashboard-view.tsx` — добавить кнопку быстрого добавления

</code_context>

<specifics>
## Specific Ideas

Нет специфических визуальных референсов сверх уже принятых в Phase 1 решений (Dialog,
предустановленная палитра для категорий уже не относится к этой фазе).

</specifics>

<deferred>
## Deferred Ideas

- Переименование `/expenses` в соответствие с сущностью `transaction` — техдолг, не в этой
  фазе (D-05)

</deferred>

---

*Phase: 2-Транзакции*
*Context gathered: 2026-09-21*
