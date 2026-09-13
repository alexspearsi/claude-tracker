# Модуль транзакций: доходы и расходы (TransactionsModule)

## Статус: выполнено

**Отклонения и дополнения к плану:**
- При старте обнаружился зависший процесс `nest start --watch` от прошлой сессии (PID 37240),
  пересобиравший `dist` поверх удаляемых модулей — остановлен перед началом работы.
- Автоматизация запуска `npm run dev:api` через один составной bash-скрипт (`&` + `sleep` +
  `curl` в одном вызове) оказалась ненадёжной: обёртка `run_in_background` убивала процесс
  api при завершении скрипта. Решение — отдельный вызов `npm run dev:api` в фоне и отдельные
  проверки `curl`.
- В остальном реализация совпала с планом один в один: `TransactionType` сгенерировался как
  const-объект (не proxy), `@IsEnum` сработал без запасного варианта `@IsIn`; `PrismaNs.Decimal`
  как тип и как значение подтвердился при `typecheck`.
- Полный e2e-прогон (все 15 сценариев из раздела «Проверка») пройден успешно, включая
  изоляцию по пользователю, `409` при удалении категории с транзакциями и регрессию auth
  (`/api/expenses` и `/api/stats/by-category` теперь `404`, логин/регистрация/refresh не задеты).

## Контекст

Сейчас в api реализованы auth, users и CRUD категорий. Центральной сущности — учёта денег —
нет: модули `expenses` и `stats` существуют только как каркас, все методы их сервисов бросают
`Not implemented`, а модель `Expense` в схеме умеет лишь траты, без доходов.

Задача (`.claude/prompts/transactions.md`) — построить `TransactionsModule`: единую сущность
для доходов и расходов с типом `INCOME`/`EXPENSE`, CRUD-эндпоинтами, фильтрами по периоду,
типу и категории, и агрегацией за месяц.

Согласовано с пользователем:
- `ExpensesModule` и `StatsModule` **удаляются целиком** — транзакции их полностью заменяют
  (CRUD вместо `/expenses`, `/transactions/summary` вместо `/stats/by-category`). Вместе с ними
  удаляется модель `Expense` и её таблица: она обслуживала только эти модули и гарантированно
  пуста (сервис никогда не был реализован, `seed.ts` пустой).
- Только backend, фронт не трогаем.
- Валидация — только class-validator (как у категорий), без дублирующих Zod-схем в `shared`.
- Модель называется `Transaction` (ед. число, как `User`/`Category`) с `@@map("transactions")`;
  обратные связи — `transactions Transaction[]`, как и просит задание.
- `categoryId` обязателен; удаление категории с транзакциями запрещается (`onDelete: Restrict`)
  и отдаёт 409 вместо потери истории.

## Проверенные факты, влияющие на реализацию

- `apps/api/src/prisma/prisma.provider.ts` экспортирует `export type Prisma = PrismaClient` —
  **имя `Prisma` в сервисе занято**. Неймспейс клиента импортировать под алиасом:
  `import { Prisma as PrismaNs } from '../../generated/prisma/client.js'`. Проверено: в
  `internal/prismaNamespace.ts` есть и значение, и тип — `export const Decimal = runtime.Decimal`,
  `export type Decimal = runtime.Decimal`, т.е. `new PrismaNs.Decimal(0)` работает.
- `apps/api/src/generated/prisma/enums.ts` сейчас пуст (`export {}`) — енамов в схеме нет.
  После миграции там появится `TransactionType`; `client.ts` реэкспортирует его (`export * from './enums.js'`).
- Колонки времени — `TIMESTAMP(3)` без таймзоны, Prisma пишет UTC → границы месяца считать
  через `Date.UTC`, иначе offset машины утащит чужие дни в соседний месяц.
