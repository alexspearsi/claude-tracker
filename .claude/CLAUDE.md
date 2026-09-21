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

`npm run dev` поднимает `api` и `web` через `concurrently` — у npm нет флага `--parallel` для
`npm run --workspaces`, он выполняет скрипты воркспейсов последовательно. `dev` в `apps/api`
(`nest start --watch`) не завершается сам, поэтому без `concurrently` очередь до `apps/web`
просто не доходила бы и фронт не стартовал.

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

**Доступ к БД — через `PrismaService`, как в официальном гайде Prisma по NestJS.**
`PrismaService extends PrismaClient` (`apps/api/src/prisma/prisma.service.ts`), driver adapter
(`@prisma/adapter-pg`) собирается в конструкторе и передаётся через `super({ adapter })`.
Сервисы получают клиент обычным constructor injection: `constructor(private readonly prisma: PrismaService)`,
без токена и `@Inject`. Раньше в проекте был провайдер по символьному токену `PRISMA` — от него
отказались: предполагаемая причина («PrismaClient — не класс, extends не даёт методов»)
не подтвердилась. Прямой рантайм-тест (создать `PrismaService` и проверить `typeof svc.user`,
`typeof svc.$transaction`) показал, что делегаты моделей и методы клиента после `extends`
на месте и в связке с кастомным `output` + `moduleFormat: "esm"` + driver adapter, которая
используется в этом проекте. Нюанс: `instanceof PrismaClient` для инстанса **всегда** `false` —
даже без наследования, у голого `new PrismaClient(...)` — потому что сгенерированный клиент
оборачивается в Proxy; на DI и вызовы методов это не влияет, полагаться на `instanceof` для
Prisma-клиента просто нельзя.
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
| `widgets/` | самостоятельные блоки страницы (`app-header`, `recent-transactions`) |
| `features/` | действия пользователя: формы, Server Actions (`features/auth`) |
| `entities/` | предметные сущности (`session` — токены в куках, `transaction`, `category`, `user`) |
| `shared/` | `ui` (shadcn/ui), `lib`, `api`, `config` |

Слой «pages» из канонического FSD назван **`views`**: имя `pages` зарезервировано Next.
`components.json` перенастроен под это — shadcn кладёт компоненты в `src/shared/ui`,
а `cn` берёт из `@/shared/lib/utils`. CLI shadcn при добавлении компонентов пишет импорт
`from "cn"` (несуществующий npm-пакет) — после `shadcn add` проверяй импорты и меняй на
`@/shared/lib/utils`; он же тянет лишние зависимости (`cn`, `next-themes`), их надо снести.

**Кросс-импорты между `entities` запрещены** — `entities/transaction` не может импортировать
`entities/category`, и ни одна entity не может импортировать `entities/session`. Отсюда два
следствия: entity-api принимают `accessToken` параметром вместо того, чтобы читать сессию
самостоятельно (его достаёт вызывающий widget/view — см. `entities/transaction/api/get-transactions.ts`),
а склейку данных из двух entity (например, имя категории в строке транзакции) делает `widget`,
который получает готовые значения пропсами, а не сущность целиком.

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

**401 от api внутри RSC уводит на `/session-expired`, а не сразу на `/login`.** Такое
бывает редко (например, ротация `JWT_ACCESS_SECRET`) — access-кука ещё не истекла по
времени жизни, но токен уже не проходит `JwtAuthGuard`. Позвать `clearSession()` прямо в
компоненте (`widgets/app-header`, `views/dashboard`) нельзя: `cookies().delete()` в Server
Component при рендере бросает исключение, разрешён только в Server Action и Route Handler.
Поэтому `app/session-expired/route.ts` — отдельный Route Handler, который физически чистит
куки (`clearSessionCookies` из `proxy-session.ts`) и редиректит на `/login`; без этого шага
`proxy.ts` увидел бы на `/login` ту же мёртвую access-куку и как `isGuestOnly` тут же увёл
обратно на `/dashboard` — бесконечный цикл. Роут не входит ни в `PROTECTED_ROUTES`, ни в
`GUEST_ROUTES`, поэтому proxy пропускает его без изменений.

