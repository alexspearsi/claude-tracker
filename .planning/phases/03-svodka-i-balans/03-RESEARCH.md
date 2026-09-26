# Phase 3: Сводка и баланс - Research

**Researched:** 2026-09-21
**Domain:** Next.js 16 App Router (Server Components) — фронтенд-слой над уже готовым backend-эндпоинтом
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Расположение и структура на дашборде**
- **D-01:** Новый виджет `widgets/monthly-summary` размещается на `/dashboard` ПЕРЕД
  `RecentTransactions` (сводка — общая картина, список транзакций — детали; типичный порядок
  «сверху вниз: обзор → детали»). — *Recommended: сводка первой, чтобы пользователь видел
  финансовое положение сразу при заходе на дашборд, не листая список транзакций.*
- **D-02:** Виджет — Server Component (как `RecentTransactions`), без собственного `useState`:
  месяц/год берутся из текущей даты сервера на момент рендера, интерактивности (переключение
  месяца) в этой фазе нет — SUM-01 формулирует требование только про «текущий месяц».
  — **Reversibility:** reversible — при появлении переключателя периода в будущей фазе виджет
  просто получит проп/searchParam, серверная структура не потребует переделки.

**Визуализация баланс/доходы/расходы**
- **D-03:** Три показателя (баланс, доходы, расходы) отображаются как строка из трёх
  компактных карточек/блоков внутри одной `Card` виджета — не как текстовый абзац и не как три
  отдельные `Card`. Цвет: доход — `text-emerald-600 dark:text-emerald-400`, расход —
  `text-destructive`, баланс — нейтральный текст со знаком (не окрашивается в красный/зелёный,
  чтобы не подразумевать оценочное суждение «хорошо/плохо» при отрицательном балансе — баланс
  это факт, а не результат). Переиспользуется цветовая конвенция `TransactionAmount`
  (`entities/transaction/ui/transaction-amount.tsx`), но не сам компонент — он рассчитан на
  сумму одной транзакции со знаковым префиксом «−»/«+», а не на подписанные метки «Баланс»/
  «Доходы»/«Расходы».
- **D-04:** Форматирование сумм — существующий `formatMoney` (`shared/lib/utils.ts`), тот же,
  что использует `TransactionAmount` и весь остальной проект. Второй форматтер не пишется.

**Таблица разбивки по категориям**
- **D-05:** Одна таблица (не две — раздельно доход/расход), как явно требует SUM-02
  («таблицу», единственное число). API уже возвращает единый массив `byCategory`,
  отсортированный по убыванию `total` и содержащий поле `type` на каждой строке — сортировка
  на фронте не делается повторно, доверяем порядку с сервера. Тип строки (доход/расход)
  внутри объединённой таблицы различается тем же визуальным языком, что и в
  `ExpensesTable`/`RecentTransactions`: `CategoryDot` (цвет категории) + знаковая сумма через
  паттерн `TransactionAmount` (цвет по `type`), а не отдельная колонка «Тип».
  — **Reversibility:** reversible — если пользователь позже попросит разделить на две таблицы,
  это локальное изменение одного компонента, серверный контракт не меняется.
- **D-06:** Колонки таблицы: Категория (точка цвета + имя), Сумма (знаковая, форматированная).
  Без колонки «% от общего» и без колонки «Тип» отдельно — не запрошено в SUM-02, добавление
  было бы scope creep.

**Пустое состояние**
- **D-07:** Если за текущий месяц нет транзакций — `income`/`expense`/`balance` от api придут
  нулевыми строками (`"0.00"`), `byCategory` — пустым массивом. Виджет показывает нули в трёх
  карточках как есть (не скрывает их), а под таблицей — короткий текст в духе существующих
  пустых состояний проекта («Нет данных за текущий месяц» или аналог, финальную копию уточнит
  UI-фаза) вместо пустой таблицы без заголовков.

**Хендлинг ошибок и авторизации**
- **D-08:** Загрузка сводки — по той же серверной конвенции, что `loadRecentTransactions`/
  `loadTransactions`: `import 'server-only'`, `accessToken` параметром (кросс-импорт
  `entities/session` запрещён), различение `unauthorized` (→ `/session-expired`) и `error`
  (текст «Не удалось загрузить сводку: {message}» рядом с существующим паттерном ошибки на
  дашборде). Загрузка сводки идёт параллельно с загрузкой списка транзакций через
  `Promise.allSettled`/`Promise.all` в `DashboardView`, а не последовательно.

### Claude's Discretion
- Итоговое имя FSD-слайса (`widgets/monthly-summary` — рабочее название) может быть уточнено
  планировщиком/UI-исследователем, если найдётся более удачное по конвенции проекта.
- Точный текст пустого состояния и точная разметка/отступы трёх карточек — решает UI-фаза
  (`gsd-ui-phase`) по UI-SPEC конвенции проекта (60/30/10 цвет, ≤4 размера шрифта, spacing
  кратно 4), не discuss-phase.

### Deferred Ideas (OUT OF SCOPE)
- **Переключение периода (не только текущий месяц)** — SUM-01 прямо ограничивает фазу текущим
  месяцем; произвольный выбор месяца/года — кандидат в будущую фазу (v2), если появится
  соответствующее требование в REQUIREMENTS.md.
- **Графики/диаграммы разбивки по категориям** — SUM-02 явно исключает графики («без графиков»)
  — не в этой фазе и не факт, что вообще в проекте.
</user_constraints>

## Summary

