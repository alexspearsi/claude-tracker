---
phase: 01-kategorii
verified: 2026-09-21T00:00:00Z
status: gaps_found
score: 12/13 must-haves verified
covered_files: [".claude/CLAUDE.md", ".claude/docs/api.md", ".claude/docs/architecture.md", ".claude/docs/dev-guide.md", ".planning/REQUIREMENTS.md", ".planning/phases/01-kategorii/01-01-PLAN.md", ".planning/phases/01-kategorii/01-01-SUMMARY.md", ".planning/phases/01-kategorii/01-02-PLAN.md", ".planning/phases/01-kategorii/01-02-SUMMARY.md", ".planning/phases/01-kategorii/01-03-PLAN.md", ".planning/phases/01-kategorii/01-03-SUMMARY.md", "apps/web/src/app/(dashboard)/categories/page.tsx", "apps/web/src/entities/category/api/create-category.ts", "apps/web/src/entities/category/api/delete-category.ts", "apps/web/src/entities/category/api/update-category.ts", "apps/web/src/features/category-form/api/create-category.action.ts", "apps/web/src/features/category-form/api/delete-category.action.ts", "apps/web/src/features/category-form/api/update-category.action.ts", "apps/web/src/features/category-form/model/affected-paths.ts", "apps/web/src/features/category-form/model/palette.ts", "apps/web/src/features/category-form/model/types.ts", "apps/web/src/features/category-form/ui/category-delete-dialog.tsx", "apps/web/src/features/category-form/ui/category-form.tsx", "apps/web/src/features/category-form/ui/color-swatch-picker.tsx", "apps/web/src/shared/api/error-message.ts", "apps/web/src/shared/ui/alert-dialog.tsx", "apps/web/src/shared/ui/dialog.tsx", "apps/web/src/views/categories/ui/categories-view.tsx", "apps/web/src/widgets/category-list/ui/category-list.tsx", "apps/web/src/widgets/category-list/ui/empty-state.tsx"]
covered_digest: "v1:sha256:9a8ebd5224358d1c343dce507d8028e4b9ca3acb1e1a2fd80a43e458559c5bfd"
behavior_unverified: 0
overrides_applied: 0
gaps:
  - truth: "Имя категории длиной ~50 символов усекается в колонке списка (класс `truncate`) и не ломает вёрстку строки"
    status: failed
    reason: "`TableCell` в `shared/ui/table.tsx` задаёт `whitespace-nowrap` и не имеет ограничения ширины/`max-width`; родительский `<span className=\"flex items-center gap-2\">` в `category-list.tsx` тоже не ограничен и не имеет `min-w-0`. Для CSS `truncate` (`overflow-hidden text-overflow-ellipsis whitespace-nowrap`) нужен ограниченный по ширине контейнер — здесь его нет, поэтому ячейка расширяется под длинное имя, а кнопки «Редактировать»/«Удалить» сдвигаются вправо вместо обрезки текста. Это не гипотеза: подтверждено ручным UAT в 01-03-SUMMARY.md («Полное имя (50 символов) отображается без усечения... кнопки сдвигаются вправо») и статическим анализом исходников (`shared/ui/table.tsx` L78-89, `category-list.tsx` L54-58)."
    artifacts:
      - path: "apps/web/src/widgets/category-list/ui/category-list.tsx"
        issue: "Ячейка с именем категории (`TableCell` + `span.truncate`) не имеет ограничения ширины/`min-w-0`, поэтому усечение не активируется"
      - path: "apps/web/src/shared/ui/table.tsx"
        issue: "`TableCell` жёстко задаёт `whitespace-nowrap` без `max-width`, что не даёт вложенному `truncate` сработать"
    missing:
      - "Ограничить ширину имени в строке (например, `<TableCell className=\"w-full max-w-0\">` или фиксированный `max-w-[240px]` + `min-w-0` на внутреннем flex-контейнере), чтобы длинное имя реально обрезалось многоточием, а кнопки действий не сдвигались"
deferred: []
human_verification: []
---

# Phase 1: Категории Verification Report

