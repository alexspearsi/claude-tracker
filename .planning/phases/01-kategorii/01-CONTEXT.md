# Phase 1: Категории - Context

**Gathered:** 2026-09-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Фронтенд-CRUD для категорий: страница `/categories` (сейчас — заглушка `apps/web/src/app/(dashboard)/categories/page.tsx`) получает создание, редактирование, удаление категорий, с блокировкой удаления при наличии связанных транзакций (API уже отдаёт 409). Никакого нового backend-кода — `/api/categories` уже полностью реализован.

</domain>

<decisions>
## Implementation Decisions

### UI-паттерн формы
- **D-01:** Создание/редактирование категории — через `Dialog` (shadcn/ui), не отдельная страница и не inline-форма в списке. — **Reversibility:** reversible — чисто компонентная замена
- **D-02:** Одна форма `CategoryForm` для create и edit (принимает опциональный `category` проп для режима редактирования), по аналогии с рекомендацией research для `TransactionForm`

### Цвет категории
- **D-03:** Пикер цвета — фиксированная палитра из 8–12 preset-свотчей (кнопки-кружки), без HSB/RGB picker — уже зафиксировано в PROJECT.md/REQUIREMENTS.md как решение, не переоткрывается

### Список категорий
- **D-04:** Простой список/таблица (имя, цветной `CategoryDot` — уже существует как переиспользуемый компонент, кнопки редактировать/удалить), без карточек/сетки

### Удаление
- **D-05:** Подтверждение через `AlertDialog` (shadcn/ui) перед удалением
- **D-06:** При 409 от API (категория используется) — сообщение в самом диалоге/тосте: "Нельзя удалить категорию — есть связанные транзакции", без закрытия диалога молча

### Пустое состояние
- **D-07:** Если категорий нет — простое сообщение с кнопкой "Создать категорию", без иллюстраций

### Claude's Discretion
- Точный набор из 8–12 цветов палитры — Claude выбирает набор, визуально различимый и консистентный с уже существующими dashboard-цветами категорий
- Расположение кнопки "Добавить категорию" на странице (шапка страницы, справа)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Требования и роадмап
- `.planning/REQUIREMENTS.md` — CAT-01..05
- `.planning/ROADMAP.md` — Phase 1 (Категории)

### Research (эта итерация)
- `.planning/research/ARCHITECTURE.md` — размещение `features/category-form`, паттерн Server Action + `revalidatePath`, категории переиспользуют существующую `@expense/shared` Zod-схему
- `.planning/research/STACK.md` — недостающие shadcn-примитивы (`Dialog`, `AlertDialog`, `DropdownMenu`)
- `.planning/research/PITFALLS.md` — 409 на удаление категории уже корректно транслируется бэкендом (`ConflictException`), риск только на фронте — маппинг через `apiErrorMessage`

### Контракты API
- `packages/shared/src/schemas/category.ts` — Zod-схема категории (name, color `#RRGGBB`, icon) — источник для `zodResolver` формы
- `apps/api/src/modules/categories/dto/` — DTO-классы, дублирующие правила Zod-схемы

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `apps/web/src/entities/category/ui/category-dot.tsx` — цветная точка категории, уже используется на дашборде, переиспользовать в списке категорий
- `apps/web/src/entities/category/api/get-categories.ts` — `getCategories(accessToken)`, уже читает `GET /categories`
- `packages/shared/src/schemas/category.ts` — `categorySchema`, `createCategorySchema`, `updateCategorySchema` — готовы для `zodResolver`
- `apps/web/src/features/auth/` — эталонный паттерн feature-слоя: `api/*.action.ts` (Server Actions), `model/*-schema.ts`, `ui/*.tsx`

### Established Patterns
- Server Actions вызывают `getSession()` для токена, затем entity-функцию с `accessToken` параметром, затем `revalidatePath`
- Ошибки API маппятся через `apiErrorMessage` (`shared/api/error-message.ts`) в текст тоста
- Entities не читают сессию сами — `accessToken` передаётся параметром (см. `get-categories.ts`)

### Integration Points
- Новый `entities/category/api/{create,update,delete}-category.ts` — по образцу `get-categories.ts`
- Новый `features/category-form/` — форма создания/редактирования (Dialog + zodResolver на существующей Zod-схеме)
- Новый `features/category-delete/` или включить в `category-form` — AlertDialog + маппинг 409
- `apps/web/src/app/(dashboard)/categories/page.tsx` — заменить заглушку на реальный список (Server Component, `getCategories`)

</code_context>

<specifics>
## Specific Ideas

Нет специфических визуальных референсов — стандартный подход: Dialog-форма, AlertDialog-подтверждение, палитра свотчей.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 1-Категории*
*Context gathered: 2026-09-20*
