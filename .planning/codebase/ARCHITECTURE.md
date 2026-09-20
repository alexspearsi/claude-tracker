---
last_mapped_commit: 7bdd32cff1b9829a6507c35f437d7e395a9906a3
last_mapped_at: 2026-09-20
---
<!-- refreshed: 2026-09-20 -->

# Architecture

**Analysis Date:** 2026-09-20

## System Overview

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                      Next.js 16 App Router Frontend                          │
│         `apps/web/src` — FSD (Feature Slice Design) structure                │
├────────────────────────┬────────────────────────┬──────────────────────────┤
│   Views (screens)      │  Widgets (blocks)      │  Features (actions)      │
│  `views/dashboard`     │  `widgets/app-header`  │  `features/auth`         │
│  `views/login`         │  `widgets/recent-tx`   │                          │
└───────────┬────────────┴────────────┬───────────┴──────────────┬────────────┘
            │                        │                          │
            ▼                        ▼                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│              Entities (domain objects) + Shared utilities                     │
│  `entities/transaction` `entities/category` `entities/session` `entities/user`│
│  `shared/ui` (shadcn) `shared/api` `shared/lib` `shared/config`              │
└───────────────────────────┬───────────────────────────────────────────────────┘
                            │
                    HTTP → proxy.ts
                            │
            ▼──────────────────────────────────────▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                 NestJS 12 API Backend (ESM modules)                          │
│              `apps/api/src` — Layered module structure                       │
├────────────────────┬──────────────────────┬──────────────────────────────────┤
│  Controllers       │  Services/Handlers   │  Prisma Data Access Layer        │
│ (HTTP endpoints)   │ (business logic)     │ (ORM client - extends Client)    │
└───────────┬────────┴────────────┬─────────┴──────────┬───────────────────────┘
            │                    │                    │
            └────────────────────┼────────────────────┘
                                 │
                ┌────────────────▼────────────────┐
                │   Shared Contracts Package      │
                │  `packages/shared/src/schemas`  │
                │      (Zod validation)           │
                └────────────────────────────────┘
                                 │
                                 ▼
                   PostgreSQL 16 Database
                   (Prisma 7 + driver adapter)
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| **Next.js App** | Route handling, page rendering, Server Components, middleware | `apps/web/src/app/`, `apps/web/src/proxy.ts` |
| **Views Layer** | Full-screen page components that compose widgets and features | `apps/web/src/views/` |
| **Widgets Layer** | Reusable page blocks (header, table, navigation) | `apps/web/src/widgets/` |
| **Features Layer** | User actions: forms, Server Actions, form logic with react-hook-form | `apps/web/src/features/` |
| **Entities Layer** | Domain objects: transaction, category, user, session with their API calls | `apps/web/src/entities/` |
| **Shared Layer** | UI components (shadcn/ui), utilities, API helpers, configuration | `apps/web/src/shared/` |
| **NestJS Modules** | Feature modules implementing CRUD and business logic | `apps/api/src/modules/` |
| **Controllers** | HTTP endpoints, parameter extraction, authentication check | `apps/api/src/modules/*/\*.controller.ts` |
| **Services** | Business logic, data transformation, validation | `apps/api/src/modules/*/\*.service.ts` |
| **CQRS Handlers** | Command/Query processing (auth uses CQRS pattern) | `apps/api/src/modules/auth/commands/`, `/queries/` |
| **PrismaService** | Data access abstraction, connection management (extends PrismaClient) | `apps/api/src/prisma/prisma.service.ts` |
| **Shared Package** | Zod schemas for API contracts, shared between frontend and backend | `packages/shared/src/schemas/` |

## Pattern Overview

**Overall:** Monorepo with layered backend (Nest.js + Prisma) and frontend FSD architecture, with contracts defined once in shared Zod schemas.

**Key Characteristics:**

- **Single source of API contracts** — Zod schemas in `packages/shared` used by both frontend (zodResolver) and backend (ZodValidationPipe)
- **Feature isolation on frontend** — Strict FSD layer separation prevents circular dependencies and encourages composition over inheritance
- **Eager data access** — PrismaService connects on application bootstrap (not lazy)
- **JWT with refresh rotation** — Access token (15min) in httpOnly cookie, refresh token (30 days) with hash storage for logout/revocation
- **User data isolation** — All queries to categories and transactions filtered by userId from JWT payload
- **CQRS for auth complexity** — Command handlers for register/login/logout, token service for JWT operations

## Layers

**Frontend (Next.js 16 App Router with FSD):**

