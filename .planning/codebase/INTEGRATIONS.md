---
last_mapped_commit: 7bdd32cff1b9829a6507c35f437d7e395a9906a3
last_mapped_at: 2026-09-20
---
# External Integrations

**Analysis Date:** 2026-09-20

## APIs & External Services

**None detected.** This is a standalone expense tracking application with no third-party API dependencies.

## Data Storage

**Databases:**

- PostgreSQL 16 (Alpine)
  - Connection method: Driver adapter (`@prisma/adapter-pg@7.10.0`)
  - Client: Prisma 7.10.0 (ESM, custom adapter in `apps/api/src/prisma/prisma.service.ts`)
  - Connection string env var: `DATABASE_URL` (set via `apps/api/prisma.config.ts`)
  - Schema: `apps/api/prisma/schema.prisma`
  - Tables: `users`, `refresh_tokens`, `categories`, `transactions`
  - Indexes: On `userId` + `date` (transactions), `categoryId` (transactions), `userId` (refresh_tokens)
  - Constraints: Cascade delete for user data, Restrict delete for categories (to preserve transaction history)

**Local Development:**

- Container: `expense-tracker-db` (docker-compose)
- Port: 5433 (non-standard; 5432 occupied locally)
- Volume: Named `db-data` for persistence
- Seed script: `apps/api/prisma/seed.ts` (location; no seed data currently)

**File Storage:** Not used — no file uploads or object storage configured

**Caching:** Not configured — no Redis, Memcached, or in-memory cache layer

## Authentication & Identity

**Auth Provider:** Custom JWT-based (no external provider like Auth0, Firebase, Okta)

**Implementation:**

- Backend: NestJS + Passport.js + JWT
  - Module: `apps/api/src/modules/auth/`
  - Strategy: JWT (`passport-jwt`)
  - Guards: `JwtAuthGuard` (applied globally via `APP_GUARD`)
  - Public routes: Marked with `@Public()` decorator
  - Token storage: httpOnly cookies (`access_token`, `refresh_token`)

- Frontend: React + Server Actions + httpOnly cookies
  - Location: `apps/web/src/entities/session/`
  - Session file: `apps/web/src/entities/session/api/session.ts` (server-only)
  - Proxy handler: `apps/web/src/proxy.ts` (token refresh and rotation)
  - Cookie rotation: `refresh_tokens.handler.ts` (API-side token revocation and rotation)

**Secrets Management:**

- Environment variables in `.env` (local dev)
- Secrets required:
  - `JWT_ACCESS_SECRET` - Access token signing key
  - `JWT_REFRESH_SECRET` - Refresh token signing key
- Token lifetimes:
  - Access token: 15 minutes (from `JWT_ACCESS_TTL`)
  - Refresh token: 30 days (from `JWT_REFRESH_TTL`)
- Refresh token rotation: Old token revoked (`revokedAt` set) on each refresh via `POST /api/auth/refresh`

**Authorization:**

- Type: Role-based (implicit; user owns their categories and transactions)
- Data isolation: All requests filtered by `userId` from JWT claims
- Guarding method: Global `JwtAuthGuard` + `@Public()` for auth endpoints

**User Registration:**

- Endpoint: `POST /api/auth/register`
- Password: Hashed with bcrypt (stored as `passwordHash` in `users` table)
- Response: Access + refresh tokens set as httpOnly cookies

**User Login:**

- Endpoint: `POST /api/auth/login`
- Credentials: Email + password (validated against `users` table)
- Password check: bcrypt compare
- Response: Access + refresh tokens set as httpOnly cookies

**Token Refresh:**

- Endpoint: `POST /api/auth/refresh`
- Mechanism: Uses `refresh_token` cookie to get new access + refresh pair
- Rotation: Old `refresh_token` revoked, new one generated
- Frontend: Automatic via `proxy.ts` (detects expired access, attempts refresh before 401 propagates)
- Fallback: Redirect to `/session-expired` on rotation failure (allows cleanup in Route Handler)

**Session Expiry:**

- Access token: Expires after 15 minutes
- Refresh token: Expires after 30 days (hard logout)
- Early logout: `POST /api/auth/logout` revokes refresh token, clears cookies

## Monitoring & Observability

**Error Tracking:** Not configured — no Sentry, DataDog, or external error aggregation

**Logging:**

- Method: Console (via NestJS `Logger`)
- Level: Info (bootstrap messages only, no structured logging)
- Example: `Logger.log()` in `apps/api/src/main.ts`
- Location: stdout to docker/deployment logs

**Request Logging:** Not configured — no middleware for request/response logging

**Health Checks:**

