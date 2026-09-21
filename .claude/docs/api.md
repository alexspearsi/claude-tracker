# API

Базовый URL: `http://localhost:4001/api` (`PORT`/`CORS_ORIGIN` — в
`apps/api/.env`, глобальный префикс `/api` задан в `main.ts`).

Формат ошибки — единый для всех эндпоинтов (`HttpExceptionFilter`):

```json
{
  "statusCode": 400,
  "path": "/api/transactions",
  "timestamp": "2026-09-19T12:00:00.000Z",
  "error": { "message": "..." }
}
```

Для роутов на `ZodValidationPipe` (auth) в `error` дополнительно есть
`issues` (результат `z.treeifyError`). Для роутов на `ValidationPipe`
(categories, transactions) с `errorFormat: 'grouped'` (whitelist +
forbidNonWhitelisted, см. `apps/api/src/main.ts`) `error.message` — **не
строка и не массив**, а объект, где ключ — имя поля, значение — массив
сообщений этого поля:

```json
{ "error": { "message": { "name": ["Название не может быть пустым"] } } }
```

На фронте этот формат разбирает `extractFieldErrors`
(`apps/web/src/shared/api/error-message.ts`) и кладёт результат в
`form.setError` по каждому полю; `apiErrorMessage` (тот же файл) обрабатывает
остальные формы ответа (409, 404, сеть, 5xx) для тостов. Без
`extractFieldErrors` объектный `error.message` попадает в общий фолбэк, и
пользователь видит сообщение о недоступности сервиса вместо ошибки поля.

**Авторизация:** все эндпоинты, кроме помеченных `Public`, требуют
`Authorization: Bearer <access_token>`. Без валидного токена — `401`.
Данные всегда фильтруются по пользователю из токена — чужие записи
недоступны по прямому id (`404`, не `403`).

---

## Health

### `GET /health` — `Public`

Проверка живости процесса.

```json
{ "status": "ok", "ts": "2026-09-19T12:00:00.000Z" }
```

---

## Auth (`/auth`)

Тела валидируются Zod-схемами из `packages/shared/src/schemas/auth.ts`
(`ZodValidationPipe`).

### `POST /auth/register` — `Public`

```json
// запрос
{ "email": "user@example.com", "password": "min 8 символов", "name": "опционально" }
```
```json
// 201 — AuthTokens
{ "accessToken": "...", "refreshToken": "..." }
```
`409`, если email занят (`P2002`).

### `POST /auth/login` — `Public`

```json
{ "email": "user@example.com", "password": "..." }
```
`200` → `AuthTokens`. `401`, если email/пароль не совпали.

### `POST /auth/refresh` — `Public`

```json
{ "refreshToken": "..." }
```
`200` → новая пара `AuthTokens`. Старый refresh отзывается (ротация — в БД
проставляется `revokedAt`), повторный вызов со старым токеном даёт `401`.
`401`, если токен недействителен, отозван или просрочен.

### `POST /auth/logout`

```json
{ "refreshToken": "..." }
```
`204 No Content`. Отзывает переданный refresh-токен. `401`, если токен не
принадлежит текущему пользователю или недействителен.

### `GET /auth/me`

`200` → `UserProfile`:
```json
{ "id": "uuid", "email": "user@example.com", "name": "Имя или null", "createdAt": "ISO" }
```
`404`, если пользователь не найден (токен пережил удаление аккаунта).
Дублирует `GET /users/me`.

---

## Users (`/users`)

### `GET /users/me`

То же, что `GET /auth/me`.

---

## Categories (`/categories`)

Тела валидируются DTO-классами (`apps/api/src/modules/categories/dto`,
class-validator, `whitelist` + `forbidNonWhitelisted`). Правила дублируют
`createCategorySchema`/`updateCategorySchema` из `@expense/shared`.

Тип `Category` в ответе:
```json
{ "id": "uuid", "name": "string", "color": "#RRGGBB", "icon": "string | null", "createdAt": "ISO" }
```

### `GET /categories`

`200` → `Category[]`, отсортированы по `name` (asc).

### `POST /categories`

