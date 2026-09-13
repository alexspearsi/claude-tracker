# Категории трат: CRUD в API (class-validator + CQRS-проверка пользователя)

## Статус: выполнено

**Отклонения и дополнения к плану:**
- Константы правил и русские сообщения валидации вынесены в
  `apps/api/src/modules/categories/dto/category-validation.ts` (общие для create/update DTO,
  там же `trim` для `@Transform`), чтобы не дублировать их в двух DTO.
- В CLAUDE.md заодно убрана устаревшая строка «`/auth/me` объявлен как POST» (исправлено ещё в
  auth-cqrs) и добавлено упоминание `isPrismaError`.
- Помимо сценариев 1–8 проверено: имя из пробелов и 51 символ → 400; `PATCH` в занятое имя → 409;
  `PATCH` пустым телом → 200 без изменений; второй пользователь может завести категорию с тем же
  именем; **CQRS-ветка** — пользователь удалён из БД при живом токене → `POST /api/categories`
  отдаёт 404 «Пользователь не найден».
- api не перезапускался вручную: работал уже запущенный `nest start --watch`, он пересобрал
  изменения сам.

## Чеклист реализации

**1. Зависимости**
- [x] `npm i -w apps/api class-validator@0.15.1 class-transformer@0.5.1 --save-exact`
- [x] В `apps/api/package.json` обе версии записаны точно, без `^`

**2. Глобальный ValidationPipe**
- [x] `apps/api/src/main.ts`: `app.useGlobalPipes(new ValidationPipe({ whitelist, forbidNonWhitelisted, transform, errorFormat: 'grouped' }))`

**3. Хелпер ошибок Prisma**
- [x] Создать `apps/api/src/prisma/prisma-errors.ts`: `isPrismaError(error, code)` + константы `P2002`/`P2025`
- [x] Перевести `UsersService.create` на хелпер, удалить приватный `isUniqueViolation`

