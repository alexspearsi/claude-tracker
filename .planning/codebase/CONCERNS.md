---
last_mapped_commit: 7bdd32cff1b9829a6507c35f437d7e395a9906a3
last_mapped_at: 2026-09-20
---
# Codebase Concerns

**Analysis Date:** 2026-09-20

## Tech Debt

**Testing framework not configured:**

- Issue: No test runner is set up in the project (`CLAUDE.md` states explicitly "Тестов в проекте нет — раннер не настроен")
- Files: All application code (`apps/api/src`, `apps/web/src`, `packages/shared/src`)
- Impact: Zero test coverage; any change risks introducing bugs; refactoring is dangerous without safety net
- Fix approach: Set up Jest or Vitest; start with auth and transaction logic (highest risk paths); configure pre-commit hook to run tests

**Database seed file empty:**

- Issue: `apps/api/prisma/seed.ts` has only a TODO comment; no demo data is populated
- Files: `apps/api/prisma/seed.ts`
- Impact: Developers cannot test the app without manually creating users and data; impossible to verify UI screens work with real data
- Fix approach: Create demo user (email: demo@example.com), add 3–4 basic categories (Еда, Транспорт, Жильё, Работа), add 5–10 sample transactions across different months

**Stub pages for major features:**

- Issue: `/expenses` and `/categories` pages are empty placeholders with TODOs
- Files: `apps/web/src/app/(dashboard)/expenses/page.tsx`, `apps/web/src/app/(dashboard)/categories/page.tsx`
- Impact: Two core features of the app are non-functional; users cannot view or manage their transactions and categories
- Fix approach: Implement `/expenses` page with transaction list, filters (date, category, type), and pagination; implement `/categories` page with CRUD operations

**Route naming mismatch (Transactions vs. Expenses):**

- Issue: API module is named `transactions` (`/api/transactions`), but the frontend menu item and route are `/expenses`. The `expenses` module was removed from the API but the route name persists on the frontend.
- Files: `apps/web/src/shared/config/routes.ts` (exports `expenses: '/expenses'`), `apps/api/src/modules/transactions/` (entity is `Transaction`)
- Impact: Conceptual mismatch between API and frontend; confusing for developers; potential for future bugs if new features use "expenses" terminology
- Fix approach: Rename `/expenses` to `/transactions` throughout the frontend; update menu labels to use "Транзакции" consistently

## Known Bugs

**Unknown routes return Express HTML instead of JSON:**

- Symptoms: Requesting a non-existent route (e.g., `/api/foo`) returns HTML error page from Express, not the JSON error format defined in `HttpExceptionFilter`
- Files: `apps/api/src/main.ts`, `apps/api/src/common/filters/http-exception.filter.ts`
- Trigger: GET/POST/etc. to any undefined route
- Workaround: The filter is correctly implemented; the issue is that Express default 404 handler runs before the filter catches it. This is minor (API clients will see HTML instead of JSON), not a security issue.
- Fix approach: Register a catch-all handler in `main.ts` after `app.useGlobalFilters()` or configure NestJS to use the filter for 404s

## Security Considerations

**Session cookie security depends on httpOnly flag:**

- Risk: Access and refresh tokens are stored in httpOnly cookies; if the `SESSION_COOKIE_OPTIONS` are misconfigured or the flag is removed, XSS could steal tokens
- Files: `apps/web/src/entities/session/model/cookies.ts` (defines `SESSION_COOKIE_OPTIONS`)
- Current mitigation: `httpOnly: true` is set; cookies are `secure: true` in production (depends on environment configuration)
- Recommendations: 
  - Verify `secure: true` is enforced in production environment (should be set by `process.env.NODE_ENV === 'production'`)
  - Audit all places where tokens are read (`refreshSession()`, `getSession()`) to ensure they never log or expose tokens
  - Consider adding `SameSite: 'strict'` to cookie options to prevent CSRF

**JWT secret rotation not handled:**

- Risk: If `JWT_ACCESS_SECRET` or `JWT_REFRESH_SECRET` are rotated in `apps/api/src/modules/auth/jwt.strategy.ts`, old tokens become invalid. Users with active sessions will be logged out.
- Files: `apps/api/src/modules/auth/jwt.strategy.ts` (reads `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` from config)
- Current mitigation: None; there's no graceful degradation or old-key support
- Recommendations: 
  - Document rotation procedure (e.g., keep old secret available for 5 minutes during rotation)
  - Consider storing key versions in tokens so multiple keys can be tried

**Refresh token stored as hash, but no rate limiting on refresh endpoint:**

- Risk: If a user's refresh token is compromised, an attacker can request new access tokens indefinitely (until refresh expires in 30 days)
- Files: `apps/api/src/modules/auth/commands/refresh-tokens.handler.ts`
- Current mitigation: Token is revoked on refresh (RotateOnRefresh), so only one valid token exists at a time
- Recommendations: 
  - Add rate limiting to `/auth/refresh` endpoint (e.g., 10 requests per minute per IP)
  - Log refresh attempts to detect suspicious patterns
  - Consider implementing device tracking (store device ID with refresh token)

