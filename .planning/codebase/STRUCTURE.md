---
last_mapped_commit: 7bdd32cff1b9829a6507c35f437d7e395a9906a3
last_mapped_at: 2026-09-20
---
# Codebase Structure

**Analysis Date:** 2026-09-20

## Directory Layout

```
purple-school-claude/
├── apps/
│   ├── api/                          # NestJS backend (ESM, port 4001)
│   │   ├── src/
│   │   │   ├── main.ts               # Application bootstrap
│   │   │   ├── app.module.ts         # Root module
│   │   │   ├── common/               # Cross-cutting: guards, filters, pipes, decorators
│   │   │   │   ├── decorators/       # @CurrentUser(), @Public()
│   │   │   │   ├── filters/          # HttpExceptionFilter (global error handler)
│   │   │   │   ├── guards/           # JwtAuthGuard (authentication)
│   │   │   │   ├── pipes/            # ValidationPipe configs, ZodValidationPipe
│   │   │   │   └── health.controller.ts  # GET /api/health
│   │   │   ├── config/               # Configuration and validation
│   │   │   │   └── env.validation.ts # Environment variable schema (Zod)
│   │   │   ├── contracts/            # Command/Query definitions for CQRS
│   │   │   │   └── users/            # CreateUserCommand, types
│   │   │   ├── modules/              # Feature modules (auth, users, categories, transactions)
│   │   │   │   ├── auth/             # JWT auth, tokens, login/register/logout/refresh
│   │   │   │   │   ├── auth.controller.ts    # Routes: POST /auth/register, /login, /logout, /refresh
│   │   │   │   │   ├── auth.module.ts        # Imports PassportModule, registers JwtAuthGuard globally
│   │   │   │   │   ├── jwt.strategy.ts       # Passport JWT strategy (validates token signature)
│   │   │   │   │   ├── tokens.service.ts     # Issue JWT access/refresh tokens
│   │   │   │   │   └── commands/             # CQRS handlers (RegisterHandler, LoginHandler, etc.)
│   │   │   │   ├── users/            # User management
│   │   │   │   │   ├── users.controller.ts   # GET /api/users/me
│   │   │   │   │   ├── users.service.ts
│   │   │   │   │   ├── commands/             # CreateUserCommand handler
│   │   │   │   │   └── queries/              # GetUserQuery handler
│   │   │   │   ├── categories/       # Category CRUD (tied to transactions)
│   │   │   │   │   ├── categories.controller.ts  # GET/POST/PATCH/DELETE /api/categories
│   │   │   │   │   ├── categories.service.ts
│   │   │   │   │   └── dto/                  # class-validator DTOs (CreateCategoryDto, etc.)
│   │   │   │   └── transactions/     # Transaction CRUD (income/expense)
│   │   │   │       ├── transactions.controller.ts  # GET/POST/PATCH/DELETE /api/transactions, /summary
│   │   │   │       ├── transactions.service.ts
│   │   │   │       ├── transaction.types.ts   # TransactionDto, TransactionListDto (response types)
│   │   │   │       └── dto/                   # class-validator DTOs (CreateTransactionDto, etc.)
│   │   │   ├── prisma/               # Database access layer
│   │   │   │   ├── prisma.service.ts # PrismaService (extends PrismaClient, eager connect)
│   │   │   │   ├── prisma.module.ts  # PrismaModule exports PrismaService
│   │   │   │   └── prisma-errors.ts  # Prisma error → HTTP exception translation
│   │   │   └── generated/
│   │   │       └── prisma/           # Generated Prisma client (git-ignored, committed after build)
│   │   ├── prisma/
│   │   │   ├── schema.prisma         # Database schema (User, RefreshToken, Category, Transaction)
│   │   │   └── seed.ts               # Database seed script (currently empty)
│   │   ├── package.json              # Dependencies, scripts (nest start --watch)
│   │   └── tsconfig.json             # TypeScript config for api (ESM, types: node)
│   │
│   └── web/                          # Next.js 16 frontend (port 3001)
│       ├── src/
│       │   ├── app/                  # Next.js App Router (page.tsx only, 3-5 lines each)
│       │   │   ├── layout.tsx         # Root layout (Toaster, globals.css)
│       │   │   ├── proxy.ts           # Middleware (session checks, token refresh, routing)
│       │   │   ├── (auth)/            # Guest routes (login, register)
│       │   │   │   ├── layout.tsx
│       │   │   │   ├── login/
│       │   │   │   │   └── page.tsx   # Routes to views/login/ui/login-view.tsx
│       │   │   │   └── register/
│       │   │   │       └── page.tsx   # Routes to views/register/ui/register-view.tsx
│       │   │   ├── (dashboard)/       # Protected routes (require session)
│       │   │   │   ├── layout.tsx     # AppHeader, getSession() check
│       │   │   │   ├── dashboard/
│       │   │   │   │   └── page.tsx   # Dashboard with recent transactions
│       │   │   │   ├── expenses/      # Stub (no implementation)
│       │   │   │   │   └── page.tsx
│       │   │   │   └── categories/    # Stub (no implementation)
│       │   │   │       └── page.tsx
│       │   │   ├── session-expired/
│       │   │   │   └── route.ts       # Route Handler: clears cookies, redirects to login
│       │   │   ├── privacy/           # Static pages
│       │   │   │   └── page.tsx
│       │   │   └── terms/
│       │   │       └── page.tsx
│       │   │
│       │   ├── views/                 # Full-screen pages (FSD layer 2)
│       │   │   ├── login/
│       │   │   │   └── ui/
│       │   │   │       └── login-view.tsx    # Composes LoginForm + branding
│       │   │   ├── register/
│       │   │   │   └── ui/
│       │   │   │       └── register-view.tsx # Composes RegisterForm + branding
│       │   │   └── dashboard/
│       │   │       └── ui/
│       │   │           └── dashboard-view.tsx # Composes AppHeader + RecentTransactions
│       │   │
│       │   ├── widgets/               # Reusable page blocks (FSD layer 3)
│       │   │   ├── app-header/        # Top navigation, user menu
│       │   │   │   └── ui/
│       │   │   │       ├── app-header.tsx
│       │   │   │       └── main-nav.tsx
│       │   │   └── recent-transactions/  # Table + pagination (on dashboard)
│       │   │       └── ui/
│       │   │           ├── recent-transactions.tsx
│       │   │           ├── transactions-table.tsx
│       │   │           ├── pagination-nav.tsx
│       │   │           └── empty-state.tsx
│       │   │
│       │   ├── features/              # User actions (FSD layer 4)
│       │   │   └── auth/              # Login/register/logout forms and actions
│       │   │       ├── api/           # Server Actions (use server)
│       │   │       │   ├── login.action.ts       # 'use server', calls POST /api/auth/login
│       │   │       │   ├── register.action.ts    # 'use server', calls POST /api/auth/register
│       │   │       │   └── logout.action.ts      # 'use server', calls POST /api/auth/logout
│       │   │       ├── model/         # Types and schemas
│       │   │       │   ├── types.ts
│       │   │       │   └── register-form-schema.ts
│       │   │       └── ui/            # Client components (use client)
│       │   │           ├── login-form.tsx        # react-hook-form, zodResolver
│       │   │           ├── register-form.tsx     # react-hook-form, zodResolver
│       │   │           └── logout-button.tsx
│       │   │
│       │   ├── entities/              # Domain objects (FSD layer 5)
│       │   │   ├── session/           # Session state and auth tokens
│       │   │   │   ├── api/
│       │   │   │   │   ├── session.ts             # getSession(), setSession(), refreshSession(), clearSession()
│       │   │   │   │   └── proxy-session.ts      # exchangeRefreshToken(), setSessionCookies(), clearSessionCookies()
│       │   │   │   ├── lib/
│       │   │   │   │   └── token-expiry.ts       # Extract exp from JWT
│       │   │   │   └── model/
│       │   │   │       └── cookies.ts            # ACCESS_COOKIE, REFRESH_COOKIE constants
│       │   │   ├── transaction/       # Transaction entity
│       │   │   │   ├── api/
│       │   │   │   │   └── get-transactions.ts   # Fetch transactions, accepts accessToken parameter
│       │   │   │   ├── model/
│       │   │   │   │   └── types.ts              # TransactionType, TransactionDto mirrors backend
│       │   │   │   └── ui/
│       │   │   │       └── transaction-amount.tsx # Display component for amount with color
│       │   │   ├── category/          # Category entity
│       │   │   │   ├── api/
│       │   │   │   │   └── get-categories.ts     # Fetch categories
│       │   │   │   ├── model/
│       │   │   │   │   └── types.ts              # Category type
│       │   │   │   └── ui/
│       │   │   │       └── category-item.tsx     # Display category with color
│       │   │   └── user/              # User profile entity
│       │   │       ├── api/
│       │   │       │   └── get-user.ts           # Fetch current user
│       │   │       ├── lib/
│       │   │       │   └── user-name.ts          # Format user display name
│       │   │       └── model/
│       │   │           └── types.ts              # User profile type
│       │   │
│       │   └── shared/                # Shared utilities and UI (FSD layer 6)
│       │       ├── ui/                # shadcn/ui components
│       │       │   ├── button.tsx
│       │       │   ├── input.tsx
│       │       │   ├── form.tsx       # Wrapper for react-hook-form
│       │       │   ├── sonner.tsx     # Toast notifications
│       │       │   ├── card.tsx
│       │       │   ├── separator.tsx
│       │       │   └── ... (other shadcn components)
│       │       ├── api/
│       │       │   ├── error-message.ts  # Parse API errors to toast text
│       │       │   └── client.ts         # fetch() wrapper with default headers/error handling
│       │       ├── lib/
│       │       │   ├── utils.ts          # cn() for classnames, formatMoney() for decimals
│       │       │   ├── format-date.ts    # Format dates for display
│       │       │   └── pagination.ts     # Pagination helpers
│       │       └── config/
│       │           └── routes.ts         # ROUTES constant, PROTECTED_ROUTES, GUEST_ROUTES arrays
│       │
│       ├── package.json               # Dependencies, scripts (next dev)
│       ├── next.config.ts             # Next.js configuration
│       ├── tsconfig.json              # TypeScript config for web (React, next)
│       └── components.json            # shadcn/ui configuration (points to src/shared/ui)
│
├── packages/
│   └── shared/                        # Shared contracts (Zod schemas)
│       ├── src/
│       │   └── schemas/
│       │       ├── auth.ts            # registerSchema, loginSchema, authTokensSchema, userProfileSchema
│       │       └── category.ts        # categorySchema (for API validation)
│       ├── package.json               # Exports as @expense/shared
│       └── tsconfig.json              # TypeScript config
│
├── .planning/
│   └── codebase/                      # Generated documentation (this folder)
│       ├── ARCHITECTURE.md            # System patterns, layers, data flows
│       ├── STRUCTURE.md               # This file
│       ├── CONVENTIONS.md             # Code style, naming, imports (if generated)
│       ├── TESTING.md                 # Test setup and patterns (if generated)
│       ├── STACK.md                   # Dependencies and versions (if generated)
│       ├── INTEGRATIONS.md            # External services (if generated)
│       └── CONCERNS.md                # Tech debt and issues (if generated)
│
├── .claude/
│   ├── CLAUDE.md                      # This project's instructions (Russian, conventions, architecture notes)
│   ├── docs/                          # Project documentation
│   │   ├── API.md                     # API endpoints reference
│   │   ├── DATABASE.md                # Database schema and queries
│   │   ├── ARCHITECTURE.md            # Architecture overview (older, may be outdated)
│   │   └── README.md                  # Development setup
│   ├── memory/
│   │   └── MEMORY.md                  # Project memory (persists across sessions)
│   ├── skills/
│   │   ├── commit/                    # Commit message rules (GitHub Flow, Conventional Commits)
│   │   └── ... (other project-specific skills)
│   ├── plans/                         # Phase execution plans (created by /gsd-plan-phase)
│   └── settings.local.json            # Local development configuration
│
├── .github/
│   └── workflows/                     # CI/CD pipelines (GitHub Actions)
│
├── node_modules/                      # Dependencies (npm install)
├── package.json                       # Root monorepo configuration (workspaces: apps/api, apps/web, packages/shared)
├── package-lock.json                  # Dependency lock file
├── tsconfig.json                      # Root TypeScript config (extends in each app)
└── README.md                          # Project overview
```