**Phase Goal:** Пользователь может полностью управлять своими категориями (создание, редактирование, удаление) через рабочую страницу `/categories`, с понятной блокировкой удаления категорий, у которых есть связанные транзакции.
**Verified:** 2026-09-21
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Пользователь может создать категорию, указав название и цвет из предустановленной палитры (CAT-01, SC1) | ✓ VERIFIED | `category-form.tsx` (create mode) → `createCategoryAction` → `entities/category/api/create-category.ts` → `POST /categories`; `ColorSwatchPicker` — 10 preset-свотчей, свободного ввода hex нет (`color-swatch-picker.tsx`); подтверждено UAT-сценарием 2 в 01-03-SUMMARY.md |
| 2 | Пользователь может отредактировать название и цвет существующей категории (CAT-02, SC2) | ✓ VERIFIED | `category-form.tsx` принимает `category` проп, `defaultValues` предзаполняются, `onSubmit` ветвится на `updateCategoryAction(category.id, values)` → `PATCH /categories/:id`; подтверждено UAT-сценарием 5 |
| 3 | Пользователь может удалить категорию через диалог подтверждения (CAT-03, SC3) | ✓ VERIFIED | `CategoryDeleteDialog` — shadcn `AlertDialog` с заголовком «Удалить категорию «{name}»?», кнопками «Удалить»/«Отмена»; `handleConfirm` → `deleteCategoryAction` → `DELETE /categories/:id`; подтверждено UAT-сценарием 6 |
| 4 | При попытке удалить категорию со связанными транзакциями пользователь видит понятное сообщение о блокировке (не сырой текст ошибки API), удаление не происходит (CAT-04, SC4) | ✓ VERIFIED | `delete-category.action.ts`: `error instanceof ApiError && error.status === 409 → { error, blocked: true }` (решение по числовому статусу, не тексту); `CategoryDeleteDialog` при `blocked` рендерит фиксированный текст «Нельзя удалить категорию — есть связанные транзакции», не закрывает диалог, кнопка снова активна; подтверждено UAT-сценарием 7 (транзакция создана напрямую через SQL) |
| 5 | Страница `/categories` показывает полный список категорий пользователя как рабочий CRUD, а не заглушку (CAT-05, SC5) | ✓ VERIFIED | `page.tsx` → `CategoriesView` (Server Component) → `getCategories(session.accessToken)` → `CategoryList`; заглушка `<main>Категории</main>` удалена (git history: commit `c531917`); подтверждено UAT-сценарием 1 |
| 6 | 400 от DTO-роута (имя >50 символов) показывает сообщение под полем через `FormMessage`, а не тост «Сервис недоступен» | ✓ VERIFIED | `extractFieldErrors` (проверяет `error.status === 400`, парсит grouped `{поле: [сообщения]}`) вызывается в `catch` раньше `apiErrorMessage` во всех трёх экшенах; `category-form.tsx` маппит `result.fieldErrors` на `form.setError`. UAT-сценарий 4 показал ожидаемое поведение (сообщение под полем), но перехватил его клиентский Zod, а не серверный путь — сама реализация `extractFieldErrors` проверена статически (код+grep), путь корректно смонтирован |
| 7 | 409 от `POST /categories` (дубль имени) показывает сообщение API как тост, форма остаётся открытой | ✓ VERIFIED | `create-category.action.ts`: дубль имени не даёт `fieldErrors` (409, не 400) → падает в `apiErrorMessage(error)`; `category-form.tsx` catch-ветка вызывает `toast.error`, не закрывает Dialog; подтверждено UAT-сценарием 3 |
| 8 | Submit-кнопка формы показывает `Loader2Icon` и `disabled`, пока `form.formState.isSubmitting === true` | ✓ VERIFIED | `category-form.tsx` L115-118: `<Button disabled={isSubmitting}>{isSubmitting ? <Loader2Icon .../> : null}...` |
| 9 | Ошибка загрузки списка рендерится как «Не удалось загрузить категории: {message}»; 401 уводит на `/session-expired`, отсутствие сессии — на `/login` | ✓ VERIFIED | `categories-view.tsx`: `redirect(ROUTES.login)` без сессии; `catch` с `error.status === 401 → redirect(ROUTES.sessionExpired)`; иначе `loadError = apiErrorMessage(error)`, рендерится строкой |
| 10 | Цвет выбирается только кликом по свотчу — свободного ввода hex в UI нет | ✓ VERIFIED | `color-swatch-picker.tsx` — только `<button>` на каждый hex из `CATEGORY_COLORS`, никакого `<input>` для цвета |
| 11 | Пустой список показывает «Пока нет категорий» + описание + кнопку «Создать категорию» (D-07) | ✓ VERIFIED | `category-list.tsx` L37-42: `categories.length === 0` → `EmptyState` с нужным текстом и `action` кнопкой; подтверждено UAT-сценарием 1/8 |
| 12 | Имя категории длиной ~50 символов усекается в колонке списка (класс `truncate`) и не ломает вёрстку строки | ✗ FAILED | `TableCell`/`span.truncate` не имеет ограничения ширины (`shared/ui/table.tsx` `whitespace-nowrap` без `max-width`); подтверждено ручным UAT (01-03-SUMMARY.md: «Находка — НЕ подтверждено», кнопки сдвигаются вправо) — см. Gaps |
| 13 | Поле имени в Dialog не выходит за границы модалки при 50 символах ввода | ✓ VERIFIED | Подтверждено ручным UAT (01-03-SUMMARY.md: «✅ пройдено», текст виден в рамке инпута) |