| Layer | Purpose | Location | Contains | Depends on | Used by |
|-------|---------|----------|----------|-----------|---------|
| **app** | Routing only | `apps/web/src/app/` | Page.tsx files (3-5 lines), layouts, metadata | Next.js | Routes (Next) |
| **views** | Full screens | `apps/web/src/views/` | Screen-level components (login-view.tsx, dashboard-view.tsx) | features, widgets, entities, shared | app/ routes |
| **widgets** | Page blocks | `apps/web/src/widgets/` | Reusable UI blocks (app-header, recent-transactions) | features, entities, shared | views |
| **features** | User actions | `apps/web/src/features/` | Forms, Server Actions (*.action.ts), form schemas | entities, shared | widgets, views |
| **entities** | Domain objects | `apps/web/src/entities/` | API calls, types, UI components per entity | shared | features, widgets, views |
| **shared** | Cross-cutting | `apps/web/src/shared/` | UI library (shadcn), utilities, config, API error handling | Nothing | All layers |

**Backend (NestJS modules):**

| Layer | Purpose | Location | Contains | Depends on | Used by |
|-------|---------|----------|----------|-----------|---------|
| **Controllers** | HTTP dispatch | `apps/api/src/modules/*/controller.ts` | Route definitions, parameter extraction | Services, decorators, guards | Express routing |
| **Services/Handlers** | Business logic | `apps/api/src/modules/*/service.ts`, `/commands/handler.ts` | Data transformation, validation, queries | PrismaService, other services | Controllers |
| **PrismaService** | Data access | `apps/api/src/prisma/` | Query execution, connection pooling | Database | All services |
| **Common** | Cross-cutting | `apps/api/src/common/` | Guards (JwtAuthGuard), filters (HttpExceptionFilter), pipes, decorators | Nest framework | Global middleware |

## Data Flow

### Primary Request Path (Protected Endpoint)

1. **Browser request** — User action in frontend (`apps/web/src`)
2. **Proxy middleware** (`apps/web/src/proxy.ts`) — Checks for access token; if expired, exchanges refresh token for new pair (line 52-63)
3. **Page/Server Action** — Calls API via `fetch` with access token in Authorization header
4. **Nest Controller** (`apps/api/src/modules/*/controller.ts`) — Receives request, JwtAuthGuard validates token (line 24, auth.module.ts as APP_GUARD), CurrentUser decorator extracts userId
5. **Service/Handler** (`apps/api/src/modules/*/service.ts`) — Executes business logic, queries data filtered by userId for isolation
6. **PrismaService** (`apps/api/src/prisma/prisma.service.ts`) — Executes SQL via adapter
7. **Response** — HTTP 200 with JSON, or error caught by HttpExceptionFilter (line 18, main.ts)
8. **Frontend** — Entity API (`apps/web/src/entities/*/api/`) parses response or throws error, widget renders or shows toast

### Authentication Flow

1. **Login/Register form** (`apps/web/src/features/auth/ui/`) — User submits via Server Action (line 56-65, login-form.tsx)
2. **Server Action** (`apps/web/src/features/auth/api/login.action.ts`) — Calls `POST /api/auth/login` with email/password from Zod schema
3. **Auth Controller** (`apps/api/src/modules/auth/auth.controller.ts`) — Routes to LoginHandler via CQRS
4. **LoginHandler** (`apps/api/src/modules/auth/commands/login.handler.ts`) — Verifies password, calls TokensService.issue() to generate JWT pair
5. **TokensService** — Creates access (15min exp) and refresh (30 days, hash in DB) tokens, returns both
6. **Response** → **Server Action** → **setSession()** (`apps/web/src/entities/session/api/session.ts`) — Writes tokens to httpOnly cookies via `cookies().set()`
7. **Redirect** to `/dashboard`
8. **Proxy** on next request — Sees access cookie, allows through
9. **Dashboard layout** (`apps/web/src/app/(dashboard)/layout.tsx`) — Calls `getSession()` to verify session, redirects to login if missing

### Summary / Aggregation Flow (Example)

1. **Widget call** — `GET /api/transactions/summary?month=09&year=2026`
2. **Controller** — Routes to `TransactionsService.summary(userId, month, year)`
3. **Service** (`apps/api/src/modules/transactions/transactions.service.ts`) — Aggregates by `$group` or groupBy in Prisma, filters by `userId` and date range
4. **Response** — `{ income: Decimal, expense: Decimal, balance: Decimal, byCategory: [...] }`
5. **Frontend widget** — Renders totals

### Token Refresh Flow