Фаза не добавляет нового API — весь необходимый расчёт (`GET /transactions/summary?month=&year=`)
уже реализован, протестирован и не меняется. Задача целиком фронтенд-слойная: один новый
entity-api метод, один новый server-only лоадер, один новый widget, три строки интеграции в
`DashboardView`. Все нужные UI-примитивы (`Card`, `Table`, `CategoryDot`, цветовая конвенция
`TransactionAmount`, `formatMoney`) уже существуют и использовались в фазах 1-2 — новых
библиотек не требуется, `## Package Legitimacy Audit` не применим.

Ключевая находка, отличающая эту фазу от `loadRecentTransactions`: `SummaryCategoryItem`
**уже содержит** `name`/`color` категории на каждой строке (сервер сам джойнит их в
`transactions.service.ts`), поэтому паттерн «отдельный `getCategories()` + `Map`-склейка»,
использованный в `loadRecentTransactions`, здесь **не нужен и не должен повторяться** — это
единственная структурная реальная развилка относительно прочитанного в CONTEXT.md канонического
референса, и её стоит явно указать планировщику, чтобы не завести на дашборд лишний
параллельный запрос.

Вторая находка — для таблицы разбивки по категориям `TransactionAmount` можно и нужно
переиспользовать **как есть** (не только его цветовую конвенцию): проп-шейп
`{ amount: string; type: TransactionType }` совпадает с полями `SummaryCategoryItem`
(`total`→`amount`, `type`→`type`) один в один. Для трёх карточек баланс/доходы/расходы,
наоборот, компонент не подходит (см. `Code Examples`), как и зафиксировано в CONTEXT.md D-03.

**Primary recommendation:** новый entity-api `getSummary(accessToken, {month, year})` →
новый server-only лоадер `loadMonthlySummary(accessToken)` (без параллельного запроса
категорий, в отличие от `loadRecentTransactions`) → новый widget `widgets/monthly-summary`
(одна `Card`: три статистики сверху, таблица снизу, `TransactionAmount` переиспользуется в
строках таблицы) → третий параллельный вызов в существующем `Promise.all` в `DashboardView`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Расчёт баланса/доходов/расходов и группировка по категориям | API / Backend | — | Уже реализовано в `TransactionsService.summary()` (Prisma `groupBy`), фаза 3 не трогает |
| Определение «текущего месяца» | Frontend Server (RSC) | — | Вычисляется на сервере в момент рендера `DashboardView`/лоадера, не в браузере (D-02: без клиентского `useState`) |
| Загрузка сводки по HTTP | Frontend Server (RSC) | — | `apiFetch` из server-only лоадера, `accessToken` параметром — тот же паттерн, что у `getTransactions`/`getCategories` |
| Рендер трёх карточек и таблицы | Frontend Server (RSC) | — | Чистая презентация уже готовых серверных данных, интерактивности нет в этой фазе |
| Изоляция данных по пользователю | API / Backend | — | Уже обеспечено `where: { userId, ... }` в `summary()`, фронт ничего не фильтрует повторно |

## Standard Stack

Новых библиотек фаза не вводит — используется существующий стек проекта.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 16.3.4 [VERIFIED: apps/web/package.json] | App Router, Server Components | Уже используется во всём `apps/web` |
| react | 19.2.8 [VERIFIED: apps/web/package.json] | UI | Уже используется |

### Supporting
Нет новых supporting-зависимостей — переиспользуются существующие примитивы (см. `Don't Hand-Roll`).

### Alternatives Considered
Не применимо — фаза не вводит новых библиотек, альтернатив не рассматривалось.

**Installation:** не требуется — новых пакетов нет.

**Version verification:** версии `next`/`react` подтверждены чтением `apps/web/package.json`
этой сессией; отдельная проверка через `npm view` не требуется, так как пакеты не меняются
и не добавляются этой фазой.

## Package Legitimacy Audit

**Не применимо.** Фаза не устанавливает новых пакетов — весь необходимый код (HTTP-клиент,
UI-примитивы, форматирование) уже существует в репозитории и использовался в фазах 1-2.

## Architecture Patterns

### System Architecture Diagram

```
Browser (GET /dashboard)
        │
        ▼
proxy.ts (оптимистичная проверка access-куки, см. CLAUDE.md)
        │
        ▼
app/(dashboard)/dashboard/page.tsx  →  DashboardView (RSC, async)
        │
        ├── getSession() ──────────────► access_token (httpOnly cookie)
        │
        ├── Promise.all([
        │     loadRecentTransactions(accessToken, page),   ← существует
        │     loadMonthlySummary(accessToken),              ← НОВОЕ
        │     getCurrentUser(accessToken).catch(() => null) ← существует
        │   ])
        │
        │        loadMonthlySummary(accessToken)
        │                │
        │                ├── now.getUTCMonth()+1, now.getUTCFullYear()
        │                │
        │                ▼
        │        getSummary(accessToken, {month, year})   ← НОВЫЙ entity-api
        │                │
        │                ▼
        │        apiFetch('/transactions/summary?month=&year=')
        │                │
        │                ▼
        │        GET /api/transactions/summary  (Nest, JwtAuthGuard)
        │                │
        │                ▼
        │        TransactionsService.summary(userId, month, year)
        │           — where: { userId, date: { gte: from, lt: to } }
        │           — Prisma groupBy(['type']) + groupBy(['categoryId','type'])
        │                │
        │                ▼
        │        TransactionSummary { income, expense, balance, byCategory[] }
        │
        ▼
DashboardView рендерит:
  ├── если summaryResult.status === 'unauthorized' → redirect('/session-expired')
  ├── если summaryResult.status === 'error'        → текст ошибки (не блокирует остальной дашборд)
  └── иначе → <MonthlySummary summary={...} />  (НОВЫЙ widget, ставится ПЕРЕД RecentTransactions)
              ├── три карточки: Баланс / Доходы / Расходы (formatMoney, цвет по D-03)
              └── таблица byCategory: CategoryDot + <TransactionAmount amount={total} type={type} />
```

