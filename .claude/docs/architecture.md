# Архитектура

Монорепозиторий на npm workspaces: `apps/api` (Nest.js), `apps/web` (Next.js),
`packages/shared` (Zod-схемы). Порядок сборки важен: `shared` → `api` → `web` —
api и web импортируют `@expense/shared` как обычный пакет workspaces и видят
`dist`, а не исходники.

```
packages/shared  →  apps/api
                 ↘  apps/web
```

## packages/shared

Источник правды для контрактов auth/users и форм фронта. Экспортирует
Zod-схемы и типы, выведенные через `z.infer`:

- `schemas/auth.ts` — `registerSchema`, `loginSchema`, `refreshSchema`,
  `authTokensSchema`, `userProfileSchema`
- `schemas/category.ts` — `createCategorySchema`, `updateCategorySchema`,
  `categorySchema`

Nest валидирует ими тела запросов через `ZodValidationPipe`
(`apps/api/src/common/pipes/zod-validation.pipe.ts`), фронт использует те же
схемы через `zodResolver`. Сообщения об ошибках пишутся один раз здесь и
видны в обоих местах.

**Исключение — категории и транзакции.** Их тела проверяются DTO-классами на
class-validator через глобальный `ValidationPipe`, а не Zod-схемами из
`shared`. У категорий правила всё равно задокументированы и в
`packages/shared/src/schemas/category.ts` (используется под тип ответа
`Category` на фронте), и в DTO api — при правке меняются оба места. У
транзакций дубликата в `shared` нет вовсе: контракт ответа живёт локально в
`apps/api/src/modules/transactions/transaction.types.ts`.

## apps/api — слои Nest

Модульная структура Nest, команды/запросы через `@nestjs/cqrs` там, где
нужно кросс-модульное обращение без прямой зависимости на чужой сервис.

```
src/
  main.ts                 # bootstrap: prefix /api, CORS, глобальные guard/filter/pipe
  app.module.ts            # сборка модулей
  common/
    decorators/             # @Public(), @CurrentUser()
    guards/                  # JwtAuthGuard
    filters/                 # HttpExceptionFilter — единый формат ошибки
    pipes/                    # ZodValidationPipe
  config/
    env.validation.ts         # Zod-схема process.env, падает на старте
  contracts/
    users/                     # команды/запросы CQRS для модуля users
  generated/
    prisma/                     # сгенерированный Prisma-клиент (в git не хранится)
  prisma/
    prisma.provider.ts           # провайдер PrismaClient по токену PRISMA
    prisma.module.ts               # @Global, отдаёт PRISMA, закрывает соединение на shutdown
    prisma-errors.ts                # isPrismaError — коды P2002/P2025/P2003
  modules/
    auth/       # register/login/refresh/logout/me — CQRS-команды, TokensService, JwtStrategy
    users/       # create/findByEmail/findById — CQRS-команды/запросы, потребляются auth и categories
    categories/   # CRUD, DTO на class-validator
    transactions/  # CRUD + фильтры + summary, DTO на class-validator
```

### Авторизация

`JwtAuthGuard` подключён глобально через `APP_GUARD` в `AuthModule` — только
там импортирован `PassportModule`. По умолчанию закрыт весь api; открытые
роуты помечаются декоратором `@Public()` (`/auth/register`, `/auth/login`,
`/auth/refresh`, `/health`). Локальный `@UseGuards(JwtAuthGuard)` в
feature-модуле уронит приложение на старте с `UnknownDependenciesException`
(нет доступа к `PassportModule`).

`JwtStrategy` (`modules/auth/jwt.strategy.ts`) достаёт access-токен из
заголовка `Authorization: Bearer`, проверяет подпись `JWT_ACCESS_SECRET` и
кладёт `{ id, email }` в `request.user` — их читает декоратор
`@CurrentUser()`.

Refresh-токены хранятся в БД **хешем** (SHA-256, не bcrypt — см. комментарий
в `tokens.service.ts` про 72-байтовый лимит bcrypt и общий префикс токенов
одного пользователя), что даёт логаут и отзыв сессий. При каждом обмене
refresh на новую пару старый токен отзывается (`revokedAt`) — ротация.
Параллельный обмен одним и тем же refresh-токеном невозможен: второй запрос
не найдёт неотозванную запись и получит 401.