**Score:** 12/13 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/web/src/shared/ui/dialog.tsx` | shadcn Dialog primitive | ✓ VERIFIED | 158 lines, imports from `radix-ui`, used by `category-form.tsx` |
| `apps/web/src/shared/ui/alert-dialog.tsx` | shadcn AlertDialog primitive | ✓ VERIFIED | 196 lines, `cn` import fixed to `@/shared/lib/utils` (no stray `"cn"` package import found), used by `category-delete-dialog.tsx` |
| `apps/web/src/entities/category/api/create-category.ts` | `createCategory(accessToken, input)` → POST | ✓ VERIFIED | Calls `apiFetch('/categories', { method: 'POST', ... })` |
| `apps/web/src/entities/category/api/update-category.ts` | `updateCategory(accessToken, id, input)` → PATCH | ✓ VERIFIED | Calls `apiFetch(\`/categories/${id}\`, { method: 'PATCH', ... })` |
| `apps/web/src/entities/category/api/delete-category.ts` | `deleteCategory(accessToken, id)` → DELETE | ✓ VERIFIED | Calls `apiFetch(\`/categories/${id}\`, { method: 'DELETE' })` |
| `apps/web/src/features/category-form/model/types.ts` | `CategoryActionState`, `CategoryFormValues` | ✓ VERIFIED | Both types present, `fieldErrors`/`blocked` fields wired |
| `apps/web/src/features/category-form/model/palette.ts` | `CATEGORY_COLORS` (10 hex) | ✓ VERIFIED | 10 Tailwind-500 hex values, `as const` |
| `apps/web/src/features/category-form/model/affected-paths.ts` | `CATEGORY_AFFECTED_PATHS` | ✓ VERIFIED | `[ROUTES.categories, ROUTES.dashboard, ROUTES.expenses]` |
| `apps/web/src/features/category-form/api/create-category.action.ts` | Server Action, POST + revalidate | ✓ VERIFIED | `'use server'`, `extractFieldErrors` → `apiErrorMessage` fallback, `revalidatePath` loop |
| `apps/web/src/features/category-form/api/update-category.action.ts` | Server Action, PATCH + revalidate | ✓ VERIFIED | Same pattern as create |
| `apps/web/src/features/category-form/api/delete-category.action.ts` | Server Action, DELETE + 409 branch | ✓ VERIFIED | `status === 409 → blocked: true`, revalidate on success |
| `apps/web/src/features/category-form/ui/color-swatch-picker.tsx` | Swatch picker UI | ✓ VERIFIED | 10 clickable circles, `aria-pressed` |
| `apps/web/src/features/category-form/ui/category-form.tsx` | Create/edit form | ✓ VERIFIED | Single component, `category?` prop toggles mode |
| `apps/web/src/features/category-form/ui/category-delete-dialog.tsx` | Delete confirmation | ✓ VERIFIED | `AlertDialog` + blocked-state handling |
| `apps/web/src/widgets/category-list/ui/category-list.tsx` | List/table + dialog orchestration | ✓ VERIFIED | Table with edit/delete buttons, empty state branch |
| `apps/web/src/widgets/category-list/ui/empty-state.tsx` | Empty state UI | ✓ VERIFIED | Local copy per FSD cross-import rule |
| `apps/web/src/views/categories/ui/categories-view.tsx` | Server Component page view | ✓ VERIFIED | Session check, 401 redirect, error rendering |
| `apps/web/src/app/(dashboard)/categories/page.tsx` | Route entrypoint | ✓ VERIFIED | Delegates to `CategoriesView`, no stub text remaining |

No STUB or MISSING artifacts found.

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `app/(dashboard)/categories/page.tsx` | `views/categories/ui/categories-view.tsx` | direct render | ✓ WIRED | |
| `categories-view.tsx` | `entities/category/api/get-categories.ts` | `getCategories(session.accessToken)` | ✓ WIRED | Result passed as props to `CategoryList` |
| `category-form.tsx` | `entities/category/api/{create,update}-category.ts` | via `*Action` Server Actions | ✓ WIRED | |
| `*-category.action.ts` | `CATEGORY_AFFECTED_PATHS` | `revalidatePath` loop | ✓ WIRED | All 3 actions revalidate `/categories`, `/dashboard`, `/expenses` |
| `shared/api/error-message.ts` (`extractFieldErrors`) | `category-form.tsx` (`form.setError`) | `result.fieldErrors` → `Object.entries` loop | ✓ WIRED | |
| `delete-category.action.ts` | `category-delete-dialog.tsx` | `result.blocked` → `blockedMessage` state | ✓ WIRED | |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|---------------------|--------|
| `category-list.tsx` | `categories` prop | `getCategories()` real API call in `categories-view.tsx`, no static fallback | Yes | ✓ FLOWING |
| `category-form.tsx` (edit) | `defaultValues` | `category` prop passed from `category-list.tsx`'s `formTarget` state (actual clicked row) | Yes | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full workspace typecheck (shared → api → web) passes cleanly | `npm run typecheck` | All 4 sub-tasks (`shared` build, `api` tsc --noEmit, `web` tsc --noEmit, `shared` tsc --noEmit) completed with no errors | ✓ PASS |
| `apps/web` lint | `npm --prefix apps/web run lint` | Timed out at 100s (not evaluated — inconclusive, not treated as failure) | ? SKIP |
| No runnable test suite exists (project has no test runner per CLAUDE.md) | — | — | SKIPPED (no runnable entry points beyond typecheck) |

### Probe Execution

Not applicable — no `scripts/*/tests/probe-*.sh` and no probe references in PLAN/SUMMARY files for this phase.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|--------------|--------|----------|
| CAT-01 | 01-01 | Создание категории (название + цвет из палитры) | ✓ SATISFIED | Truths #1, #6, #7, #10 |
| CAT-02 | 01-02 | Редактирование существующей категории | ✓ SATISFIED | Truth #2 |
| CAT-03 | 01-02 | Удаление категории с подтверждением | ✓ SATISFIED | Truth #3 |
| CAT-04 | 01-02 | Блокировка удаления занятой категории, понятное сообщение | ✓ SATISFIED | Truth #4 |
| CAT-05 | 01-01 | `/categories` работает как полноценный список с CRUD, не заглушка | ✓ SATISFIED | Truth #5, #11 (наблюдается визуальный дефект — truth #12 — но не отменяет статус «не заглушка») |

No orphaned requirements — `.planning/REQUIREMENTS.md` traceability table maps all 5 CAT-* IDs to Phase 1, and all 5 appear in plan frontmatter `requirements:` fields.

### Anti-Patterns Found

Scanned all files in `covered_files` under `apps/web/src/{entities/category,features/category-form,widgets/category-list,views/categories}` and the modified `app/(dashboard)/categories/page.tsx` for `TBD|FIXME|XXX|TODO|HACK|PLACEHOLDER`, stub returns, and hardcoded-empty props.

None found. No debt markers, no empty handlers, no static/hardcoded data flowing to rendered output.

### Human Verification Required

None. All roadmap Success Criteria and plan must-haves resolved to VERIFIED or FAILED via direct code inspection, git history, and the manual UAT already recorded and cross-checked against source in 01-03-SUMMARY.md (scenarios independently corroborated against `shared/ui/table.tsx`, `category-list.tsx`, and the action/entity files).

### Gaps Summary

One gap blocks a clean pass: the "long category name truncates in the list" visual must-have (tagged `verification: backstop` in both 01-01-PLAN.md and 01-03-PLAN.md) is confirmed FAILED, not merely unverified. This was already self-identified by the phase's own manual UAT (01-03-SUMMARY.md) and independently corroborated here via static analysis of `apps/web/src/shared/ui/table.tsx` (`TableCell` sets `whitespace-nowrap` with no `max-width`) and `apps/web/src/widgets/category-list/ui/category-list.tsx` (the `truncate` span has no bounding container). The fix is scoped and small — add a width constraint to the name cell/container — and does not require new architecture.

Everything else — the 5 roadmap Success Criteria (CAT-01 create, CAT-02 edit, CAT-03 delete-with-confirm, CAT-04 409-blocked-delete-with-friendly-message, CAT-05 working `/categories` page) — is genuinely wired end-to-end: real Server Actions hit the real `/api/categories` endpoints, `revalidatePath` propagates changes to `/dashboard` and `/expenses`, the 409-vs-400 branching is decided by numeric `error.status` (not message-text sniffing) exactly as the plan required, and no stub/placeholder code remains in the modified files. `npm run typecheck` passes cleanly across all three packages.

---

*Verified: 2026-09-21*
*Verifier: Claude (gsd-verifier)*