### Recommended Project Structure
```
apps/web/src/
├── entities/transaction/
│   ├── api/
│   │   └── get-summary.ts          # НОВЫЙ — apiFetch('/transactions/summary?...')
│   └── model/
│       └── types.ts                # ИЗМЕНИТЬ — добавить SummaryCategoryItem, TransactionSummary
├── widgets/monthly-summary/        # НОВЫЙ слайс (рабочее имя по CONTEXT.md, discretion планировщика)
│   ├── api/
│   │   └── load-monthly-summary.ts # НОВЫЙ — server-only лоадер, ОДИН запрос (не allSettled)
│   └── ui/
│       ├── monthly-summary.tsx     # НОВЫЙ — контейнер: Card + три карточки + таблица/empty-state
│       ├── summary-stats.tsx       # НОВЫЙ (опционально отдельным файлом) — три карточки
│       └── summary-category-table.tsx # НОВЫЙ (опционально отдельным файлом) — таблица byCategory
└── views/dashboard/ui/
    └── dashboard-view.tsx          # ИЗМЕНИТЬ — третий параллельный вызов + рендер до RecentTransactions
```

Разбивка `monthly-summary.tsx` на подкомпоненты (`summary-stats.tsx`,
`summary-category-table.tsx`) — рекомендация по аналогии с `recent-transactions` (который
разбит на `recent-transactions.tsx` + `transactions-table.tsx` + `empty-state.tsx`), но не
жёсткое требование: CONTEXT.md прямо оставляет точную разметку на усмотрение UI-фазы.

### Pattern 1: Entity-api — `accessToken` параметром, без чтения `entities/session`
**What:** Функции в `entities/*/api/` принимают токен параметром вместо обращения к
`entities/session` — кросс-импорты между entities запрещены правилами FSD проекта.
**When to use:** Любой новый entity-api метод, читающий защищённый роут api.
**Example:**
```typescript
// Source: apps/web/src/entities/transaction/api/get-transactions.ts (VERIFIED, строки 1-33)
import 'server-only';
import { apiFetch } from '@/shared/api/api-client';
import type { TransactionList, TransactionType } from '@/entities/transaction/model/types';

export function getTransactions(
  accessToken: string,
  { limit, offset, type, categoryId, dateFrom, dateTo }: GetTransactionsParams,
): Promise<TransactionList> {
  const query = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (type) query.set('type', type);
  // ...
  return apiFetch<TransactionList>(`/transactions?${query}`, { accessToken, cache: 'no-store' });
}
```

**Новый файл по этому паттерну** — `entities/transaction/api/get-summary.ts`:
```typescript
import 'server-only';
import { apiFetch } from '@/shared/api/api-client';
import type { TransactionSummary } from '@/entities/transaction/model/types';

interface GetSummaryParams {
  month: number;
  year: number;
}

/** Токен параметром — см. комментарий в get-transactions.ts. */
export function getSummary(
  accessToken: string,
  { month, year }: GetSummaryParams,
): Promise<TransactionSummary> {
  // month и year ОБЯЗАТЕЛЬНЫ на api (SummaryQueryDto без @IsOptional) — оба всегда передаются.
  const query = new URLSearchParams({ month: String(month), year: String(year) });
  return apiFetch<TransactionSummary>(`/transactions/summary?${query}`, {
    accessToken,
    cache: 'no-store',
  });
}
```

### Pattern 2: Мирроринг типов api → `entities/transaction/model/types.ts`
**What:** Типы ответа api для транзакций дублируются вручную в `entities/transaction/model/types.ts`
(не выносятся в `@expense/shared`), с комментарием «зеркало … — менять оба места».
**Example:**
```typescript
// Source: apps/api/src/modules/transactions/transaction.types.ts (VERIFIED, строки 19-36)
export interface SummaryCategoryItem {
  categoryId: string;
  name: string;
  color: string;
  type: TransactionType;
  total: string;
}

export interface TransactionSummary {
  month: number;
  year: number;
  from: string; // включительно
  to: string; // исключительно — первое число следующего месяца
  income: string;
  expense: string;
  balance: string; // income - expense, может быть отрицательным
  byCategory: SummaryCategoryItem[];
}
```
Добавить в `entities/transaction/model/types.ts` **дословно те же поля** (тип `TransactionType`
там уже определён локально, строки 1-5 файла — переиспользуется, второй раз не заводится):
```typescript
export interface SummaryCategoryItem {
  categoryId: string;
  name: string;
  color: string;
  type: TransactionType;
  total: string;
}

export interface TransactionSummary {
  month: number;
  year: number;
  from: string;
  to: string;
  income: string;
  expense: string;
  balance: string;
  byCategory: SummaryCategoryItem[];
}
```