**4. DTO (`apps/api/src/modules/categories/dto/`)**
- [x] `create-category.dto.ts`: `name` (trim, IsString, IsNotEmpty, MaxLength 50), `color?` (Matches #RRGGBB), `icon?` (IsString, MaxLength 50)
- [x] `update-category.dto.ts`: `name`/`color` через `@ValidateIf(v !== undefined)` (null → 400), `icon` через `@IsOptional` (null сбрасывает)
- [x] Русские сообщения валидации

**5. Сервис (`categories.service.ts`)**
- [x] Инжект `QueryBus` рядом с `PRISMA`
- [x] Приватный `toCategory(record)` → `Category` из `@expense/shared`
- [x] `findAll(userId)`: сортировка по `name`
- [x] `create`: `GetUserByIdQuery` → 404, если пользователя нет; `P2002` → 409
- [x] `update`: `where: { id, userId }`; `P2025` → 404, `P2002` → 409
- [x] `remove`: `where: { id, userId }`; `P2025` → 404

**6. Контроллер (`categories.controller.ts`)**
- [x] Заменить `ZodValidationPipe` на `CreateCategoryDto`/`UpdateCategoryDto`, импорт значением, не `import type`
- [x] `@Param('id', ParseUUIDPipe)` в PATCH и DELETE
- [x] `@HttpCode(HttpStatus.NO_CONTENT)` на DELETE; `list` → `findAll`
- [x] Никаких `@UseGuards`/`@Public()`: защиту даёт глобальный гвард

**7. Модуль (`categories.module.ts`)**
- [x] `imports: [CqrsModule]`, `UsersModule` не импортировать

**8. CLAUDE.md**
- [x] Раздел про контракты: Zod для auth/users и фронта, class-validator DTO для категорий, осторожно с `import type`
- [x] Убрать «Глобальный ValidationPipe не подключается»
- [x] «Состояние»: категории реализованы

**9. Проверка**
- [x] `npm run typecheck` без ошибок
- [x] `npm run lint` без ошибок
- [x] `npm run db:up` + `npm run dev:api`, приложение стартует
- [x] Ручной e2e: сценарии 1–8 из раздела «Проверка»
- [x] Поставить в этом файле «Статус: выполнено», записать отклонения от плана, если были

## Контекст

Авторизация (users + auth на CQRS) готова. Следующий шаг — категории трат. Каркас уже есть:
модель `Category` в `apps/api/prisma/schema.prisma` (id, userId FK → User с `onDelete: Cascade`,
name `VarChar(50)`, color `VarChar(7)` с default `#64748b`, icon nullable, `@@unique([userId, name])`),
миграция `20260911084452_init` её уже создала — **схему и миграции не трогаем**. Контроллер
`categories.controller.ts` с роутами GET/POST/PATCH/DELETE и сервис-заглушка (`Not implemented`)
тоже на месте.

Согласовано с пользователем:
- **Валидация через class-validator** — DTO-классы и глобальный `ValidationPipe` в api (осознанный
  отход от правила «только Zod» в CLAUDE.md; CLAUDE.md обновляем).
- **CQRS к User-модулю** — только проверка пользователя: перед созданием категории сервис шлёт
  `GetUserByIdQuery` через `QueryBus`. Сам CRUD — обычный сервис поверх Prisma.

## Шаг 1. Зависимости

```bash
npm i -w apps/api class-validator@0.15.1 class-transformer@0.5.1 --save-exact
```

Версии сверены с `npm view` (latest). Nest 12 `ValidationPipe` грузит оба пакета через
динамический `import()` (`node_modules/@nestjs/common/pipes/validation.pipe.js`) — с ESM совместимо.

## Шаг 2. Глобальный ValidationPipe — `apps/api/src/main.ts`

```ts
app.useGlobalPipes(
  new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, errorFormat: 'grouped' }),
);
```

Почему это не ломает auth/users на Zod: `ValidationPipe.toValidate` пропускает параметры с
метатипом `Object`/`String`, а в `auth.controller.ts` типы тел импортированы через `import type`
→ в рантайме `Object` → пайп отдаёт значение как есть, дальше работает `ZodValidationPipe`.
`errorFormat: 'grouped'` даёт `{ поле: [сообщения] }` — фронту удобнее плоского списка.

## Шаг 3. DTO — `apps/api/src/modules/categories/dto/`

- `create-category.dto.ts` — `CreateCategoryDto`:
  - `name`: `@Transform(trim)`, `@IsString()`, `@IsNotEmpty()`, `@MaxLength(50)`;
  - `color?`: `@IsOptional()`, `@Matches(/^#[0-9a-fA-F]{6}$/, { message: 'Цвет в формате #RRGGBB' })`
    — если не передан, срабатывает default из БД;
  - `icon?`: `@IsOptional()`, `@IsString()`, `@MaxLength(50)`.
- `update-category.dto.ts` — `UpdateCategoryDto`, все поля опциональны (без `@nestjs/mapped-types`,
  явно). Для `name`/`color` вместо `@IsOptional()` — `@ValidateIf((_, v) => v !== undefined)`:
  `@IsOptional` пропускает `null`, а эти колонки NOT NULL → был бы 500. `icon` может прийти `null`
  (сброс иконки) — ему `@IsOptional()` подходит.
- Сообщения валидации — по-русски. Ограничения повторяют `packages/shared/src/schemas/category.ts`
  (он остаётся для форм фронта — синхронность правил держим вручную).

**Важно:** в контроллере DTO импортируются как значения (`import { CreateCategoryDto }`), не
`import type` — иначе `emitDecoratorMetadata` даст `Object` и валидация молча не выполнится.

## Шаг 4. Сервис — `categories.service.ts`

Инжект: `@Inject(PRISMA) prisma` + `QueryBus`. Все запросы фильтруются по `userId`.

- `findAll(userId)` — `findMany({ where: { userId }, orderBy: { name: 'asc' } })`.
- `create(userId, dto)` — `queryBus.execute<GetUserByIdQuery, UserRecord | null>(new GetUserByIdQuery(userId))`
  (контракт из `src/contracts/users/`), `null` → `NotFoundException('Пользователь не найден')`;
  затем `category.create`. `P2002` → `ConflictException('Категория с таким названием уже есть')`.
- `update(userId, id, dto)` — `category.update({ where: { id, userId }, data })` (Prisma 7 допускает
  не-уникальные поля в `where` у `update`): одна операция и изоляция по пользователю.
  `P2025` → `NotFoundException('Категория не найдена')` (чужая категория неотличима от
  несуществующей), `P2002` → 409.
- `remove(userId, id)` — `category.delete({ where: { id, userId } })`, `P2025` → 404. Траты
  категории не удаляются (`onDelete: SetNull` в схеме).
- Приватный `toCategory(record)` → тип `Category` из `@expense/shared` (`createdAt.toISOString()`,
  без `userId`/`updatedAt`).

Проверку кодов Prisma вынести из `UsersService.isUniqueViolation` в общий хелпер
`apps/api/src/prisma/prisma-errors.ts` (`isPrismaError(error, 'P2002' | 'P2025')`) и
переиспользовать в обоих сервисах.

## Шаг 5. Контроллер — `categories.controller.ts`

- `GET /categories` → `findAll`; `POST` → `create(user.id, dto: CreateCategoryDto)`;
  `PATCH :id` → `update`; `DELETE :id` → `remove` с `@HttpCode(HttpStatus.NO_CONTENT)`.
- `@Param('id', ParseUUIDPipe)` — иначе не-UUID уходит в Prisma и падает 500.
- `ZodValidationPipe` и Zod-схемы отсюда убираются.
- Защита — глобальный `JwtAuthGuard` (APP_GUARD в `AuthModule`); `@Public()` не ставим,
  `@UseGuards(JwtAuthGuard)` **не добавляем** — по CLAUDE.md это роняет старт с
  `UnknownDependenciesException`. `userId` берётся из `@CurrentUser()`.

## Шаг 6. Модуль — `categories.module.ts`

`imports: [CqrsModule]` (для `QueryBus`). `UsersModule` не импортируется — связь только через
контракт `GetUserByIdQuery`. `exports: [CategoriesService]` оставить (пригодится тратам).

## Шаг 7. CLAUDE.md

- Раздел про контракты: Zod — для auth/users и форм фронта; категории валидируются DTO на
  class-validator через глобальный `ValidationPipe`; про `import type` и метатип `Object`.
- Убрать пункт «Глобальный ValidationPipe не подключается».
- «Состояние»: категории реализованы.

## Проверка

```bash
npm run typecheck
npm run lint
npm run db:up
npm run dev:api        # http://localhost:4001/api
```

Ручной e2e (curl, `Authorization: Bearer <access>` от `POST /api/auth/login`):

1. `POST /api/categories` `{"name":"Еда"}` → 201, `color` = `#64748b`, `icon` = null.
2. `{"name":"Еда"}` повторно → 409; `{"name":"X","color":"red"}` → 400 с группировкой по полю;
   `{"name":"X","foo":1}` → 400 (forbidNonWhitelisted); `{"name":""}` → 400.
3. `GET /api/categories` → только свои категории, по алфавиту.
4. `PATCH /api/categories/:id` `{"icon":null}` → иконка сброшена; `{"name":null}` → 400.
5. Второй пользователь: `PATCH`/`DELETE` чужого id → 404; его `GET` не видит чужих.
6. `DELETE /api/categories/:id` → 204, повтор → 404; `/api/categories/abc` → 400 (ParseUUIDPipe).
7. Без токена → 401.
8. Регрессия: `POST /api/auth/register` с невалидным телом → 400 в прежнем Zod-формате (`issues`),
   логин/refresh работают.

Автотестов нет (раннер не настроен) — проверка ручная.
