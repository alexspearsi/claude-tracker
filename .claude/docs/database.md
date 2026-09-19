# База данных

PostgreSQL 16, схема описана в `apps/api/prisma/schema.prisma`, миграции — в
`apps/api/prisma/migrations/`. Connection string задаётся не в схеме
(Prisma 7 убрала `url` из `datasource`), а в `apps/api/prisma.config.ts` через
`env('DATABASE_URL')` и читается из `apps/api/.env`.

Генератор клиента настроен на ESM: `moduleFormat = "esm"`,
`importFileExtension = "js"`, клиент пишется в `apps/api/src/generated/prisma`
(каталог не в git, генерируется командой `npm run prisma:generate`).
Подключение в рантайме — через driver adapter `@prisma/adapter-pg`, не через
`url` в схеме (см. `apps/api/src/prisma/prisma.provider.ts`).

## Таблицы

### `users`

| Колонка | Тип | Назначение |
|---|---|---|
| `id` | `uuid`, PK, `default(uuid())` | идентификатор пользователя |
| `email` | `text`, `@unique` | логин, проверяется на уникальность при регистрации |
| `passwordHash` | `text` | bcrypt-хеш пароля (10 раундов, см. `RegisterHandler`) |
| `name` | `text?` | имя, опционально |
| `createdAt` | `timestamp`, `default(now())` | дата регистрации |
| `updatedAt` | `timestamp`, `@updatedAt` | автообновляемая дата изменения |

Связи: `categories[]`, `transactions[]`, `refreshTokens[]` — все с
`onDelete: Cascade` со стороны потомка (удаление пользователя удаляет его
данные).

### `refresh_tokens`

| Колонка | Тип | Назначение |
|---|---|---|
| `id` | `uuid`, PK | идентификатор записи |
| `userId` | `uuid`, FK → `users.id`, `onDelete: Cascade` | владелец токена |
| `tokenHash` | `text` | **SHA-256** хеш refresh-JWT, не сам токен |
| `expiresAt` | `timestamp` | срок действия (из `exp` токена) |
| `revokedAt` | `timestamp?` | момент отзыва; `null` — токен активен |
| `createdAt` | `timestamp`, `default(now())` | момент выдачи |

Индекс: `@@index([userId])`.

Хранится хеш, а не сам токен — это даёт логаут и отзыв сессий без раскрытия
токена при компрометации БД. SHA-256 выбран вместо bcrypt намеренно: bcrypt
обрезает вход до 72 байт, а у всех refresh-токенов одного пользователя первые
72 байта совпадают (общий префикс заголовка JWT и полей `sub`/`email`) —
`bcrypt.compare` ложно засчитывал бы чужой токен как совпадающий.

Ротация: при `POST /auth/refresh` старая запись получает `revokedAt`, новая
пара токенов создаёт новую запись. `verify()` в `TokensService` ищет запись
по `{ userId, tokenHash, revokedAt: null, expiresAt: { gt: now } }` —
отозванные и просроченные токены не проходят.

### `categories`

| Колонка | Тип | Назначение |
|---|---|---|
| `id` | `uuid`, PK | идентификатор категории |
| `userId` | `uuid`, FK → `users.id`, `onDelete: Cascade` | владелец |
| `name` | `varchar(50)` | название |
| `color` | `varchar(7)`, `default("#64748b")` | цвет в формате `#RRGGBB` |
| `icon` | `varchar(50)?` | опциональная иконка |
| `createdAt` | `timestamp`, `default(now())` | — |
| `updatedAt` | `timestamp`, `@updatedAt` | — |

Ограничение: `@@unique([userId, name])` — у одного пользователя не может быть
двух категорий с одинаковым названием (нарушение → `P2002` → `409`).

### `transactions`

Единая сущность дохода и расхода — направление задаёт `type`, `amount`
всегда хранится положительным (знак не хранится).

| Колонка | Тип | Назначение |
|---|---|---|
| `id` | `uuid`, PK | идентификатор |
| `userId` | `uuid`, FK → `users.id`, `onDelete: Cascade` | владелец |
| `categoryId` | `uuid`, FK → `categories.id`, `onDelete: Restrict` | категория |
| `amount` | `Decimal(12, 2)` | сумма, всегда положительная |
| `type` | `TransactionType` (enum) | `INCOME` \| `EXPENSE` |
| `description` | `varchar(500)?` | опциональное описание |
| `date` | `timestamp` | дата операции (не дата создания записи) |
| `createdAt` | `timestamp`, `default(now())` | момент создания записи |
| `updatedAt` | `timestamp`, `@updatedAt` | — |

Индексы:
- `@@index([userId, date])` — покрывает и список (`userId` + диапазон `date`
  + сортировка), и агрегацию `summary` за месяц.
- `@@index([categoryId])` — под FK-проверку при удалении категории и под
  фильтр `categoryId` в `GET /transactions`.

`onDelete: Restrict` на `category` (не `SetNull`) — колонка `categoryId`
`NOT NULL`, обнулить её при удалении категории нельзя технически. Поэтому
`DELETE /categories/:id` с существующими транзакциями роняет `P2003`,
который сервис переводит в `409` — история трат не стирается молча.

Колонки типа `timestamp` — без таймзоны (`TIMESTAMP(3)`), Prisma всегда
пишет и читает их как UTC. `TransactionsService.summary` строит границы
месяца через `Date.UTC(...)`, а не `new Date(year, month-1, 1)` — иначе
границу сместил бы локальный offset машины.

### enum `TransactionType`

```prisma
enum TransactionType {
  INCOME
  EXPENSE
}
```

## Деньги

`amount` — `Decimal(12, 2)` в БД, **строка** на входе (DTO) и выходе (JSON)
API. Между БД и JSON никогда не появляется `float`/`Number` — точность не
теряется. На входе строка проверяется паттерном `^\d{1,10}(\.\d{1,2})?$`
(`transaction-validation.ts`), на выходе — `Decimal.toFixed(2)`.

## Изоляция данных

Все выборки/изменения `categories` и `transactions` идут через
`where: { id, userId }` — запись другого пользователя по прямому `id`
неотличима от несуществующей (Prisma отдаёт `P2025` → `404`, не `403`).

## Ошибки Prisma → HTTP

Единая точка перевода — `isPrismaError`/`PrismaErrorCode`
(`apps/api/src/prisma/prisma-errors.ts`), каждый сервис использует их в своём
`catch`:

| Код Prisma | Причина | HTTP | Где встречается |
|---|---|---|---|
| `P2002` | unique-констрейнт | 409 | `users.email`, `categories (userId, name)` |
| `P2025` | `update`/`delete` не нашли запись | 404 | любой `where: { id, userId }` на чужую/несуществующую запись |
| `P2003` | нарушение внешнего ключа | 409 | `DELETE /categories/:id` с транзакциями; гонка при создании транзакции, если категорию удалили параллельно |

## Миграции

```
apps/api/prisma/migrations/
  20260911084452_init/            # users, refresh_tokens, categories
  20260913155525_add_transactions/ # transactions, enum TransactionType
```

Применяются командой `npm run prisma:migrate` (`prisma migrate dev` внутри
`apps/api`). Подробнее о том, как добавить новую миграцию — в `dev-guide.md`.

`prisma/seed.ts` существует, но не заполнен (см. `CLAUDE.md`, раздел
«Состояние»).