- Database: `pg_isready` in docker-compose (5s interval)
- API: No `/health` endpoint configured

## CI/CD & Deployment

**Hosting:** Not configured — no deployment targets specified

- Self-hosted capable (standalone Node + Postgres)
- No cloud provider integrations (AWS, GCP, Azure) detected

**CI Pipeline:** Not configured — no GitHub Actions, GitLab CI, or other automation

**Build & Deploy:**

- Manual: `npm run build` compiles all workspaces
- Start: `npm run start` or direct `node dist/main.js` in API, `next start` in web
- Port configuration: API `4001`, Web `3001` (environment variables `PORT`, hardcoded in web)

**Secrets Management (Deployment):**

- Environment variables must be set in deployment environment
- Required for production:
  - `DATABASE_URL` - PostgreSQL connection string
  - `JWT_ACCESS_SECRET` - 32+ bytes recommended
  - `JWT_REFRESH_SECRET` - 32+ bytes recommended
  - `CORS_ORIGIN` - Allowed origin (e.g., production domain)
  - `PORT` - API port (default 4001)

## Environment Configuration

**Development:**

- Database: Local docker container (docker-compose)
- Seed data: None (dashboard shows empty state)
- Config file: `.env` (copied from `.env.example`)

**Environment Variables Defined:**

- **Database:**
  - `POSTGRES_USER` - DB user (default: expense)
  - `POSTGRES_PASSWORD` - DB password (default: expense)
  - `POSTGRES_DB` - DB name (default: expense_tracker)
  - `POSTGRES_PORT` - DB port (default: 5433, not standard 5432)
  - `DATABASE_URL` - Full connection string (Prisma, format: `postgresql://user:pass@host:port/db`)

- **Authentication:**
  - `JWT_ACCESS_SECRET` - Signing key for access tokens
  - `JWT_REFRESH_SECRET` - Signing key for refresh tokens
  - `JWT_ACCESS_TTL` - Access token TTL (e.g., 15m)
  - `JWT_REFRESH_TTL` - Refresh token TTL (e.g., 30d)

- **Server:**
  - `PORT` - API port (default: 4001)
  - `CORS_ORIGIN` - CORS origin (default: http://localhost:3001)
  - `NODE_ENV` - Environment (development/production) — inferred, not explicit

**Secrets Location (Production):**

- Method: Environment variables (no .env files in production)
- Mechanism: Platform-specific (Kubernetes secrets, Docker Compose secrets, cloud provider secret managers, etc.)

## Webhooks & Callbacks

**Incoming Webhooks:** Not configured — no payment processors, message queues, or external event sources

**Outgoing Webhooks:** Not configured — no event publishing to external systems

**Background Jobs:** Not configured — no async processing (all operations synchronous, request-response)

**Email:** Not configured — no transactional email service (no Sendgrid, AWS SES, etc.)

## Data Models & Contracts

**API Contracts:**

- Location: `packages/shared/src/schemas/` (Zod schemas)
- Usage: Server request validation, TypeScript type inference, client form validation
- Examples:
  - Auth: Sign up / login / refresh schemas
  - Categories: CRUD request/response schemas
  - Transactions: Query filters, create/update/delete schemas

**Database Models:**

- User: Email, password hash, name, timestamps
- Category: User FK, name, color, icon, timestamps
- Transaction: User FK, Category FK, amount (Decimal), type (INCOME/EXPENSE), date, timestamps
- RefreshToken: User FK, token hash, expiry, revoked timestamp

**DTO Classes (NestJS Validation):**

- Categories DTOs: `apps/api/src/modules/categories/dto/` (class-validator)
- Transactions DTOs: `apps/api/src/modules/transactions/dto/` (class-validator)
- Purpose: Request body validation (complementary to Zod schemas for these modules)

## CORS & Cross-Origin

**CORS Enabled:** Yes

- Configuration: `apps/api/src/main.ts`
- Default origin: `http://localhost:3001` (frontend)
- Credentials: Allowed (for httpOnly cookies)
- Configurable via: `CORS_ORIGIN` env var

## Rate Limiting

**Rate Limiting:** Not configured — no request rate limits or throttling

## Data Security

**Password Storage:**

- Algorithm: bcrypt (rounds: default 10)
- Location: `users.passwordHash` (never plain text)

**Sensitive Data:**

- Tokens: httpOnly cookies (JavaScript-inaccessible)
- Token hash: `refresh_tokens.tokenHash` (not plain token) stored for revocation checking

**HTTPS/TLS:** Not enforced in code — delegation to deployment layer (must be configured in production)

---

*Integration audit: 2026-09-20*
