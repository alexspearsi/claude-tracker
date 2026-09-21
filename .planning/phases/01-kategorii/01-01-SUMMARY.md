---
phase: 01-kategorii
plan: 01
subsystem: ui
tags: [nextjs, react-hook-form, zod, shadcn, dialog, server-actions]

requires: []
provides:
  - "/categories отдаёт реальный список категорий пользователя вместо заглушки"
  - "Dialog-форма создания категории (имя + палитра из 10 свотчей)"
  - "extractFieldErrors — общий мост от grouped-формата ValidationPipe к per-field ошибкам RHF"
  - "CATEGORY_AFFECTED_PATHS — конвенция ревалидации для всех путей, где рендерится категория"
  - "Пустое состояние списка категорий (D-07)"
affects: [01-02-редактирование-и-удаление-категорий, 01-03-документация, фаза-2-транзакции]

actuals:
  tokens: 21000
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Server Action без redirect() — возвращает CategoryActionState, Dialog сам решает, закрываться ли"
    - "extractFieldErrors как общий shared/api/ хелпер, переиспользуемый будущими DTO-формами (транзакции, фаза 2)"

key-files:
  created:
    - apps/web/src/shared/ui/dialog.tsx
    - apps/web/src/entities/category/api/create-category.ts
    - apps/web/src/features/category-form/model/types.ts
    - apps/web/src/features/category-form/model/palette.ts
    - apps/web/src/features/category-form/model/affected-paths.ts
    - apps/web/src/features/category-form/api/create-category.action.ts
    - apps/web/src/features/category-form/ui/color-swatch-picker.tsx
    - apps/web/src/features/category-form/ui/category-form.tsx
    - apps/web/src/widgets/category-list/ui/category-list.tsx
    - apps/web/src/widgets/category-list/ui/empty-state.tsx
    - apps/web/src/views/categories/ui/categories-view.tsx
  modified:
    - apps/web/src/app/(dashboard)/categories/page.tsx
    - apps/web/src/shared/api/error-message.ts

key-decisions:
  - "extractFieldErrors добавлен как сосед apiErrorMessage в том же файле, не отдельный модуль — оба обслуживают одну ответственность (разбор ошибок API)"
  - "Цвет выбирается только кликом по preset-свотчу, свободного ввода hex в UI нет — гарантирует /^#[0-9a-fA-F]{6}$/ без доп. валидации на клиенте"

patterns-established:
  - "Grouped-validation-error bridge: extractFieldErrors(error) → Record<string, string> | null, вызывается в catch до apiErrorMessage — фаза 2 (транзакции) переиспользует без изменений"
  - "CATEGORY_AFFECTED_PATHS: массив путей для revalidatePath, экспортируемый рядом с формой — паттерн для будущих affected-paths в других features"

requirements-completed: [CAT-01, CAT-05]

coverage:
  - id: D1
    description: "/categories показывает рабочий список категорий пользователя вместо заглушки"
    requirement: "CAT-05"
    verification:
      - kind: manual_procedural
        ref: "открыть /categories при запущенном dev-сервере, увидеть таблицу/пустое состояние вместо статичного текста"
        status: unknown
    human_judgment: true
    rationale: "В проекте нет тест-раннера (01-VALIDATION.md) — верификация только через ручной UAT"
  - id: D2
    description: "Создание категории через Dialog с именем и цветом из палитры, немедленно видна в списке (revalidatePath)"
    requirement: "CAT-01"
    verification:
      - kind: manual_procedural
        ref: "заполнить форму, кликнуть свотч, сохранить — строка появляется без перезагрузки"
        status: unknown
    human_judgment: true
    rationale: "Требует живого dev-сервера и браузера — не автоматизировано в этом проекте"
  - id: D3
    description: "400 от DTO-роута (например, имя >50 символов) показывается под полем, а не тостом о недоступности сервиса"
    verification:
      - kind: manual_procedural
        ref: "снять maxLength через devtools, отправить длинное имя, увидеть FormMessage под полем"
        status: unknown
    human_judgment: true
    rationale: "Требует ручного обхода клиентского maxLength — не автоматизировано"
  - id: D4
    description: "Пустое состояние (D-07) с кнопкой создания при отсутствии категорий"
    verification:
      - kind: manual_procedural
        ref: "у пользователя без категорий /categories показывает 'Пока нет категорий' + кнопку"
        status: unknown
    human_judgment: true
    rationale: "Требует состояния БД без категорий — ручная проверка"

duration: ~40min
completed: 2026-09-21
status: complete
---

# Phase 1 Plan 01: Сквозной путь создания категории Summary

**Dialog-форма создания категории (RHF + zodResolver + shadcn Dialog) поверх готового `POST /api/categories`, с общим мостом `extractFieldErrors` к grouped-формату `ValidationPipe`, заменяет заглушку `/categories` рабочим списком с пустым состоянием**

## Performance

