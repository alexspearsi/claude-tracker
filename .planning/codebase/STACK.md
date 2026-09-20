---
last_mapped_commit: 7bdd32cff1b9829a6507c35f437d7e395a9906a3
last_mapped_at: 2026-09-20
---
# Technology Stack

**Analysis Date:** 2026-09-20

## Languages

**Primary:**

- TypeScript 6.0.3 - Backend (Nest), frontend (Next.js), and shared schemas
  - Compiler options: `target: ES2023` (base), strict mode, decorated classes (API), JSX preserve (web)
  - Modules: ESM for API (`"type": "module"`), ESNext for web

**Secondary:**

- JavaScript - Build scripts, configs (`eslint.config.mjs`)

## Runtime

**Environment:**

- Node.js 24+ (specified in `.nvmrc`)

**Package Manager:**

- npm (workspace-based) with `package-lock.json`
- Lockfile: present

## Frameworks

**Core:**

- Next.js 16.3.4 (App Router) - Frontend (`apps/web`)
  - Port: 3001 (non-standard; 3000 occupied locally)
  - Dev: Turbopack
  - Routing: File-based in `src/app/`

- NestJS 12.0.1 - Backend API (`apps/api`)
  - Port: 4001 (non-standard; 4000 occupied locally)
  - Dev: `nest start --watch` 
  - Modules: Auth, Categories, Transactions, Users
  - Global guards, pipes, filters configured in `main.ts`

**UI & Styling:**

- React 19.2.8 - Component library for web
- Tailwind CSS 4.3.3 - Styling (`apps/web`)
- shadcn/ui - Component abstractions (installed in `src/shared/ui`)
- Radix UI 1.6.7 - Headless component primitives
- Lucide React 1.43.0 - Icon library

**Form Handling:**

- React Hook Form 7.87.0 - Form state management
- `@hookform/resolvers` 5.9.1 - Zod integration for validation

**Data & API:**

- Zod 4.5.4 - Schema validation (shared, API, and web)
  - Location: `packages/shared/src/schemas/`
  - Usage: Type inference, API validation, form validation

**Database:**

- Prisma 7.10.0 (ESM, driver adapter mode) - ORM
  - Client: `@prisma/client@7.10.0`
  - Driver: `@prisma/adapter-pg@7.10.0` - PostgreSQL driver
  - Schema: `apps/api/prisma/schema.prisma`
  - Config: `apps/api/prisma.config.ts` (Prisma 7 - connection string from env, not schema)
  - Generation: ESM format, `.js` extensions for imports
  - Database: PostgreSQL 16 (Alpine)

**Authentication:**

- Passport.js 0.7.0 - Auth middleware
- `@nestjs/jwt` 12.0.1 - JWT token handling
- `@nestjs/passport` 12.0.0 - Passport integration
- `passport-jwt` 4.0.1 - JWT strategy
- bcrypt 6.0.0 - Password hashing

**Server & Networking:**

- Express (via `@nestjs/platform-express` 12.0.1) - HTTP server for Nest
- CORS enabled in `main.ts` with configurable origin (default: `http://localhost:3001`)

**Data Fetching & Caching:**

- TanStack React Query 5.102.8 - Server state management (web)
- Fetch API - HTTP client (no axios/got; native fetch)

**Utilities:**

- `reflect-metadata` 0.2.2 - TypeScript reflection for decorators (Nest requirement)
- `class-transformer` 0.5.1 - DTO transformation (API validation)
- `class-validator` 0.15.1 - Class-based validation (categories, transactions DTOs)
- `server-only` 0.0.1 - Enforcement of server-only code (web)

**UI Feedback:**

- Sonner 2.0.8 - Toast notifications (web)
- Recharts 3.10.1 - Charts and data visualization (web)

**Utilities & Helpers:**

- `clsx` 2.1.1 - Conditional className utility
- `class-variance-authority` 0.7.1 - CSS-in-JS variants
- `tailwind-merge` 3.6.0 - Merge Tailwind classes without conflicts

**Database Connection:**