- Zod-схемы `packages/shared/src/schemas/expense.ts` и `common.ts` импортируются **только**
  удаляемыми модулями; фронт берёт из `@expense/shared` лишь auth-символы (проверено grep'ом).
  Значит оба файла — мёртвый код и удаляются.
- `ZodValidationPipe` остаётся: им пользуется `auth.controller.ts`.
- Postgres поднят (docker `expense-tracker-db`, порт 5433, healthy) — миграцию можно катить сразу.

## Схема данных

`apps/api/prisma/schema.prisma` — добавить енам и модель, удалить `Expense`:

```prisma
/// Доход или расход. Знак не хранится: направление задаёт type, amount всегда положительный.
enum TransactionType {
  INCOME
  EXPENSE
}

model Transaction {
  id          String          @id @default(uuid()) @db.Uuid
  userId      String          @db.Uuid
  categoryId  String          @db.Uuid
  amount      Decimal         @db.Decimal(12, 2)
  type        TransactionType
  description String?         @db.VarChar(500)
  date        DateTime
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  // Restrict, а не SetNull: колонка NOT NULL, обнулить её нельзя. Удаление категории
  // с транзакциями даёт P2003 → 409, история трат не стирается.
  category Category @relation(fields: [categoryId], references: [id], onDelete: Restrict)

  // Покрывает и список (userId + диапазон date + сортировка), и summary за месяц.
  @@index([userId, date])
  // Под FK-проверку при удалении категории и под фильтр categoryId.
  @@index([categoryId])
  @@map("transactions")
}
```

В `User` и `Category` связь `expenses Expense[]` заменяется на `transactions Transaction[]`.

Решения по полям: `@db.Decimal(12, 2)` обязателен (иначе Prisma сделает `DECIMAL(65,30)`);
`description` — `@db.VarChar(500)` под `@MaxLength(500)` в DTO; `updatedAt` добавляем (есть у всех
моделей проекта и есть PATCH), но **в JSON не выводим** — в ответе только поля из задания.
Индекс по `type` не нужен: кардинальность 2, планировщик его проигнорирует.

## Структура модуля

`apps/api/src/modules/transactions/` по образцу `modules/categories`:

| Файл | Содержимое |
|---|---|
| `transactions.module.ts` | контроллер + сервис. `CqrsModule` не нужен (см. ниже), `PrismaModule` глобальный |
| `transactions.controller.ts` | 6 роутов, DTO импортируются **значением** |
| `transactions.service.ts` | логика, маппер `toTransaction`, `toHttpError`, `buildDateFilter` |
| `transaction.types.ts` | `TransactionDto`, `TransactionSummary` — контракт ответа локально в модуле |
| `dto/transaction-validation.ts` | константы, русские сообщения, `trim`/`toMoneyString`/`isPresent` |
| `dto/create-transaction.dto.ts` | `amount`, `type`, `categoryId`, `date`, `description?` |
| `dto/update-transaction.dto.ts` | то же, все поля через `@ValidateIf(isPresent)` |
| `dto/transaction-query.dto.ts` | `dateFrom?`, `dateTo?`, `type?`, `categoryId?` |
| `dto/summary-query.dto.ts` | `month`, `year` — обязательные, через `@Type(() => Number)` |

### Ключевые решения

**Енам для `@IsEnum` берём сгенерированный Prisma** (`../../../generated/prisma/enums.js`),
а не свой TS-енам — один источник правды, тип совпадает с тем, что ждёт `prisma.transaction.create`.
Импорт **значением**: `@IsEnum` нужен рантайм-объект. Если после генерации окажется, что Prisma
обернула енам в `makeStrictEnum`-прокси и `@IsEnum` спотыкается — запасной вариант
`@IsIn(['INCOME', 'EXPENSE'])`.

**`amount` ходит строкой.** Принимаем строку или число, `@Transform(toMoneyString)` приводит
число к строке **без округления** (`12.345` останется `"12.345"` и упадёт в 400 — лучше, чем
молча округлить деньги), затем `@Matches(/^\d{1,10}(\.\d{1,2})?$/)` и проверка «не ноль»
(`@Matches(/[1-9]/)`). В Prisma передаём строку как есть — поле `Decimal` её принимает, float
в цепочке не возникает. Регекс повторяет `moneySchema` из удаляемого `common.ts`.

**`date` остаётся строкой в DTO** (`@IsISO8601({ strict: true })`, strict отсекает `2026-02-31`),
в `Date` превращается в сервисе: `@Type(() => Date)` на кривой строке дал бы `Invalid Date` и 500 из Prisma.

**В update — `@ValidateIf(isPresent)`, не `@IsOptional`** для `amount`/`type`/`categoryId`/`date`:
`@IsOptional` пропускает и `null`, а это NOT NULL-колонки → вместо 400 был бы 500. Для
`description` `@IsOptional` уместен — `null` сбрасывает описание. Паттерн скопирован из
`dto/update-category.dto.ts`.

**Глобальный `ValidationPipe` с `forbidNonWhitelisted: true`** означает, что любой
незадекларированный query-параметр (`page`, `limit`, `search`) даст 400 — осознанно, пагинации
в задании нет. Query-DTO тоже импортируются значением, иначе метатип будет `Object` и пайп
молча пропустит и валидацию, и `transform`.

### Контроллер

```
GET    /transactions          → findAll(user.id, query)       200
GET    /transactions/summary  → summary(user.id, month, year)  200   ← ДО :id
GET    /transactions/:id      → findOne(user.id, id)           200
POST   /transactions          → create(user.id, dto)           201
PATCH  /transactions/:id      → update(user.id, id, dto)       200
DELETE /transactions/:id      → remove(user.id, id)            204 (@HttpCode)
```

**Критично: `@Get('summary')` объявляется ДО `@Get(':id')`** — Nest матчит роуты в порядке
регистрации, иначе `summary` уедет в `:id`. На `:id` — `ParseUUIDPipe`, как в категориях.
Никаких `@UseGuards` — гвард глобальный (`APP_GUARD` в `AuthModule`), локальный уронит старт.

### Сервис

Изоляция по пользователю везде: `where: { id, userId }` — чужая запись даёт P2025 → 404,
неотличима от несуществующей.

- `findAll` — `where` собирается из `userId` + опциональных `type`/`categoryId` + диапазона дат
  (свободная функция `buildDateFilter`: `gte` для `dateFrom`; для `dateTo` без времени — `lt`
  следующих суток, иначе дата вида `2026-09-30` отрезала бы весь последний день).
  Сортировка `[{ date: 'desc' }, { createdAt: 'desc' }]` — вторичный ключ нужен, иначе у
  транзакций одного дня порядок недетерминирован.
- `findOne` — `findFirst({ where: { id, userId } })`, `null` → 404.
- `create` — приватный `assertCategoryBelongsToUser(userId, categoryId)`: `findFirst({ where: { id, userId } })`,
  иначе транзакцию можно привязать к **чужой** категории. Отдельная сверка пользователя через
  `QueryBus`/`GetUserByIdQuery` (как в `CategoriesService.create`) здесь **не нужна**: категория
  существует только у существующего пользователя (FK + `onDelete: Cascade`), так что переживший
  удаление токен всё равно получит 404 — поэтому и `CqrsModule` в модуле не нужен.
- `update` — проверка категории, если она передана; `update({ where: { id, userId }, data })`,
  `undefined` Prisma игнорирует.
- `remove` — `delete({ where: { id, userId } })`.
- `toHttpError` внизу файла: P2025 → 404 «Транзакция не найдена», P2003 → 409 «Категория
  недоступна» (гонка: категорию удалили между проверкой и вставкой). Использует
  `isPrismaError` из `apps/api/src/prisma/prisma-errors.ts`.
- `toTransaction(record)` внизу файла + локальный `interface TransactionRecord` — как `toCategory`
  в категориях. `amount: record.amount.toFixed(2)` — точная строка, `Number` между БД и JSON не появляется.

### Summary

```jsonc
{
  "month": 9, "year": 2026,
  "from": "2026-09-01T00:00:00.000Z",   // включительно
  "to":   "2026-10-01T00:00:00.000Z",   // ИСКЛЮЧИТЕЛЬНО
  "income": "120000.00", "expense": "84500.30", "balance": "35499.70",
  "byCategory": [
    { "categoryId": "…", "name": "Еда", "color": "#ef4444", "type": "EXPENSE", "total": "18400.00" }
  ]
}
```

Границы: `new Date(Date.UTC(year, month - 1, 1))` и `new Date(Date.UTC(year, month, 1))`
(`month=12` сам перекатывается на январь). Агрегация — два `groupBy` в `Promise.all`
(`by: ['type']` и `by: ['categoryId', 'type']`): `SUM(amount)` считается в Postgres над `DECIMAL`,
арифметика точная, пустая группа просто отсутствует. `findMany` + сведение в JS тянул бы все
строки месяца в память — хуже и по сети, и по коду. `balance = income.minus(expense)` —
Decimal-арифметика, дефолт `new PrismaNs.Decimal(0)`. Имена и цвета категорий — одним `findMany`
по собранным id. Итого 3 запроса, все под индексом `[userId, date]`.

`byCategory` оставляем: именно она заменяет удаляемый `/stats/by-category`. Категория может
встретиться дважды — отдельно по INCOME и по EXPENSE, поэтому в элементе есть `type`.

## Побочный эффект: удаление категории с транзакциями

`onDelete: Restrict` означает, что `DELETE /api/categories/:id` при наличии транзакций получит
P2003, которого текущий `toHttpError` не знает → 500. Правки:

- `apps/api/src/prisma/prisma-errors.ts` — добавить `ForeignKeyViolation: 'P2003'`.
- `apps/api/src/modules/categories/categories.service.ts`, `toHttpError` — P2003 →
  `ConflictException('Нельзя удалить категорию, пока по ней есть транзакции')`.

Это изменение контракта категорий (новый 409) — зафиксировать в CLAUDE.md.

## Чеклист реализации

**1. Подготовка**
- [ ] `npm run db:up`; убедиться, что контейнер жив и в `apps/api/.env` есть `DATABASE_URL` на порт **5433**
- [ ] Удалить стейл-артефакты: `rm -rf apps/api/dist packages/shared/dist` (tsc их не чистит, иначе можно ловить «удалённый» роут из старого `dist/main.js`)

**2. Удаление заглушек (до правки схемы — иначе репозиторий не собирается между шагами)**
- [x] Удалить папку `apps/api/src/modules/expenses/`
- [x] Удалить папку `apps/api/src/modules/stats/`
- [x] Удалить `packages/shared/src/schemas/expense.ts` и `packages/shared/src/schemas/common.ts`
- [x] `packages/shared/src/index.ts`: убрать экспорты `./schemas/expense` и `./schemas/common`
- [x] `apps/api/src/app.module.ts`: убрать `ExpensesModule` и `StatsModule` из импортов и `imports` (и сразу подключить `TransactionsModule`)
- [x] Проверить, что `ZodValidationPipe` НЕ удалён — он нужен `auth.controller.ts`
- [x] `grep -rn "Paginated\|moneySchema\|ExpenseQuery\|StatsByCategory" apps packages --include=*.ts --include=*.tsx` — пусто
- [x] (доп.) Обнаружен и остановлен зависший процесс `nest start --watch` с прошлой сессии (PID 37240) — пересобирал `dist` поверх удалённых модулей

**3. Схема и миграция**
- [x] `schema.prisma`: добавить `enum TransactionType` и `model Transaction` (текст выше)
- [x] `schema.prisma`: в `User` и `Category` заменить `expenses Expense[]` на `transactions Transaction[]`
- [x] `schema.prisma`: удалить модель `Expense`
- [x] `npx prisma migrate dev --name add-transactions` — прошло без интерактивного промпта (таблица была пуста)
- [x] Глазами проверить `migration.sql`: `CREATE TYPE`, `DROP TABLE "expenses"`, `CREATE TABLE "transactions"`, FK `ON DELETE RESTRICT`, оба индекса — всё совпало с планом
- [x] `enums.ts` не обновился автоматически, запущен `npx prisma generate` вручную → `TransactionType` теперь const-объект + тип (не proxy), `@IsEnum` подойдёт напрямую

**4. Правка категорий под Restrict**
- [ ] `apps/api/src/prisma/prisma-errors.ts`: добавить `ForeignKeyViolation: 'P2003'` с комментарием
- [ ] `categories.service.ts`, `toHttpError`: P2003 → 409 «Нельзя удалить категорию, пока по ней есть транзакции»

**5. DTO (`apps/api/src/modules/transactions/dto/`)**
- [ ] `transaction-validation.ts`: `AMOUNT_PATTERN`, `AMOUNT_NOT_ZERO`, `DESCRIPTION_MAX`, `YEAR_MIN/MAX`, русские `messages`, `trim`, `toMoneyString`, `isPresent`
- [ ] `create-transaction.dto.ts`: `amount` (Transform + IsString + 2×Matches), `type` (`@IsEnum(TransactionType)`), `categoryId` (`@IsUUID`), `date` (`@IsISO8601({ strict: true })`), `description?` (IsOptional + trim + MaxLength 500)
- [ ] `update-transaction.dto.ts`: те же правила, но `amount`/`type`/`categoryId`/`date` через `@ValidateIf(isPresent)`; `description` через `@IsOptional` (null сбрасывает)
- [ ] `transaction-query.dto.ts`: `dateFrom?`/`dateTo?` (IsISO8601), `type?` (IsEnum), `categoryId?` (IsUUID) — все строки, `@Type` не нужен
- [ ] `summary-query.dto.ts`: `month`/`year` с `@Type(() => Number)` + `@IsInt` + `@Min`/`@Max` (1–12 и 2000–2100), **без** `@IsOptional` — это и делает их обязательными

**6. Модуль**
- [ ] `transaction.types.ts`: `TransactionDto`, `SummaryCategoryItem`, `TransactionSummary`
- [ ] `transactions.service.ts`: импорт `Prisma as PrismaNs` из `generated/prisma/client.js` (имя `Prisma` занято провайдером), `findAll`/`findOne`/`create`/`update`/`remove`/`summary`, приватный `assertCategoryBelongsToUser`, свободные `buildDateFilter`/`toTransaction`/`toHttpError` внизу файла
- [ ] `transactions.controller.ts`: 6 роутов, `@Get('summary')` **до** `@Get(':id')`, `ParseUUIDPipe` на `:id`, `@HttpCode(NO_CONTENT)` на DELETE, DTO импортируются значением
- [ ] `transactions.module.ts`: контроллер + сервис, `exports: [TransactionsService]`, без `CqrsModule`
- [ ] `app.module.ts`: подключить `TransactionsModule` после `CategoriesModule`
- [ ] Все относительные импорты — с расширением `.js` (ESM), комментарии по-русски

**7. Сборка и проверка**
- [x] `npm run typecheck` без ошибок
- [x] `npm run lint` без ошибок
- [x] `npm run build` без ошибок (сначала пересобирает `packages/shared`)
- [x] Ручной e2e по сценариям ниже — все 15 пунктов пройдены (см. отклонения ниже)
- [x] `npm run dev:api` стартует, в логах видны 6 роутов `/api/transactions*` и нет `/api/expenses`, `/api/stats`

**8. Документация**
- [x] CLAUDE.md, «Состояние»: транзакции реализованы, `expenses`/`stats` удалены
- [x] CLAUDE.md, абзац про class-validator: теперь **два** модуля на DTO-классах (категории и транзакции)
- [x] CLAUDE.md: `DELETE /categories/:id` может вернуть 409, если по категории есть транзакции
- [x] В этом файле проставить «Статус: выполнено» и записать отклонения от плана, если были

## Проверка

```bash
npm run typecheck && npm run lint && npm run build
npm run dev:api     # http://localhost:4001/api
```

Ручной e2e (api на 4001, токен из `POST /api/auth/login`):

```bash
TOKEN=$(curl -s -X POST http://localhost:4001/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"...","password":"..."}' | node -pe "JSON.parse(require('fs').readFileSync(0)).accessToken")
CAT=$(curl -s -X POST http://localhost:4001/api/categories -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"name":"Еда","color":"#ef4444"}' | node -pe "JSON.parse(require('fs').readFileSync(0)).id")
```

Позитивные сценарии:
1. `POST /api/transactions` `{"amount":"1234.56","type":"EXPENSE","categoryId":"$CAT","date":"2026-09-13T10:00:00.000Z","description":"Обед"}` → 201, `amount` строкой `"1234.56"`.
2. `amount` числом `1234.56` → 201, в ответе `"1234.56"`.
3. `GET /api/transactions` → массив, сортировка по дате убыванием.
4. Фильтры: `?type=INCOME`, `?categoryId=$CAT`, `?dateFrom=2026-09-01T00:00:00.000Z&dateTo=2026-09-30` — последний **включает** транзакции 30-го числа.
5. `GET /api/transactions/summary?month=9&year=2026` → объект сводки (а **не** 400/404 от роута `:id`), `income`/`expense`/`balance` строками, `byCategory` с именем и цветом категории.
6. `GET /api/transactions/:id` → 200; `PATCH` `{"amount":"10.00"}` → 200; `DELETE` → 204, повтор → 404.

Негативные сценарии:
7. `amount`: `"12.345"` → 400, `"0"` / `"0.00"` → 400, `"-5"` → 400.
8. `type: "TRANSFER"` → 400; `date: "2026-02-31"` → 400; `categoryId` не-UUID → 400.
9. `PATCH` `{"amount":null}` → 400 (ValidateIf), `{"description":null}` → 200, описание сброшено.
10. `?limit=10` → 400 (`forbidNonWhitelisted`); `/api/transactions/not-a-uuid` → 400 (ParseUUIDPipe).
11. `GET /api/transactions/summary` без параметров → 400; `?month=13&year=2026` → 400.
12. Изоляция: вторым пользователем `GET`/`PATCH`/`DELETE` чужого id → 404; `POST` с чужим `categoryId` → 404 «Категория не найдена».
13. `DELETE /api/categories/$CAT` при живых транзакциях → **409**; после удаления транзакций → 204.
14. Без токена → 401.
15. Регрессия: `/api/auth/register` с кривым телом → прежний Zod-формат (`issues`); логин/refresh живы; `/api/expenses` и `/api/stats/by-category` → 404.

Автотестов в проекте нет (раннер не настроен) — проверка ручная.
