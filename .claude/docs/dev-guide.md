# Как добавить...

Практические рецепты для типовых задач в этом репозитории. Общие принципы
архитектуры — в `architecture.md`, список эндпоинтов — в `api.md`, схема БД —
в `database.md`.

Перед началом: `npm run dev` поднимает `shared` → `api` (4001) → `web`
(3001). После правки Zod-схем в `packages/shared` нужен его пересбор
(`npm run build -w packages/shared` либо просто перезапуск `npm run dev`),
иначе изменения не доедут до потребителей — dev-режим `shared` не следит за
файлами сам.

---

## Новый модуль в api (по образцу `categories`)

Модуль без кросс-модульных обращений (CRUD, фильтруется по `userId`) не
нуждается в CQRS — используй прямой `@Inject(PRISMA)` в сервисе, как в
`categories`/`transactions`.

1. **Модель в Prisma**, если нужна новая таблица — см. раздел
   «Новая миграция» ниже.

2. **DTO** в `apps/api/src/modules/<модуль>/dto/`:
   - `<модуль>-validation.ts` — общие константы (лимиты, regex) и сообщения
     об ошибках на русском, плюс общие `@Transform`-функции (`trim`,
     `isPresent` — см. `categories/dto/category-validation.ts` как образец).
   - `create-<модуль>.dto.ts`, `update-<модуль>.dto.ts` — классы на
     `class-validator`. Update-DTO использует `@ValidateIf(isPresent)` вместо
     `@IsOptional()` там, где колонка `NOT NULL` — `@IsOptional()` пропускает
     и `null`, что уронит запрос в БД 500-й вместо явных 400.
   - Если у сущности есть контракт ответа, разделяемый с фронтом, — добавь
     Zod-схему в `packages/shared/src/schemas/<модуль>.ts` и экспортируй её
     из `packages/shared/src/index.ts` (как `category.ts`). Если контракт
     ответа нужен только внутри api — локальный `.types.ts` в модуле (как
     `transactions/transaction.types.ts`) достаточно.

3. **Сервис** `<модуль>.service.ts`:
   ```ts
   @Injectable()
   export class XService {
     constructor(@Inject(PRISMA) private readonly prisma: Prisma) {}
     // каждый метод: where: { id, userId } — изоляция данных по пользователю
   }
   ```
   Оборачивай Prisma-ошибки через `isPrismaError`/`PrismaErrorCode`
   (`apps/api/src/prisma/prisma-errors.ts`) в `toHttpError` внутри файла
   сервиса — см. `categories.service.ts` для образца.

4. **Контроллер** `<модуль>.controller.ts`:
   - DTO-параметры импортируй **значением**, не `import type` — иначе
     `ValidationPipe` молча пропустит проверку (метатип станет `Object`).
   - Не добавляй `@UseGuards(JwtAuthGuard)` — авторизация уже глобальная
     через `AuthModule`; локальный guard уронит старт с
     `UnknownDependenciesException`, потому что `PassportModule`
     импортирован только там.
   - Если нужен публичный роут — `@Public()` из
     `common/decorators/public.decorator.ts`.
   - Роуты со статичным сегментом (`GET /summary`) регистрируй **до**
     роутов с параметром (`GET /:id`) — Nest матчит по порядку объявления.

5. **Модуль** `<модуль>.module.ts` — контроллер + сервис в `providers`, без
   `imports: [CqrsModule]`, если CQRS не используется.

6. Подключи модуль в `apps/api/src/app.module.ts` (`imports`).

7. Обнови `.claude/docs/api.md` (новые эндпоинты) и, если менялась схема,
   `.claude/docs/database.md`.

### Когда нужен CQRS

Только если модулю нужны данные **другого** модуля без прямой зависимости на
его сервис (пример: `categories` спрашивает `users` о существовании
пользователя). Тогда:

- Контракт команды/запроса — в `src/contracts/<модуль-источник>/`, не внутри
  модуля-потребителя.
- Хендлер — в `modules/<модуль-источник>/commands|queries/`.
- Потребитель вызывает `commandBus.execute(new XCommand(...))` /
  `queryBus.execute(new XQuery(...))`, оба модуля импортируют `CqrsModule`.

См. `auth` → `users` (`RegisterHandler` → `CreateUserCommand`) и
`categories` → `users` (`CategoriesService.create` → `GetUserByIdQuery`) как
образцы.

---

## Новая миграция Prisma

1. Правишь `apps/api/prisma/schema.prisma`.
2. Из корня: `npm run prisma:migrate` (обёртка над `prisma migrate dev`
   внутри `apps/api`) — попросит имя миграции, создаст папку в
   `apps/api/prisma/migrations/` и применит её к БД из `DATABASE_URL`.
3. `prisma:migrate` сам вызывает генерацию клиента, но если менял только
   генератор/конфиг без миграции — `npm run prisma:generate`.
4. Клиент пишется в `apps/api/src/generated/prisma` (не в git, генератор
   ESM: `moduleFormat = "esm"`, `importFileExtension = "js"`) — импорты на
   него в коде api пишутся с `.js`.
