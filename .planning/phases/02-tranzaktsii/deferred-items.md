# Deferred Items — Phase 2 (Транзакции)

Обнаружено, но вне скоупа текущего плана (SCOPE BOUNDARY) — фиксируется, не чинится.

## 02-01: `npm run typecheck` для apps/api не проходил в этом worktree — РЕШЕНО локально

**Что происходило:** `apps/api` не собирал Prisma-клиент — `prisma:generate` падал с
`PrismaConfigEnvError: Cannot resolve environment variable: DATABASE_URL`, а без сгенерированного
клиента `tsc --noEmit` в `apps/api` валился на импортах `../generated/prisma/*` и на
`PrismaService`-делегатах. Причина — этот git worktree создан изолированно и не унаследовал
`apps/api/.env` (gitignored, не копируется harness'ом при создании worktree).

**Почему изначально вне скоупа:** план 02-01 не трогает ни одного файла в `apps/api`.

**Разрешение (для верификации Задачи 2 — сквозной human-check):** локально в этом worktree
создан `apps/api/.env` из `.env.example` со свежесгенерированными dev-секретами (не
production, только для локальной проверки) и `apps/web/.env.local` из своего `.env.example`.
БД-контейнер `expense-tracker-db` уже был поднят (общий docker-контейнер, не per-worktree) и
здоров на порту 5433, схема уже смигрирована — `prisma migrate status` подтвердил
"Database schema is up to date". Полный `npm run typecheck` (shared → api → web) теперь
проходит кодом 0.

**Файлы `.env`/`.env.local` не коммитятся** — оба в `.gitignore`, создавались только для
локального ручного прогона проверки этого плана.