### Pattern 3: Server-only лоадер с разбором 401/error (упрощённая версия — один запрос)
**What:** `widgets/*/api/load-*.ts`, `import 'server-only'`, возвращает discriminated union
`{status: 'ok'|'unauthorized'|'error'}`.
**Отличие от `loadRecentTransactions`:** там `Promise.allSettled` нужен, потому что лоадер
делает ДВА параллельных запроса (`getTransactions` + `getCategories`) и должен понять, какой
из них упал. `loadMonthlySummary` делает **один** запрос (`getSummary`) — `SummaryCategoryItem`
уже содержит `name`/`color`, второй запрос категорий не нужен (см. `Don't Hand-Roll`). Поэтому
здесь достаточно простого `try/catch`, `Promise.allSettled` был бы избыточен для одного промиса.
**Example (новый файл `widgets/monthly-summary/api/load-monthly-summary.ts`):**
```typescript
import 'server-only';
import { getSummary } from '@/entities/transaction/api/get-summary';
import { ApiError } from '@/shared/api/api-client';
import { apiErrorMessage } from '@/shared/api/error-message';
import type { TransactionSummary } from '@/entities/transaction/model/types';

export type LoadMonthlySummaryResult =
  | { status: 'ok'; summary: TransactionSummary }
  | { status: 'unauthorized' }
  | { status: 'error'; message: string };

/**
 * Месяц/год берутся из UTC-даты сервера на момент рендера — согласовано с тем, как api
 * считает границы месяца через Date.UTC (transactions.service.ts, строки 120-121).
 * getMonth()/getFullYear() (локальное время) могли бы разойтись с api на стыке месяца,
 * если сервер выполняется не в UTC-таймзоне.
 */
export async function loadMonthlySummary(accessToken: string): Promise<LoadMonthlySummaryResult> {
  const now = new Date();
  const month = now.getUTCMonth() + 1;
  const year = now.getUTCFullYear();

  try {
    const summary = await getSummary(accessToken, { month, year });
    return { status: 'ok', summary };
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return { status: 'unauthorized' };
    }
    return { status: 'error', message: `Сводка: ${apiErrorMessage(error)}` };
  }
}
```

### Pattern 4: Интеграция в `DashboardView`
**What:** Третий параллельный вызов в существующем `Promise.all`, независимый рендер ошибки,
объединение проверки `unauthorized`.
**Example — точка изменения (`apps/web/src/views/dashboard/ui/dashboard-view.tsx`, VERIFIED, строки 20-51 целиком):**

Текущий код:
```typescript
const [result, profile] = await Promise.all([
  loadRecentTransactions(session.accessToken, page),
  getCurrentUser(session.accessToken).catch(() => null),
]);

if (result.status === 'unauthorized') {
  redirect(ROUTES.sessionExpired);
}

return (
  <main className="mx-auto flex max-w-4xl flex-col gap-6 p-6">
    <h1 className="text-2xl font-semibold">{/* ... */}</h1>
    {result.status === 'error' ? (
      <p className="text-sm text-destructive">Не удалось загрузить данные: {result.message}</p>
    ) : (
      <RecentTransactions {/* ... */} />
    )}
  </main>
);
```

Рекомендуемое изменение:
```typescript
const [result, summaryResult, profile] = await Promise.all([
  loadRecentTransactions(session.accessToken, page),
  loadMonthlySummary(session.accessToken),
  getCurrentUser(session.accessToken).catch(() => null),
]);

// 401 от любого из параллельных запросов — мёртвая сессия, источник не важен (D-08).
if (result.status === 'unauthorized' || summaryResult.status === 'unauthorized') {
  redirect(ROUTES.sessionExpired);
}

return (
  <main className="mx-auto flex max-w-4xl flex-col gap-6 p-6">
    <h1 className="text-2xl font-semibold">{/* ... без изменений ... */}</h1>

    {summaryResult.status === 'error' ? (
      <p className="text-sm text-destructive">Не удалось загрузить сводку: {summaryResult.message}</p>
    ) : (
      <MonthlySummary summary={summaryResult.summary} />
    )}

    {result.status === 'error' ? (
      <p className="text-sm text-destructive">Не удалось загрузить данные: {result.message}</p>
    ) : (
      <RecentTransactions {/* ... без изменений ... */} />
    )}
  </main>
);
```
Ошибка сводки не блокирует рендер списка транзакций и наоборот — независимые ветки (D-08:
«текст рядом с существующим паттерном ошибки на дашборде», не общий catch на всё).

### Pattern 5: Три карточки баланс/доходы/расходы (TransactionAmount НЕ переиспользуется напрямую)
**What:** `TransactionAmount` рассчитан на пропсы `{amount: string; type: TransactionType}`
одной транзакции со знаковым префиксом «−»/«+» (VERIFIED, `transaction-amount.tsx`, строки
11-25: `{isExpense ? '−' : '+'}{formatMoney(amount)}`). Для подписанных карточек
«Баланс»/«Доходы»/«Расходы» это не подходит: нет второго значения `type` на три показателя
сразу, а `balance` может быть отрицательным без привязки к `TransactionType`. D-03 прямо
запрещает переиспользовать сам компонент, требуя лишь ту же цветовую конвенцию.
**Example (иллюстративно — точную разметку/отступы решает UI-фаза, D-discretion):**
```typescript
// mirrors цветовые классы из transaction-amount.tsx (VERIFIED, строка 17):
// 'text-emerald-600 dark:text-emerald-400' (доход) / 'text-destructive' (расход)
import { cn, formatMoney } from '@/shared/lib/utils';

interface SummaryStatProps {
  label: string;
  amount: string;
  colorClassName?: string; // не задан для «Баланс» — нейтральный текст (D-03)
}

function SummaryStat({ label, amount, colorClassName }: SummaryStatProps) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm text-muted-foreground">{label}</span>
      {/* formatMoney(Number('-500.00')) уже даёт знак через Intl — доп. '−' не нужен */}
      <span className={cn('text-xl font-semibold tabular-nums', colorClassName)}>
        {formatMoney(amount)}
      </span>
    </div>
  );
}

// использование:
<div className="grid grid-cols-3 gap-4">
  <SummaryStat label="Баланс" amount={summary.balance} />
  <SummaryStat label="Доходы" amount={summary.income} colorClassName="text-emerald-600 dark:text-emerald-400" />
  <SummaryStat label="Расходы" amount={summary.expense} colorClassName="text-destructive" />
</div>
```
`formatMoney` сам расставляет минус для отрицательных чисел через `Intl.NumberFormat`
(VERIFIED, `shared/lib/utils.ts`, строки 10-12: `new Intl.NumberFormat('ru-RU', {style:
'currency', currency}).format(Number(amount))`) — для отрицательного `balance` отдельно
дописывать знак не требуется.