1. **Access token expires** — httpOnly cookie `access_token` becomes unreadable (still has TTL)
2. **Browser navigation** — Proxy.ts reads cookies (line 45-46)
3. **Proxy detects** — Access missing, refresh present
4. **exchangeRefreshToken()** (`apps/web/src/entities/session/api/proxy-session.ts`) — Calls `POST /api/auth/refresh` with refresh token
5. **RefreshTokensHandler** (`apps/api/src/modules/auth/commands/refresh-tokens.handler.ts`) — Verifies hash, revokes old token, issues new pair
6. **Response** → **Proxy** (`apps/web/src/proxy.ts` line 63) — Writes new cookies via `setSessionCookies(response, tokens)`
7. **User continues** — No logout, page loads normally

### Session Expiration / Logout

1. **Manual logout** — `logoutAction()` (`apps/web/src/features/auth/api/logout.action.ts`) calls `POST /api/auth/logout`
2. **LogoutHandler** — Marks refresh token as revoked in DB, returns 200
3. **Server Action** — Calls `clearSession()` to delete cookies via `cookies().delete()`
4. **Redirect** to `/login`

**Invalid/Expired Access (Rare):**

- Access cookie exists but JWT signature doesn't verify (e.g., JWT_ACCESS_SECRET rotated)
- JwtAuthGuard throws `UnauthorizedException` (401)
- Client-side catch in widget → widget redirects via `redirect(ROUTES.sessionExpired)`
- Route Handler `/session-expired` (`apps/web/src/app/session-expired/route.ts`) → Clears cookies physically → Redirects to `/login`

**State Management:**

- **Frontend:** React state in components, react-hook-form for forms, no global state manager (server-centric with Server Components)
- **Backend:** Stateless HTTP, state in PostgreSQL (user, categories, transactions, refresh tokens)
- **Session state:** httpOnly cookies (access/refresh tokens) — not accessible to JavaScript, prevents XSS token theft

## Key Abstractions

**CurrentUser Decorator:**

- Purpose: Extract authenticated user from JWT payload and inject into controller methods
- Examples: `apps/api/src/common/decorators/current-user.decorator.ts`
- Pattern: NestJS custom decorator with `ExecutionContext` — extracts `user` from request (set by JwtStrategy)

**AuthUser Type:**

- Purpose: Type-safe user object from JWT (id, email)
- Examples: `apps/api/src/common/decorators/current-user.decorator.ts` exports type
- Pattern: Defined alongside decorator, reused in all protected endpoint signatures

**TransactionListDto / TransactionDto:**

- Purpose: HTTP response contracts for transactions (with pagination metadata)
- Examples: `apps/api/src/modules/transactions/transaction.types.ts`
- Pattern: Defined locally (not in shared, unlike auth contracts) because no frontend form uses transaction body validation

**Zod Schemas as Single Source of Truth:**

- Purpose: Define API contracts once, use in both backend (validation) and frontend (forms)
- Examples: `packages/shared/src/schemas/auth.ts` (registerSchema, loginSchema), `packages/shared/src/schemas/category.ts`
- Pattern: Export both schema (`z.object(...)`) and inferred type (`z.infer`)
- Backend: `ZodValidationPipe` in auth controllers validates request body against schema (line 19-22, main.ts)
- Frontend: `zodResolver` passes schema to react-hook-form for client validation

**PrismaService as DI Singleton:**

- Purpose: Single, shared database client for entire application (connection pooling)
- Examples: Injected into any service: `constructor(private readonly prisma: PrismaService)`
- Pattern: Extends PrismaClient, connects eagerly on module init, caught errors translate to HTTP exceptions via `isPrismaError()`

**DTO Classes (class-validator):**

- Purpose: Validate request bodies that are NOT in shared Zod schemas (categories, transactions CRUD)
- Examples: `apps/api/src/modules/categories/dto/create-category.dto.ts` (class with decorators like `@IsString()`)
- Pattern: Imported by value (not `import type`) so ValidationPipe metadata includes class reference
- Separate from Zod schemas because frontend doesn't form-validate categories in a dedicated form (form on widget receives values directly)

**Entity FSD Structure on Frontend:**

- Purpose: Encapsulate domain object (transaction, category, etc.) with its API calls, types, and UI components
- Examples: `apps/web/src/entities/transaction/api/get-transactions.ts` (fetches from backend), `model/types.ts` (types mirror backend), `ui/transaction-amount.tsx` (display component)
- Pattern: `api/` folder has server-side functions that accept `accessToken` parameter (caller reads session, not entity), `model/` has types, `ui/` has small presentational components

**Server Action as Feature Boundary:**