## Directory Purposes

**`apps/api/`:** NestJS backend server

- Port 4001 (`/api` prefix)
- Handles authentication, database operations, business logic
- Connects to PostgreSQL via Prisma
- Exports modules (auth, users, categories, transactions) as feature modules

**`apps/web/`:** Next.js 16 frontend application

- Port 3001
- Feature Slice Design (FSD) structure with layers: app → views → widgets → features → entities → shared
- Server Components (default) and Client Components (`use client`)
- Server Actions for form submission and navigation
- Proxy middleware for session management and routing

**`packages/shared/`:** Shared Zod schemas and types

- Published as `@expense/shared` npm package (via workspaces)
- Imported by both api and web
- Single source of truth for auth/category API contracts
- Ensures frontend forms and backend validation are in sync

**`prisma/` (in `apps/api/`):** Database configuration and seed

- `schema.prisma` — Entity definitions, migrations, indexes
- `seed.ts` — Data initialization script (currently empty)
- Migrations stored in `prisma/migrations/` (git-tracked)

**`.claude/docs/`:** Project documentation

- **API.md** — Endpoint reference (deprecated, info in ARCHITECTURE.md)
- **DATABASE.md** — Schema explanations, common queries
- **ARCHITECTURE.md** — High-level design overview
- **README.md** — Setup and development commands