### CQRS

`@nestjs/cqrs` используется точечно — там, где модулю нужны данные другого
модуля без прямой зависимости на его сервис:

- `auth` → `users`: `RegisterHandler` выполняет `CreateUserCommand`,
  `LoginHandler`/`AuthController.me` — `GetUserByEmailQuery`/`GetUserByIdQuery`.
- `categories` → `users`: `CategoriesService.create` проверяет существование
  пользователя через `GetUserByIdQuery` (токен мог пережить удаление
  пользователя).

Контракты команд/запросов лежат в `src/contracts/<модуль>/`, а не внутри
модуля-источника — их импортируют оба модуля без циклической зависимости.
`transactions` и `categories` (внутри своего CRUD) CQRS не используют —
прямой вызов `Inject(PRISMA)` в сервисе достаточен, кросс-модульных обращений
там нет.

### Доступ к БД

В Prisma 7 `PrismaClient` — не класс, а конструктор с интерфейсом, поэтому
`extends PrismaClient` компилируется, но не даёт ни методов, ни моделей.
Клиент отдаётся провайдером по токену `PRISMA`
(`src/prisma/prisma.provider.ts`), подключение — через driver adapter
`@prisma/adapter-pg`. Сервисы получают клиент через `@Inject(PRISMA)`.
`PrismaModule` глобальный (`@Global()`), поэтому `PRISMA` доступен везде без
повторного импорта модуля.

Ошибки Prisma переводятся в HTTP-исключения через `isPrismaError` /
`PrismaErrorCode` (`src/prisma/prisma-errors.ts`) — каждый сервис делает это
сам в `catch`, единого interceptor/filter для этого нет:

| Код | Значение | HTTP |
|---|---|---|
| `P2002` | нарушение unique-констрейнта | 409 |
| `P2025` | update/delete не нашли запись по `where` | 404 |
| `P2003` | нарушение внешнего ключа | 409 |

`P2003` у `DELETE /categories/:id` — по категории есть транзакции
(`Transaction.category` — `onDelete: Restrict`).

### Обработка ошибок

`HttpExceptionFilter` (`@Catch()` без аргументов — ловит всё) приводит любую
ошибку к единому JSON: `{ statusCode, path, timestamp, error }`, где `error`
— тело самого `HttpException` (для не-`HttpException` — `500` с общим
сообщением). Ошибки ≥500 логируются через `Logger.error`.

Известная недоделка каркаса: неизвестный роут (404 вне `/api/...`) отдаёт
HTML от Express мимо этого фильтра — фильтр ловит только исключения внутри
обработки запроса Nest.

### Валидация входа

Два параллельных механизма, оба подключены глобально в `main.ts`:

- **`ZodValidationPipe`** — вручную на каждый `@Body()` auth-роутов, схема из
  `@expense/shared`.
- **`ValidationPipe`** (Nest, class-validator) — глобальный, с
  `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`,
  `errorFormat: 'grouped'`. Работает на DTO-классах в `categories`/`transactions`.

DTO в контроллерах импортируются **значением**, не `import type`: при
`import type` метатип параметра в рантайме — `Object`, и `ValidationPipe`
молча пропускает проверку. На этом же основано исключение auth-роутов из
глобального пайпа: их типы тел (`LoginInput` и т.п.) импортированы через
`import type`, поэтому глобальный `ValidationPipe` их не трогает — они
валидируются только явным `ZodValidationPipe`.

### Изоляция данных

Каждый запрос к транзакциям и категориям фильтруется по `userId` из JWT —
через `where: { id, userId }` в Prisma-запросе. Чужая запись по прямому id
неотличима от несуществующей: и `update`/`delete` чужой записи, и запрос
несуществующей дают одинаковый `P2025` → 404.

### Деньги

`Decimal(12, 2)` в БД (`Transaction.amount`), **строка** в JSON на всех
границах (DTO входа/выхода, `@expense/shared` типы). Никаких `float` для
сумм — точность теряется на double. Сумма приходит строкой вида `"1234.56"`
(паттерн в `transaction-validation.ts`), в БД уходит как есть, из БД читается
через `Decimal.toFixed(2)`. На фронте форматирование — `formatMoney`
(`apps/web/src/shared/lib/utils.ts`).

