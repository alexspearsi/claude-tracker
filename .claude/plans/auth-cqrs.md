# Авторизация в API: модули users + auth на CQRS

## Статус: выполнено

- [x] Шаг 1. Зависимость `@nestjs/cqrs`
- [x] Шаг 2. Контракты шины
- [x] Шаг 3. Модуль users
- [x] Шаг 4. Модуль auth
- [x] Шаг 5. Проверка (typecheck, lint, ручной e2e)

**Отклонение от плана:** в `tokens.service.ts` refresh-токен хешируется через SHA-256
(`node:crypto`), а не через `bcrypt.hash`, как было в исходном плане. Причина — обнаруженный
при ручном e2e-тестировании баг: bcrypt обрезает вход до 72 байт, а у всех refresh-токенов
одного пользователя первые 72 байта совпадают (общий префикс JWT: заголовок + `sub` + `email`
идут раньше `jti`/`iat`/`exp`), поэтому `bcrypt.compare` ложно считал чужой (в т.ч. уже
отозванный) токен пользователя совпадающим — ротация и logout отзывали не ту запись.
Refresh-токен — высокоэнтропийный секрет, не пароль, поэтому детерминированный SHA-256 с
точным поиском по хешу корректен и устраняет баг (bcrypt пароля в `register`/`login` не
тронут — там короткий человеческий пароль, для него bcrypt уместен).


## Контекст

В `apps/api` уже есть каркас: `modules/users` (пустой сервис, без контроллера), `modules/auth`
(контроллер с роутами `register/login/refresh/logout/me`, сервис из заглушек `Not implemented`,
`JwtStrategy`, глобальный `JwtAuthGuard` через `APP_GUARD`). Prisma-схема содержит готовые модели
`User` (email, passwordHash, name) и `RefreshToken` (tokenHash, expiresAt, revokedAt), миграция
`20260911084452_init` применена — **менять схему и создавать новую миграцию не нужно**.
Zod-контракты в `packages/shared/src/schemas/auth.ts` (`registerSchema`, `loginSchema`,
`refreshSchema`, `authTokensSchema`, `userProfileSchema`) тоже готовы.

Задача — наполнить эти модули реальной логикой: регистрация и вход по JWT (пара access + refresh
с ротацией), а взаимодействие между `auth` и `users` вести **только через CQRS-шины**, без прямых
импортов сервисов одного модуля в другой. Оба модуля переводятся на CQRS целиком: контроллеры
работают через `CommandBus`/`QueryBus`, а не через сервис.

Решения, согласованные с пользователем: токены — access + refresh (модель `RefreshToken`
используется по назначению); у `users` появляется собственный контроллер с `GET /users/me`.

## Шаг 1. Зависимость

```bash
npm i -w apps/api @nestjs/cqrs@12.0.0
```

Версия сверена с реестром: `latest` = `12.0.0`, peer — `@nestjs/common ^12`, `rxjs ^7.2` —
совпадает со стеком. `CqrsModule` импортируется **в каждом** модуле, где регистрируются хендлеры
(в `UsersModule` и `AuthModule`), глобально в `AppModule` не подключаем.

## Шаг 2. Контракты шины — `apps/api/src/contracts/users/`

Чтобы `auth` не импортировал ничего из `modules/users`, классы команд/запросов и типы их
результатов живут отдельно; оба модуля зависят только от контрактов.

- `create-user.command.ts` — `CreateUserCommand { email, passwordHash, name?: string | null }`,
  результат — `UserRecord { id, email, name, createdAt: Date }`.
- `get-user-by-email.query.ts` — `GetUserByEmailQuery { email }`,
  результат — `UserCredentials | null` (`UserRecord` + `passwordHash`); используется только auth
  для сверки пароля.
- `get-user-by-id.query.ts` — `GetUserByIdQuery { id }`, результат — `UserRecord | null`.
- `index.ts` — barrel. Импорты внутри api — с расширением `.js` (ESM).

Класс-контракт — простой `export class X { constructor(public readonly ...) {} }`, без декораторов.

## Шаг 3. Модуль users

Файлы в `apps/api/src/modules/users/`:

- `users.service.ts` — наполнить: `create`, `findByEmail`, `findById` поверх `@Inject(PRISMA)`
  (провайдер уже глобальный, см. `src/prisma/prisma.provider.ts`). Сервис **не экспортируется**
  из модуля — это внутренняя деталь домена.
- `commands/create-user.handler.ts` — `@CommandHandler(CreateUserCommand)`. Вставка пользователя;
  нарушение уникальности email (`P2002` от Prisma) → `ConflictException('Email уже занят')`.
  Пароль сюда приходит **уже хешированным** — users не знает про bcrypt.