**`.claude/plans/`:** Phase execution plans

- Created by `/gsd-plan-phase` command
- Used by `/gsd-execute-phase` to track implementation progress

## Key File Locations

**Entry Points:**

- Backend: `C:/Users/User/OneDrive/Desktop/purple school claude/apps/api/src/main.ts` — NestFactory bootstrap
- Frontend: `C:/Users/User/OneDrive/Desktop/purple school claude/apps/web/src/app/layout.tsx` — Root React layout
- Frontend middleware: `C:/Users/User/OneDrive/Desktop/purple school claude/apps/web/src/proxy.ts` — Session/routing gateway

**Configuration:**

- Monorepo: `C:/Users/User/OneDrive/Desktop/purple school claude/package.json` — workspaces declaration
- Backend TypeScript: `C:/Users/User/OneDrive/Desktop/purple school claude/apps/api/tsconfig.json` — ESM, node types
- Frontend TypeScript: `C:/Users/User/OneDrive/Desktop/purple school claude/apps/web/tsconfig.json` — React, next types
- Shared package: `C:/Users/User/OneDrive/Desktop/purple school claude/packages/shared/package.json` — Exports schemas
- Database: `C:/Users/User/OneDrive/Desktop/purple school claude/apps/api/prisma/schema.prisma` — Schema definition
- Backend env validation: `C:/Users/User/OneDrive/Desktop/purple school claude/apps/api/src/config/env.validation.ts` — Zod schema for env vars
- Frontend routes: `C:/Users/User/OneDrive/Desktop/purple school claude/apps/web/src/shared/config/routes.ts` — Single source of URL constants