### Pattern 6: Таблица byCategory — `TransactionAmount` переиспользуется НАПРЯМУЮ
**What:** В отличие от карточек, строка `SummaryCategoryItem` — это буквально один агрегат с
`type` (как у транзакции), поэтому `TransactionAmount` подходит без адаптации: только
переименовать проп `total` → `amount` на вызове.
**Example (новый файл `summary-category-table.tsx`, по образцу `transactions-table.tsx`,
VERIFIED строки 1-48):**
```typescript
import { CategoryDot } from '@/entities/category/ui/category-dot';
import { TransactionAmount } from '@/entities/transaction/ui/transaction-amount';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/shared/ui/table';
import type { SummaryCategoryItem } from '@/entities/transaction/model/types';

interface SummaryCategoryTableProps {
  items: SummaryCategoryItem[];
}

export function SummaryCategoryTable({ items }: SummaryCategoryTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Категория</TableHead>
          <TableHead className="text-right">Сумма</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          // ВАЖНО: ключ по categoryId+type, не только categoryId — см. Common Pitfalls
          <TableRow key={`${item.categoryId}-${item.type}`}>
            <TableCell>
              <span className="flex items-center gap-2">
                <CategoryDot color={item.color} />
                {item.name}
              </span>
            </TableCell>
            <TableCell className="text-right">
              <TransactionAmount amount={item.total} type={item.type} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```
Данные приходят уже отсортированными по убыванию суммы с сервера (VERIFIED,
`transactions.service.ts`, строки 147-158: `.sort((a, b) => Number(b.total) - Number(a.total))`)
— повторная сортировка на фронте не делается (согласуется с D-05).

### Anti-Patterns to Avoid
- **Повторный запрос категорий (`getCategories()` + `Map`-склейка) для этого виджета:**
  `SummaryCategoryItem` уже содержит `name`/`color` — это была бы бессмысленная лишняя сетевая
  зависимость и код, дублирующий работу, уже сделанную сервером.
- **`Promise.allSettled` внутри `loadMonthlySummary`:** там ровно один промис (`getSummary`) —
  `allSettled` для одного промиса не даёт ничего сверх `try/catch`, только усложняет код.
- **Импорт `EmptyState` из `widgets/recent-transactions/ui/empty-state.tsx` в новый widget:**
  запрещено правилом FSD «кросс-импорты внутри слоя запрещены» (оба — `widgets`). Пустое
  состояние по D-07 — «короткий текст», не полноценный `EmptyState` с `backHref` — проще
  заинлайнить `<p className="text-sm text-muted-foreground">…</p>` локально в
  `monthly-summary.tsx`, а не тащить компонент через слой.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Форматирование денег | Свой `Intl.NumberFormat`-вызов или `toFixed` | `formatMoney` (`shared/lib/utils.ts`) | Единственный форматтер в проекте (D-04), уже обрабатывает знак и валюту |
| Цвет категории в таблице | Свой `<span style={{background: color}}>` | `CategoryDot` (`entities/category/ui/category-dot.tsx`) | Уже используется в `ExpensesTable`/`RecentTransactions`, визуальная консистентность |
| Знаковая сумма с цветом в таблице категорий | Новый компонент `SummaryAmount` | `TransactionAmount` (напрямую, см. Pattern 6) | Проп-шейп совпадает 1:1, дублирующий компонент не нужен |
| Джойн категории к строке сводки | `getCategories()` + `Map<id, Category>` | Ничего — поля уже в ответе `GET /transactions/summary` | Сервер уже отдаёт `name`/`color` на каждой строке `byCategory` |
| Таблица (`<table>` разметка) | Своя HTML-таблица | `Table`/`TableHeader`/`TableBody`/`TableRow`/`TableCell`/`TableHead` (`shared/ui/table.tsx`) | Уже есть, используется `TransactionsTable` |
| Контейнер карточки | Свой `<div className="border rounded">` | `Card`/`CardHeader`/`CardTitle`/`CardContent` (`shared/ui/card.tsx`) | Тот же визуальный язык, что у `RecentTransactions` |

**Key insight:** Эта фаза — почти чистая сборка из существующих примитивов. Единственный
реальный риск hand-roll — по инерции скопировать двух-запросный паттерн
`loadRecentTransactions` (он там нужен из-за отсутствующего джойна в `TransactionDto`), хотя
`TransactionSummary`/`SummaryCategoryItem` устроены иначе и джойн уже сделан на сервере.