**Мутации категорий ревалидируют три пути сразу.** Имя и цвет категории рендерятся в строках
транзакций на `/dashboard` и `/expenses`, поэтому ревалидации только `/categories` недостаточно
после create/update/delete — используй готовый список `CATEGORY_AFFECTED_PATHS`
(`features/category-form/model/affected-paths.ts`), а не собирай пути заново под каждую фичу.

**Мутации транзакций ревалидируют обе поверхности через `TRANSACTION_AFFECTED_PATHS`.**
Аналогично категориям — `features/transaction-form/model/affected-paths.ts` содержит
`[ROUTES.dashboard, ROUTES.expenses]` (`/categories` туда не входит: мутация транзакции не
меняет категорию), используй готовый список, а не собирай пути заново.

**У транзакций нет Zod-схемы в `@expense/shared`.** В отличие от категорий (см. выше),
локальная `features/transaction-form/model/transaction-form-schema.ts` — ручное зеркало
`apps/api/src/modules/transactions/dto/transaction-validation.ts`; при правке лимитов/паттернов
на api меняй оба места, `npm run typecheck` расхождение значений между ними не поймает.

**Фильтры списка транзакций живут в строке запроса, а не в клиентском состоянии.** Значения
разбираются и проверяются белым списком в `widgets/expenses-list/model/filters.ts`
(`parseTransactionFilters`) — непрошедшее значение трактуется как «фильтр не задан», тем же
способом, что уже применён к номеру страницы в `shared/lib/pagination.ts` (`parsePage`).
Панель фильтров не хранит `useState`: она читает проп `filters` (из RSC-разбора
`searchParams`) и на любое изменение пушет новый URL.

**Два разных формата даты в срезе транзакций — легко перепутать.** В теле create/update
(`POST`/`PATCH /transactions`) дата уходит полным ISO-таймстампом на полдень UTC
(`buildIsoNoon`) — иначе календарная дата съезжает на сутки при локальной полуночи в
положительных часовых поясах. В параметрах фильтра (`dateFrom`/`dateTo`) — календарной датой
без времени (`YYYY-MM-DD`) — иначе верхняя граница периода обрезает почти весь последний день
(сервис включает день целиком только когда время не передано).

**Ошибки полей DTO-роутов достаются через `extractFieldErrors`, не `apiErrorMessage`.** Формы,
которые ходят на DTO-роуты (категории, транзакции), получают 400 с `error.message` в виде
объекта `{ поле: [сообщения] }` (`errorFormat: 'grouped'`) — `extractFieldErrors`
(`shared/api/error-message.ts`) разбирает этот формат в `Record<string, string>` для
`form.setError`; `apiErrorMessage` остаётся для тостов (409, 404, сеть, 5xx). В `catch`
экшена вызывай `extractFieldErrors` раньше `apiErrorMessage` — иначе объектный `error.message`
проваливается в общий фолбэк с сообщением о недоступности сервиса.

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

## Ветки, коммиты и PR

Правила GitHub Flow, Conventional Commits и оформления PR вынесены в скилл `commit`
(`.claude/skills/commit/SKILL.md`) — обращайся к нему при создании веток, коммитов и PR.

## Состояние

В api реализованы auth (JWT access + refresh с ротацией), users, CRUD категорий
(`/api/categories`) и CRUD транзакций (`/api/transactions`) — единая сущность доходов и
расходов (`TransactionType.INCOME`/`EXPENSE`), с фильтрами по периоду/типу/категории,
пагинацией (`limit`/`offset`, дефолт 20, максимум 100 — ответ `{ items, total }`, а не голый
массив) и агрегацией `GET /api/transactions/summary?month=&year=` (income/expense/balance
строками, разбивка по категориям). Модули `expenses` и `stats` (были заглушками) удалены
вместе с моделью `Expense` — транзакции их полностью заменяют.