**Core Logic:**

- Auth backend: `C:/Users/User/OneDrive/Desktop/purple school claude/apps/api/src/modules/auth/` — Controllers, handlers, tokens service
- Auth frontend: `C:/Users/User/OneDrive/Desktop/purple school claude/apps/web/src/features/auth/` — Forms, Server Actions
- Data access: `C:/Users/User/OneDrive/Desktop/purple school claude/apps/api/src/prisma/prisma.service.ts` — Database client singleton
- Session: `C:/Users/User/OneDrive/Desktop/purple school claude/apps/web/src/entities/session/api/session.ts` — Cookie management
- Error handling (backend): `C:/Users/User/OneDrive/Desktop/purple school claude/apps/api/src/common/filters/http-exception.filter.ts` — Global exception formatter
- Error handling (frontend): `C:/Users/User/OneDrive/Desktop/purple school claude/apps/web/src/shared/api/error-message.ts` — API error → toast message

**Testing:**

- No test infrastructure configured (CLAUDE.md: "Тестов в проекте нет")
- Future: tests would follow project conventions (location TBD)

## Naming Conventions

**Files:**

| Pattern | Example | Used for |
|---------|---------|----------|
| `*.controller.ts` | `auth.controller.ts` | NestJS route handlers |
| `*.service.ts` | `transactions.service.ts` | NestJS business logic |
| `*.handler.ts` | `register.handler.ts` | CQRS command/query handlers |
| `*.module.ts` | `auth.module.ts` | NestJS feature modules |
| `*.strategy.ts` | `jwt.strategy.ts` | Passport authentication strategies |
| `*.dto.ts` | `create-category.dto.ts` | class-validator request body models |
| `*.types.ts` | `transaction.types.ts` | TypeScript types and interfaces |
| `*.ts` (action) | `login.action.ts` | Next.js Server Actions (marked `'use server'`) |
| `*-view.tsx` | `login-view.tsx` | Full-screen page components (FSD views layer) |
| `*.tsx` (widget) | `app-header.tsx` | Reusable UI blocks |
| `*-schema.ts` | `register-form-schema.ts` | Form schemas (often zod) |
| `*.config.ts` | `next.config.ts`, `prisma.config.ts` | Configuration files |
| `utils.ts`, `helpers.ts` | `utils.ts`, `format-date.ts` | Utility functions |