## Common Pitfalls

### Pitfall 1: Локальный `getMonth()`/`getFullYear()` вместо UTC-версий
**What goes wrong:** На стыке месяца (например, 23:xx по местному времени 30-го числа при
сервере в часовом поясе восточнее UTC) `new Date().getMonth()` вернёт месяц, отличный от
UTC-месяца, который использует `TransactionsService.summary()` для расчёта границ (`from`/`to`
строятся через `Date.UTC(year, month-1, 1)`).
**Why it happens:** `Date.prototype.getMonth()` — локальное время процесса, а не UTC; сервер
может выполняться не в UTC-таймзоне.
**How to avoid:** Использовать `now.getUTCMonth() + 1` / `now.getUTCFullYear()` в
`loadMonthlySummary` (см. Pattern 3) — согласовано с `Date.UTC` в
`transactions.service.ts:120-121`.
**Warning signs:** Сводка показывает данные не за тот месяц в первые/последние часы месяца,
не воспроизводится при ручном тестировании в середине месяца — тот же класс бага, что описан в
CLAUDE.md § «Два разных формата даты» (прецедент фазы 2 с `buildIsoNoon`).

### Pitfall 2: Дублирующийся `categoryId` в `byCategory` — ключ React только по `categoryId`
**What goes wrong:** `React key={item.categoryId}` без учёта `type` вызовет предупреждение о
дублирующихся ключах и непредсказуемый рендер, если одна и та же категория использовалась и в
доходной, и в расходной транзакции за месяц.
**Why it happens:** `Category` (VERIFIED, `apps/api/prisma/schema.prisma`, строки 48-62) не
содержит поля `type` — категория не привязана к направлению транзакции на уровне схемы, а
`groupBy` в `summary()` группирует `by: ['categoryId', 'type']` (VERIFIED,
`transactions.service.ts`, строки 126-131: `` this.prisma.transaction.groupBy({ by:
['categoryId', 'type'], where, _sum: { amount: true } }) ``). Значит одна категория может
дать **две** строки в `byCategory` с одинаковым `categoryId`, но разным `type` (например,
категория «Прочее», использованная и как доход, и как расход в одном месяце).
**How to avoid:** React-ключ строить как `` `${item.categoryId}-${item.type}` `` (см. Pattern 6),
не голый `item.categoryId`.
**Warning signs:** React console warning «two children with the same key»; визуально —
дублирующаяся или пропавшая строка в таблице при наличии категории с транзакциями обоих типов.

### Pitfall 3: `month`/`year` не переданы или переданы необязательными
**What goes wrong:** 400 от api вместо данных сводки.
**Why it happens:** `SummaryQueryDto` **не** помечен `@IsOptional` (VERIFIED,
`apps/api/src/modules/transactions/dto/summary-query.dto.ts`, строки 6-18: комментарий
«month и year обязательны — без @IsOptional undefined не пройдёт @IsInt», оба поля с
`@IsInt`/`@Min`/`@Max` без `@IsOptional`) — в отличие от фильтров списка транзакций, где
`dateFrom`/`dateTo` опциональны.
**How to avoid:** `getSummary` всегда строит query с обоими параметрами (см. Pattern 1),
`loadMonthlySummary` всегда вычисляет оба перед вызовом — никогда не вызывать `getSummary` без
одного из значений.
**Warning signs:** `apiErrorMessage` вернёт текст ошибки валидации вместо данных; в
`extractFieldErrors`-формате это будет `{ month: [...] }` или `{ year: [...] }`, но сводка не
проходит через per-field форму — просто покажется как общая ошибка `summaryResult.status === 'error'`.

### Pitfall 4: Попытка переиспользовать `TransactionAmount` для карточки «Баланс»
**What goes wrong:** `TransactionAmount` требует `type: TransactionType` — у баланса такого
поля нет и не должно быть (баланс — не транзакция и не имеет направления), а хардкод любого
`type` дал бы неверный цвет или неверный знак-префикс поверх уже знакового `formatMoney`.
**Why it happens:** Соблазн переиспользовать компонент, раз он уже даёт нужные цвета.
**How to avoid:** Для трёх карточек — свой мелкий компонент/разметка с `formatMoney` напрямую
и явным `colorClassName` (см. Pattern 5); `TransactionAmount` переиспользуется только в
строках таблицы категорий (Pattern 6), где проп-шейп реально совпадает.
**Warning signs:** В UI-review карточка «Баланс» неожиданно красная/зелёная вместо нейтральной,
либо двойной знак («−-500 ₽»).

## Code Examples

Все примеры в разделе `Architecture Patterns` (Pattern 1-6) взяты из чтения актуального кода
этой сессии — отдельного раздела не требуется, дублировать нечего.

## State of the Art

Фаза продолжает паттерн, установленный в фазах 1-2 (Server Component + server-only лоадер +
`Promise.all`/`allSettled` в `DashboardView`) без изменений подхода — «Old Approach» / «Current
Approach» не различаются, таблица не применима.

