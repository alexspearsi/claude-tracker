# Deferred Items — Phase 2 (Транзакции)

Обнаружено, но вне скоупа текущего плана (SCOPE BOUNDARY) — фиксируется, не чинится.

## 02-01: `npm run typecheck` для apps/api не проходит в этом worktree

**Что происходит:** `apps/api` не собирает Prisma-клиент — `prisma:generate` падает с
`PrismaConfigEnvError: Cannot resolve environment variable: DATABASE_URL`, а без сгенерированного
клиента `tsc --noEmit` в `apps/api` валится на импортах `../generated/prisma/*` и на
`PrismaService`-делегатах (`Property 'category' does not exist on type 'PrismaService'` и т.п.).

**Почему вне скоупа:** план 02-01 не трогает ни одного файла в `apps/api` (весь `files_modified`
— `apps/web` + `package-lock.json`). Причина — этот git worktree создан изолированно и не
унаследовал `apps/api/.env` (`DATABASE_URL`), который есть в основном репозитории, но
gitignored и потому не копируется harness'ом при создании worktree. Это дефект окружения
worktree, а не код, изменённый этим планом.

**Проверено:** `npm run typecheck --workspace=apps/web` (единственный пакет, который правит этот
план) проходит кодом 0, без единой ошибки — гейт плана выполнен для затронутого кода.

**Что делать:** при мёрже в основную ветку/при работе не в изолированном worktree
`npm run typecheck` полного монорепо должен пройти как обычно (там `.env` есть). Если этот
worktree переживёт мёрж и с ним продолжат работать — скопировать `apps/api/.env` из основного
репозитория вручную (не через агента: файл содержит секреты).