5. Если добавлял `onDelete: Restrict`/новый FK — проверь, что сервис,
   удаляющий родительскую сущность, переводит `P2003` в `409` через
   `isPrismaError` (см. `categories.service.ts`).
6. Обнови `.claude/docs/database.md` — таблица, колонки, индексы, что
   означает каждое поле.

БД поднимается `npm run db:up` (`postgres:16-alpine` в docker, порт 5433 —
не 5432, он занят локальной установкой). `npm run prisma:studio` — GUI для
просмотра данных.

---

## Новая фича на фронте (по образцу `features/auth`)

1. **Найди правильный слой.** Форма/действие пользователя → `features/`.
   Целый экран, который её использует → `views/`. Кросс-импорт внутри одного
   слоя запрещён — общий код поднимается в `shared/`.

2. **Схема формы** — переиспользуй Zod-схему из `@expense/shared`, если
   контракт там уже есть (auth, categories). Если нужна схема только для UI
   (например, доп. поле подтверждения пароля на регистрации) — локальная
   схема в `features/<фича>/model/`, см.
   `features/auth/model/register-form-schema.ts`.

3. **Server Action** — `features/<фича>/api/<действие>.action.ts`:
   ```ts
   'use server';
   export async function xAction(input: XInput): Promise<XActionState> {
     const parsed = xSchema.safeParse(input); // Server Action открыт прямым POST,
     if (!parsed.success) return { error: '...' }; // клиентская валидация — не защита
     try {
       const result = await apiFetch<T>('/path', { method: 'POST', body: JSON.stringify(parsed.data) });
       // при необходимости — await setSession(result), если экшен меняет сессию
     } catch (error) {
       return { error: apiErrorMessage(error) };
     }
     redirect(ROUTES.x); // ВНЕ try/catch — redirect бросает NEXT_REDIRECT, catch его проглотит
   }
   ```
   Если экшен требует авторизованный запрос — достань access-токен через
   `getSession()` и передай `accessToken` в `apiFetch`.

4. **Форма** — react-hook-form + `zodResolver`, компоненты из
   `shared/ui` (shadcn). Ошибки апи — в toast через `apiErrorMessage`
   (`shared/api/error-message.ts`), не ре-имплементируй разбор тела ошибки.

5. **Роут** — добавь путь в `shared/config/routes.ts` (`ROUTES`), при
   необходимости — в `PROTECTED_ROUTES`/`GUEST_ROUTES`, `app/.../page.tsx`
   остаётся тонким (3–5 строк, рендерит `views/`).

### shadcn/ui компоненты

`components.json` перенастроен: компоненты ставятся в `src/shared/ui`, `cn`
берётся из `@/shared/lib/utils`. CLI shadcn при добавлении компонента пишет
импорт `from "cn"` (несуществующий npm-пакет) и тянет лишние зависимости
(`cn`, `next-themes`) — после `npx shadcn add <компонент>` вручную:
1. исправь импорт `cn` на `@/shared/lib/utils`;
2. удали из `package.json` пакеты `cn` и `next-themes`, если добавились.

---

## Связать фронт с реальными данными (страницы-заглушки)

Страницы `expenses`/`categories` сейчас — статичная разметка без запросов.
Чтобы подключить их к api:

1. Данные читаются в Server Component (`views/<экран>/ui/*.tsx` или прямо в
   `app/.../page.tsx`, если экран простой) через `apiFetch` с access-токеном
   из `getSession()` — как в auth-экшенах, но `GET` без формы.
2. Мутации (создание/правка/удаление) — Server Actions в `features/`, по
   образцу `features/auth/api/*.action.ts`, только без `setSession`/`redirect`
   в конце: вместо этого `revalidatePath`, чтобы Server Component
   перечитал список.
3. Список категорий для формы транзакции — переиспользуй тип `Category` из
   `@expense/shared`, не создавай параллельный.

---

## Общие команды

```bash
npm run dev              # shared → api (4001) + web (3001)
npm run build             # shared → api → web, порядок важен
npm run typecheck          # shared, затем tsc --noEmit во всех пакетах
npm run lint                # eslint в api и web
```

Тестового раннера в проекте нет — проверяй `typecheck` + `lint` + ручной
прогон (`npm run dev` и curl/браузер).

### Частые ловушки (см. `CLAUDE.md` для деталей)

- Забыл пересобрать `packages/shared` после правки Zod-схемы — фронт/api
  видят старый `dist`.
- DTO-параметр в контроллере импортирован через `import type` — валидация
  молча отключается.
- `@UseGuards(JwtAuthGuard)` локально в модуле — падение на старте.
- `@IsOptional()` вместо `@ValidateIf(isPresent)` в update-DTO на
  `NOT NULL`-колонке — 500 от БД вместо 400.
- Новый роут со статичным сегментом объявлен после `:id`-роута в том же
  контроллере — Nest матчит по порядку.
- ESLint 10 вместо 9.x — плагины `eslint-config-next` падают на
  `contextOrFilename.getFilename is not a function`.
