---
last_mapped_commit: 7bdd32cff1b9829a6507c35f437d7e395a9906a3
last_mapped_at: 2026-09-20
---
# Coding Conventions

**Analysis Date:** 2026-09-20

## Naming Patterns

**Files:**

- Source files: `kebab-case.ts` or `kebab-case.tsx` (e.g., `http-exception.filter.ts`, `app-header.tsx`, `recent-transactions.tsx`)
- DTO files: `create-category.dto.ts`, `update-category.dto.ts`
- Validation files: `category-validation.ts`
- Index/barrel files: `index.ts`

**Functions:**

- camelCase: `getCategories()`, `findAll()`, `toCategory()`, `apiErrorMessage()`
- Private/internal functions: prefix-free, but consider exporting if reusable
- Command handlers: named with `Handler` suffix (e.g., `LoginHandler`, `RegisterHandler`)

**Variables:**

- camelCase: `userId`, `accessToken`, `categoryName`, `isSubmitting`
- Constants in validation rules: `SCREAMING_SNAKE_CASE` (e.g., `CATEGORY_NAME_MAX`, `CATEGORY_COLOR_PATTERN`)
- Request/response objects: camelCase

**Types & Interfaces:**

- PascalCase: `CategoriesService`, `AuthUser`, `CategoryDotProps`, `CreateCategoryDto`
- DTO Classes: PascalCase (e.g., `CreateCategoryDto`, `UpdateCategoryDto`)
- Zod schemas: camelCase (e.g., `loginSchema`, `registerSchema`)
- Type exports use `z.infer<typeof schema>` pattern (e.g., `type LoginInput = z.infer<typeof loginSchema>`)

**Unused Parameters:**

- Prefix unused params with underscore: `(_param: Type)` 
- ESLint rule: `'@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }]`

## Code Style

**Formatting:**

- No Prettier configuration in use
- ESLint 9.x enforces style (NOT 10.x — 10.x incompatible with eslint-plugin-react)
- 2-space indentation (standard TypeScript)
- Semicolons required
- Single quotes for strings (ESLint default)

**Linting:**

- Frontend: `apps/web/eslint.config.mjs` imports `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript` as flat configs
- Backend: `apps/api/eslint.config.mjs` uses `typescript-eslint` with typed parsing enabled only for `src/**/*.ts`
- Ignored directories: `node_modules/`, `dist/`, `.next/`, `src/generated/**` (Prisma client)
- Run: `npm run lint` (runs ESLint in all workspaces)

**ESM Requirements (API only):**

- API is ESM package (`"type": "module"` in `apps/api/package.json`)
- All relative imports in API must include `.js` extension: `import { Foo } from './foo.js'`
- Prisma generator configured with `moduleFormat = "esm"` and `importFileExtension = "js"`

## Import Organization

**Order (from real examples):**

1. External dependencies (e.g., `@nestjs/*`, `react-hook-form`, `lucide-react`)
2. Type-only imports from external packages (e.g., `import type { ... } from '@nestjs/common'`)
3. Shared package imports (`@expense/shared`, `@expense/api`)
4. Internal path-aliased imports (`@/shared/ui/*`, `@/features/auth/*`)
5. Relative imports with explicit `.js` extension in API

**Path Aliases:**

- Frontend: `@/*` → `apps/web/src/*` (e.g., `@/shared/ui/button`)
- API: No path aliases; uses relative imports with `.js` extension
- Shared package: `@expense/shared` (consumed as npm package via workspaces)

**Type Imports:**

- Use `import type { Type }` for type-only imports to reduce bundle size
- However, **in NestJS controllers receiving DTO parameters**, import DTO classes as values (not `import type`), else `ValidationPipe` won't see the class metadata and validation silently fails
- Example from `categories.controller.ts`: `import { CreateCategoryDto }` (not `import type`)

## Error Handling

**API Layer (Backend - Nest):**

- HTTP exceptions thrown as Nest exceptions: `new NotFoundException()`, `new ConflictException()`, `new BadRequestException()`
- All exceptions caught by global `HttpExceptionFilter` at `apps/api/src/common/filters/http-exception.filter.ts`
- Response format: `{ statusCode, path, timestamp, error }` where `error` is the exception response body
- Status codes: Use `HttpStatus` enum (e.g., `HttpStatus.NO_CONTENT` for 204)
- Error messages in Russian (user-facing)

**Database Errors (Prisma):**