**CategoryId in transaction doesn't validate user ownership at DB level:**

- Risk: While the service checks `assertCategoryBelongsToUser()`, if this check is ever bypassed or a refactor removes it, a user could attach a transaction to another user's category
- Files: `apps/api/src/modules/transactions/transactions.service.ts` (line 68: `await this.assertCategoryBelongsToUser()`)
- Current mitigation: Check is present and consistent; Prisma ForeignKeyViolation (P2003) will catch cross-user references if category is deleted
- Recommendations: 
  - Add a database-level check: make `Category.userId` part of the foreign key constraint (this requires composite foreign key)
  - Alternatively, add a check trigger in PostgreSQL to validate `transactions.userId = categories.userId`

## Performance Bottlenecks

**Categories fetched without pagination:**

- Problem: `GET /api/categories` returns all user categories without limit. If a user has 1000+ categories (unlikely but possible), the response is slow and uses memory.
- Files: `apps/api/src/modules/categories/categories.service.ts` (line 27: `findMany` has no `take`/`skip`)
- Cause: Categories are assumed to be small in number; no pagination was implemented
- Improvement path: Add `limit` and `offset` query parameters; set max limit to 100

**Potential N+1 query in transaction summary:**

- Problem: `GET /api/transactions/summary` fetches all transactions for a month, then fetches all categories in a separate query
- Files: `apps/api/src/modules/transactions/transactions.service.ts` (lines 124–143)
- Cause: While optimized with `Promise.all()`, if a user has 1000 transactions across 50 categories, we do 2 queries. Could be 1 with a join.
- Improvement path: Refactor to use `findMany` with `include: { category: true }` instead of separate `groupBy` + fetch; this trades memory for fewer round-trips

**Date filtering recalculates every request:**

- Problem: `buildDateFilter()` recalculates date boundaries on every transaction list request
- Files: `apps/api/src/modules/transactions/transactions.service.ts` (line 191–204)
- Cause: Not a bottleneck for small data, but the logic is correct and doesn't scale as issue
- Improvement path: Consider caching date boundaries if the function is called frequently; current implementation is acceptable

## Fragile Areas

**Proxy refresh token exchange race condition:**

- Files: `apps/web/src/proxy.ts` (lines 44–65)
- Why fragile: Token refresh is protected against concurrent calls via `missing: [{ type: 'header', key: 'next-router-prefetch' }]`, but the protection is implicit in the matcher. If someone adds a Server Action that calls `refreshSession()` while proxy is also trying to refresh, the second one fails and clears the session.
- Safe modification: 
  - Never call `refreshSession()` in a component or widget directly; always use `getSession()` which doesn't refresh
  - Document that only proxy and logout actions should refresh tokens
  - Consider adding a mutex or flag to prevent concurrent refreshes

**Token expiry calculation relies on JWT `exp` field:**

- Files: `apps/web/src/entities/session/lib/token-expiry.ts` (parses JWT manually to extract `exp`)
- Why fragile: If JWT format changes or the token is malformed, the expiry calculation silently fails and returns a wrong date
- Safe modification: 
  - Add error handling to `tokenExpiresAt()` to throw if token is invalid
  - Add unit tests for edge cases (malformed tokens, expired tokens, future tokens)

**Error swallowing in refreshSession():**

- Files: `apps/web/src/entities/session/api/session.ts` (line 71: bare `catch` block)
- Why fragile: `catch` block clears session and returns null for any error (network error, parse error, API error). If there's a bug in the code path, it will silently fail without indication.
- Safe modification: 
  - Log the error (at least in development: `if (process.env.NODE_ENV === 'development') console.error(error)`)
  - Consider rethrowing network errors (when `fetch` itself fails) vs. API errors (4xx/5xx responses)

**DTO validation doesn't cover all constraints:**

- Files: `apps/api/src/modules/categories/dto/create-category.dto.ts`, `apps/api/src/modules/transactions/dto/create-transaction.dto.ts`
- Why fragile: Class-validator rules don't prevent all invalid states (e.g., zero amounts, category names that are too long). Combined with `whitelist: true`, the API rejects unknown fields but allows invalid values to be processed.
- Safe modification: 
  - Add `@Min(0.01)` and `@Max(999999.99)` to amount fields
  - Add `@MaxLength(50)` to category names (matches DB schema `VarChar(50)`)
  - Test boundary conditions in unit tests

**Global AuthGuard loaded only via AuthModule:**

- Files: `apps/api/src/modules/auth/auth.module.ts` (lines 27: `{ provide: APP_GUARD, useClass: JwtAuthGuard }`)
- Why fragile: The guard is registered in a feature module, not AppModule. If AuthModule is ever lazy-loaded or conditionally imported, the guard won't apply. CLAUDE.md warns against using `@UseGuards(JwtAuthGuard)` locally (it causes startup errors).
- Safe modification: 
  - Never add `@UseGuards` decorators locally; all routes are protected by default
  - Consider moving guard registration to AppModule with a feature flag if global protection ever needs to be toggled
  - Document this constraint in code comments