**Directories:**

| Pattern | Example | Scope |
|---------|---------|-------|
| `src/modules/{name}/` | `src/modules/auth/` | Feature module (NestJS) |
| `src/modules/{name}/dto/` | `src/modules/categories/dto/` | Request body validators |
| `src/modules/{name}/commands/` | `src/modules/auth/commands/` | CQRS command handlers |
| `src/modules/{name}/queries/` | `src/modules/users/queries/` | CQRS query handlers |
| `entities/{name}/api/` | `entities/transaction/api/` | Entity API calls (server-side functions) |
| `entities/{name}/model/` | `entities/category/model/` | Entity types and constants |
| `entities/{name}/ui/` | `entities/transaction/ui/` | Entity display components |
| `features/{name}/api/` | `features/auth/api/` | Server Actions and form logic |
| `features/{name}/ui/` | `features/auth/ui/` | Form components (client-side) |
| `widgets/{name}/ui/` | `widgets/app-header/ui/` | Widget implementation |
| `shared/ui/` | `shared/ui/` | UI component library (shadcn) |
| `shared/api/` | `shared/api/` | API client utilities |
| `shared/lib/` | `shared/lib/` | Utility functions |
| `shared/config/` | `shared/config/` | Configuration constants |

**Functions and Variables:**

| Pattern | Example | Used for |
|---------|---------|----------|
| camelCase | `getUserProfile()`, `currentUser` | Functions, variables |
| PascalCase | `RegisterCommand`, `UserProfile` | Classes, types, components |
| UPPER_SNAKE_CASE | `ACCESS_COOKIE`, `JWT_ACCESS_TTL` | Constants |
| `is*` prefix | `isProtected()`, `isGuestOnly()` | Boolean functions |
| `get*` prefix | `getSession()`, `getCategories()` | Data fetching functions |
| `create*`, `update*`, `delete*` | `CreateUserCommand`, `UpdateTransactionDto` | Action command/DTOs |