**Deprecated/outdated:** нет — фаза не затрагивает устаревающий код.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Месяц/год для `loadMonthlySummary` следует вычислять через `getUTCMonth()`/`getUTCFullYear()`, а не локальные `getMonth()`/`getFullYear()` | Pattern 3, Pitfall 1 | D-02 в CONTEXT.md говорит только «текущая дата сервера», не уточняя UTC/локальное время. Если сервер деплоится не в UTC-таймзоне и решение будет иным (локальное время), возможен видимый пользователю сдвиг месяца на границе месяца — рекомендация основана на согласовании с `Date.UTC` в `summary()`, а не на явно зафиксированном решении |
| A2 | Разбивка виджета на `monthly-summary.tsx` + `summary-stats.tsx` + `summary-category-table.tsx` (три файла) | Recommended Project Structure | Организационное решение, не зафиксировано в CONTEXT.md (discretion UI-фазы/планировщика) — можно собрать в один файл без функциональной разницы |
| A3 | Имя FSD-слайса `widgets/monthly-summary` | Recommended Project Structure | CONTEXT.md явно называет это «рабочим названием», допускающим замену планировщиком/UI-исследователем — при переименовании поправить все импорты по образцу этого документа |

## Open Questions

1. **Нужен ли отдельный файл `summary-stats.tsx`/`summary-category-table.tsx`, или всё в одном `monthly-summary.tsx`?**
   - What we know: CONTEXT.md оставляет точную разметку UI-фазе, функциональных ограничений нет.
   - What's unclear: предпочтение по размеру файла/для более удобного code review.
   - Recommendation: планировщик может решить сам исходя из объёма итоговой разметки; оба варианта совместимы с этим research.

## Validation Architecture

> `workflow.nyquist_validation: true` (`.planning/config.json`, прочитан этой сессией) — секция обязательна.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | none — подтверждено этой сессией: `grep -rn "test" package.json apps/web/package.json apps/api/package.json` по секциям `scripts` не дал совпадений ни в одном из трёх `package.json`; тот же вывод, что зафиксирован в `01-RESEARCH.md`/`02-RESEARCH.md` |
| Config file | none — см. Wave 0 |
| Quick run command | none available |
| Full suite command | none available |

CLAUDE.md подтверждает это прямо: «Тестов в проекте нет — раннер не настроен.»
`[VERIFIED: apps/api/package.json, apps/web/package.json, root package.json — прочитаны/проверены grep'ом этой сессией, скрипта test нет ни в одном]`.

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SUM-01 | На `/dashboard` видны баланс/доходы/расходы за текущий месяц, посчитанные на основе `GET /transactions/summary` | manual-only | — | ❌ Нет фреймворка — Wave 0 |
| SUM-02 | Таблица разбивки по категориям (сумма, категория, цвет), отсортированная по убыванию суммы, без графиков | manual-only | — | ❌ Нет фреймворка — Wave 0 |

Ручные сценарии, которые должен покрыть `/gsd-verify-work` для этих двух требований (без
фреймворка единственная доступная проверка — `manual_procedural`, по прецеденту фаз 1-2):

1. **SUM-01 — базовый рендер:** зайти на `/dashboard` пользователем с транзакциями за текущий
   месяц → карточки «Баланс»/«Доходы»/«Расходы» показывают значения, согласованные с прямым
   вызовом `GET /api/transactions/summary?month=&year=` за тот же период (сверка числа в числ,
   не приблизительно) — подтверждает, что `loadMonthlySummary` передаёт корректные `month`/`year`
   и не расходится с сервером (см. Pitfall 1).
2. **SUM-01 — знак и цвет:** у пользователя с расходами больше доходов за месяц баланс
   отрицательный → значение показывается со знаком «−» через `formatMoney`, но карточка
   «Баланс» остаётся нейтрального цвета (не красная) — проверяет D-03 буквально, а не только
   цвет доход/расход.
3. **SUM-01 — пустой месяц:** пользователь без единой транзакции за текущий месяц (или новый
   тестовый пользователь) → три карточки показывают нули (не скрыты, не placeholder), под
   таблицей — текст пустого состояния вместо таблицы без строк (D-07).
4. **SUM-02 — сортировка и содержимое строки:** у пользователя ≥3 категорий с транзакциями за
   месяц → строки таблицы идут по убыванию `total` (сверить порядок с прямым вызовом api, где
   `byCategory` уже отсортирован сервером — см. `transactions.service.ts:147-158`), у каждой
   строки — точка цвета категории, имя, знаковая сумма нужного цвета; колонки «Тип»/«% от
   общего» отсутствуют (D-06).
5. **SUM-02 — дубли categoryId/type:** если у тестового пользователя есть категория,
   использованная и в доходной, и в расходной транзакции за месяц (см. Pitfall 2) → в таблице
   две отдельные строки (доход и расход отдельно), без React-предупреждения о дублирующихся
   ключах в консоли браузера, без визуально «пропавшей» строки — это сценарий, который стоит
   отдельно завести в тестовых данных, а не полагаться на то, что он возникнет случайно.
6. **Ошибка/авторизация:** протухшая access-кука (или намеренно сломанный токен) → редирект на
   `/session-expired`, а не полу-отрендеренная страница с ошибкой сводки; отдельно — 5xx только
   от `/transactions/summary` (например, временно уронить эндпоинт) → текст «Не удалось
   загрузить сводку: …» показывается рядом с существующим паттерном ошибки, а список последних
   транзакций рендерится нормально (независимость веток по D-08).

Обоснование manual-only по всей строке: тот же прецедент, что в `01-RESEARCH.md`/`02-RESEARCH.md`
— фреймворк тестов не введён ни в одной из предыдущих фаз, вводить его молча ради одной фазы
не входит в её скоуп (project-wide решение).