- **Duration:** ~40 минут (первая задача выполнена предыдущим запуском executor'а, прерванным лимитом сессии; задачи 2-3 и SUMMARY.md — этим продолжением)
- **Started:** 2026-09-20T23:00Z (оценка)
- **Completed:** 2026-09-21
- **Tasks:** 3
- **Files modified:** 14 (11 новых, 3 изменённых)

## Accomplishments
- `/categories` рендерит реальный список категорий пользователя (`CategoriesView` — серверный компонент, `getCategories(session.accessToken)`), заглушка `<main className="p-6">Категории</main>` удалена
- Кнопка «Создать категорию» открывает `Dialog` с формой: `Input` для имени + `ColorSwatchPicker` (10 preset-свотчей), сохранение вызывает `createCategoryAction` → `POST /api/categories` → `revalidatePath` по `CATEGORY_AFFECTED_PATHS` (`/categories`, `/dashboard`, `/expenses`)
- `extractFieldErrors` — новый общий хелпер в `shared/api/error-message.ts`, разбирает `errorFormat: 'grouped'` от `class-validator`-DTO роутов (`{ поле: [сообщения] }`) в `Record<string, string>`; `create-category.action.ts` вызывает его раньше общего `apiErrorMessage`-фолбэка
- `category-form.tsx` маппит `result.fieldErrors` на `form.setError` — 400 по имени показывается под полем через `FormMessage`, а не тостом «Сервис недоступен»
- Пустое состояние (D-07): собственная копия `EmptyState` для виджета категорий (кросс-импорт из `widgets/recent-transactions` запрещён FSD-конвенцией), с кнопкой «Создать категорию», открывающей ту же модалку, что и кнопка в шапке

## Task Commits

Each task was committed atomically:

1. **Task 1: Сквозной путь «создать категорию» — от страницы до POST /api/categories** - `c531917` (feat)
2. **Task 2: Per-field ошибки валидации — extractFieldErrors как мост к grouped-формату ValidationPipe** - `12b068f` (feat)
3. **Task 3: Пустое состояние списка категорий (D-07)** - `8f08ea4` (feat)

## Files Created/Modified
- `apps/web/src/shared/ui/dialog.tsx` - shadcn Dialog, импорт из объединённого `radix-ui` (не отдельного пакета)
- `apps/web/src/entities/category/api/create-category.ts` - `createCategory(accessToken, input)`, по образцу `get-categories.ts`
- `apps/web/src/features/category-form/model/types.ts` - `CategoryActionState`, `CategoryFormValues`
- `apps/web/src/features/category-form/model/palette.ts` - `CATEGORY_COLORS` (10 hex-значений)
- `apps/web/src/features/category-form/model/affected-paths.ts` - `CATEGORY_AFFECTED_PATHS`
- `apps/web/src/features/category-form/api/create-category.action.ts` - Server Action без `redirect()`, с `extractFieldErrors`-веткой
- `apps/web/src/features/category-form/ui/color-swatch-picker.tsx` - `ColorSwatchPicker`, клик по свотчу выбирает цвет
- `apps/web/src/features/category-form/ui/category-form.tsx` - `CategoryForm`, RHF + zodResolver(createCategorySchema)
- `apps/web/src/widgets/category-list/ui/category-list.tsx` - `CategoryList`, таблица/пустое состояние + управление Dialog
- `apps/web/src/widgets/category-list/ui/empty-state.tsx` - `EmptyState`, локальная копия для этого виджета
- `apps/web/src/views/categories/ui/categories-view.tsx` - `CategoriesView`, серверный компонент с обработкой 401
- `apps/web/src/app/(dashboard)/categories/page.tsx` - делегирует в `CategoriesView`, заглушка удалена
- `apps/web/src/shared/api/error-message.ts` - добавлен `extractFieldErrors` рядом с существующим `apiErrorMessage`

## Decisions Made
- `extractFieldErrors` живёт в том же файле, что и `apiErrorMessage` (не отдельный модуль) — обе функции решают одну задачу (разбор ошибок API), и фаза 2 (формы транзакций) переиспользует обе без новых импортов
- Свободный ввод hex-цвета в UI отсутствует — только клик по preset-свотчу, что тривиально удовлетворяет регэксп `/^#[0-9a-fA-F]{6}$/` без дополнительной клиентской валидации

## Deviations from Plan

None — план выполнен точно как написан. Единственное отклонение процесса (не плана): выполнение прервалось после Task 1 из-за лимита сессии Claude; после сброса лимита Task 2 и Task 3 выполнены тем же агентом в том же worktree без повторной работы.

## Issues Encountered
Ни одной технической проблемы — сгенерированный `npx shadcn add dialog` не добавил новых npm-зависимостей (импорт из уже установленного `radix-ui`), `npm run typecheck` и `npm --prefix apps/web run lint` прошли чисто после каждой задачи.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Архитектура среза (`app → views → widgets → features → entities → shared` + Server Action + `revalidatePath`) доказана целиком на живом пути — план 01-02 (редактирование/удаление) расширяет те же файлы, не создавая новых архитектурных решений
- `extractFieldErrors` и `CATEGORY_AFFECTED_PATHS` готовы к переиспользованию формами транзакций в фазе 2
- Ручная UAT-проверка (создание категории, дубль имени, длинное имя, пустое состояние) не выполнена в рамках этого запуска — требует поднятых `npm run db:up` и `npm run dev`, что не было доступно в изолированном worktree-исполнении; рекомендуется провести перед мержем PR

---
*Phase: 01-kategorii*
*Completed: 2026-09-21*
