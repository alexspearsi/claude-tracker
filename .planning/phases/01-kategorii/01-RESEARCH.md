# Phase 1: Категории — Research

**Researched:** 2026-09-20
**Domain:** Frontend CRUD (Next.js 16 App Router, FSD) over an already-complete Nest 12 `/api/categories` backend
**Confidence:** HIGH — every claim below is grounded in a direct `Read` of the actual source in this repo (frontend, backend, and `node_modules/@nestjs/common` pipe internals) this session, not in generic Next.js/shadcn advice.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**UI-паттерн формы**
- **D-01:** Создание/редактирование категории — через `Dialog` (shadcn/ui), не отдельная страница и не inline-форма в списке. — Reversibility: reversible — чисто компонентная замена
- **D-02:** Одна форма `CategoryForm` для create и edit (принимает опциональный `category` проп для режима редактирования), по аналогии с рекомендацией research для `TransactionForm`

**Цвет категории**
- **D-03:** Пикер цвета — фиксированная палитра из 8–12 preset-свотчей (кнопки-кружки), без HSB/RGB picker — уже зафиксировано в PROJECT.md/REQUIREMENTS.md как решение, не переоткрывается

**Список категорий**
- **D-04:** Простой список/таблица (имя, цветной `CategoryDot` — уже существует как переиспользуемый компонент, кнопки редактировать/удалить), без карточек/сетки

**Удаление**
- **D-05:** Подтверждение через `AlertDialog` (shadcn/ui) перед удалением
- **D-06:** При 409 от API (категория используется) — сообщение в самом диалоге/тосте: "Нельзя удалить категорию — есть связанные транзакции", без закрытия диалога молча

**Пустое состояние**
- **D-07:** Если категорий нет — простое сообщение с кнопкой "Создать категорию", без иллюстраций

### Claude's Discretion
- Точный набор из 8–12 цветов палитры — Claude выбирает набор, визуально различимый и консистентный с уже существующими dashboard-цветами категорий
- Расположение кнопки "Добавить категорию" на странице (шапка страницы, справа)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CAT-01 | Пользователь может создать категорию (название + цвет из предустановленной палитры) | `features/category-form` Pattern 1/2/5 below; existing `createCategorySchema` for `zodResolver`; `POST /categories` already implemented — see Architecture Patterns, Code Examples |
| CAT-02 | Пользователь может отредактировать существующую категорию | Same `CategoryForm` with `category` prop populated (Pattern 1); `PATCH /categories/:id` via `updateCategorySchema` |
| CAT-03 | Пользователь может удалить категорию с подтверждением | `AlertDialog` delete-confirm pattern (Pattern 4); `DELETE /categories/:id` returns 204 |
| CAT-04 | Если у категории есть связанные транзакции, удаление блокируется и показывается понятное сообщение (маппинг 409, а не сырой текст) | Pitfall 1 (409 status-check, not string-match) — API-side mapping already verified in `categories.service.ts`; this phase only needs the frontend branch |
| CAT-05 | Страница `/categories` работает как полноценный список с CRUD (не заглушка) | `views/categories/ui/categories-view.tsx` mirroring `views/dashboard/ui/dashboard-view.tsx` exactly — see Code Examples |
</phase_requirements>

## Summary

This is a narrow, well-bounded phase: the entire backend (`CategoriesController`, `CategoriesService`, DTOs, Prisma model, 409-on-FK-restrict handling) is already implemented and correct — nothing on the API side needs to change. The work is 100% frontend: replace the `/categories` stub with a Server Component list, and add a `Dialog`-based create/edit form plus an `AlertDialog`-based delete confirmation, following the `features/auth` pattern that already exists in this codebase almost exactly.

Two shadcn/ui primitives are missing from the project (`Dialog`, `AlertDialog`) — both compose directly on the already-installed, unified `radix-ui@1.6.7` package `[VERIFIED: node_modules/radix-ui via require()]`, which exports `Dialog` and `AlertDialog` members, so adding them should not pull any new npm dependency. `DropdownMenu` is **not** needed for this phase — D-04 explicitly calls for plain edit/delete buttons, not a row action menu (that was a broader Phase 2-oriented recommendation in the project-level `STACK.md`, not a Phase 1 requirement).

