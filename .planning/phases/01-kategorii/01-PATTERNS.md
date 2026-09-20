# Phase 1: Категории - Pattern Map

**Mapped:** 2026-09-20
**Files analyzed:** 14
**Analogs found:** 14 / 14

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `apps/web/src/entities/category/api/create-category.ts` | service (entity-api) | request-response | `apps/web/src/entities/category/api/get-categories.ts` | exact (same entity, verb sibling) |
| `apps/web/src/entities/category/api/update-category.ts` | service (entity-api) | request-response | `apps/web/src/entities/category/api/get-categories.ts` | exact |
| `apps/web/src/entities/category/api/delete-category.ts` | service (entity-api) | request-response | `apps/web/src/entities/category/api/get-categories.ts` | exact |
| `apps/web/src/features/category-form/api/create-category.action.ts` | controller (Server Action) | request-response | `apps/web/src/features/auth/api/register.action.ts` | role-match (redirect vs return-state differs, see Pattern 2 below) |
| `apps/web/src/features/category-form/api/update-category.action.ts` | controller (Server Action) | request-response | `apps/web/src/features/auth/api/register.action.ts` | role-match |
| `apps/web/src/features/category-form/api/delete-category.action.ts` | controller (Server Action) | request-response | `apps/web/src/features/auth/api/logout.action.ts` | role-match (session read + branching, no unconditional redirect) |
| `apps/web/src/features/category-form/model/types.ts` | model (action-state type) | — | `apps/web/src/features/auth/model/types.ts` | role-match, shape must differ (union with `success`/`fieldErrors`/`blocked`) |
| `apps/web/src/features/category-form/ui/category-form.tsx` | component (client form) | request-response | `apps/web/src/features/auth/ui/register-form.tsx` | exact (RHF + zodResolver + shadcn Form) |
| `apps/web/src/features/category-form/ui/color-swatch-picker.tsx` | component | — | `apps/web/src/entities/category/ui/category-dot.tsx` (styling technique) + `apps/web/src/shared/ui/checkbox.tsx` (button/asChild a11y pattern) | partial — no direct analog, compose from two |
| `apps/web/src/features/category-form/ui/category-delete-dialog.tsx` | component (client dialog) | request-response | none in-repo (first `AlertDialog` usage) | no analog — use RESEARCH.md Pattern 4 |
| `apps/web/src/widgets/category-list/ui/category-list.tsx` | component (client widget, owns dialog state) | CRUD (list + triggers) | `apps/web/src/widgets/recent-transactions/ui/recent-transactions.tsx` | role-match (Card-wrapped list, but that one is server + read-only; this one is client + interactive) |
| `apps/web/src/widgets/category-list/ui/empty-state.tsx` | component | — | `apps/web/src/widgets/recent-transactions/ui/empty-state.tsx` | exact |
| `apps/web/src/views/categories/ui/categories-view.tsx` | component (Server Component view) | request-response | `apps/web/src/views/dashboard/ui/dashboard-view.tsx` | exact |
| `apps/web/src/app/(dashboard)/categories/page.tsx` | route (Next page, modify existing stub) | request-response | `apps/web/src/app/(dashboard)/dashboard/page.tsx` (structure) | exact |
| `apps/web/src/shared/api/error-message.ts` (extend) | utility | transform | itself (existing file, add `extractFieldErrors`) | exact — read below for insertion point |

## Pattern Assignments

### `apps/web/src/entities/category/api/create-category.ts` (service, request-response)

**Analog:** `apps/web/src/entities/category/api/get-categories.ts` (full file, 9 lines)

```typescript
import 'server-only';
import type { Category } from '@expense/shared';
import { apiFetch } from '@/shared/api/api-client';

/** Токен параметром — см. комментарий в entities/transaction/api/get-transactions.ts. */
export function getCategories(accessToken: string): Promise<Category[]> {
  return apiFetch<Category[]>('/categories', { accessToken, cache: 'no-store' });
}
```