```json
{ "name": "Продукты", "color": "#64748b", "icon": "cart" }
```
- `name` — 1–50 символов, обязательно.
- `color` — `#RRGGBB`, опционально (по умолчанию `#64748b` из схемы БД).
- `icon` — до 50 символов, опционально.

`201` → `Category`. `400` при нарушении правил. `409`, если у пользователя
уже есть категория с таким `name` (`@@unique([userId, name])`).

### `PATCH /categories/:id`

Тело — любое подмножество полей `POST` (все опциональны, но переданное поле
не может быть `null`, кроме `icon`). `200` → обновлённая `Category`. `400`
невалидный UUID `:id` или тело. `404`, если категория не найдена или
принадлежит другому пользователю.

### `DELETE /categories/:id`

`204 No Content`. `404`, если категория не найдена/чужая. **`409`**, если по
категории есть транзакции (`onDelete: Restrict` на `Transaction.category` —
колонка `categoryId` `NOT NULL`, обнулить нельзя, история не стирается).

---

## Transactions (`/transactions`)

Тела и query валидируются DTO-классами (`apps/api/src/modules/transactions/dto`).
Единая сущность дохода/расхода — направление задаёт `type`, `amount` всегда
положительный.

Тип `TransactionDto` в ответе:
```json
{
  "id": "uuid",
  "amount": "1234.56",
  "type": "INCOME | EXPENSE",
  "description": "string | null",
  "date": "ISO",
  "categoryId": "uuid",
  "createdAt": "ISO"
}
```

### `GET /transactions`

Query-параметры (все опциональны):

| Параметр | Формат | Описание |
|---|---|---|
| `dateFrom` | ISO 8601 | нижняя граница `date`, включительно |
| `dateTo` | ISO 8601 | верхняя граница `date`, включительно (если без времени — включает весь день) |
| `type` | `INCOME` \| `EXPENSE` | фильтр по типу |
| `categoryId` | UUID | фильтр по категории |

`200` → `TransactionDto[]`, сортировка `date desc, createdAt desc`.

### `GET /transactions/summary?month=&year=`

Оба параметра обязательны, целые числа: `month` 1–12, `year` 2000–2100.
Роут объявлен **до** `GET /:id` в контроллере — иначе `summary` попал бы в
параметр `:id` (Nest матчит роуты по порядку регистрации).

`200`:
```json
{
  "month": 9,
  "year": 2026,
  "from": "2026-09-01T00:00:00.000Z",
  "to": "2026-10-01T00:00:00.000Z",
  "income": "50000.00",
  "expense": "32000.00",
  "balance": "18000.00",
  "byCategory": [
    { "categoryId": "uuid", "name": "Продукты", "color": "#64748b", "type": "EXPENSE", "total": "12000.00" }
  ]
}
```
`byCategory` отсортирован по `total` (desc), период — `[from, to)` в UTC.

### `GET /transactions/:id`

`200` → `TransactionDto`. `404`, если не найдена/чужая.

### `POST /transactions`

```json
{
  "amount": "1234.56",
  "type": "EXPENSE",
  "categoryId": "uuid",
  "date": "2026-09-13T12:00:00.000Z",
  "description": "опционально, до 500 символов"
}
```
- `amount` — **строка** вида `1234.56` (до 10 цифр, максимум 2 знака после
  точки, не ноль). Число в JSON автоматически приводится к строке
  (`toMoneyString`) без округления — `12.345` не пройдёт паттерн, а не
  молча округлится.
- `date` — строгий ISO 8601 (`strict: true`, отсекает несуществующие даты
  вроде `2026-02-31`).
- `categoryId` — должен принадлежать текущему пользователю.

`201` → `TransactionDto`. `400` при нарушении формата. `404`, если категория
не найдена/чужая. `409` при гонке (категорию удалили между проверкой и
вставкой).

### `PATCH /transactions/:id`

Тело — любое подмножество полей `POST` (все опциональны, `description`
можно сбросить в `null`). `200` → обновлённая `TransactionDto`. `404`,
если транзакция или (при передаче) новая категория не найдены/чужие.

### `DELETE /transactions/:id`

`204 No Content`. `404`, если не найдена/чужая.