The single most important, non-obvious finding from this session: **the category form is the first form in this codebase to submit against a `class-validator`/DTO-validated Nest route** (auth's forms hit Zod-validated routes; the existing `apiErrorMessage()` helper was built for that shape). A direct read of the installed `@nestjs/common` `ValidationPipe` source (`errorFormat: 'grouped'`, configured in `apps/api/src/main.ts`) confirms the 400 body for an invalid category name/color is `{ error: { message: { name: [...], color: [...] } } }` — a **plain object keyed by field**, not a string or a string array. `apiErrorMessage()`'s current fallback logic only recognizes `string` and `string[]` shapes for `body.error.message`, so a 400 from `POST /categories` or `PATCH /categories/:id` today falls through to the generic `"Сервис недоступен, попробуйте позже"` toast — actively misleading for what is a normal validation error, not a service outage. This phase must add a small grouped-error extractor (see Common Pitfalls §1 and Code Examples) before the create/edit form can show correct per-field errors.

**Primary recommendation:** Mirror `features/auth` file-for-file for `features/category-form/` (Dialog form + AlertDialog delete, both owned by the same feature slice), reuse `@expense/shared`'s existing `categorySchema`/`createCategorySchema`/`updateCategorySchema` for `zodResolver` with zero new schema code, and add one new shared helper — a grouped-validation-error extractor in `shared/api/error-message.ts` — before wiring the create/edit Server Actions.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Category list rendering (`/categories` initial load) | Frontend Server (SSR) | Database/Storage | `views/categories/ui/categories-view.tsx` is an async Server Component fetching via `getCategories()`, exactly like `dashboard-view.tsx` does for transactions |
| Category create/edit/delete persistence | API/Backend | Database/Storage | `CategoriesController` → `CategoriesService` → `PrismaService` already fully implemented; frontend only calls it |
| Field validation (name/color/icon rules) | API/Backend | Browser/Client | `Create/UpdateCategoryDto` (`class-validator`) is the real gate; `categorySchema` via `zodResolver` is a client-side UX mirror only, same split CLAUDE.md already documents |
| Dialog/AlertDialog open state, form interactivity | Browser/Client | — | `'use client'` components (`CategoryForm`, delete confirm), no server involvement until submit |
| Router-cache freshness after mutation | Frontend Server (SSR) | — | `revalidatePath()` called inside the Server Action, affects Next's client Router Cache for `/categories`, `/dashboard`, `/expenses` |
| Delete-blocked-by-FK enforcement | API/Backend | Browser/Client | `P2003` → `ConflictException` already implemented server-side (`categories.service.ts`); frontend only needs to branch on `error.status === 409` and show the message (D-06) |
| Session/access-token read | Frontend Server (SSR) | — | `getSession()` (`'server-only'`), read once per Server Action/Server Component, passed down as a plain string — no new boundary type |

## Standard Stack

### Core (already in the project — confirmed installed, no version change)

| Library | Version (installed) | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React Hook Form | 7.87.0 `[VERIFIED: apps/web/package.json:23]` | `CategoryForm` state | Already the project's only form library — `register-form.tsx` is the exact pattern to mirror |
| `@hookform/resolvers` | 5.9.1 `[VERIFIED: apps/web/package.json:14]` | `zodResolver` adapter | Already used by every auth form |
| Zod | 4.5.4 `[VERIFIED: apps/web/package.json:28]` | `categorySchema`/`createCategorySchema`/`updateCategorySchema` — already exist, reused as-is | Unlike transactions, categories already have a shared Zod schema — CLAUDE.md and CONTEXT.md both require reusing it, not inventing a new one |
| Next.js Server Actions | 16.3.4 (built-in) | `create/update/delete-category.action.ts` | Matches `features/auth/api/*.action.ts` exactly |
| `radix-ui` (unified) | 1.6.7 `[VERIFIED: apps/web/package.json:20 and require('radix-ui') export check]` | Underlying primitive for the two new shadcn components | Already exports `Dialog` and `AlertDialog` — no new npm install expected for either |
| `lucide-react` | 1.43.0 `[VERIFIED: apps/web/package.json:18]` | Icons (`Loader2Icon` on submit, trash/pencil icons for row actions) | Already the project's icon set |
| `sonner` | 2.0.8 `[VERIFIED: apps/web/package.json:26]` | Toasts for non-field-level errors (409 duplicate name, 409 FK-blocked, network) | Already installed and used by every auth form |

### Supporting — new shadcn/ui components to add this phase

| Component | Purpose | When to Use |
|-----------|---------|-------------|
| `Dialog` | Wraps `CategoryForm` for both create and edit (D-01) | Trigger button on page header opens create mode; per-row "Редактировать" button opens edit mode with `category` prop populated |
| `AlertDialog` | Delete confirmation (D-05) | Per-row "Удалить" button; on confirm, calls `deleteCategoryAction`; on 409, shows message inline (D-06) without closing the dialog |

**Not needed this phase:** `DropdownMenu`, `Select`, `Popover`, `Calendar`, `date-fns` — all of these are Phase 2 (transactions) concerns per the project-level `STACK.md`; D-04 explicitly rules out a row-action menu for categories in favor of plain buttons.

**Installation:**
```bash
cd apps/web
npx shadcn@latest add dialog alert-dialog
```
Confirmed shadcn CLI available at `4.21.0` `[VERIFIED: npx shadcn@latest --version, run this session]`. After running, per the existing project convention (already documented in CLAUDE.md for prior `shadcn add` runs): check the generated files for an incorrect `from "cn"` import and strip any `next-themes` dependency it may pull in; also diff `apps/web/package.json` to confirm no new `@radix-ui/react-*` sub-package was added (the project's existing components — see `checkbox.tsx` — already import from the unified `radix-ui` package, so the CLI is expected to generate `Dialog`/`AlertDialog` the same way, but this must be confirmed after the actual `add` runs, not assumed).

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| shadcn `Dialog`/`AlertDialog` for create/edit/delete | Dedicated `/categories/new` and `/categories/[id]/edit` pages | Rejected — D-01/D-05 explicitly lock in the Dialog/AlertDialog pattern; no deep-linking requirement exists for categories |
| Fixed 8–12 color swatches (buttons) | `Popover` + HSB/RGB picker | Rejected — D-03 and `REQUIREMENTS.md` "Out of Scope" both explicitly rule out a full color picker |
| Plain edit/delete buttons per row | `DropdownMenu` row actions | Rejected for this phase by D-04 — simple list, two visible buttons, no menu |

## Package Legitimacy Audit

No new npm packages are installed by this phase. `npx shadcn@latest add dialog alert-dialog` generates source files into `src/shared/ui/` from the shadcn registry; it does not add a new npm dependency because the unified `radix-ui` meta-package (already a pinned dependency at `1.6.7`) already provides the `Dialog` and `AlertDialog` primitives — confirmed this session via `node -e "console.log(Object.keys(require('radix-ui')).filter(...))"` → `['AlertDialog', 'Dialog']` `[VERIFIED: local node_modules inspection, this session]`.

| Package | Registry | Status | Disposition |
|---------|----------|--------|-------------|
| `radix-ui` | npm | Already installed at `1.6.7`, pinned in `apps/web/package.json` — no change | No action — reused as-is |
| `lucide-react` | npm | Already installed at `1.43.0` — no change | No action — reused as-is |

**Packages removed due to [SLOP] verdict:** none.
**Packages flagged as suspicious [SUS]:** none.

*If the `shadcn add` run unexpectedly adds a standalone `@radix-ui/react-dialog` or `@radix-ui/react-alert-dialog` package instead of using the unified `radix-ui` import (contrary to the `checkbox.tsx` precedent), the planner should treat that as a signal to re-run the Package Legitimacy Gate on the new package before merging, and to flag the deviation from this project's established shadcn-generation convention.*

## Architecture Patterns

### System Architecture Diagram

```
┌───────────────────────── apps/web/src ─────────────────────────────────────┐
│ app/(dashboard)/categories/page.tsx  (Server Component, 3–5 lines)         │
│        │ delegates to                                                       │
│        ▼                                                                    │
│ views/categories/ui/categories-view.tsx  (Server Component)                │
│   getSession() → redirect(ROUTES.login) if none                            │
│   getCategories(accessToken) → redirect(ROUTES.sessionExpired) on 401      │
│        │ renders (empty-state if list is empty — D-07)                     │
│        ▼                                                                    │
│ widgets/category-list/ui/category-list.tsx  (renders rows client-side)     │
│   per row: CategoryDot + name + "Редактировать" + "Удалить" buttons        │
│        │ opens                                    │ opens                  │
│        ▼                                           ▼                       │
│ features/category-form/ui/category-form.tsx    features/category-form/ui/ │
│   Dialog, create OR edit via `category?` prop     category-delete-dialog   │
│   (D-01, D-02)                                     .tsx  (AlertDialog, D-05)│
│        │ onSubmit                                  │ onConfirm            │
│        ▼                                           ▼                       │
│ features/category-form/api/                    features/category-form/api/│
│   create-category.action.ts /                    delete-category.action.ts│
│   update-category.action.ts  ('use server')                                │
│        │                                           │                       │
│        ▼                                           ▼                       │
│ entities/category/api/{create,update,delete}-category.ts (accessToken param)│
│        │ apiFetch POST / PATCH / DELETE                                    │
│        ▼                                                                    │
│ Nest CategoriesController → Create/UpdateCategoryDto (class-validator,     │
│   real gate) → CategoriesService → PrismaService → Postgres                │
│        │ 201/200/204  —or—  400 (field validation) / 409 (duplicate name,  │
│        │                     P2002 — OR FK-restrict, P2003 — CAT-04)       │
│        ▼                                                                    │
│ Server Action: success → revalidatePath(ROUTES.categories, dashboard,      │
│   expenses); error → extractFieldErrors()/apiErrorMessage() → setError/toast│
└──────────────────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure (additions only)

```
apps/web/src/
├── entities/category/
│   ├── api/
│   │   ├── get-categories.ts          # existing, unchanged
│   │   ├── create-category.ts         # NEW — POST /categories
│   │   ├── update-category.ts         # NEW — PATCH /categories/:id
│   │   └── delete-category.ts         # NEW — DELETE /categories/:id, returns Promise<void>
│   ├── model/types.ts                 # existing, unchanged
│   └── ui/category-dot.tsx            # existing, unchanged — reused in the list
├── features/category-form/            # NEW
│   ├── api/
│   │   ├── create-category.action.ts
│   │   ├── update-category.action.ts
│   │   └── delete-category.action.ts
│   ├── model/types.ts                 # CategoryActionState shape (mirrors AuthActionState)
│   └── ui/
│       ├── category-form.tsx          # 'use client' — Dialog + RHF + zodResolver, create/edit
│       ├── color-swatch-picker.tsx    # fixed palette, 8–12 buttons (D-03)
│       └── category-delete-dialog.tsx # 'use client' — AlertDialog, 409 branch (D-05, D-06)
├── widgets/category-list/             # NEW
│   ├── model/types.ts                 # row model if needed (likely just `Category` from shared)
│   └── ui/
│       ├── category-list.tsx          # 'use client' — row rendering, owns Dialog/AlertDialog open state
│       └── empty-state.tsx            # D-07 — mirror widgets/recent-transactions/ui/empty-state.tsx
├── views/categories/
│   └── ui/categories-view.tsx         # NEW — mirrors views/dashboard/ui/dashboard-view.tsx exactly
└── shared/api/error-message.ts        # EXTEND — add extractFieldErrors() (see Pitfall 1)
```

### Structure Rationale

- **`features/category-form/` owns both the create/edit Dialog and the delete AlertDialog.** CONTEXT.md's `code_context` section leaves this as an open choice ("Новый `features/category-delete/` или включить в `category-form`"). Given the phase is small (one entity, no separate lifecycle), keeping both in one feature slice avoids a second near-empty feature folder and keeps the "one feature = one entity's mutations" shape consistent with `features/auth` owning login+register+logout together.
- **`widgets/category-list/` is the client boundary that owns Dialog/AlertDialog *open* state**, not the view. The view (`categories-view.tsx`) stays a pure Server Component (matches `dashboard-view.tsx`); `category-list.tsx` is `'use client'` and holds `useState` for which category (if any) is being edited/deleted, then renders `<CategoryForm category={editing} />` / `<CategoryDeleteDialog category={deleting} />` conditionally. This mirrors the existing split where `widgets/recent-transactions` is a pure Server Component prop-drilled from `dashboard-view.tsx` — but categories need client interactivity (opening dialogs) that transactions' read-only list didn't, so `category-list.tsx` itself must be a client boundary, one level below the view.
- **`entities/category/api/create-category.ts` etc. take `accessToken` as a parameter**, exactly like the existing `get-categories.ts` (`[VERIFIED: apps/web/src/entities/category/api/get-categories.ts:6]`, quoting the doc-comment: `"Токен параметром — см. комментарий в entities/transaction/api/get-transactions.ts."`). No new convention — a straight extension.
- **No new Zod schema file** — `features/category-form/model/` holds only `types.ts` (the `CategoryActionState` union), not a `-schema.ts` file, because `createCategorySchema`/`updateCategorySchema` already exist in `@expense/shared` and are imported directly. This is the one place this phase's structure *diverges* from the `transaction-form` shape recommended in the project-level `ARCHITECTURE.md` (which needs a new local schema because transactions have none) — do not copy that file into `category-form`.

### Pattern 1: One `CategoryForm`, two modes via optional prop (D-02)

**What:** `features/category-form/ui/category-form.tsx` accepts an optional `category?: Category` prop. `undefined` → create mode (calls `createCategoryAction`); populated → edit mode (calls `updateCategoryAction`, `defaultValues` seeded from the prop). This is the exact shape `features/auth` uses for the login/register split, generalized to a single component with a prop switch instead of two components, per D-02's explicit instruction ("по аналогии с рекомендацией research для TransactionForm").

**Example:**
```typescript
// features/category-form/ui/category-form.tsx
'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { createCategorySchema, type Category, type CreateCategoryInput } from '@expense/shared';
import { createCategoryAction } from '@/features/category-form/api/create-category.action';
import { updateCategoryAction } from '@/features/category-form/api/update-category.action';

interface CategoryFormProps {
  category?: Category;      // undefined → create; populated → edit
  onSuccess: () => void;    // caller closes the Dialog
}

export function CategoryForm({ category, onSuccess }: CategoryFormProps) {
  const form = useForm<CreateCategoryInput>({
    resolver: zodResolver(createCategorySchema),
    defaultValues: category ?? { name: '', color: '#64748b' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    const result = category
      ? await updateCategoryAction(category.id, values)
      : await createCategoryAction(values);

    if (result?.fieldErrors) {
      for (const [field, message] of Object.entries(result.fieldErrors)) {
        form.setError(field as keyof CreateCategoryInput, { message });
      }
      return;
    }
    if (result?.error) {
      toast.error(result.error);
      return;
    }
    onSuccess();
  });

  // ... <Form>/<FormField> wiring exactly as in register-form.tsx, plus <ColorSwatchPicker>
}
```

### Pattern 2: Non-redirecting Server Action returning `{success}` / `{error}` / `{fieldErrors}`

**What:** Unlike every existing action in this repo (`loginAction`/`registerAction` redirect on success; `logoutAction` returns `void` and always redirects), category mutations must return a *value* the Dialog reads to decide whether to close — this is the first non-redirecting action shape in the codebase `[VERIFIED: grep of features/auth/api/*.action.ts, this session — all three either redirect or return void]`. This is the correct extension of the existing "Server Action reads session, calls entity API, translates errors" shape, just without a `redirect()` call at the end.

**Example:**
```typescript
// features/category-form/api/create-category.action.ts
'use server';
import { createCategorySchema, type CreateCategoryInput } from '@expense/shared';
import { getSession } from '@/entities/session/api/session';
import { createCategory } from '@/entities/category/api/create-category';
import { apiErrorMessage, extractFieldErrors } from '@/shared/api/error-message';
import { revalidatePath } from 'next/cache';
import { ROUTES } from '@/shared/config/routes';
import type { CategoryActionState } from '@/features/category-form/model/types';

export async function createCategoryAction(input: unknown): Promise<CategoryActionState> {
  // Server Action доступен прямым POST, поэтому валидация клиента здесь не защита.
  const parsed = createCategorySchema.safeParse(input);
  if (!parsed.success) {
    return { error: 'Проверьте правильность заполнения полей' };
  }

  const session = await getSession();
  if (!session) {
    return { error: 'Сессия истекла, войдите заново' };
  }

  try {
    await createCategory(session.accessToken, parsed.data);
  } catch (error) {
    const fieldErrors = extractFieldErrors(error);
    if (fieldErrors) {
      return { error: 'Проверьте правильность заполнения полей', fieldErrors };
    }
    return { error: apiErrorMessage(error) };
  }

  revalidatePath(ROUTES.categories);
  revalidatePath(ROUTES.dashboard);
  revalidatePath(ROUTES.expenses);
  return { success: true };
}
```

### Pattern 3: `extractFieldErrors()` — the grouped-validation-error bridge (new, required this phase)

**What:** A small helper, sibling to `apiErrorMessage()` in `shared/api/error-message.ts`, that recognizes the `class-validator` `errorFormat: 'grouped'` body shape and returns a flat `Record<string, string>` (first message per field) instead of falling through to the generic fallback string. See Common Pitfalls §1 for the full grounding of why this is necessary.

**Example:**
```typescript
// shared/api/error-message.ts — ADD, do not replace apiErrorMessage
/**
 * Тело grouped-ошибки ValidationPipe (errorFormat: 'grouped', см. main.ts):
 * `error.message` — не строка, а объект `{ поле: [сообщения] }`. Используется
 * DTO-роутами (категории, транзакции), в отличие от Zod-роутов auth.
 */
export function extractFieldErrors(error: unknown): Record<string, string> | null {
  if (!(error instanceof ApiError) || error.status !== 400) {
    return null;
  }
  const body = error.body as { error?: { message?: unknown } } | null;
  const message = body?.error?.message;
  if (typeof message !== 'object' || message === null || Array.isArray(message)) {
    return null;
  }
  const result: Record<string, string> = {};
  for (const [field, messages] of Object.entries(message as Record<string, unknown>)) {
    if (Array.isArray(messages) && typeof messages[0] === 'string') {
      result[field] = messages[0];
    }
  }
  return Object.keys(result).length > 0 ? result : null;
}
```

### Pattern 4: Delete confirmation — `AlertDialog` branching on `error.status`, not message text (D-05, D-06, CAT-04)

**What:** `category-delete-dialog.tsx` calls `deleteCategoryAction(id)`; on `error.status === 409`, keeps the dialog open and shows the message inline (D-06 explicitly forbids silently closing); on any other error, closes and toasts. This exactly follows the existing pitfall research's Pitfall 4 recommendation, already validated against the real backend response.

**Example:**
```typescript
// features/category-form/api/delete-category.action.ts
'use server';
import { getSession } from '@/entities/session/api/session';
import { deleteCategory } from '@/entities/category/api/delete-category';
import { apiErrorMessage } from '@/shared/api/error-message';
import { ApiError } from '@/shared/api/api-client';
import { revalidatePath } from 'next/cache';
import { ROUTES } from '@/shared/config/routes';
import type { CategoryActionState } from '@/features/category-form/model/types';

export async function deleteCategoryAction(id: string): Promise<CategoryActionState> {
  const session = await getSession();
  if (!session) {
    return { error: 'Сессия истекла, войдите заново' };
  }

  try {
    await deleteCategory(session.accessToken, id);
  } catch (error) {
    // 409 — либо связанные транзакции (P2003), либо (при create/update) дубль имени (P2002);
    // на delete FK-конфликт — единственный практический источник 409.
    if (error instanceof ApiError && error.status === 409) {
      return { error: apiErrorMessage(error), blocked: true };
    }
    return { error: apiErrorMessage(error) };
  }

  revalidatePath(ROUTES.categories);
  revalidatePath(ROUTES.dashboard);
  revalidatePath(ROUTES.expenses);
  return { success: true };
}
```

### Pattern 5: Fixed color-swatch picker (D-03)

**What:** `ColorSwatchPicker` is a plain button grid, not a shadcn `Select`/`Popover` — each swatch is a `button` with `backgroundColor` set inline (same technique as the existing `CategoryDot`), `aria-pressed` for the selected state, and `onClick` calling `field.onChange(hex)` from RHF's `Controller`. No new dependency; renders the hex string directly into the form value, which already matches `categoryColorSchema`'s `/^#[0-9a-fA-F]{6}$/` pattern by construction (the user can never type an invalid color, since there is no free-text input).

**Recommended palette (Claude's discretion, D-03):** 10 swatches from Tailwind's standard 500-shade scale, visually distinct from each other and from the two grays already used elsewhere in the app (`#64748b` slate-500 DB default, `#94a3b8` slate-400 dashboard fallback for missing category) so a user-picked color is never confused with "no category":

`#ef4444` (red), `#f97316` (orange), `#f59e0b` (amber), `#22c55e` (green), `#14b8a6` (teal), `#0ea5e9` (sky), `#3b82f6` (blue), `#6366f1` (indigo), `#8b5cf6` (violet), `#ec4899` (pink).

`[ASSUMED]` — these are standard, widely-published Tailwind hex values from training knowledge; this session confirmed the *names* exist in the installed `tailwindcss@4` theme (`node_modules/tailwindcss/theme.css`, e.g. `--color-red-500`, `--color-blue-500` etc.) but Tailwind v4 defines shades in `oklch()`, not hex, so the exact hex values were not re-derived/converted this session — verify visually in-browser during execution rather than trusting the hex byte-for-byte. See Assumptions Log A1.

### Anti-Patterns to Avoid

- **Reading `getSession()` inside `entities/category/api/*.ts`:** breaks the established `accessToken`-as-parameter convention; do the same as `get-categories.ts` already does.
- **String-matching the 409 message instead of checking `error.status === 409`:** the Russian message is not a stable contract — `ApiError.status` is already available and free.
- **Letting `apiErrorMessage()`'s current fallback silently mask a 400 validation error as "Сервис недоступен":** this is the exact bug Pitfall 1 describes — always try `extractFieldErrors()` before falling back to `apiErrorMessage()` for create/update actions.
- **Building the delete confirmation as a second custom modal instead of shadcn `AlertDialog`:** D-05 explicitly locks this in; a hand-rolled confirm dialog would also lose the built-in focus-trap/escape-key/ARIA behavior `AlertDialog` provides for free.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Modal/dialog focus trap, escape-to-close, ARIA roles | A custom `<div>`-based modal | shadcn `Dialog` / `AlertDialog` (Radix-backed) | Radix already handles focus management and accessibility correctly; a hand-rolled version is a well-known source of keyboard-trap and screen-reader bugs |
| Color input validation | A custom hex-regex `<input>` with live validation feedback | Fixed swatch buttons (D-03, Pattern 5) | The palette approach makes invalid input structurally impossible — no regex/feedback UI needed at all |
| Grouped-validation-error parsing | Ad-hoc `if (typeof body.error.message === 'object')` inline in every action | One shared `extractFieldErrors()` helper (Pattern 3) | This shape will recur for every future DTO-validated route (transactions in Phase 2) — centralize it once, in `shared/api/`, not per-feature |
| Toast notifications | A custom toast/snackbar component | `sonner` (already installed, already used by auth) | No reason to introduce a second toast system for one new feature |

**Key insight:** everything this phase needs is either already installed (`radix-ui`, `react-hook-form`, `sonner`, `zod`) or a thin, single-purpose addition (`extractFieldErrors`, the swatch picker) — there is no legitimate reason to add a new runtime dependency for this phase.

## Common Pitfalls

### Pitfall 1: `apiErrorMessage()` cannot parse `class-validator`'s grouped 400 body — category forms are the first to hit this shape

**What goes wrong:** Submitting an invalid category (empty name, name > 50 chars, malformed color — though Pattern 5 makes the color case unreachable via the UI, name length is still reachable) returns a 400 whose body, after passing through `HttpExceptionFilter`, is `{ error: { message: { name: ["Название не может быть пустым"] } } }` — `message` is a **plain object**, not a string or string array. `apiErrorMessage()`'s current logic only branches on `typeof message === 'string'` and `Array.isArray(message)` `[VERIFIED: apps/web/src/shared/api/error-message.ts:49-56]`, quoting:
```
const message = body?.error?.message;
if (typeof message === 'string' && message.length > 0) {
  return message;
}
if (Array.isArray(message) && typeof message[0] === 'string') {
  return message[0];
}
return FALLBACK;
```
Both branches miss an object, so it falls to `FALLBACK = 'Сервис недоступен, попробуйте позже'` `[VERIFIED: apps/web/src/shared/api/error-message.ts:3]` — a "service is down" message shown for an ordinary "your category name is too long" validation error.

**Why it happens:** `apiErrorMessage()` was built and tested only against auth's Zod-validated routes (`ZodValidationPipe`, `z.treeifyError` shape, handled by the separate `firstZodIssue()` branch `[VERIFIED: apps/web/src/shared/api/error-message.ts:18-30]`). Categories (and transactions, in Phase 2) go through the *other* validation path — the global `class-validator` `ValidationPipe` configured with `errorFormat: 'grouped'` `[VERIFIED: apps/api/src/main.ts:21-28]`. This session traced the exact shape by reading the installed pipe source: `groupValidationErrors()` builds `result[property] = Object.values(error.constraints)` `[VERIFIED: node_modules/@nestjs/common/pipes/validation.pipe.js:233-247]`, and `createExceptionFactory()` wraps it as `{ message: errors, error, statusCode }` `[VERIFIED: node_modules/@nestjs/common/pipes/validation.pipe.js:119-129]` — confirming `body.error.message` is genuinely an object keyed by field name, not a coincidental one-off.

**How to avoid:** Add `extractFieldErrors()` (Pattern 3) and call it *before* falling back to `apiErrorMessage()` in every category mutation Server Action. Map the returned `Record<string,string>` onto `form.setError()` per field (Pattern 1), and reserve `apiErrorMessage()`'s plain toast for shapes it already handles correctly (409 conflicts, 404, 500, network failures — all confirmed string-shaped).

**Warning signs:** A "Сервис недоступен, попробуйте позже" toast appearing immediately (not after a delay) when submitting an obviously-malformed category name in local dev with the API running fine — that "too instant" a 503-style message for a synchronous 400 is the tell.

### Pitfall 2: Two distinct 409 causes on category mutations — duplicate name (create/update) vs. FK-restrict (delete only)

**What goes wrong:** `categories.service.ts`'s `toHttpError()` maps **two different Prisma error codes** to 409 `[VERIFIED: apps/api/src/modules/categories/categories.service.ts:85-97]`:
```
if (isPrismaError(error, PrismaErrorCode.UniqueViolation)) {
  return new ConflictException('Категория с таким названием уже есть');
}
...
if (isPrismaError(error, PrismaErrorCode.ForeignKeyViolation)) {
  return new ConflictException('Нельзя удалить категорию, пока по ней есть транзакции');
}
```
The uniqueness constraint is **per-user**, not global — `@@unique([userId, name])` `[VERIFIED: apps/api/prisma/schema.prisma:60]`. So a 409 from `createCategoryAction`/`updateCategoryAction` means "you already have a category with this name" (message string, handled fine by `apiErrorMessage()` already — no `extractFieldErrors()` needed here since this is a `ConflictException`, not a `ValidationPipe` 400), while a 409 from `deleteCategoryAction` means "transactions still reference this category" (CAT-04/D-06). A UI that treats every 409 the same (e.g., always shows the delete-blocked copy) would show the wrong message on a duplicate-name create attempt.

**Why it happens:** Both paths reuse the same `ConflictException`/409 status, distinguished only by which action triggered them and by the message text — there is no separate error code in the response body to branch on beyond the message string itself.

**How to avoid:** Do not build a single generic "409 means blocked-by-transactions" handler. `apiErrorMessage(error)` already returns the *correct* Russian string for both cases (both are plain `ConflictException` strings, not grouped objects) — just surface it as-is via toast/inline for create/update 409s, and reserve the "keep dialog open + name the reason" UX (D-06) specifically for the delete flow, since that is the only 409 CAT-04 is about.

### Pitfall 3: `revalidatePath` must cover `/categories`, `/dashboard`, and `/expenses` — not just `/categories`

**What goes wrong:** Category name/color feeds transaction row rendering on both `/dashboard` (`recent-transactions`, via the `Map`-based join in `load-recent-transactions.ts` `[VERIFIED: apps/web/src/widgets/recent-transactions/api/load-recent-transactions.ts:50-58]`) and the future `/expenses` page. Revalidating only `ROUTES.categories` after an edit leaves a stale category name/color visible in already-rendered transaction rows on the other two routes until a hard refresh.

**Why it happens:** `revalidatePath` is per-path, not per-data-shape (see project-level `ARCHITECTURE.md` Pattern 3 / `PITFALLS.md` Pitfall 5 — already documented at the project level; this is the category-specific instance of that general finding).

**How to avoid:** Every category mutation action calls `revalidatePath()` for all three routes (see Pattern 2/4 code examples above) — a shared constant (e.g. `CATEGORY_AFFECTED_PATHS = [ROUTES.categories, ROUTES.dashboard, ROUTES.expenses]`) avoids drift across the three action files.

### Pitfall 4: `Category.icon` is `string | null` in the API type but `string | undefined` (optional) in the create/update Zod schema

**What goes wrong:** `categorySchema.icon` is `z.string().nullable()` `[VERIFIED: packages/shared/src/schemas/category.ts:19]`, but `createCategorySchema.icon` is `z.string().max(50).optional()` `[VERIFIED: packages/shared/src/schemas/category.ts:10]` — `null` and `undefined` are not interchangeable for RHF `defaultValues` seeded from an existing `Category` (edit mode): passing `category.icon` (which can be `null`) straight into a form field typed as `string | undefined` is a type mismatch TypeScript will flag, and if suppressed, could submit a literal `"null"` string or leave RHF in an inconsistent controlled/uncontrolled state depending on the input implementation.

**How to avoid:** Since this phase's icon field is out of scope for the UI (CONTEXT.md's decisions never mention an icon picker — only name and color are user-facing per CAT-01/CAT-02, and `icon` has no UI requirement in `REQUIREMENTS.md`), the simplest correct approach is to **not expose an icon field in `CategoryForm` at all this phase** and let it default/pass through as `undefined` on create, omitted on update. If a future phase adds icon selection, normalize explicitly (`category.icon ?? undefined`) when seeding `defaultValues`.

### Pitfall 5: `UpdateCategoryDto` rejects `null` for `name`/`color` but accepts it for `icon` — don't genericize the update payload builder

**What goes wrong:** `UpdateCategoryDto` uses a custom `isPresent` guard (`value !== undefined`) for `name`/`color`, explicitly commented as rejecting `null` because those are `NOT NULL` columns `[VERIFIED: apps/api/src/modules/categories/dto/update-category.dto.ts:11-15]`, quoting: `"Пропускает только отсутствующее поле. @IsOptional пропустил бы и null, а name/color — NOT NULL-колонки: вместо 400 получили бы 500 от БД."` — while `icon` uses plain `@IsOptional()` and the column is nullable. A generic "strip undefined keys" helper applied uniformly to the update payload would be safe (never sends explicit `null` for name/color since the form never produces `null` there), but a naive "strip falsy keys" helper would incorrectly drop an intentional `icon: null` (icon-clear) — moot this phase since icon isn't exposed (Pitfall 4), but worth flagging if a future phase adds icon editing.

**How to avoid:** Send `updateCategorySchema.parse()`'s output directly (only fields the user actually changed, via RHF's `dirtyFields` or by always sending `{name, color}` since both are always present in the form) — do not write a generic key-stripping utility that treats `null` and `undefined` the same.

### Pitfall 6: Radix `asChild` + `<button>` — Chrome color-override quirk already worked around once in this codebase

**What goes wrong:** `checkbox.tsx`'s existing code comments an already-diagnosed Chrome bug where the browser force-resets `border`/`background` on native `<button>` elements under certain conditions, worked around by rendering `asChild` onto a `<div>` instead `[VERIFIED: apps/web/src/shared/ui/checkbox.tsx:13-17]`, quoting: `"Chrome на некоторых машинах принудительно обнуляет border/background у <button> ... asChild рендерит div вместо button"`. `DialogTrigger`/`AlertDialogTrigger` with `asChild` wrapping the existing `Button` component is the standard shadcn pattern this phase will use (e.g. "Добавить категорию", "Редактировать", "Удалить" triggers) — if the generated `Dialog`/`AlertDialog` components from the shadcn CLI use a real `<button>` under `asChild` rather than the same div-based workaround, the same visual bug could resurface.

**How to avoid:** After `shadcn add dialog alert-dialog`, do a manual smoke check (not just typecheck) of trigger buttons in a real Chrome window on the target dev machine before considering the components done — this is a rendering bug, not a type error, so `tsc`/lint will not catch it.

## Code Examples

### `entities/category/api/create-category.ts` (mirrors `get-categories.ts`)
```typescript
// Source: pattern from apps/web/src/entities/category/api/get-categories.ts (read this session)
import 'server-only';
import type { Category, CreateCategoryInput } from '@expense/shared';
import { apiFetch } from '@/shared/api/api-client';

export function createCategory(accessToken: string, input: CreateCategoryInput): Promise<Category> {
  return apiFetch<Category>('/categories', {
    method: 'POST',
    accessToken,
    body: JSON.stringify(input),
  });
}
```

### `entities/category/api/delete-category.ts` (204 No Content — `apiFetch` already handles this)
```typescript
// apiFetch: `response.status === 204 ? null : await response.json()` — already correct,
// see apps/web/src/shared/api/api-client.ts:31 (read this session)
import 'server-only';
import { apiFetch } from '@/shared/api/api-client';

export function deleteCategory(accessToken: string, id: string): Promise<void> {
  return apiFetch<void>(`/categories/${id}`, { method: 'DELETE', accessToken });
}
```

### `views/categories/ui/categories-view.tsx` (mirrors `dashboard-view.tsx` exactly)
```typescript
// Source: pattern from apps/web/src/views/dashboard/ui/dashboard-view.tsx (read this session)
import { redirect } from 'next/navigation';
import { getSession } from '@/entities/session/api/session';
import { getCategories } from '@/entities/category/api/get-categories';
import { ApiError } from '@/shared/api/api-client';
import { ROUTES } from '@/shared/config/routes';
import { CategoryList } from '@/widgets/category-list/ui/category-list';

export async function CategoriesView() {
  const session = await getSession();
  if (!session) {
    redirect(ROUTES.login);
  }

  try {
    const categories = await getCategories(session.accessToken);
    return (
      <main className="mx-auto flex max-w-4xl flex-col gap-6 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Категории</h1>
          {/* "Добавить категорию" trigger — top-right, Claude's discretion per CONTEXT.md */}
        </div>
        <CategoryList categories={categories} />
      </main>
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      redirect(ROUTES.sessionExpired);
    }
    throw error;
  }
}
```

### `app/(dashboard)/categories/page.tsx` (replaces the current stub)
```typescript
// Current stub, read this session (apps/web/src/app/(dashboard)/categories/page.tsx):
//   export default function CategoriesPage() {
//     // TODO: список категорий с созданием и редактированием.
//     return <main className="p-6">Категории</main>;
//   }
import type { Metadata } from 'next';
import { CategoriesView } from '@/views/categories/ui/categories-view';

export const metadata: Metadata = { title: 'Категории — Трекер расходов' };

export default function CategoriesPage() {
  return <CategoriesView />;
}
```

## State of the Art

Not applicable — this is a brownfield addition to a project whose own conventions (established 2026-09-20, this same day) are the current state of the art for this codebase. No external ecosystem shift is relevant to a shadcn `Dialog`/`AlertDialog` addition.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The 10 recommended color-swatch hex values (`#ef4444`, `#f97316`, etc.) are Tailwind's standard 500-shade hex equivalents | Architecture Patterns → Pattern 5 | Low — purely cosmetic; wrong hex still satisfies `/^#[0-9a-fA-F]{6}$/` and functions correctly, worst case is a slightly-off shade. Verify visually during execution, no functional risk |
| A2 | `npx shadcn@latest add dialog alert-dialog` will generate components importing from the unified `radix-ui` package (not standalone `@radix-ui/react-dialog`) | Standard Stack → Installation, Package Legitimacy Audit | Low-medium — if wrong, a new npm dependency is silently added; mitigated by the explicit instruction to diff `package.json` after running the command, carried over from the project's existing shadcn-CLI convention |
| A3 | The generated `Dialog`/`AlertDialog` trigger buttons do not reintroduce the Chrome border/background override bug already worked around in `checkbox.tsx` | Common Pitfalls → Pitfall 6 | Low — cosmetic, single-browser, already has a known workaround pattern (`asChild` onto `div`) to apply if it recurs |

## Open Questions

1. **Exact placement of the "Добавить категорию" trigger button and page header layout**
   - What we know: CONTEXT.md leaves this to Claude's discretion, suggesting "шапка страницы, справа" (page header, right side)
   - What's unclear: Whether it should be a `DialogTrigger` directly in `categories-view.tsx`'s header, or delegated into `category-list.tsx` alongside the row-level triggers (the latter keeps all Dialog/AlertDialog state ownership in one client component)
   - Recommendation: Put the "create" trigger inside `category-list.tsx` too (even though it's conceptually page-level), so the view stays a pure Server Component and all dialog state lives in exactly one place — simpler than splitting create-trigger state (view or a header component) from edit/delete-trigger state (list)

2. **Whether `extractFieldErrors()` should live in `shared/api/error-message.ts` or a new file**
   - What we know: It needs `ApiError` (already imported there) and will be reused by Phase 2's transaction forms (transactions are also DTO/class-validator-validated, per CLAUDE.md)
   - What's unclear: Nothing blocking — this is a naming/file-organization call, not a research gap
   - Recommendation: Add to the existing `error-message.ts` file as a named export alongside `apiErrorMessage()`, since it operates on the identical `NestErrorBody` shape already typed there

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build/dev servers | ✓ | v24.13.0 `[VERIFIED: node --version, this session]` | — |
| npm | Workspace install, `shadcn add` | ✓ | 11.9.0 `[VERIFIED: npm --version, this session]` | — |
| shadcn CLI (via `npx`) | Generating `Dialog`/`AlertDialog` source | ✓ | 4.21.0 `[VERIFIED: npx shadcn@latest --version, this session]` | — |
| Network access (shadcn registry fetch) | `shadcn add` command | Assumed available (not probed — this session ran in a sandboxed dev environment) | — | If offline at execution time, hand-copy the two component files from a machine with access, or from `ui.shadcn.com`'s published source for `dialog`/`alert-dialog` |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** shadcn registry network access (see above).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None configured — `"Тестов в проекте нет — раннер не настроен"` `[VERIFIED: .claude/CLAUDE.md, project instructions, "Команды" section]` |
| Config file | none |
| Quick run command | none available |
| Full suite command | none available |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CAT-01 | Create category with name + palette color | manual-only | — | ❌ no framework in project |
| CAT-02 | Edit existing category | manual-only | — | ❌ no framework in project |
| CAT-03 | Delete category with confirmation | manual-only | — | ❌ no framework in project |
| CAT-04 | Delete blocked by FK, shows actionable message | manual-only | — | ❌ no framework in project |
| CAT-05 | `/categories` full CRUD list, not a stub | manual-only | — | ❌ no framework in project |

**Justification for manual-only:** The project has no test runner configured anywhere (confirmed in CLAUDE.md, a project-wide, pre-existing constraint — not something this phase should unilaterally fix by introducing a framework for five UI behaviors). Verification for this phase should go through `/gsd-verify-work`'s conversational UAT against the running dev server, exactly as the pitfalls' own "Looks Done But Isn't" checklist style already implies for this codebase's Phase 2 research.

### Sampling Rate
- **Per task commit:** manual smoke test in the running dev server (`npm run dev:web`), since no automated quick-run command exists
- **Per wave merge:** full manual pass through CAT-01 through CAT-05 against a real (or seeded) category with and without transactions attached
- **Phase gate:** `/gsd-verify-work` conversational UAT, no automated suite to gate on

### Wave 0 Gaps
- [ ] No test framework installed — introducing one (Vitest/Jest + Testing Library) is out of scope for this narrowly-scoped CRUD phase per the phase description; flag as a standing project-level gap, not a Phase 1 blocker
- [ ] No `tests/` directory or fixtures exist to extend

*(Framework introduction, if desired, should be a separate infrastructure decision — not smuggled into a UI CRUD phase.)*

## Security Domain

### Applicable ASVS Categories (Level 1)

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No — no new auth surface this phase | `JwtAuthGuard` already global, unchanged |
| V3 Session Management | No | Existing cookie-session machinery unchanged |
| V4 Access Control | Yes | Already enforced server-side: every `CategoriesService` method filters `where: { id, userId }` or `where: { userId }` `[VERIFIED: apps/api/src/modules/categories/categories.service.ts:27-73]` — a category `id` belonging to another user is indistinguishable from a nonexistent one (404), never leaked or editable. Frontend adds no new access-control surface; it only needs to trust the API's 404/409 responses, never assume client-side ownership |
| V5 Input Validation | Yes | Server: `Create/UpdateCategoryDto` (`class-validator`, `whitelist: true`, `forbidNonWhitelisted: true` — unknown fields rejected, not silently dropped `[VERIFIED: apps/api/src/main.ts:22-27]`). Client: `zodResolver(createCategorySchema/updateCategorySchema)` mirrors the same regex/length rules for UX only — server remains the real gate |
| V6 Cryptography | No | No new secrets/crypto this phase |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| IDOR — editing/deleting another user's category by guessing/reusing a UUID | Elevation of Privilege | Already mitigated server-side (`where: { id, userId }`, see V4 above) — this phase must not add any client-side "is this my category" check as a substitute; always trust the API's 403/404 |
| Stored payload abuse via `color`/`name`/`icon` fields (e.g., injecting CSS via `color` if the regex were ever loosened) | Tampering | `CATEGORY_COLOR_PATTERN`/`categoryColorSchema` both already `/^#[0-9a-fA-F]{6}$/`-constrained server- and client-side; Pattern 5's swatch-button UI makes free-text color entry impossible in this phase's UI, an additional layer of mitigation beyond the regex |
| Reflected/stored XSS via category `name` rendered in the list/rows | Tampering/Information Disclosure | React's default JSX text-node escaping already prevents this; no `dangerouslySetInnerHTML` should be introduced anywhere in `CategoryList`/`CategoryDot`/`CategoryForm` |
| Mass assignment (submitting extra fields like `userId` or `id` in the create/update body) | Tampering | `forbidNonWhitelisted: true` already rejects unknown properties at the DTO layer with a 400 `[VERIFIED: apps/api/src/main.ts:22-27]` — no frontend action needed, but worth knowing the 400 in that case will also need `extractFieldErrors()`/`apiErrorMessage()` to surface sensibly (it will, since `forbidNonWhitelisted` violations also flow through the same grouped-error path) |

## Sources

### Primary (HIGH confidence — direct reads this session)
- `apps/web/src/entities/category/api/get-categories.ts` — accessToken-param convention
- `apps/web/src/app/(dashboard)/categories/page.tsx` — current stub to replace
- `apps/web/src/features/auth/api/login.action.ts`, `register.action.ts`, `logout.action.ts` — Server Action pattern precedents
- `apps/web/src/features/auth/ui/register-form.tsx` — RHF + zodResolver + shadcn Form wiring
- `apps/web/src/features/auth/model/types.ts` — `AuthActionState` shape precedent
- `packages/shared/src/schemas/category.ts`, `packages/shared/src/index.ts` — existing Zod schemas, confirmed exported from `@expense/shared`
- `apps/web/src/entities/category/ui/category-dot.tsx`, `model/types.ts` — reusable list-row primitive
- `apps/web/src/shared/api/api-client.ts` — `apiFetch`/`ApiError` shape, 204-handling
- `apps/web/src/shared/api/error-message.ts` — `apiErrorMessage()` current logic, the gap this phase must close
- `apps/web/src/shared/ui/form.tsx`, `checkbox.tsx` — shadcn Form primitives, Radix `asChild` Chrome-bug precedent
- `apps/web/src/shared/config/routes.ts` — `ROUTES.categories`/`dashboard`/`expenses`, `PROTECTED_ROUTES`
- `apps/web/src/views/dashboard/ui/dashboard-view.tsx`, `app/(dashboard)/dashboard/page.tsx` — Server Component view pattern to mirror for `/categories`
- `apps/web/src/widgets/recent-transactions/api/load-recent-transactions.ts`, `ui/recent-transactions.tsx`, `ui/empty-state.tsx` — empty-state and Map-join precedents
- `apps/api/src/modules/categories/categories.controller.ts`, `categories.service.ts`, `dto/category-validation.ts`, `dto/create-category.dto.ts`, `dto/update-category.dto.ts` — backend contract, 409/404 mapping, `NOT NULL` vs. nullable field handling
- `apps/api/src/main.ts` — global `ValidationPipe` config, `errorFormat: 'grouped'`
- `apps/api/src/common/filters/http-exception.filter.ts` — response envelope shape
- `apps/api/prisma/schema.prisma:48-62` — `Category` model, `@@unique([userId, name])`
- `node_modules/@nestjs/common/pipes/validation.pipe.js` (installed `12.0.1`, actually resolved `12.0.3` bin) — `groupValidationErrors`/`createExceptionFactory` source, the ground truth for Pitfall 1
- `node_modules/radix-ui` (installed `1.6.7`) — confirmed `Dialog`/`AlertDialog` exports via `require()`
- `apps/web/components.json` — confirms shadcn CLI must run with `cwd apps/web`, alias config
- `apps/web/package.json`, `apps/api/package.json` — installed version confirmation for all Core Stack entries
- `.planning/config.json` — `nyquist_validation: true`, `security_enforcement: true`, `security_asvs_level: 1`

### Secondary (MEDIUM confidence — carried over from project-level research, re-scoped to this phase)
- `.planning/research/ARCHITECTURE.md` — FSD placement precedent, `revalidatePath` semantics (websearch-sourced, cross-checked against official Next.js docs)
- `.planning/research/STACK.md` — broader shadcn primitive survey (narrowed for this phase to just Dialog/AlertDialog)
- `.planning/research/PITFALLS.md` — Pitfall 4 (409 UX) and Pitfall 5 (`revalidatePath` cross-surface) directly informed this phase's Pitfalls 2/3

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every package/version confirmed installed via direct `package.json` reads or CLI `--version` checks this session
- Architecture: HIGH — every pattern is a direct extension of an existing, read-this-session file in this repo, not generic advice
- Pitfalls: HIGH for #1–5 (grounded in direct source reads, including `node_modules` pipe internals and Prisma schema); MEDIUM for #6 (a known Chrome quirk already worked around once, but not yet reproduced against the new `Dialog`/`AlertDialog` specifically)

**Research date:** 2026-09-20
**Valid until:** 30 days (stable brownfield addition; re-verify if `@nestjs/common`, `radix-ui`, or `zod` are upgraded before execution)