## Scaling Limits

**Hard limit on transaction limit parameter:**

- Current capacity: Max 100 transactions per page (`LIMIT_DEFAULT = 20`, max `100` in validation)
- Limit: If a user has 10,000+ transactions, pagination becomes tedious (100+ pages)
- Scaling path: Maintain current limits; add cursor-based pagination as optimization if scroll performance becomes an issue

**Refresh token table unbounded growth:**

- Current capacity: One token per session; 30-day expiry means old tokens are cleaned up (eventually)
- Limit: `refresh_tokens` table has a `revokedAt` field but no automatic cleanup job. Old, expired tokens accumulate.
- Scaling path: Add a migration/job to delete tokens where `expiresAt < NOW() - INTERVAL 1 DAY` daily; consider adding TTL index in PostgreSQL

**Category name uniqueness only per user:**

- Current capacity: 50 character limit per name (`VarChar(50)`)
- Limit: No scaling limit; this is by design (categories are per-user)
- Scaling path: None needed

## Dependencies at Risk

**TypeScript 6.0.3 pinned (cannot upgrade to 7.x):**

- Risk: Version 7.x removed programmatic compiler API; `nest build` explicitly fails with 7.x. Pinning blocks access to bug fixes and performance improvements in TS 7+.
- Files: `package.json` (`"typescript": "6.0.3"`), `apps/api/package.json` (`"typescript": "6.0.3"`)
- Impact: Bug fixes and language features in 7.x are unavailable; must stay on 6.0.3 until Nest supports it
- Migration plan: Monitor Nest 12.x releases for support announcement; upgrade both TypeScript and Nest together

**ESLint 9.39.5 pinned (cannot upgrade to 10.x):**

- Risk: ESLint 10 breaks eslint-plugin-react with `contextOrFilename.getFilename is not a function`
- Files: `apps/api/package.json` (`"eslint": "9.39.5"`), `apps/web/package.json` (`"eslint": "9.39.5"`)
- Impact: New ESLint rules and fixes are unavailable in 10.x; must use flat config workarounds
- Migration plan: Monitor eslint-plugin-react and TypeScript-ESLint releases; they need updates to support ESLint 10

**Prisma 7.10.0 pinned (latest tag points to 8.x RC):**

- Risk: `npm install` may eventually resolve `@prisma/client@latest` to 8.x (RC), causing version mismatch with `prisma@7.10.0`
- Files: `apps/api/package.json` (`"prisma": "7.10.0"`, `"@prisma/client": "7.10.0"`)
- Impact: Build failures if CLI and client versions diverge; schema generation breaks
- Migration plan: Keep pinned until Prisma 8 is stable; update both together after release

## Missing Critical Features

**Expenses and categories pages incomplete:**

- Problem: `/expenses` and `/categories` routes render empty placeholders; users cannot interact with transactions or categories from the UI
- Blocks: Core app functionality; users must use API directly
- Priority: **High** — these are blocking features for any MVP

**No user profile/settings page:**

- Problem: Users cannot change their password, name, or delete their account
- Blocks: User account management features
- Priority: **Medium** — typical in first iteration; password reset usually added later

## Test Coverage Gaps

**Auth module untested:**

- What's not tested: JWT generation, token refresh, login validation, password hashing
- Files: `apps/api/src/modules/auth/*`, `apps/web/src/features/auth/*`
- Risk: Any refactor of auth logic could break login/logout without being caught
- Priority: **High** — auth is security-critical

**Transaction filtering untested:**

- What's not tested: Date range logic, category filtering, pagination offset/limit edge cases, secondary sort key (createdAt) when dates match
- Files: `apps/api/src/modules/transactions/transactions.service.ts` (findAll, buildDateFilter)
- Risk: Pagination edge cases (duplcates, missing records) could happen silently if skip/take logic is changed
- Priority: **High** — affects data consistency

**Session refresh untested:**

- What's not tested: Token expiry parsing, cookie lifecycle, concurrent refresh attempts, error handling
- Files: `apps/web/src/entities/session/*`
- Risk: Session management failures could lock out entire user base without being caught
- Priority: **High** — session is critical infrastructure

**Proxy routing untested:**

- What's not tested: Guest-only routes redirect correctly, protected routes block unauthenticated access, prefetch filtering works
- Files: `apps/web/src/proxy.ts`
- Risk: Routing logic bypass (e.g., someone accesses `/dashboard` without token) could expose data
- Priority: **Medium** — security risk but mitigated by JwtAuthGuard

**Error message translation untested:**

- What's not tested: `apiErrorMessage()` extraction of error text from Nest response format, Zod validation message parsing
- Files: `apps/web/src/shared/api/error-message.ts`
- Risk: Users see raw JSON or fallback "Service unavailable" messages instead of helpful error text
- Priority: **Low** — UX issue, not functional

---

*Concerns audit: 2026-09-20*
