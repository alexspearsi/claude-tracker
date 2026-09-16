# Трекер расходов

Монорепозиторий: учёт личных трат по категориям с аналитикой.

| Пакет | Стек | Порт |
|---|---|---|
| `apps/web` | Next.js 16 (App Router), React 19, Tailwind 4 + shadcn/ui | 3001 |
| `apps/api` | Nest.js 12 (ESM), Prisma 7, PostgreSQL 16 | 4001 (`/api`) |
| `packages/shared` | Zod-схемы и типы, общие для фронта и бэка | — |

Порты нестандартные: на этой машине 3000, 4000 и 5432 уже заняты другими
проектами и локально установленным PostgreSQL. БД контейнера слушает **5433**.

## Состояние

Реализованы auth, категории и транзакции (`/api/categories`, `/api/transactions`,
с пагинацией и агрегацией `summary`). На фронте готовы вход, регистрация, выход и
главный экран `/dashboard` — меню, профиль пользователя, последние транзакции с
пагинацией. Страницы категорий и списка транзакций (`/expenses`) — пока заглушки.
Подробности и история решений — в `.claude/CLAUDE.md` и `.claude/plans/`.

## Запуск

```bash
npm install
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local

npm run db:up                     # postgres:16 в docker, порт 5433
npm run prisma:migrate            # миграции + генерация клиента
npm run dev                       # shared собирается, затем web + api
```

Проверка: `curl http://localhost:4001/api/health` → `{"status":"ok",...}`.

## Особенности версий

Стек новый, и три вещи отличаются от привычных гайдов:

- **Prisma 7** убрала `url` из `datasource` — connection string живёт в
  `apps/api/prisma.config.ts`, а клиент подключается через driver adapter
  (`@prisma/adapter-pg`). `PrismaClient` больше не класс, поэтому сервис не
  наследует его, а получает через провайдер `PRISMA` (`src/prisma/prisma.provider.ts`).
  Генератор настроен на ESM с расширениями `.js` в импортах.
- **Nest 12 поставляется только как ESM**, поэтому `apps/api` — ESM-пакет
  (`"type": "module"`), и все относительные импорты в нём пишутся с `.js`.
- **ESLint закреплён на 9.x**: плагины `eslint-config-next` несовместимы с ESLint 10.
- **TypeScript закреплён на 6.0.3**: в 7.0 (Go-порт) нет программного API
  компилятора, без которого не работает `nest build`. Вернуть 7.x можно, когда
  выйдет 7.1 с этим API.
- `prisma` и `@prisma/client` пиннятся на `7.10.0`: тег `latest` у CLI сейчас
  указывает на релиз-кандидат 8.x.

## Соглашения

- **Деньги** — `Decimal(12,2)` в БД и **строка** в JSON. Никаких `float` для сумм.
- **Контракты API** описаны Zod-схемами в `packages/shared` и переиспользуются
  и в валидации Nest (`ZodValidationPipe`), и в формах Next (`zodResolver`).
- **Авторизация включена по умолчанию**: `JwtAuthGuard` подключён глобально
  в `AuthModule`, открытые роуты помечаются декоратором `@Public()`.
- **Изоляция данных**: запросы к тратам и категориям фильтруются по `userId`
  из JWT — чужие записи недоступны по прямому id.
