# Трекер расходов

Веб-приложение для учёта личных доходов и расходов по категориям: единая
сущность транзакций (`INCOME`/`EXPENSE`), фильтры по периоду/типу/категории,
месячная аналитика с разбивкой по категориям.

## Стек

Монорепозиторий на npm workspaces.

| Пакет | Стек | Порт |
|---|---|---|
| `apps/web` | Next.js 16 (App Router), React 19, Tailwind 4 + shadcn/ui, react-hook-form + Zod | 3001 |
| `apps/api` | Nest.js 12 (ESM), Prisma 7 + `@prisma/adapter-pg`, PostgreSQL 16, CQRS | 4001 (`/api`) |
| `packages/shared` | Zod-схемы и типы, общие для api и web | — |

Порты нестандартные (3000/4000/5432 заняты другими процессами на машине) —
это осознанное решение, см. `CLAUDE.md`.

## Требования

- Node.js ≥ 22 (см. `.nvmrc` — используется 24)
- Docker (для локального PostgreSQL) либо своя БД PostgreSQL 16
- npm (workspaces)

## Быстрый старт

```bash
npm install

cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

В `apps/api/.env` замените `JWT_ACCESS_SECRET` и `JWT_REFRESH_SECRET` на свои
значения (например, `openssl rand -base64 48`) — в примере лежат заглушки.

```bash
npm run db:up            # postgres:16 в docker, порт 5433
npm run prisma:migrate   # миграции + генерация Prisma-клиента
npm run dev               # shared собирается, затем api (4001) и web (3001)
```

Проверка, что api поднялся: `curl http://localhost:4001/api/health` →
`{"status":"ok", ...}`.

### Переменные окружения

**Корень (`.env`, читает `docker-compose.yml`):**

| Переменная | Назначение |
|---|---|
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | параметры контейнера БД |
| `POSTGRES_PORT` | порт на хосте (по умолчанию 5433) |

**`apps/api/.env`:**

| Переменная | Назначение |
|---|---|
| `DATABASE_URL` | строка подключения к Postgres |
| `PORT` | порт Nest (по умолчанию 4001) |
| `CORS_ORIGIN` | адрес фронтенда, которому разрешён CORS |
| `JWT_ACCESS_SECRET`, `JWT_ACCESS_TTL` | секрет и срок жизни access-токена |
| `JWT_REFRESH_SECRET`, `JWT_REFRESH_TTL` | секрет и срок жизни refresh-токена |

**`apps/web/.env.local`:**

| Переменная | Назначение |
|---|---|
| `NEXT_PUBLIC_API_URL` | базовый URL api (`http://localhost:4001/api`) |

### База данных

```bash
npm run db:up             # поднять postgres:16 в docker (порт 5433)
npm run prisma:migrate    # применить миграции (prisma migrate dev)
npm run prisma:generate   # перегенерировать Prisma-клиент без миграции
npm run prisma:studio     # открыть Prisma Studio
npm run db:down           # остановить контейнер БД
```

### Dev-сервер

```bash
npm run dev        # shared → api + web одновременно
npm run dev:api     # только api (nest start --watch)
npm run dev:web     # только web (next dev --turbopack)
```

Другие команды — `npm run build`, `npm run typecheck`, `npm run lint` — см.
`CLAUDE.md`.

## Структура проекта

```
apps/
  api/                    # Nest.js API
    src/
      modules/            # auth, users, categories, transactions
      common/              # гварды, декораторы, фильтры, пайпы
      contracts/           # CQRS-команды и запросы
      prisma/               # провайдер PrismaClient (токен PRISMA)
      config/               # валидация env
    prisma/                # schema.prisma и миграции
  web/                     # Next.js фронтенд
    src/
      app/                 # роутинг Next: layout'ы, page.tsx, metadata
      views/                # экраны целиком (login, register)
      features/             # действия пользователя: формы, Server Actions
      entities/              # предметные сущности (session — токены в куках)
      shared/                 # ui (shadcn/ui), lib, api, config
      proxy.ts                # защита роутов + обновление access-токена
packages/
  shared/                   # Zod-схемы, общие типы для api и web
```

Фронтенд организован по Feature Slice Design, импорт разрешён только вниз:
`app → views → widgets → features → entities → shared`. Подробности — в
`CLAUDE.md`.

## Основные эндпоинты

Базовый префикс — `/api` (`http://localhost:4001/api`).

### Auth (`/auth`)

| Метод | Путь | Описание |
|---|---|---|
| `POST` | `/auth/register` | регистрация, возвращает пару токенов |
| `POST` | `/auth/login` | вход, возвращает пару токенов |
| `POST` | `/auth/refresh` | обмен refresh-токена на новую пару (с ротацией) |
| `POST` | `/auth/logout` | отзыв refresh-токена |
| `GET` | `/auth/me` | профиль текущего пользователя |

### Users (`/users`)

| Метод | Путь | Описание |
|---|---|---|
| `GET` | `/users/me` | профиль текущего пользователя |

### Categories (`/categories`)

| Метод | Путь | Описание |
|---|---|---|
| `GET` | `/categories` | список категорий пользователя |
| `POST` | `/categories` | создать категорию |
| `PATCH` | `/categories/:id` | обновить категорию |
| `DELETE` | `/categories/:id` | удалить категорию (409, если есть транзакции) |

### Transactions (`/transactions`)

| Метод | Путь | Описание |
|---|---|---|
| `GET` | `/transactions` | список с фильтрами `dateFrom`, `dateTo`, `type`, `categoryId` |
| `GET` | `/transactions/summary?month=&year=` | доходы/расходы/баланс за месяц с разбивкой по категориям |
| `GET` | `/transactions/:id` | одна транзакция |
| `POST` | `/transactions` | создать транзакцию |
| `PATCH` | `/transactions/:id` | обновить транзакцию |
| `DELETE` | `/transactions/:id` | удалить транзакцию |

### Health

| Метод | Путь | Описание |
|---|---|---|
| `GET` | `/health` | проверка живости api |

Все эндпоинты, кроме `/auth/register`, `/auth/login`, `/auth/refresh` и
`/health`, требуют JWT (`Authorization: Bearer <access_token>` либо
httpOnly-куку `access_token`) и возвращают только данные текущего
пользователя. Коллекция запросов Postman — в `postman/`.

## Состояние

В api реализованы auth (JWT access + refresh с ротацией), users, CRUD
категорий и CRUD транзакций с фильтрами и агрегацией. На фронте готовы вход,
регистрация и выход; страницы трат и категорий — заглушки без данных
(транзакции с фронтом пока не связаны). Подробности и известные недоделки —
в `CLAUDE.md`.
