# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Отвечай пользователю по-русски. Комментарии в коде — тоже на русском.

## Команды

```bash
npm run dev              # shared собирается, затем api + web
npm run dev:api          # nest start --watch
npm run dev:web          # next dev --turbopack
npm run build            # shared → api → web (порядок важен)
npm run typecheck        # собирает shared, затем tsc --noEmit во всех пакетах
npm run lint             # eslint в api и web

npm run db:up            # postgres:16 в docker
npm run db:down
npm run prisma:migrate   # prisma migrate dev
npm run prisma:generate
npm run prisma:studio
```

`packages/shared` собирается перед всем остальным: api и web импортируют `@expense/shared`
как обычный пакет через workspaces и видят `dist`, а не исходники. После правки схем в
shared нужен его пересбор, иначе изменения не доедут до потребителей.

Тестов в проекте нет — раннер не настроен.

**ESLint закреплён на 9.x, не 10.** Плагины из `eslint-config-next` (прежде всего
`eslint-plugin-react`) с ESLint 10 падают на `contextOrFilename.getFilename is not a function`.
Конфиги — нативные flat: web импортирует `eslint-config-next/core-web-vitals` и
`/typescript` напрямую (обёртка `FlatCompat` не нужна и ломается), api собран на
`typescript-eslint`. Типизированный разбор в api включён только для `src/**/*.ts`:
`prisma.config.ts`, `prisma/seed.ts` и сам конфиг линтера в `tsconfig` не входят.

## Порты (нестандартные — не «чини» их обратно)

| Сервис | Порт | Почему не дефолт |
|---|---|---|
| web | 3001 | 3000 занят другим процессом на машине |
| api | 4001 (`/api`) | 4000 занят контейнером чужого проекта |
| postgres | 5433 | 5432 держит локально установленный PostgreSQL |

## Архитектура

Монорепо на npm workspaces: `apps/web` (Next.js 16 App Router), `apps/api` (Nest 12),
`packages/shared` (Zod-схемы).

**Контракты API живут в `packages/shared`.** Zod-схемы там — источник правды для auth/users
и форм фронта: Nest валидирует ими тела запросов через `ZodValidationPipe`, фронт использует
те же схемы через `zodResolver`, типы выводятся через `z.infer`.

**Исключение — категории и транзакции.** Их тела проверяются DTO-классами на class-validator
(`apps/api/src/modules/categories/dto`, `apps/api/src/modules/transactions/dto`) через
глобальный `ValidationPipe` в `main.ts` (`whitelist` + `forbidNonWhitelisted`, ошибки в
формате `errorFormat: 'grouped'` — `{ поле: [сообщения] }`). Правила категорий дублируют
`packages/shared/src/schemas/category.ts` — меняй оба места; у транзакций Zod-дубликата нет,
контракт ответа живёт локально в `transactions/transaction.types.ts`. DTO в контроллере
импортируй **значением**: при `import type` метатип параметра — `Object`, и `ValidationPipe`
молча пропускает проверку. На этом же держится совместимость с Zod-роутами auth: их типы тел
импортированы через `import type`, глобальный пайп их не трогает.

**Авторизация закрыта по умолчанию.** `JwtAuthGuard` подключён глобально через `APP_GUARD`
в `AuthModule` — только там импортирован `PassportModule`. Открытые роуты помечаются
декоратором `@Public()`. Локальный `@UseGuards(JwtAuthGuard)` в feature-модуле уронит
приложение на старте с `UnknownDependenciesException`.

**Доступ к БД — через провайдер, не через наследование.** В Prisma 7 `PrismaClient` не класс,
а конструктор с интерфейсом, поэтому `extends PrismaClient` компилируется, но не даёт ни
методов, ни моделей. Клиент отдаётся провайдером по токену `PRISMA`
(`apps/api/src/prisma/prisma.provider.ts`), сервисы получают его через `@Inject(PRISMA)`.
Ошибки Prisma (`P2002` — unique, `P2025` — запись не найдена, `P2003` — нарушение внешнего
ключа) переводятся в HTTP-исключения через `isPrismaError` из `apps/api/src/prisma/prisma-errors.ts`.
`P2003` возникает у `DELETE /categories/:id`, если по категории есть транзакции
(`Transaction.category` — `onDelete: Restrict`, обнулить NOT NULL-колонку нельзя) — отдаётся
как 409, а не 500.

**Деньги** — `Decimal(12, 2)` в БД и **строка** в JSON, чтобы не терять точность. Никаких
`float` для сумм; форматирование — `formatMoney` в `apps/web/src/shared/lib/utils.ts`.

**Изоляция данных по пользователю**: каждый запрос к транзакциям и категориям фильтруется по
`userId` из JWT, чтобы чужая запись не открывалась по прямому id.

## Фронтенд — Feature Slice Design

`apps/web/src` разложен по слоям FSD, импорт разрешён **только вниз**:
`app → views → widgets → features → entities → shared`. Кросс-импорты внутри слоя запрещены,
общий код поднимается в слой ниже.

| Слой | Что лежит |
|---|---|
| `app/` | только роутинг Next: layout'ы, `page.tsx` в 3–5 строк, `metadata` |
| `views/` | экраны целиком (`views/login/ui/login-view.tsx`) |
| `widgets/` | самостоятельные блоки страницы (пока пусто) |
| `features/` | действия пользователя: формы, Server Actions (`features/auth`) |
| `entities/` | предметные сущности (`entities/session` — токены в куках) |
| `shared/` | `ui` (shadcn/ui), `lib`, `api`, `config` |