- `pg` 8.23.0 - PostgreSQL client (used with Prisma adapter)

## Testing

**Framework:** Not configured

- Project note: "Тестов в проекте нет — раннер не настроен"

**Testing packages present but unused:**

- `@nestjs/testing` 12.0.1 (dev dependency)

## Build & Dev Tools

**Testing & Linting:**

- ESLint 9.39.5 (pinned to 9.x, not 10.x)
  - Config: Flat config format (ESM)
  - API: `apps/api/eslint.config.mjs` - TypeScript ESLint with typed parsing for `src/**/*.ts`
  - Web: `apps/web/eslint.config.mjs` - Next.js core-web-vitals + TypeScript configs

- TypeScript ESLint 8.70.0 - Type-aware linting (API)

**Build & Scripting:**

- Concurrently 10.0.5 - Parallel script execution (dev servers)
- NestJS CLI 12.0.0 - Build & dev orchestration (`nest build`, `nest start --watch`)
- TypeScript compiler - Direct compilation (`tsc --noEmit` for typecheck)

**Dependency Resolution:**

- npm workspaces - Monorepo package management
  - Root: `package.json` with workspace declarations
  - Workspace packages: `apps/web`, `apps/api`, `packages/shared`
  - Cross-workspace imports via `@expense/shared`, `@expense/api`, `@expense/web`

## Configuration

**Environment:**

- Configuration method: Environment variables via `dotenv`
- Loaded in:
  - API: `apps/api/prisma.config.ts` (`import 'dotenv/config'`)
  - API: `main.ts` via `ConfigService` (NestJS ConfigModule)
- Variables required (from `.env.example`):
  - `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_PORT`
  - `DATABASE_URL` (Prisma - set by CI/dev env, not in `.env`)
  - `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` (auth - inferred from usage)
  - `JWT_ACCESS_TTL`, `JWT_REFRESH_TTL` (auth token lifetimes)
  - `CORS_ORIGIN` (default: `http://localhost:3001`)
  - `PORT` (API port, default: 4001)

**Build:**

- `tsconfig.base.json` - Shared TypeScript base config (ES2023, strict mode, path aliases)
- `tsconfig.json` (apps/api) - ESM, decorator metadata, no emit
- `tsconfig.json` (apps/web) - DOM lib, JSX preserve, Next.js plugin, path aliases `@/*`
- `eslint.config.mjs` (both apps) - ESLint 9 flat config, typed parsing
- Prisma config: `prisma.config.ts` (Prisma 7 - CLI config separate from schema)

## Docker & Containerization

**Database Container:**

- Image: `postgres:16-alpine`
- Container name: `expense-tracker-db`
- Defined in: `docker-compose.yml`
- Port mapping: `${POSTGRES_PORT:-5432}:5432` (default 5432, overridden to 5433 locally)
- Health check: `pg_isready` with 5s interval, 10 retries
- Volume: Named volume `db-data` for persistence
- Environment: Configured from docker-compose vars (POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB, POSTGRES_PORT)

**Application Containers:** Not configured (local development only)

## Platform Requirements

**Development:**

- Node.js 24+ (`.nvmrc`)
- Docker & Docker Compose (for PostgreSQL)
- npm 10+ (workspaces support)
- Git

**Production:**

- Node.js 24+
- PostgreSQL 16+ (or compatible)
- Environment variables: `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `CORS_ORIGIN`
- Deployment target: Self-hosted (no platform restrictions detected)

## External Dependencies Summary

**Production Dependencies (by workspace):**

- **Shared:** Zod only
- **API:** NestJS ecosystem (12 packages), Prisma + pg adapter, Auth (Passport, JWT, bcrypt), validation
- **Web:** Next.js, React 19, TanStack Query, shadcn/ui + Radix, React Hook Form, Tailwind, Sonner, Recharts

**Dev Dependencies:**

- ESLint 9, TypeScript 6, Prisma CLI, NestJS CLI, Concurrently

**Total packages:** 80+ (check `package-lock.json` for exact count)

---

*Stack analysis: 2026-09-20*