### Sampling Rate
- **Per task commit:** `npm run typecheck` (ловит расхождение зеркалируемых типов
  `TransactionSummary`/`SummaryCategoryItem` между api и `entities/transaction/model/types.ts` —
  ровно тот класс ошибок, на который указывает Pattern 2)
- **Per wave merge:** `npm run typecheck && npm run lint`
- **Phase gate:** ручной UAT-проход сценариев 1-6 выше через `/gsd-verify-work` (диалоговый),
  автоматического набора нет

### Wave 0 Gaps
- Фреймворк тестов не установлен на уровне проекта — существующий пробел (с фазы 1), не новый
  для этой фазы. Не устраняется здесь — по тому же обоснованию «manual-only, по прецеденту», что
  выше.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V2 Authentication | yes | Существующий `JwtAuthGuard` (глобальный `APP_GUARD`) + httpOnly `access_token`/`refresh_token` — не меняется этой фазой |
| V3 Session Management | yes | Существующая ротация refresh-токена в `proxy.ts` — не меняется, `loadMonthlySummary` использует тот же `accessToken` из `getSession()` |
| V4 Access Control | yes | `TransactionsService.summary()` фильтрует по `userId` (VERIFIED, `transactions.service.ts:122`: `` const where = { userId, date: { gte: from, lt: to } } ``) — уже реализовано, фаза 3 только читает результат |
| V5 Input Validation | yes | `SummaryQueryDto` (`month`/`year`, `@IsInt`+`@Min`+`@Max`, оба обязательны) — уже реализовано на api; фронт обязан всегда передавать оба параметра (Pitfall 3) |
| V6 Cryptography | no | Фаза не выполняет криптографических операций |

### Known Threat Patterns for stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|----------------------|
| IDOR — чтение чужой сводки по подмене параметров | Information Disclosure | Уже митигировано `where: { userId, ... }` в `summary()` — новых параметров, принимаемых от клиента напрямую в query кроме `month`/`year`, фаза не добавляет |
| XSS через `color` категории в inline-стиле `CategoryDot` | Tampering | Не новый риск этой фазы: цвет категории уже ограничен фиксированной палитрой `CATEGORY_COLORS` (10 значений) при создании категории — `SummaryCategoryItem.color` берётся из той же таблицы `Category`, что и везде на фронте |

## Sources

### Primary (HIGH confidence — прочитано этой сессией)
- `apps/api/src/modules/transactions/transactions.service.ts` — метод `summary`, строки 117-170
- `apps/api/src/modules/transactions/transaction.types.ts` — `TransactionSummary`, `SummaryCategoryItem`, строки 19-36
- `apps/api/src/modules/transactions/dto/summary-query.dto.ts` — весь файл
- `apps/api/prisma/schema.prisma` — модели `Category` (строки 48-62), `Transaction` (строки 70-91)
- `apps/web/src/widgets/recent-transactions/api/load-recent-transactions.ts` — весь файл
- `apps/web/src/views/dashboard/ui/dashboard-view.tsx` — весь файл
- `apps/web/src/entities/transaction/api/get-transactions.ts`, `apps/web/src/entities/category/api/get-categories.ts`
- `apps/web/src/entities/transaction/ui/transaction-amount.tsx`, `apps/web/src/entities/category/ui/category-dot.tsx`
- `apps/web/src/entities/transaction/model/types.ts`
- `apps/web/src/shared/lib/utils.ts` (`formatMoney`, `cn`)
- `apps/web/src/shared/api/api-client.ts`, `apps/web/src/shared/api/error-message.ts`
- `apps/web/src/shared/ui/card.tsx`, `apps/web/src/shared/ui/table.tsx`
- `apps/web/src/widgets/recent-transactions/ui/{recent-transactions,transactions-table,empty-state}.tsx`
- `apps/web/src/shared/config/routes.ts`
- `apps/web/package.json` (версии `next`/`react`)
- `.planning/phases/03-svodka-i-balans/03-CONTEXT.md`
- `.planning/REQUIREMENTS.md` §SUM-01, §SUM-02
- `.claude/CLAUDE.md`

### Secondary (MEDIUM confidence)
Не использовались — вся необходимая информация получена прямым чтением исходников проекта
(внешних библиотек/API фаза не вводит, WebSearch/Context7 не требовались).

### Tertiary (LOW confidence)
Нет.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — версии подтверждены чтением `package.json`, новых пакетов нет
- Architecture: HIGH — все паттерны интеграции прочитаны из актуального кода этой сессии
- Pitfalls: HIGH — Pitfall 2 (дублирование `categoryId`) верифицирован сопоставлением схемы Prisma и кода `groupBy`, не предположение

**Research date:** 2026-09-21
**Valid until:** 30 дней (стек стабилен, backend-эндпоинт не меняется этой фазой)

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-------------------|
| SUM-01 | Пользователь видит сводку баланса/доходов/расходов за текущий месяц на дашборде (на основе `GET /transactions/summary`) | Pattern 3 (лоадер с UTC-вычислением месяца), Pattern 4 (интеграция в `DashboardView`), Pattern 5 (три карточки) |
| SUM-02 | Пользователь видит разбивку доходов/расходов по категориям в виде таблицы (сумма, категория, цвет), отсортированной по убыванию суммы — без графиков | Pattern 6 (таблица `byCategory` с прямым переиспользованием `TransactionAmount`), Pitfall 2 (корректный React-ключ), подтверждение сортировки на сервере (`transactions.service.ts:147-158`) |

</phase_requirements>

---

*Phase: 3-Сводка и баланс*
*Research completed: 2026-09-21*