Слой «pages» из канонического FSD назван **`views`**: имя `pages` зарезервировано Next.
`components.json` перенастроен под это — shadcn кладёт компоненты в `src/shared/ui`,
а `cn` берёт из `@/shared/lib/utils`. CLI shadcn при добавлении компонентов пишет импорт
`from "cn"` (несуществующий npm-пакет) — после `shadcn add` проверяй импорты и меняй на
`@/shared/lib/utils`; он же тянет лишние зависимости (`cn`, `next-themes`), их надо снести.

**Сессия — в httpOnly-куках `access_token` / `refresh_token`.** Их выставляет
`setSession` из `entities/session/api/session.ts` (файл под `import 'server-only'`) при
входе и регистрации; клиентскому JS токены недоступны. Срок жизни куки берётся из поля
`exp` самого JWT (`entities/session/lib/token-expiry.ts`), а не из константы — иначе его
пришлось бы держать синхронным с `JWT_ACCESS_TTL`/`JWT_REFRESH_TTL` вручную. Формы — react-hook-form с
`zodResolver` поверх схем из `@expense/shared`, сабмит зовёт Server Action
(`features/auth/api/*.action.ts`), тот ходит в api и кладёт куки. `redirect` в экшене
пишется **вне** `try/catch`: он бросает `NEXT_REDIRECT`, и catch бы его проглотил.
Ошибки api превращает в текст тоста `apiErrorMessage` (`shared/api/error-message.ts`).

**Защита роутов — `apps/web/src/proxy.ts`.** В Next 16 конвенция `middleware.ts`
переименована в `proxy.ts`; функция экспортируется как `proxy`. Пока access-кука жива,
проверка оптимистичная (только её наличие, без запроса к api), настоящую проверку токена
делает `JwtAuthGuard`, а `app/(dashboard)/layout.tsx` дополнительно дёргает `getSession()`.

**Обновление access-токена живёт в proxy.** Access — 15 минут, refresh — 30 дней, поэтому
исчезнувшая access-кука не означает выход: proxy меняет refresh на новую пару через
`POST /auth/refresh` и кладёт её в куки ответа (`entities/session/api/proxy-session.ts`).
Другого места для этого нет — при рендере страницы куки уже не записать, `cookies().set`
работает только в Server Action, Route Handler и proxy. Если обмен не удался, куки
чистятся, чтобы не долбить api на каждом запросе.

**Обмен refresh-токена нельзя делать параллельно:** api отзывает старый токен при каждом
обмене (ротация в `refresh-tokens.handler.ts`), второй одновременный запрос получит 401 и
выбросит пользователя. Поэтому префетчи Next отсечены прямо в `config.matcher` через
`missing: [next-router-prefetch, purpose=prefetch]`: внутри функции отличить их нельзя —
Next намеренно вырезает `rsc` и `next-router-prefetch` из `request.headers`, чтобы
RSC-запрос не обработали иначе, чем HTML. В Server Action обновление доступно как
`refreshSession()` из `entities/session/api/session.ts`; в `logoutAction` оно нужно, чтобы
отозвать refresh в базе даже при истёкшем access.

## Ограничения версий стека

Стек новее большинства гайдов — эти решения приняты вынужденно, не меняй их без причины:

- **`apps/api` — ESM-пакет** (`"type": "module"`), потому что Nest 12 поставляется только
  в ESM. Все относительные импорты внутри api пишутся с расширением `.js`.
- **TypeScript закреплён на 6.0.3.** В 7.0 (Go-порт) нет программного API компилятора, без
  которого `nest build` падает с явной ошибкой. Вернуться к 7.x можно после выхода 7.1.
- **Prisma 7**: `url` убран из `datasource` и задаётся в `apps/api/prisma.config.ts`;
  подключение только через driver adapter `@prisma/adapter-pg`. Генератор настроен на
  `moduleFormat = "esm"` и `importFileExtension = "js"` — иначе ESM-рантайм не найдёт модули.
- **`prisma` и `@prisma/client` пиннятся на `7.10.0`** (без `^`): тег `latest` у CLI сейчас
  указывает на релиз-кандидат 8.x, и установка без точной версии рассинхронизирует CLI с клиентом.
- Версии зависимостей проверяй по реестру (`npm view <пакет> version`), а не по памяти —
  в этом стеке несколько пакетов ушли на мажор вперёд относительно привычных значений.

## Коммиты

Сообщения — по Conventional Commits: `<тип>: <описание>` на русском языке.

Типы: `feat` (новая функциональность), `fix` (исправление бага), `refactor` (изменение кода
без изменения поведения), `chore` (рутина — зависимости, конфиги), `docs` (документация),
`test` (тесты), `style` (форматирование без изменения логики).

Заголовок — коротко и в повелительном наклонении («добавь», а не «добавил»/«добавлено»), тело
коммита — по необходимости, с объяснением «зачем», а не пересказом диффа. Коммитить только по
явной просьбе пользователя.

## Состояние

В api реализованы auth (JWT access + refresh с ротацией), users, CRUD категорий
(`/api/categories`) и CRUD транзакций (`/api/transactions`) — единая сущность доходов и
расходов (`TransactionType.INCOME`/`EXPENSE`), с фильтрами по периоду/типу/категории и
агрегацией `GET /api/transactions/summary?month=&year=` (income/expense/balance строками,
разбивка по категориям). Модули `expenses` и `stats` (были заглушками) удалены вместе с
моделью `Expense` — транзакции их полностью заменяют. На фронте готовы вход, регистрация и
выход: формы на shadcn/ui, сессия в httpOnly-куках, редиректы через `proxy.ts`. Страницы трат
и категорий — заглушки без данных (транзакции с фронтом пока не связаны), `prisma/seed.ts` не
заполнен. Планы по выполненным задачам — в `.claude/plans/`.

Известная недоделка каркаса: неизвестный роут отдаёт HTML от Express мимо глобального фильтра
ошибок.