Copy this exact shape for create/update/delete:
- `import 'server-only'` at top — entity-api files never run client-side.
- `accessToken` is always the **first parameter**, never read from session inside the entity file (session-read is the caller's job — CLAUDE.md, RESEARCH.md Anti-Patterns).
- `apiFetch<T>(path, { accessToken, method, body })` — no manual JSON.parse/stringify of the response, `apiFetch` already does it (see `api-client.ts` below).
- `POST`/`PATCH` need `body: JSON.stringify(input)`; `GET` needs `cache: 'no-store'` (not needed for mutations).
- `delete-category.ts` returns `Promise<void>` — `apiFetch` already resolves `null` on `204` (`api-client.ts:31`), no special-casing needed in the entity file.

### `apps/web/src/features/category-form/api/create-category.action.ts` / `update-category.action.ts` (controller, request-response)

**Analog:** `apps/web/src/features/auth/api/register.action.ts` (full file, 29 lines) — **but do not copy the `redirect()` ending.**

```typescript
'use server';

import { redirect } from 'next/navigation';
import { registerSchema, type AuthTokens, type RegisterInput } from '@expense/shared';
import { setSession } from '@/entities/session/api/session';
import { apiFetch } from '@/shared/api/api-client';
import { apiErrorMessage } from '@/shared/api/error-message';
import { ROUTES } from '@/shared/config/routes';
import type { AuthActionState } from '@/features/auth/model/types';

export async function registerAction(input: RegisterInput): Promise<AuthActionState> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return { error: 'Проверьте правильность заполнения полей' };
  }

  try {
    const tokens = await apiFetch<AuthTokens>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(parsed.data),
    });
    await setSession(tokens);
  } catch (error) {
    return { error: apiErrorMessage(error) };
  }

  redirect(ROUTES.dashboard);
}
```

Structural pattern to keep: `'use server'` directive, top-of-function `schema.safeParse` guard returning `{ error }` on failure, `try { await entityCall() } catch { return { error: apiErrorMessage(error) } }`.

**Deviation required (RESEARCH.md Pattern 2/3):** category actions must (1) call `getSession()` themselves (register doesn't need to — it creates the session), (2) call `extractFieldErrors(error)` before falling back to `apiErrorMessage(error)`, (3) end with `revalidatePath()` calls + `return { success: true }` instead of `redirect()`. Use RESEARCH.md's `create-category.action.ts` code block directly (already fully drafted there) — this analog is for structural conventions (import order, `'use server'` placement, `safeParse` guard shape) only.

### `apps/web/src/features/category-form/api/delete-category.action.ts` (controller, request-response)

**Analog:** `apps/web/src/features/auth/api/logout.action.ts` (full file, 41 lines) — for the "read session, branch on `ApiError.status`, no unconditional redirect" shape:

```typescript
'use server';

import { redirect } from 'next/navigation';
import { clearSession, getSession, refreshSession } from '@/entities/session/api/session';
import type { Session } from '@/entities/session/model/types';
import { ApiError, apiFetch } from '@/shared/api/api-client';
import { ROUTES } from '@/shared/config/routes';

async function revokeTokens(session: Session): Promise<boolean> {
  try {
    await apiFetch<void>('/auth/logout', {
      method: 'POST',
      accessToken: session.accessToken,
      body: JSON.stringify({ refreshToken: session.refreshToken }),
    });
    return true;
  } catch (error) {
    return !(error instanceof ApiError) || error.status !== 401;
  }
}
```

Copy the `error instanceof ApiError && error.status === N` branching idiom (line 23 / RESEARCH.md Pattern 4 reuses this exact idiom for `status === 409`). Do not copy the refresh-retry logic — that's logout-specific.

### `apps/web/src/features/category-form/model/types.ts` (model)

**Analog:** `apps/web/src/features/auth/model/types.ts` (full file, 5 lines)

```typescript
/**
 * Что возвращает Server Action формы: при успехе управление уходит в redirect
 * (он бросает NEXT_REDIRECT и ничего не возвращает), при ошибке — текст для тоста.
 */
export type AuthActionState = { error: string } | undefined;
```

Copy the doc-comment convention (explain the shape's *why*, not just its fields). New shape (per RESEARCH.md Pattern 2/4):
```typescript
export type CategoryActionState =
  | { success: true }
  | { error: string; fieldErrors?: Record<string, string>; blocked?: boolean }
  | undefined;
```

### `apps/web/src/features/category-form/ui/category-form.tsx` (component, request-response)

**Analog:** `apps/web/src/features/auth/ui/register-form.tsx` (full file, 141 lines)

**Imports pattern** (lines 1-24):
```typescript
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2Icon } from 'lucide-react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { registerAction } from '@/features/auth/api/register.action';
import {
  registerFormSchema,
  type RegisterFormValues,
} from '@/features/auth/model/register-form-schema';
import { Button } from '@/shared/ui/button';
import { Checkbox } from '@/shared/ui/checkbox';
import { ROUTES } from '@/shared/config/routes';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/ui/form';
import { Input } from '@/shared/ui/input';
```
Note: `category-form.tsx` imports `createCategorySchema` directly from `@expense/shared` instead of a local `-schema.ts` (RESEARCH.md explicitly says do NOT create `features/category-form/model/category-form-schema.ts` — the shared Zod schema is reused as-is).

**Core form + submit pattern** (lines 26-45, 134-140):
```typescript
export function RegisterForm() {
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: { email: '', password: '', name: '', agreeToTerms: false },
  });

  const onSubmit = form.handleSubmit(async ({ email, password, name }) => {
    const result = await registerAction({ email, password, ...(trimmed ? { name: trimmed } : {}) });
    if (result?.error) {
      toast.error(result.error);
    }
  });

  const { isSubmitting } = form.formState;
  // ...
  <Button type="submit" className="mt-2 w-full" disabled={isSubmitting}>
    {isSubmitting ? <Loader2Icon className="animate-spin" /> : null}
    Создать аккаунт
  </Button>
```
For `CategoryForm`: extend `onSubmit` to branch on `result?.fieldErrors` (call `form.setError` per field, RESEARCH.md Pattern 1) before the `result?.error` toast branch, and call `onSuccess()` (close Dialog) on success — none of which `register-form.tsx` needs since it redirects instead.

**Field wiring pattern** (lines 50-67, `FormField`/`FormItem`/`FormControl`/`FormMessage`) — copy verbatim for the `name` `Input` field; the `color` field uses `Controller`-driven `ColorSwatchPicker` instead of `Input` (no direct analog in this file — compose from RESEARCH.md Pattern 5).

### `apps/web/src/features/category-form/ui/color-swatch-picker.tsx` (component)

**No direct analog.** Compose from two files:

`apps/web/src/entities/category/ui/category-dot.tsx` (full file, 15 lines) — inline `style={{ backgroundColor: color }}` technique:
```typescript
interface CategoryDotProps {
  color: string;
  className?: string;
}

export function CategoryDot({ color, className }: CategoryDotProps) {
  return (
    <span
      aria-hidden="true"
      className={className ?? 'inline-block size-2.5 shrink-0 rounded-full'}
      style={{ backgroundColor: color }}
    />
  );
}
```

`apps/web/src/shared/ui/checkbox.tsx` (lines 13-17) — the `asChild`-onto-`<div>` Chrome-bug workaround, relevant if swatch buttons show the same border/background override:
```typescript
// Chrome на некоторых машинах принудительно обнуляет border/background у <button>
// (см. память "chrome-overrides-button-colors") — asChild рендерит div вместо button,
// Radix навешивает role="checkbox" и обработчики клика/клавиатуры на него сам.
```
Each swatch: a real `<button type="button">` (no Radix primitive involved here, so the Chrome workaround likely doesn't apply — it's Radix `asChild` specific) with inline `style={{ backgroundColor: hex }}`, `aria-pressed={value === hex}`, `onClick={() => onChange(hex)}`.

### `apps/web/src/features/category-form/ui/category-delete-dialog.tsx` (component)

**No analog exists in-repo** (first `AlertDialog` usage). Use RESEARCH.md's fully-drafted `delete-category.action.ts` (Pattern 4) verbatim, and build the dialog component using the `logout.action.ts`-style `error instanceof ApiError && error.status === 409` branch (see above) inside the component's submit handler to decide whether to close.

### `apps/web/src/widgets/category-list/ui/category-list.tsx` (component, client, owns dialog state)

**Analog:** `apps/web/src/widgets/recent-transactions/ui/recent-transactions.tsx` (full file, 51 lines) for the Card/EmptyState composition shape:
```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { EmptyState } from '@/widgets/recent-transactions/ui/empty-state';
// ...
export function RecentTransactions({ rows, total, page, basePath }: RecentTransactionsProps) {
  return (
    <Card>
      <CardHeader><CardTitle>Последние транзакции</CardTitle></CardHeader>
      <CardContent className="flex flex-col gap-4">
        {rows.length === 0 ? <EmptyState title="Пока нет транзакций" description="..." /> : <TransactionsTable rows={rows} />}
      </CardContent>
    </Card>
  );
}
```
Key deviation: `recent-transactions.tsx` has no `'use client'` — it's a pure Server Component prop-sink. `category-list.tsx` **must** be `'use client'` (RESEARCH.md Structure Rationale) because it owns `useState` for which category is being edited/deleted and renders `<CategoryForm>`/`<CategoryDeleteDialog>` conditionally, plus the page-level "Создать категорию" `DialogTrigger` (Open Question 1's recommendation — put it here, not in the view).

### `apps/web/src/widgets/category-list/ui/empty-state.tsx` (component)

**Analog:** `apps/web/src/widgets/recent-transactions/ui/empty-state.tsx` (full file, 23 lines)

```typescript
import Link from 'next/link';

interface EmptyStateProps {
  title: string;
  description: string;
  backHref?: string;
  backLabel?: string;
}

export function EmptyState({ title, description, backHref, backLabel }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center">
      <p className="font-medium">{title}</p>
      <p className="text-sm text-muted-foreground">{description}</p>
      {backHref ? (
        <Link href={backHref} className="text-sm text-primary underline-offset-4 hover:underline">
          {backLabel}
        </Link>
      ) : null}
    </div>
  );
}
```
Copy nearly verbatim — replace the optional `Link`-based back-navigation slot with the D-07 "Создать категорию" `Button` (opens the create Dialog, not a link) since `category-list.tsx` already owns dialog-open state.

### `apps/web/src/views/categories/ui/categories-view.tsx` (component, Server Component)

**Analog:** `apps/web/src/views/dashboard/ui/dashboard-view.tsx` (full file, 52 lines)

```typescript
import { redirect } from 'next/navigation';
import { getSession } from '@/entities/session/api/session';
import { ROUTES } from '@/shared/config/routes';

export async function DashboardView({ page }: DashboardViewProps) {
  const session = await getSession();
  if (!session) {
    redirect(ROUTES.login);
  }

  const [result, profile] = await Promise.all([...]);

  if (result.status === 'unauthorized') {
    redirect(ROUTES.sessionExpired);
  }

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">...</h1>
      {result.status === 'error' ? (
        <p className="text-sm text-destructive">Не удалось загрузить данные: {result.message}</p>
      ) : (
        <RecentTransactions rows={result.rows} total={result.total} page={page} basePath={ROUTES.dashboard} />
      )}
    </main>
  );
}
```
`categories-view.tsx` is simpler (no pagination result union) — RESEARCH.md's `getCategories()` call throws `ApiError` directly rather than returning a status union, so use `try { ... } catch (error) { if (error instanceof ApiError && error.status === 401) redirect(ROUTES.sessionExpired); throw error; }` (RESEARCH.md's own Code Examples section already has this fully drafted — copy from there, this analog is for the container/`<main>` structure and redirect-before-render idiom).

### `apps/web/src/app/(dashboard)/categories/page.tsx` (route, replaces stub)

**Analog:** sibling `apps/web/src/app/(dashboard)/dashboard/page.tsx` structure (3-5 line delegate to view + `metadata` export) — mirror RESEARCH.md's fully-drafted replacement:
```typescript
import type { Metadata } from 'next';
import { CategoriesView } from '@/views/categories/ui/categories-view';

export const metadata: Metadata = { title: 'Категории — Трекер расходов' };

export default function CategoriesPage() {
  return <CategoriesView />;
}
```
Current stub being replaced (confirmed tracked, `git ls-files` non-empty):
```typescript
export default function CategoriesPage() {
  // TODO: список категорий с созданием и редактированием.
  return <main className="p-6">Категории</main>;
}
```

### `apps/web/src/shared/api/error-message.ts` (extend, utility)

**Analog:** itself — existing `apiErrorMessage()` (full file, 58 lines) is the direct sibling for `extractFieldErrors()`:
```typescript
import { ApiError } from '@/shared/api/api-client';

const FALLBACK = 'Сервис недоступен, попробуйте позже';

interface NestErrorBody {
  error?: {
    message?: unknown;
    issues?: { errors?: unknown[]; properties?: Record<string, { errors?: unknown[] }> };
  };
}

export function apiErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return FALLBACK;
  }
  if (error.status >= 500) {
    return FALLBACK;
  }
  const body = error.body as NestErrorBody | null;
  const issue = firstZodIssue(body ?? {});
  if (issue) {
    return issue;
  }
  const message = body?.error?.message;
  if (typeof message === 'string' && message.length > 0) {
    return message;
  }
  if (Array.isArray(message) && typeof message[0] === 'string') {
    return message[0];
  }
  return FALLBACK;
}
```
Add `extractFieldErrors()` as a new named export below `apiErrorMessage()`, reusing the already-imported `ApiError` and the `NestErrorBody` interface's `error.message` field (widen its type to `unknown` — already is). Full implementation already drafted in RESEARCH.md Pattern 3 — copy verbatim, do not re-derive.

---

## Shared Patterns

### Session read + accessToken-as-parameter
**Source:** `apps/web/src/entities/category/api/get-categories.ts:5` (doc comment) and every `features/auth/api/*.action.ts`
**Apply to:** all three `entities/category/api/{create,update,delete}-category.ts` (never call `getSession()` inside them) and all three `features/category-form/api/*.action.ts` (always call `getSession()` at the top, return `{ error: 'Сессия истекла, войдите заново' }` if absent).

### Error handling — `ApiError` + `apiErrorMessage()` + new `extractFieldErrors()`
**Source:** `apps/web/src/shared/api/error-message.ts`, `apps/web/src/shared/api/api-client.ts`
**Apply to:** all mutation Server Actions. Order matters: try `extractFieldErrors(error)` first (400 grouped body → per-field `form.setError`), fall back to `apiErrorMessage(error)` (everything else — 409 duplicate name, 409 FK-blocked, 5xx, network) for a toast.

### `error.status === N` branching (never string-match)
**Source:** `apps/web/src/features/auth/api/logout.action.ts:23`
**Apply to:** `delete-category.action.ts` (`status === 409`) and `categories-view.tsx` (`status === 401`).

### Server Component view shape (`getSession` → redirect → fetch → catch 401 → redirect sessionExpired → render `<main className="mx-auto flex max-w-4xl flex-col gap-6 p-6">`)
**Source:** `apps/web/src/views/dashboard/ui/dashboard-view.tsx`
**Apply to:** `categories-view.tsx`.

### RHF + zodResolver + shadcn `Form` primitives
**Source:** `apps/web/src/features/auth/ui/register-form.tsx`
**Apply to:** `category-form.tsx`.

### Card + EmptyState list composition
**Source:** `apps/web/src/widgets/recent-transactions/ui/recent-transactions.tsx`, `.../empty-state.tsx`
**Apply to:** `widgets/category-list/ui/category-list.tsx`, `.../empty-state.tsx`.

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `apps/web/src/features/category-form/ui/category-delete-dialog.tsx` | component | request-response | First `AlertDialog` usage in the codebase — no existing confirm-dialog to copy from. Use RESEARCH.md Pattern 4 (fully drafted `delete-category.action.ts`) plus the `logout.action.ts` `status === 409` branching idiom listed above. |
| `apps/web/src/shared/ui/dialog.tsx`, `apps/web/src/shared/ui/alert-dialog.tsx` | config (generated shadcn components) | — | Not hand-written — generated via `npx shadcn@latest add dialog alert-dialog` per RESEARCH.md; after generation, verify imports use unified `radix-ui` package (not standalone `@radix-ui/react-dialog`) and `@/shared/lib/utils` (not `"cn"`), same caveat already applied to `checkbox.tsx`. |

## Metadata

**Analog search scope:** `apps/web/src/entities/category`, `apps/web/src/features/auth`, `apps/web/src/widgets/recent-transactions`, `apps/web/src/views/dashboard`, `apps/web/src/shared/api`, `apps/web/src/shared/ui`, `apps/web/src/shared/config`
**Files scanned:** 14 read directly this session, cross-referenced against RESEARCH.md's own direct-read citations (same session, same repo state)
**Pattern extraction date:** 2026-09-20