- `queries/get-user-by-email.handler.ts`, `queries/get-user-by-id.handler.ts`.
- `users.controller.ts` — новый: `@Controller('users')`, `@Get('me')` с `@CurrentUser()`
  (`src/common/decorators/current-user.decorator.ts`), отдаёт профиль через
  `queryBus.execute(new GetUserByIdQuery(user.id))`. Роут закрыт глобальным гвардом, `@Public()`
  не ставим.
- `users.module.ts` — `imports: [CqrsModule]`, `controllers: [UsersController]`,
  `providers: [UsersService, ...handlers]`, `exports: []`.

Маппинг в `UserProfile`: `createdAt` в `userProfileSchema` — `z.iso.datetime()`, значит
`createdAt.toISOString()`; `passwordHash` наружу не выходит никогда.

## Шаг 4. Модуль auth

Файлы в `apps/api/src/modules/auth/`:

- `tokens.service.ts` (внутренний, вместо нынешнего `auth.service.ts`): выпуск пары токенов и
  работа с таблицей `refresh_tokens`.
  - access: `jwt.signAsync({ sub, email }, { secret: JWT_ACCESS_SECRET, expiresIn: JWT_ACCESS_TTL })`
    — секреты берутся из `ConfigService`, `JwtModule.register({})` намеренно пустой.
  - refresh: тот же payload + `jti` (`randomUUID()`), подпись `JWT_REFRESH_SECRET` / `JWT_REFRESH_TTL`.
    В БД пишем `bcrypt.hash(refreshToken)` в `tokenHash` вместе с `expiresAt` (из `exp` декодированного
    токена) — сам токен не хранится.
  - `revoke(userId, token)` — найти среди активных записей пользователя ту, чей `tokenHash`
    подходит по `bcrypt.compare`, проставить `revokedAt`.
- `commands/register.handler.ts` — `bcrypt.hash(password, 10)` → `commandBus.execute(new CreateUserCommand(...))`
  → пара токенов.
- `commands/login.handler.ts` — `queryBus.execute(new GetUserByEmailQuery(email))` →
  `bcrypt.compare` → пара токенов. Единое сообщение `UnauthorizedException('Неверный email или пароль')`
  и для отсутствующего пользователя, и для неверного пароля.
- `commands/refresh-tokens.handler.ts` — `jwt.verifyAsync` refresh-секретом → найти неотозванную
  непросроченную запись по `bcrypt.compare` → **ротация**: старую пометить `revokedAt`, выдать новую
  пару. Токен без совпадения в БД (или уже отозванный) → `UnauthorizedException`.
- `commands/logout.handler.ts` — отзыв переданного refresh-токена, ответ 204.
- `auth.controller.ts` — переписать на шины: `register/login/refresh/logout` → `commandBus`,
  `me` → `queryBus.execute(new GetUserByIdQuery(user.id))`. Валидация тел остаётся на
  `new ZodValidationPipe(registerSchema | loginSchema | refreshSchema)`; `@Public()` на
  `register/login/refresh`. Заодно `me` переводится с `POST` на `GET` — это зафиксированная в
  CLAUDE.md недоделка каркаса.
- `jwt.strategy.ts` — без изменений.
- `auth.module.ts` — `imports: [ConfigModule, PassportModule, JwtModule.register({}), CqrsModule]`;
  `UsersModule` из импортов **убирается** (в этом суть развязки). `APP_GUARD` с `JwtAuthGuard`
  остаётся здесь — только тут импортирован `PassportModule`. `auth.service.ts` удаляется,
  его логика разошлась по хендлерам и `TokensService`.

`AppModule` не меняется: оба модуля уже подключены.

## Шаг 5. Проверка

```bash
npm run typecheck            # shared → tsc --noEmit в api и web
npm run lint
npm run db:up                # postgres на 5433; миграция уже применена
npm run dev:api              # api на 4001, префикс /api
```

Сценарий end-to-end (порт 4001, префикс `/api`):

- [x] 1. `POST /api/auth/register` `{"email":"a@b.ru","password":"password1","name":"Тест"}` → 201 и пара токенов.
- [x] 2. Повтор того же запроса → 409 «Email уже занят».
- [x] 3. `POST /api/auth/login` с верным паролем → 200 и пара токенов; с неверным → 401.
- [x] 4. `GET /api/users/me` и `GET /api/auth/me` с `Authorization: Bearer <access>` → профиль без
   `passwordHash`; без заголовка → 401.
- [x] 5. `POST /api/auth/refresh` со свежим refresh → новая пара; **повтор с тем же токеном → 401**
   (ротация сработала).
- [x] 6. `POST /api/auth/logout` (access в заголовке + refresh в теле) → 204; последующий `refresh`
   этим токеном → 401.
- [x] 7. В БД (проверено через `psql`, аналог `prisma studio`) — в `refresh_tokens` только хеши,
   у отозванных заполнен `revokedAt`.

Автотестов в проекте нет (раннер не настроен) — проверка ручная, curl/Postman.
