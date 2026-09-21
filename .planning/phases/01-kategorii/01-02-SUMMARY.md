---
phase: 01-kategorii
plan: 02
subsystem: ui
tags: [nextjs, react-hook-form, shadcn, alert-dialog, server-actions]

requires:
  - phase: 01-kategorii
    provides: "CategoryForm, CategoryList, extractFieldErrors, CATEGORY_AFFECTED_PATHS из плана 01-01"
provides:
  - "CategoryForm поддерживает режим редактирования (D-02): PATCH /categories/:id"
  - "CategoryDeleteDialog — AlertDialog подтверждения удаления (D-05)"
  - "Блокировка удаления занятой категории по error.status === 409 (CAT-04, D-06)"
affects: [01-03-документация, фаза-2-транзакции]

actuals:
  tokens: 18000
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "AlertDialogAction с event.preventDefault() — не даёт Radix закрыть диалог до ответа сервера, необходимо для состояния blocked"

key-files:
  created:
    - apps/web/src/shared/ui/alert-dialog.tsx
    - apps/web/src/entities/category/api/update-category.ts
    - apps/web/src/entities/category/api/delete-category.ts
    - apps/web/src/features/category-form/api/update-category.action.ts
    - apps/web/src/features/category-form/api/delete-category.action.ts
    - apps/web/src/features/category-form/ui/category-delete-dialog.tsx
  modified:
    - apps/web/src/features/category-form/ui/category-form.tsx
    - apps/web/src/widgets/category-list/ui/category-list.tsx

key-decisions:
  - "AlertDialogAction принимает variant напрямую (уже обёрнут в Button внутри shadcn-компонента) — buttonVariants() отдельно не понадобился"
  - "Флаг blocked ставится только в deleteCategoryAction — в create/update 409 означает дубль имени и обрабатывается обычным тостом"

patterns-established:
  - "409-статус (не текст сообщения) как единственный источник решения о блокировке UI-состояния — воспроизводимо для будущих DELETE-эндпоинтов с FK-ограничениями"

requirements-completed: [CAT-02, CAT-03, CAT-04]

coverage:
  - id: D1
    description: "Редактирование категории через ту же форму, предзаполненную текущими значениями, PATCH обновляет список без перезагрузки"
    requirement: "CAT-02"
    verification:
      - kind: manual_procedural
        ref: "открыть Редактировать у категории, изменить имя/цвет, сохранить — строка обновляется"
        status: unknown
    human_judgment: true
    rationale: "В проекте нет тест-раннера (01-VALIDATION.md) — верификация только через ручной UAT"
  - id: D2
    description: "Удаление категории через AlertDialog с подтверждением, счастливый путь убирает строку из списка"
    requirement: "CAT-03"
    verification:
      - kind: manual_procedural
        ref: "Удалить -> подтвердить на категории без транзакций -> строка исчезает"
        status: unknown
    human_judgment: true
    rationale: "Требует живого dev-сервера и браузера"
  - id: D3
    description: "Удаление категории со связанными транзакциями блокируется 409-ответом, диалог остаётся открытым с сообщением"
    requirement: "CAT-04"
    verification:
      - kind: manual_procedural
        ref: "precondition: категория со связанной транзакцией (через prisma:studio); Удалить -> подтвердить -> диалог остаётся открытым с сообщением"
        status: unknown
    human_judgment: true
    rationale: "Требует ручной подготовки данных (связанной транзакции) и живого сервера — не автоматизировано"

duration: ~50min
completed: 2026-09-21
status: complete
---

# Phase 1 Plan 02: Редактирование и удаление категорий Summary

**Полный CRUD категорий: CategoryForm получает режим редактирования (PATCH), CategoryDeleteDialog на shadcn AlertDialog добавляет удаление с подтверждением, а блокировка удаления занятой категории различается по числовому `error.status === 409`, не по тексту сообщения**

## Performance

- **Duration:** ~50 минут
- **Started:** 2026-09-21
- **Completed:** 2026-09-21
- **Tasks:** 3
- **Files modified:** 8 (6 новых, 2 изменённых)

