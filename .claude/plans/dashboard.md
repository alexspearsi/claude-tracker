# Главный экран (дашборд) `/dashboard`

## Статус: выполнено

**Отклонения и дополнения к плану:**
- `next-themes` CLI на этот раз не тянул (в отличие от прошлого `shadcn add` для auth-форм),
  и `badge` сразу сгенерировался с импортом `Slot` из единого пакета `radix-ui` — переписывать
  на отдельный `@radix-ui/react-slot` не понадобилось, только `cn` из `"cn"` на алиас.
- `shared/ui/table.tsx` CLI пометил `"use client"`, хотя компонент не использует хуки —
  директиву убрал, чтобы таблица осталась серверным компонентом (соответствует тому, что
  весь дашборд рендерится на сервере).
- `apps/web/src/app/(dashboard)/dashboard/page.tsx` типизирован явной сигнатурой
  `{ searchParams: Promise<{ page?: string | string[] }> }`, а не глобальным `PageProps` —
  проще и не зависит от того, прогонялась ли перед `tsc --noEmit` генерация типов Next.
- Полный e2e-прогон: 25 транзакций через API (пагинация, границы `limit`/`offset`, `?page`
  даёт 400, отсутствие дублей между страницами), плюс через браузер — вход/выход, все три
  страницы дашборда, `?page=abc/999/99999999999`, аккаунты с 0 и ровно 10 транзакциями,
  фолбэк имени на email при `name = null`. Все сценарии прошли как в плане.
- Один шаг плана (`ScheduleWakeup` в ожидании Docker) был лишним — инструмент предназначен
  для `/loop`, а не для обычной задачи; Docker Desktop поднялся быстрее ожидаемого и проверка
  продолжилась без него.

## Контекст

В api реализованы auth, users, категории и транзакции, но фронт до них не дотягивается:
после входа пользователь попадает на `/expenses` — заглушку из одной строки, а между
разделами нет навигации (в `app/(dashboard)/layout.tsx` висит `TODO: сайдбар` и одинокая
кнопка «Выйти»). Имя пользователя нигде не показывается: в куках лежат только токены,
а в JWT — лишь `sub` и `email`.

Задача — собрать главный экран: меню к транзакциям и категориям, профиль с именем и
список последних 10 транзакций с пагинацией, по правилам Feature Slice Design.

**Пагинации в api нет**: `GET /transactions` отдаёт голый массив, а глобальный
`ValidationPipe` с `forbidNonWhitelisted` вернёт 400 на любой незадекларированный
query-параметр. Поэтому пагинация добавляется и в api тоже.

### Согласовано с пользователем

1. **Пагинация — в api**: `limit`/`offset` в DTO, ответ становится `{ items, total }`.
2. **Главный экран — новый роут `/dashboard`**; точка входа после логина переезжает туда.
3. **Меню — горизонтальное в шапке**, рядом имя и «Выйти», активный пункт подсвечен.

### Решения, принятые при проектировании

- **Тип транзакции дублируется локально** в `entities/transaction/model/types.ts`, а не
  добавляется в `packages/shared`. CLAUDE.md фиксирует отсутствие Zod-дубликата у транзакций
  как осознанное: схема в shared стала бы третьим источником правды рядом с DTO на
  class-validator и типами api. Дашборд — только чтение, форм и `zodResolver` здесь нет.
  Для `Category` и `UserProfile` дублирование не нужно — они уже есть в `@expense/shared`.
- **Имя категории склеивается на фронте** через `Map` по ответу `GET /categories`, а не
  через `include: { category: true }` в api: маппер `toTransaction` один на все шесть ручек,
  и правка сломала бы зафиксированный контракт `TransactionDto`. Запрос идёт параллельно
  со списком, категорий у пользователя единицы.
- **`@tanstack/react-query` и `recharts` не используются** — они есть в `package.json`, но
  нигде не подключены и провайдера нет. Весь дашборд серверный, клиентское состояние не нужно.

---

## 1. API: пагинация в `GET /transactions`

Миграция не нужна — схема не меняется, индекс `@@index([userId, date])` уже покрывает
`orderBy` + `take/skip`.

**`dto/transaction-query.dto.ts`** — два опциональных поля по образцу `summary-query.dto.ts`
(`@Type(() => Number)` + `@IsInt` + `@Min`/`@Max`), но с `@IsOptional`:

```ts
@IsOptional() @Type(() => Number) @IsInt(...) @Min(1) @Max(LIMIT_MAX)
limit?: number;

@IsOptional() @Type(() => Number) @IsInt(...) @Min(0)
offset?: number;
```

> **Грабля.** Не писать `limit: number = LIMIT_DEFAULT`. `plainToInstance` присваивает
> `undefined` отсутствующим ключам и затирает инициализатор поля — дефолт молча исчезнет.
> Дефолт ставится в сервисе через `??`.

**`transactions.service.ts`, `findAll`** — `where` вынести в переменную и переиспользовать
в обоих запросах, иначе при фильтрах `total` посчитается по всем транзакциям:

```ts
const [records, total] = await Promise.all([
  this.prisma.transaction.findMany({
    where,
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    take: query.limit ?? LIMIT_DEFAULT,
    skip: query.offset ?? 0,
  }),
  this.prisma.transaction.count({ where }),
]);
return { items: records.map(toTransaction), total };
```

`Promise.all`, а не `$transaction([...])` — ровно тот же приём уже используется в `summary()`
этого файла. Вторичный ключ `createdAt` в сортировке критичен: без него `skip/take` дал бы
дубли и пропуски между страницами.

**Потребители.** `findAll` вызывается только из контроллера (проверено grep'ом), фронт этот
роут не использует. Ломаются два теста в `postman/expense-tracker-auth.postman_collection.json`
(строки ~447 и ~483, `const items = pm.response.json()`).

### Чеклист

- [x] `dto/transaction-validation.ts`: `LIMIT_DEFAULT = 20`, `LIMIT_MAX = 100`, сообщения
      `limitInt`, `limitRange`, `offsetInt`, `offsetMin` рядом с существующими
- [x] `dto/transaction-query.dto.ts`: поля `limit?`/`offset?` с `@IsOptional` + `@Type(() => Number)`
      + `@IsInt` + `@Min`/`@Max`; **без** инициализаторов полей
- [x] `transaction.types.ts`: `TransactionListDto { items: TransactionDto[]; total: number }`
- [x] `transactions.service.ts`: `where` в переменную, `Promise.all([findMany, count])`,
      `take: query.limit ?? LIMIT_DEFAULT`, `skip: query.offset ?? 0`, возврат `{ items, total }`
- [x] `transactions.controller.ts`: тип возврата `findAll` → `TransactionListDto`, добавить импорт типа
- [x] Относительные импорты с расширением `.js` (ESM), комментарии по-русски
- [x] `npm run typecheck`, `npm run lint` — чисто

---

## 2. Фронт: раскладка по FSD

```
app/(dashboard)/dashboard/page.tsx        # metadata + await searchParams + рендер view
app/(dashboard)/layout.tsx                # правка: <AppHeader/> вместо голого LogoutButton

views/dashboard/ui/dashboard-view.tsx     # экран целиком

widgets/app-header/ui/app-header.tsx      # server: имя + меню + выход
widgets/app-header/ui/main-nav.tsx        # 'use client' — только ради usePathname
widgets/recent-transactions/api/load-recent-transactions.ts
widgets/recent-transactions/model/types.ts
widgets/recent-transactions/ui/{recent-transactions,transactions-table,pagination-nav,empty-state}.tsx

entities/transaction/{model/types.ts,api/get-transactions.ts,ui/transaction-amount.tsx}
entities/category/{model/types.ts,api/get-categories.ts,ui/category-dot.tsx}
entities/user/{model/types.ts,api/get-current-user.ts,lib/display-name.ts}

shared/config/routes.ts                   # правка
shared/config/navigation.ts               # NAV_ITEMS
shared/lib/pagination.ts                  # PAGE_SIZE, parsePage, totalPages, pageHref
shared/lib/format-date.ts                 # formatDate с timeZone: 'UTC'
shared/ui/{table,badge}.tsx               # shadcn
```

**Почему такое распределение.** Шапка живёт в layout'е и склеивает `entities/user`,
`features/auth` и навигацию — это `widget`, не `view`. Список последних транзакций
композирует **две** сущности (транзакции + категории) — по FSD композиция двух entity
обязана быть виджетом, потому что entity не имеет права знать про соседнюю entity.

**Два следствия запрета кросс-импортов внутри слоя:**

1. `entities/transaction/api/*` **не может** звать `getSession()` из `entities/session`.
   Поэтому все entity-api принимают `accessToken` параметром — ровно как устроен уже
   существующий `apiFetch(path, { accessToken })`. Токен добывает слой выше.
2. Строка транзакции **не импортирует** `Category` — имя и цвет приходят пропсами
   (`categoryName`, `categoryColor`), склейку делает виджет.

Альтернативу «`serverFetch` с чтением куки в `shared/api`» отклоняю: пришлось бы опускать
`entities/session/model/cookies.ts` в `shared` и трогать работающий `proxy.ts`.

### Чеклист

- [x] `shared/config/routes.ts`: `dashboard: '/dashboard'`, добавить в `PROTECTED_ROUTES`
- [x] `shared/config/navigation.ts`: `NAV_ITEMS` — Главная/Транзакции/Категории
- [x] `shared/lib/pagination.ts`: `PAGE_SIZE = 10`, `parsePage`, `totalPages`, `pageHref`
- [x] `shared/lib/format-date.ts`: `formatDate` через `Intl.DateTimeFormat` с `timeZone: 'UTC'`
- [x] `entities/transaction/model/types.ts`: `TransactionType`, `Transaction`, `TransactionList`
      + комментарий «зеркало `transaction.types.ts` в api — менять оба места»
- [x] `entities/transaction/api/get-transactions.ts`: `import 'server-only'`, `accessToken`
      параметром, `URLSearchParams` только с `limit`/`offset`, `cache: 'no-store'`
- [x] `entities/transaction/ui/transaction-amount.tsx`: `formatMoney`, знак и цвет по `type`
- [x] `entities/category/model/types.ts`: ре-экспорт `Category` из `@expense/shared`
- [x] `entities/category/api/get-categories.ts`: `getCategories(accessToken)`
- [x] `entities/category/ui/category-dot.tsx`: точка цвета категории
- [x] `entities/user/model/types.ts`: ре-экспорт `UserProfile`
- [x] `entities/user/api/get-current-user.ts`: `cache()` из `react` поверх `/users/me`
- [x] `entities/user/lib/display-name.ts`: `name?.trim() || email`
- [x] `widgets/recent-transactions/model/types.ts`: `TransactionRowModel` (tx + `categoryName`/`categoryColor`)
- [x] `widgets/recent-transactions/api/load-recent-transactions.ts`: `Promise.all` списка и
      категорий, склейка через `Map`, фолбэк «Без категории», union
      `{status:'ok'|'unauthorized'|'error'}`, `apiErrorMessage` для текста
- [x] `widgets/recent-transactions/ui/transactions-table.tsx`: таблица shadcn
- [x] `widgets/recent-transactions/ui/pagination-nav.tsx`: `<Link>`, неактивная кнопка — `<span>`
- [x] `widgets/recent-transactions/ui/empty-state.tsx`: пустое состояние + «К первой странице»
- [x] `widgets/recent-transactions/ui/recent-transactions.tsx`: сборка карточки
- [x] `widgets/app-header/ui/main-nav.tsx`: `'use client'`, `usePathname`, активен точный
      матч или вложенный путь
- [x] `widgets/app-header/ui/app-header.tsx`: `getSession()` + `getCurrentUser`, имя,
      `LogoutButton`; ошибка `/users/me` не роняет layout, 401 → `redirect`
- [x] `views/dashboard/ui/dashboard-view.tsx`: `getSession()`, `redirect` вне `catch`, рендер виджета
- [x] `app/(dashboard)/dashboard/page.tsx`: `metadata`, `await searchParams`, `parsePage`
- [x] Проверить, что нет импортов «вверх» и кросс-импортов внутри слоя

---

## 3. Пагинация в UI

`searchParams` в Next 16 — **Promise**, и значение может быть `string | string[] | undefined`
(`?page=1&page=2`). `parsePage` берёт первый элемент массива, а любой мусор
(`abc`, `0`, `-5`, `2.5`, пустая строка) трактует как страницу 1 — показывать 404 на кривом
`?page` бессмысленно.

> **Грабля.** `parsePage` обязан ограничивать `page` и сверху (например, `100_000`): при
> `?page=99999999999` вычисленный `offset` переполнит `Int` в Postgres и даст 500 от Prisma
> вместо пустой страницы.

Верхнюю границу по факту не редиректим: при `offset` за пределами api вернёт `items: []`
и корректный `total`, рисуем пустое состояние со ссылкой «К первой странице». Редирект на
последнюю страницу стоил бы второго запроса и давал риск цикла при гонке удаления.

Страница 1 — без query-параметра в URL. Пагинация — ссылками `<Link>`: это верно для RSC и
заодно обходит известную проблему этой машины, где Chrome обнуляет фон у `<button>`.

`page.tsx` типизируется глобальным `PageProps<'/dashboard'>` (проверено в
`node_modules/next/dist/docs/.../page.md`).

> **Грабля.** `PageProps` появляется только после генерации типов (`next dev`/`next build`/
> `next typegen`). На чистом чекауте `tsc --noEmit` его не найдёт. Если это помешает —
> явная сигнатура `{ searchParams: Promise<{ page?: string | string[] }> }`.

**Префетч и proxy трогать не нужно:** `config.matcher` уже отсекает префетчи через
`missing: [next-router-prefetch, purpose=prefetch]` — ровно чтобы фоновая ротация refresh
не роняла сессию. Менять matcher значило бы воспроизвести уже решённый баг.

---

## 4. Профиль и обработка 401 в RSC

`getCurrentUser` оборачивается в React `cache()` — layout и страница спрашивают профиль
независимо, а запрос к `/users/me` уходит один за рендер. `name` в api nullable, поэтому
`userDisplayName` = `name?.trim() || email`.

**Обновить токен в серверном компоненте нельзя:** `cookies().set` работает только в
Server Action, Route Handler и proxy, поэтому `refreshSession()` в дашборде вызывать
нельзя. Обновление уже сделал `proxy.ts` до рендера — значит 401 на этом этапе означает
«сессия действительно мертва» → `redirect(ROUTES.login)`.

> **Грабля.** `redirect()` бросает `NEXT_REDIRECT`, поэтому он вызывается на верхнем уровне
> view по результату union'а, а **никогда внутри `catch`** — это та же ловушка, что уже
> описана в CLAUDE.md для Server Actions.

Сетевая ошибка и 5xx показываются блоком «Не удалось загрузить транзакции», без `throw`,
чтобы не улетать в `error.tsx`.

---

## 5. Роуты и меню

Переключить точку входа с `/expenses` на `/dashboard` в четырёх местах (полный список
получен grep'ом `ROUTES.expenses`). `logout.action.ts` не трогаем — он уходит на `/login`.

**Расхождение имён.** Пользователь просит «переход к транзакциям», а роут называется
`/expenses`, хотя сущность в api — `transaction` (модуль `expenses` удалён). Переименование
роута в эту задачу не входит: лейбл «Транзакции» ставится на `ROUTES.expenses`, расхождение
фиксируется как техдолг.

### Чеклист

- [x] `proxy.ts:28`: редирект `isGuestOnly` → `ROUTES.dashboard`
- [x] `features/auth/api/login.action.ts:29` → `ROUTES.dashboard`
- [x] `features/auth/api/register.action.ts:27` → `ROUTES.dashboard`
- [x] `app/page.tsx:18`: ссылка «Расходы» → «Кабинет» на `ROUTES.dashboard`
- [x] `app/(dashboard)/layout.tsx`: `<AppHeader />` вместо `<header>` с `LogoutButton`,
      убрать `TODO: сайдбар`
- [x] Делать этот блок **последним**: до него `/dashboard` ещё не рендерится

---

## 6. shadcn

Из `apps/web`: `npx shadcn@4.21.0 add table badge` (версия сверена с реестром — актуальная).

### Чеклист

- [x] `npx shadcn@4.21.0 add table badge`
- [x] Заменить `import { cn } from "cn"` на `@/shared/lib/utils` в новых файлах
- [x] Удалить мусорные зависимости из `apps/web/package.json` (`cn`, `next-themes`), затем
      `npm install` из корня монорепо
- [x] `badge`: проверен импорт `Slot` — CLI на этот раз сразу сгенерировал его из единого
      пакета `radix-ui` (как в `button.tsx`), отдельный `@radix-ui/react-slot` не добавился
- [x] `grep -rn "@/components/" apps/web/src/shared/ui` — пусто
- [x] `shadcn init` не запускать: `components.json` уже настроен под `views`/`shared`
- [x] Отдельный коммит — диффы CLI шумные

---

## 7. Порядок работ

1. API (раздел 1) → 2. Postman → 3. shadcn → 4. `shared` → 5. `entities` →
6. `widgets` → 7. `views` + `page.tsx` → 8. переключение точки входа → 9. документация.

### Чеклист документации

- [x] Postman: починить два теста списка на `.items`, добавить проверку `total`
- [x] Postman: новые запросы «List — пагинация (limit/offset)» и «List — limit=0 (400)»
- [x] `.claude/CLAUDE.md`, «Состояние»: дашборд, пагинация в `GET /transactions`, новый формат ответа
- [x] `README.md`, «Состояние»: убрать устаревшее «методы сервисов бросают `Not implemented`»
- [x] В этом файле проставить «Статус: выполнено» и записать отклонения от плана
- [x] Коммиты по Conventional Commits, слияние в `master` через PR (`gh pr create`)

---

## 8. Проверка

```bash
npm run typecheck && npm run lint && npm run build
npm run db:up        # Docker Desktop сейчас не запущен — поднять вручную
npm run dev          # api :4001/api, web :3001
```

**API** (Postman или curl; создать 2–3 категории и **25 транзакций** — при `PAGE_SIZE=10`
иначе не проверить 3 страницы):

- [x] `GET /transactions` → `{ items: 20, total: 25 }` — дефолт `limit` применился, `total` ≠ длине `items`
- [x] `?limit=10&offset=20` → 5 элементов, `total: 25`
- [x] `?limit=0`, `?limit=101`, `?offset=-1`, `?limit=abc` → 400
- [x] `?page=2` → **400** (`forbidNonWhitelisted`)
- [x] `?type=EXPENSE&limit=5` → `total` по фильтру, а не по всем транзакциям
- [x] `summary` не изменился
- [x] Между страницами нет дублей и пропусков (вторичный ключ `createdAt`)

**UI:**

| Сценарий | Ожидание |
|---|---|
| Вход / регистрация | редирект на `/dashboard`, не на `/expenses` |
| `/login` с живой сессией | редирект на `/dashboard` |
| `/dashboard` без кук | редирект на `/login` |
| Удалить только `access_token`, оставив `refresh_token` | proxy обменял пару, страница отрисовалась |
| Шапка | имя; у аккаунта с `name = null` — email |
| Network | `/users/me` за рендер вызывается **один** раз (проверка `cache()`) |
| Меню | подсвечен «Главная»; переход на `/categories` подсвечивает «Категории» |
| 0 транзакций | пустое состояние, пагинация неактивна |
| Ровно 10 | одна страница, «Вперёд» неактивна |
| 25 | 3 страницы, `?page=2`/`?page=3` рендерятся с сервера, на 1-й странице query нет |
| `?page=abc`, `0`, `-5`, `2.5`, пусто, `?page=1&page=2` | страница 1, без падения |
| `?page=999` | пустое состояние + «К первой странице», не 500 |
| `?page=99999999999` | страница 1, не 500 от Prisma по переполнению Int |
| Суммы | `formatMoney`: «1234.56» → «1 234,56 ₽», копейки не потеряны |
| Даты | совпадают в dev и при `TZ=UTC` |
| api остановлен | сообщение об ошибке, а не белый экран |

Автотестов в проекте нет — раннер не настроен, проверка ручная.

---

## 9. Сводка граблей

1. **class-transformer затирает дефолты полей DTO** — дефолт `limit` ставить в сервисе через `??`.
2. **`forbidNonWhitelisted`** — любой лишний query даёт 400; `?page` в api не существует.
3. **`count` без `where`** даст неверный `total` при фильтрах.
4. **`redirect()` внутри `catch`** проглотит `NEXT_REDIRECT`.
5. **`refreshSession()` в RSC не вызывать** — `cookies().set` там недоступен.
6. **Кросс-импорты в `entities`** — токен и имя категории передавать параметрами/пропсами.
7. **shadcn CLI** — `from "cn"`, лишние `cn`/`next-themes`, `@radix-ui/react-slot`.
8. **`PageProps`** требует сгенерированных типов Next.
9. **Часовой пояс дат** — фиксировать `timeZone: 'UTC'`, Prisma пишет UTC.
10. **Переполнение `offset`** при огромном `?page` — ограничить страницу сверху.
11. **Postman** — два теста списка сломаются молча.
12. **matcher в `proxy.ts` не трогать** — `missing`-правило защищает ротацию refresh.