**Types:**

| Pattern | Example | Used for |
|---------|---------|----------|
| `*Input` | `RegisterInput` | Form input type (inferred from Zod schema) |
| `*Output` | `AuthTokens` | API response type (inferred from Zod schema) |
| `*Dto` | `TransactionDto` | HTTP response type |
| `*ListDto` | `TransactionListDto` | Paginated response type |
| `*Command` | `RegisterCommand` | CQRS command type |
| `*Query` | `GetUserQuery` | CQRS query type |

## Where to Add New Code

**New Feature (e.g., recurring transactions):**

1. **Backend:**
   - Create `apps/api/src/modules/recurring-transactions/`
   - Add entity to `apps/api/prisma/schema.prisma`
   - Create controller (`recurring-transactions.controller.ts`) with routes
   - Create service (`recurring-transactions.service.ts`) with business logic
   - Add DTOs to `dto/` folder
   - If using CQRS (for complex logic): add `commands/` and `queries/` folders with handlers
   - Create `recurring-transactions.module.ts` and register in `AppModule`

2. **Contracts (if form involved):**
   - Add Zod schema to `packages/shared/src/schemas/recurring.ts` if API body needs frontend sync
   - Or just use class-validator DTO if no frontend form

3. **Frontend:**
   - Create `apps/web/src/entities/recurring-transaction/` with `api/`, `model/`, `ui/` folders
   - Create `apps/web/src/features/recurring/` with `api/` (Server Actions), `model/`, `ui/` (forms)
   - Create `apps/web/src/widgets/recurring-list/` if needed (standalone page block)
   - Add routes to `apps/web/src/app/(dashboard)/recurring-transactions/page.tsx`
   - Update `shared/config/routes.ts` with new route constant

**New Component/Module:**

- Implementation: `apps/web/src/shared/ui/new-component.tsx` (if generic, e.g., new button style)
- Or: `apps/web/src/widgets/feature-name/ui/` (if feature-specific)
- Do NOT add to `entities/` (entities are domain objects, not generic UI)

**New API Endpoint:**

- Add route to existing module's controller, or create new module if conceptually distinct
- All user-data endpoints must filter by `user.id` from JWT
- All endpoints return via `HttpExceptionFilter` (global, automatic)

**New Utility Function:**

- Shared between backend and frontend: `packages/shared/src/` (unlikely, different runtimes)
- Backend-only: `apps/api/src/common/` or within module's service
- Frontend-only: `apps/web/src/shared/lib/` (e.g., format function)

**New Database Entity:**

- Add model to `apps/api/prisma/schema.prisma`
- Add indexes for query columns (for performance)
- Create `prisma/migrations/{timestamp}-add-entity.sql` via `npm run prisma:migrate`
- Create service in `apps/api/src/modules/{name}/`

## Special Directories

**`apps/api/src/generated/prisma/`:**

- Purpose: Generated Prisma client
- Generated: Yes (by `prisma generate` command)
- Committed: No (git-ignored, regenerated after `npm install` and schema changes)
- Do NOT manually edit — changes overwritten

**`apps/web/.next/`:**

- Purpose: Next.js build output and dev build cache
- Generated: Yes (by `next build` and `next dev`)
- Committed: No (git-ignored)

**`.claude/plans/`:**

- Purpose: Execution plans created by `/gsd-plan-phase`
- Generated: Yes (by CLI tool)
- Committed: Yes (tracked for project history)

**`prisma/migrations/`:**

- Purpose: Database migration history
- Generated: Yes (by `prisma migrate` command)
- Committed: Yes (required for DB consistency across environments)

**`node_modules/`:**

- Purpose: Installed dependencies
- Generated: Yes (by `npm install`)
- Committed: No (git-ignored, recreated from package-lock.json)

---

*Structure analysis: 2026-09-20*