- Purpose: User-triggered action (submit form, logout, delete item) as isolated async function
- Examples: `apps/web/src/features/auth/api/login.action.ts` (marked `'use server'`, calls backend, handles errors)
- Pattern: Returns `{ error: string }` on failure (caught and shown in toast), redirects on success
- Error response format matches API error structure via `apiErrorMessage()` utility

## Entry Points

**Backend:**

- Location: `apps/api/src/main.ts`
- Triggers: `npm run dev:api` (nest start --watch) or `npm run build && node dist/main.js`
- Responsibilities: Create NestFactory app, register global filters/pipes/guards, set CORS, start listening on port 4001

**Frontend:**

- Location: `apps/web/src/app/layout.tsx` (root) and `apps/web/src/proxy.ts` (middleware)
- Triggers: `npm run dev:web` (next dev) or `npm run build && next start`
- Responsibilities: Render React tree, proxy handles session/routing before Next processes request, route-specific layouts (e.g., `(dashboard)/layout.tsx`)

**API Entry Points (Controllers):**

- **Auth**: `POST /api/auth/register`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/refresh` — `apps/api/src/modules/auth/auth.controller.ts`
- **Users**: `GET /api/users/me` — `apps/api/src/modules/users/users.controller.ts`
- **Categories**: `GET /api/categories`, `POST /api/categories`, `PATCH /api/categories/:id`, `DELETE /api/categories/:id` — `apps/api/src/modules/categories/categories.controller.ts`
- **Transactions**: `GET /api/transactions`, `POST /api/transactions`, `PATCH /api/transactions/:id`, `DELETE /api/transactions/:id`, `GET /api/transactions/summary` — `apps/api/src/modules/transactions/transactions.controller.ts`
- **Health**: `GET /api/health` — `apps/api/src/common/health.controller.ts`

**Frontend Page Routes:**

- `(auth)/login` → `apps/web/src/app/(auth)/login/page.tsx` → `apps/web/src/views/login/ui/login-view.tsx`
- `(auth)/register` → `apps/web/src/app/(auth)/register/page.tsx` → `apps/web/src/views/register/ui/register-view.tsx`
- `(dashboard)/dashboard` → `apps/web/src/app/(dashboard)/dashboard/page.tsx` → `apps/web/src/views/dashboard/ui/dashboard-view.tsx`
- `(dashboard)/expenses` → `apps/web/src/app/(dashboard)/expenses/page.tsx` (currently stub, no data)
- `(dashboard)/categories` → `apps/web/src/app/(dashboard)/categories/page.tsx` (currently stub, no data)

## Architectural Constraints

- **Threading:** Single-threaded event loop (both Node.js backend and browser frontend). Prisma queries are async but sequential per client connection; adapter uses native driver connection pooling.
- **Global state:** 
  - Backend: `APP_GUARD` (JwtAuthGuard) registered globally in AuthModule (line 27, auth.module.ts) — only place PassportModule is imported
  - Backend: Global ValidationPipe and HttpExceptionFilter (main.ts lines 18, 21-28)
  - Frontend: No global client-side state manager (server-centric with Next.js Server Components); React local state and react-hook-form context only
  - Session stored in httpOnly cookies (not accessible to JavaScript)
- **Circular imports:** 
  - Frontend FSD strictly enforces downward imports only (app → views → widgets → features → entities → shared). Cross-imports within same layer forbidden.
  - Backend modules can import shared contracts (`@expense/shared`)
- **Module initialization order:** 
  - Frontend: `npm run dev` starts api first (via Concurrently), then web (so api is ready when web starts)
  - Backend: PrismaModule imported first (line 14, app.module.ts) so database connection available to all modules. PrismaService connects eagerly (line 19, prisma.service.ts)
- **Type safety:** 
  - Both frontend and backend import from `@expense/shared` for auth schemas (types validated at compile time via Zod + TypeScript)
  - Backend: `import type` used for request bodies that should NOT be validated by global ValidationPipe (e.g., auth endpoints); actual class reference needed for validation to fire

## Anti-Patterns

### Using class-validator DTO for Zod-schema endpoints

**What happens:** Auth endpoints (register, login) in `auth.controller.ts` accept bodies validated by `ZodValidationPipe` (custom pipe line 22, not shown in code but referenced), but types are imported via `import type` so global ValidationPipe doesn't run. If you add a DTO class to auth endpoints and import it by value, both pipes try to validate the same body.

**Why it's wrong:** Duplicate validation, two error formats returned (Zod vs class-validator), frontend doesn't know which one to expect. Zod schemas are source of truth for auth; they sync validation with frontend forms (zodResolver).

**Do this instead:** Keep auth bodies as Zod schemas in `packages/shared/src/schemas/`. Import them as `import type` in auth.controller.ts. Use `ZodValidationPipe` in auth controller routes explicitly, or rely on the custom setup (if any). For categories/transactions, which have DTO classes (not shared), import DTO by value and use global ValidationPipe.

### Importing Entity inside another Entity

**What happens:** `entities/transaction` tries to import `entities/category` to access category types or API. This breaks FSD encapsulation and can lead to circular dependencies.

**Why it's wrong:** Entity independence is violated. If you need data from two entities in a widget, the widget should fetch both independently and compose them, not have one entity depend on another.

**Do this instead:** Fetch category data in widget/feature (via `getCategories(accessToken)`), fetch transactions (via `getTransactions(accessToken)`), map category name/color by id locally in widget. Examples: `widgets/recent-transactions/ui/transactions-table.tsx` receives `transactions` and `categoryMap` as props.

### Storing passwords as plaintext or reusing JWT secret for refresh tokens

**What happens:** If passwords are stored plaintext, any database breach exposes all user accounts. If refresh token is the JWT itself (not a hash), revocation is impossible — old tokens remain valid forever.

**Why it's wrong:** Security compromise. No audit trail, no way to revoke old sessions for a user.

**Do this instead:** Hash passwords with bcrypt (password_hash_rounds: 10, line 8 register.handler.ts). Store refresh token as hash in RefreshToken model (line 37, schema.prisma). Both access and refresh tokens are JWTs; only refresh JWT is hashed for DB storage, allowing revocation check (compare incoming token hash to stored hash).

### Reading session in entity API instead of passing accessToken as parameter

**What happens:** Entity tries to read session itself via `getSession()`, but `getSession()` is a Server-only function that won't work inside `use client` components (entities/transaction/api/get-transactions.ts runs in Server Components, but logic bleeds into client).

**Why it's wrong:** Violates server/client boundary. Entity becomes coupled to session implementation detail.

**Do this instead:** Widget/feature calls `getSession()` to read token, then passes token to entity API as parameter. Examples: `entities/transaction/api/get-transactions.ts` signature is `async function getTransactions(accessToken: string, query?: {...})` — caller (widget) provides token.

## Error Handling

**Strategy:** Layered exception translation — Prisma errors to HTTP, HTTP exceptions caught globally and formatted, frontend errors shown as toasts.

**Patterns:**

- **Prisma errors** → HTTP exceptions via `isPrismaError()` utility (`apps/api/src/prisma/prisma-errors.ts`)
  - `P2002` (unique constraint) → `ConflictException` (409)
  - `P2025` (record not found) → `NotFoundException` (404)
  - `P2003` (foreign key violation, e.g., delete category with transactions) → `ConflictException` (409)
  - Other Prisma errors → `InternalServerErrorException` (500)
- **HTTP exceptions** → Caught by `HttpExceptionFilter` (line 12, http-exception.filter.ts)
  - Formats response as `{ statusCode, path, timestamp, error }`
  - Logs 5xx errors to console
- **Frontend API errors** → Converted to toast message via `apiErrorMessage()` utility (`apps/web/src/shared/api/error-message.ts`)
  - Extracts `error.message` or falls back to `error.error[0][0]` for grouped format (class-validator)
  - Examples: Login errors shown in red toast, transaction create errors shown in yellow toast

## Cross-Cutting Concerns

**Logging:** 

- Backend: NestJS Logger class (used in main.ts bootstrap message, service methods)
- Frontend: No logging framework (development via browser console)
- HTTP responses logged only for 5xx errors (HttpExceptionFilter line 32)

**Validation:** 

- Backend: Two-tier
  - Zod schemas in `packages/shared` (auth, categories) — `ZodValidationPipe` or manual `parse()`
  - class-validator DTOs (transactions, categories alternate approach) — global `ValidationPipe`
  - Both throw `BadRequestException` (400) on failure, error format differs (Zod: `{ fieldName: [messages] }`, class-validator: grouped format with `{ поле: [сообщения] }`)
- Frontend: react-hook-form with `zodResolver` for forms (no submit until validation passes)

**Authentication:** 

- Backend: JWT via Passport strategy (`JwtStrategy` line 13, auth.module.ts), guard checks header
- Frontend: httpOnly cookies (reading done via Server Actions/Server Components only)
- Middleware: Proxy.ts enforces routing rules before page render

**User Isolation:** 

- All queries to transactions/categories filtered by `userId` from JWT (`@CurrentUser() user: AuthUser` in controller, then pass `user.id` to service)
- No endpoint returns user A's data when user B requests it (impossible to bypass via direct id URL)

---

*Architecture analysis: 2026-09-20*