- Caught and converted via `isPrismaError(error, PrismaErrorCode.*)` from `apps/api/src/prisma/prisma-errors.ts`
- Common codes: `UniqueViolation` (P2002), `RecordNotFound` (P2025), `ForeignKeyViolation` (P2003)
- Example: `isPrismaError(error, PrismaErrorCode.UniqueViolation)` → `new ConflictException('...')`

**Client Layer (Frontend - React):**

- Custom `ApiError` class defined in `apps/web/src/shared/api/api-client.ts` with properties: `message`, `status`, `body`
- Error extraction via `apiErrorMessage()` in `apps/web/src/shared/api/error-message.ts` — handles Nest error format and ZodValidationPipe grouped format
- Display to user via `toast.error(apiErrorMessage(error))`

**Validation Errors:**

- **Zod schemas** (auth, forms): Provide error messages in Russian inline (e.g., `z.email('Некорректный email')`)
- **DTO class-validators**: Rules and messages centralized in validation files (e.g., `category-validation.ts`)
- When DTO rule duplicates Zod schema, **update both places** (e.g., `CATEGORY_NAME_MAX` must match `createCategorySchema`)

## Logging

**Framework:** `@nestjs/common` Logger

**Patterns:**

- Use `Logger.log()` for startup info (e.g., "API слушает http://localhost:4001/api")
- Use `logger.error()` for HTTP 5xx errors with full exception stack
- Avoid logging sensitive data (passwords, tokens)
- Example: `this.logger.error(\`${request.method} ${request.url}\`, exception as Error);`

## Comments

**When to Comment:**

- On public functions/classes: JSDoc-style block comment explaining purpose
- On complex logic: inline comments explaining the "why", not the "what"
- On important constraints or workarounds: clear explanations for future maintainers
- On cross-cutting concerns (data isolation, validation rules that duplicate elsewhere)

**JSDoc/TSDoc:**

- Used on public exports, especially service methods
- Format: `/** Description here. */`
- Example: `/** Единый формат ошибки для фронтенда. */`

**Language:**

- Comments written in Russian (matching project's primary language and user-facing error messages)
- Code itself (variable names, function names) in English

## Function Design

**Size:**

- Keep functions small and focused (one responsibility)
- Helper functions (converters, error handlers) extracted as private/internal functions
- Example: `toCategory()`, `toHttpError()` are small, pure helper functions

**Parameters:**

- Use destructuring for object parameters (e.g., `{ color, className }`)
- Optional parameters at the end
- Required ID parameters validated with pipes (e.g., `ParseUUIDPipe`)

**Return Values:**

- Explicit return types required (enforced by `strict: true` in tsconfig)
- Use `Promise<T>` for async functions
- Use `void` for operations with no return (e.g., `Promise<void>` for logout)
- Factory functions return plain objects or classes (e.g., `toCategory()` returns `Category`)

**Async/Await:**

- Async functions preferred over Promise.then() chains
- Error handling in try/catch blocks
- Example: `try { const record = await ...create(); return toCategory(record); } catch (error) { throw toHttpError(error); }`

## Module Design

**Exports:**

- Each module exports its main service/controller/guard
- DTO classes and types exported from `dto/` subdirectory
- Validators/helpers exported from utility files
- Barrel files (`index.ts`) used in shared package for clean imports

**Barrel Files:**

- `packages/shared/src/schemas/index.ts` exports all schemas and their inferred types
- Reduces import statement length: `import { loginSchema, type LoginInput } from '@expense/shared'`

**Class Construction:**

- Constructor injection for dependencies: `constructor(private readonly serviceName: ServiceType)`
- No DI token needed if service is injectable
- Private readonly properties for immutability

## TypeScript Configuration

**Frontend (`apps/web/tsconfig.json`):**

- Extends `tsconfig.base.json`
- `moduleResolution: "bundler"` for Next.js
- `paths: { "@/*": ["./src/*"] }` for path alias
- `noEmit: true` — Next.js handles compilation

**Backend (`apps/api/tsconfig.json`):**

- Extends `tsconfig.base.json`
- `module: "nodenext"` and `moduleResolution: "nodenext"` for ESM
- `experimentalDecorators: true` and `emitDecoratorMetadata: true` for Nest DI
- `strictPropertyInitialization: false` to allow optional properties without initializers

**Base (`tsconfig.base.json`):**

- `strict: true` — enables strict null checks and type checking
- `noUncheckedIndexedAccess: true` — prevents unsafe object key access
- `noImplicitOverride: true` — forces override keyword on subclass methods
- `target: "ES2023"` for modern JavaScript features

---

*Convention analysis: 2026-09-20*