## apps/web — Feature Slice Design

`apps/web/src` разложен по слоям FSD, импорт разрешён **только вниз**:
`app → views → widgets → features → entities → shared`. Кросс-импорты внутри
одного слоя запрещены, общий код поднимается в слой ниже.

| Слой | Что лежит | Пример |
|---|---|---|
| `app/` | только роутинг Next: layout'ы, `page.tsx` в 3–5 строк, `metadata` | `app/(auth)/login/page.tsx` |
| `views/` | экраны целиком | `views/login/ui/login-view.tsx` |
| `widgets/` | самостоятельные блоки страницы (пока пусто) | — |
| `features/` | действия пользователя: формы, Server Actions | `features/auth/api/login.action.ts` |
| `entities/` | предметные сущности | `entities/session` — токены в куках |
| `shared/` | переиспользуемое: `ui`, `lib`, `api`, `config` | `shared/ui/button.tsx` |

Слой «pages» из канонического FSD назван **`views`**: имя `pages`
зарезервировано Next. `components.json` перенастроен под это — shadcn кладёт
компоненты в `src/shared/ui`, `cn` берётся из `@/shared/lib/utils`.

### Сессия

Токены живут в httpOnly-куках `access_token` / `refresh_token`
(`entities/session/model/cookies.ts`) — клиентскому JS недоступны. Их
выставляет `setSession` (`entities/session/api/session.ts`, файл под
`import 'server-only'`) при входе и регистрации. Срок жизни куки берётся из
поля `exp` самого JWT (`tokenExpiresAt` в
`entities/session/lib/token-expiry.ts`), а не из константы.

Формы — react-hook-form с `zodResolver` поверх схем из `@expense/shared`,
сабмит зовёт Server Action (`features/auth/api/*.action.ts`), тот дергает api
через `apiFetch` и кладёт токены в куки. `redirect` в экшене пишется **вне**
`try/catch` — он бросает `NEXT_REDIRECT`, catch бы его проглотил. Ошибки api
превращает в текст тоста `apiErrorMessage` (`shared/api/error-message.ts`),
которая разбирает единый формат ошибки `HttpExceptionFilter`.

Сама передача токена в api — явная: Server Action читает access-токен из
куки и передаёт его в `apiFetch` как `accessToken` (заголовок
`Authorization: Bearer`); JWT-стратегия на api куки не читает.

### Защита роутов и обновление токена

`apps/web/src/proxy.ts` — в Next 16 конвенция `middleware.ts` переименована в
`proxy.ts`, функция экспортируется как `proxy`. Пока access-кука жива,
проверка оптимистичная (только её наличие, без запроса к api) — настоящую
проверку токена делает `JwtAuthGuard` на api, а
`app/(dashboard)/layout.tsx` дополнительно дёргает `getSession()`.

Access живёт 15 минут, refresh — 30 дней, поэтому исчезнувшая access-кука не
означает выход: `proxy` меняет refresh на новую пару через
`POST /auth/refresh` и кладёт её в куки ответа
(`entities/session/api/proxy-session.ts`). Другого места для этого нет — при
рендере страницы куки уже не записать, `cookies().set` работает только в
Server Action, Route Handler и proxy.

Обмен refresh-токена нельзя делать параллельно — api отзывает старый токен
при каждом обмене (ротация), второй одновременный запрос получит 401 и
выбросит пользователя. Поэтому префетчи Next отсечены в `config.matcher`
через `missing: [next-router-prefetch, purpose=prefetch]`: внутри функции
`proxy` отличить префетч от настоящей навигации нельзя, Next вырезает эти
заголовки из `request.headers`.

## Известные ограничения

- Неизвестный роут отдаёт HTML от Express мимо `HttpExceptionFilter` (см.
  «Обработка ошибок» выше).
- Тестового раннера в проекте нет.
- Страницы трат и категорий на фронте — заглушки без данных, транзакции с UI
  пока не связаны.

См. также `dev-guide.md` (как добавить модуль/фичу/миграцию), `api.md`
(список эндпоинтов), `database.md` (схема БД).