На фронте готовы вход, регистрация, выход и главный экран `/dashboard`: горизонтальное меню
в шапке (`widgets/app-header`) с именем пользователя (фолбэк на email, если `name` не задано),
карточка «Сводка за месяц» (`widgets/monthly-summary`) — баланс/доходы/расходы за текущий месяц
и таблица разбивки по категориям, оба на основе уже существующего `GET /transactions/summary`
без нового API — и список последних 10 транзакций с пагинацией через `?page=`
(`widgets/recent-transactions`).
Имя и цвет категории в строке транзакции склеиваются на фронте через `Map` по ответу
`GET /categories` — `TransactionDto` вложенную категорию не отдаёт, менять общий маппер
`toTransaction` ради одного экрана не стали. Тип транзакции на фронте дублируется локально в
`entities/transaction/model/types.ts` (зеркало `transaction.types.ts` в api), а не в
`packages/shared`: там нет форм с `zodResolver`, только чтение. Редирект после входа/регистрации
и `isGuestOnly` в `proxy.ts` ведут на `/dashboard`, а не на `/expenses`.

`/categories` — рабочий CRUD (фаза 1): список в таблице, создание и редактирование через одну
форму `CategoryForm` в `Dialog`, удаление через `AlertDialog`, цвет выбирается из фиксированной
палитры `CATEGORY_COLORS` (10 значений, `features/category-form/model/palette.ts`), поле `icon`
в UI не выводится. Удаление занятой категории (есть связанные транзакции) блокируется по
`ApiError.status === 409` — диалог остаётся открытым с сообщением, это отдельное состояние UI,
а не сырой текст ошибки.

`/expenses` — рабочий экран транзакций (фаза 2): список в таблице с пагинацией через `?page=`,
всегда видимая панель фильтров по периоду/типу/категории (без сворачивания), создание,
редактирование и удаление через общую `features/transaction-form` (`TransactionForm` в
собственном `Dialog` + `TransactionDeleteDialog` в `AlertDialog`). Быстрое добавление той же
формы доступно и с `/dashboard` (`widgets/quick-add-transaction`, в шапке
`widgets/recent-transactions`) — оба входа ведут в один и тот же компонент формы, а не в два
разных. `prisma/seed.ts` не заполнен. Планы по выполненным задачам — в `.claude/plans/`.

Известная недоделка каркаса: неизвестный роут отдаёт HTML от Express мимо глобального фильтра
ошибок.

Известное расхождение имён: пункт меню «Транзакции» ведёт на `/expenses` (сущность в api —
`transaction`, модуль `expenses` удалён ещё при введении транзакций) — переименование роута
не входило в задачу дашборда, это техдолг.

Фронт перестилен под дизайн «Liquid Glass» (glassmorphism, перенесён из макета Claude Design):
токены и утилитарные классы — в `apps/web/src/app/globals.css` (`.lg-glass`/`.lg-glass-soft`/
`.lg-glass-pill`, `--lg-*`-переменные, `BlobBackground`), shadcn/ui-примитивы в `shared/ui`
перестилены поверх без ухода от них. У кнопок background-color/color заданы через `!important`
(`.lg-btn-primary`/`-destructive`/`-secondary`, `.lg-glass-soft`) — это не стилистический выбор,
а обход бага Chromium: объявления этих свойств внутри именованного CSS `@layer` (Tailwind v4
оборачивает всё в `@layer theme, base, components, utilities`) проигрывают UA-стилям на
`<button>` независимо от порядка слоёв и specificity — воспроизведено на пустом тестовом
`<button>` без единого класса проекта. Любой новый кнопочный вариант, красящий фон/текст через
Tailwind-утилиты (не через `lg-btn-*`), рискует получить тот же баг — оборачивай в такой же
класс с `!important` или проверяй на `<button>` отдельно от `<div>`/`<a>` (там бага нет).
Светлая тема (исходная тема макета) и мобильная адаптация (в макете есть `Mobile.dc.html` с
bottom pill nav) визуально не проверялись — тестовый браузер в dark, мобильная вёрстка не
реализована.

## Документация
При добавлении функционала проверяй .claude/docs/*.
Актуализируй файлы при изменении архитектуры или API.  