## Accomplishments
- `CategoryForm` включает ветку редактирования (D-02): предзаполнение `defaultValues` из `category`, `onSubmit` вызывает `updateCategoryAction(category.id, values)` вместо `createCategoryAction`, заголовок и подпись кнопки меняются по режиму
- `updateCategory` entity-api + `updateCategoryAction` Server Action — по образцу задачи 1 плана 01-01, с `extractFieldErrors` в `catch` перед общим фолбэком
- Сгенерирован shadcn `AlertDialog`: CLI подставил несуществующий импорт `from "cn"` (исправлен на `@/shared/lib/utils`) и добавил лишний npm-пакет `cn` в `package.json` (откачен через `npm uninstall`) — ровно то, что предупреждал план и research «Package Legitimacy Audit»
- `CategoryDeleteDialog` — первое использование `AlertDialog` в проекте: подтверждение с `event.preventDefault()`, не позволяющим Radix закрыть диалог до ответа сервера
- Блокировка удаления (CAT-04, D-06): `delete-category.action.ts` ветвится по `error instanceof ApiError && error.status === 409` → `{ error, blocked: true }`; диалог при `blocked` остаётся открытым с сообщением «Нельзя удалить категорию — есть связанные транзакции», кнопка подтверждения возвращается в активное состояние
- `CategoryList`: кнопки «Редактировать»/«Удалить» в каждой строке (обычные кнопки, без выпадающего меню — D-04), раздельные состояния `formTarget`/`deleteTarget`

## Task Commits

Each task was committed atomically:

1. **Task 1: Редактирование категории сквозь все слои (CAT-02)** - `8c727da` (feat)
2. **Task 2: Удаление категории с подтверждением через AlertDialog (CAT-03)** - `45e2e1e` (feat)
3. **Task 3: Блокировка удаления занятой категории — 409 по статусу (CAT-04, D-06)** - `2ff8af6` (feat)

## Files Created/Modified
- `apps/web/src/shared/ui/alert-dialog.tsx` - shadcn AlertDialog, импорт `cn` исправлен на `@/shared/lib/utils`
- `apps/web/src/entities/category/api/update-category.ts` - `updateCategory(accessToken, id, input)`
- `apps/web/src/entities/category/api/delete-category.ts` - `deleteCategory(accessToken, id)`
- `apps/web/src/features/category-form/api/update-category.action.ts` - Server Action обновления с `extractFieldErrors`
- `apps/web/src/features/category-form/api/delete-category.action.ts` - Server Action удаления с веткой `status === 409 → blocked`
- `apps/web/src/features/category-form/ui/category-delete-dialog.tsx` - `CategoryDeleteDialog`, AlertDialog с blocked-состоянием
- `apps/web/src/features/category-form/ui/category-form.tsx` - режим редактирования (D-02)
- `apps/web/src/widgets/category-list/ui/category-list.tsx` - кнопки действий, `deleteTarget` состояние

## Decisions Made
- `AlertDialogAction` из сгенерированного shadcn-компонента уже принимает `variant` напрямую (обёрнут в `Button` внутри) — отдельный `buttonVariants()` вызов не понадобился, упростили относительно черновика плана
- Ветки Task 2 и Task 3 реализованы и закоммичены раздельно (сначала happy path без 409, затем добавлена ветка блокировки), хотя технически было проще написать сразу целиком — атомарность коммитов по задачам плана важнее экономии шагов

## Deviations from Plan

None — план выполнен точно как написан, включая предсказанный в плане инцидент с CLI (`from "cn"` импорт и лишняя npm-зависимость), который был обнаружен и исправлен согласно инструкции плана.

## Issues Encountered
`npx shadcn@latest add alert-dialog` запросил подтверждение перезаписи `button.tsx` (уже существует и не менялся с плана 01-01) — отклонено; сам `alert-dialog.tsx` сгенерирован с ожидаемым дефектом импорта `cn`, исправлен вручную согласно плану и `## Package Legitimacy Audit` в 01-RESEARCH.md.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `/categories` — полноценный CRUD: создание, редактирование, удаление, блокировка удаления занятой категории
- План 01-03 (документация/интеграционные проверки) может опираться на завершённый CRUD без дополнительных архитектурных решений
- Ручная UAT-проверка (редактирование, удаление свободной/занятой категории, precondition с связанной транзакцией через `prisma:studio`) не выполнена в рамках этого запуска — требует поднятых `npm run db:up` и `npm run dev`; рекомендуется провести перед мержем PR

---
*Phase: 01-kategorii*
*Completed: 2026-09-21*
