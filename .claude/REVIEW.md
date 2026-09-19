## Чеклист

### Общее
- [ ] PR title соответствует Conventional Commits (`<тип>: <описание>` на русском, повелительное наклонение)
- [ ] `npm run build` проходит (порядок shared → api → web не нарушен)
- [ ] `npm run typecheck` и `npm run lint` проходят
- [ ] После правки схем в `packages/shared` — пересобран (`dist` актуален)
- [ ] Тестов в проекте нет — не требовать их и не ссылаться на несуществующий раннер

### Валидация и контракты
- [ ] Auth/users — через Zod-схемы `packages/shared`, `ZodValidationPipe`, тип тела в контроллере через `import type`
- [ ] Категории и транзакции — через DTO-классы (class-validator), глобальный `ValidationPipe`
      (`whitelist` + `forbidNonWhitelisted`)
- [ ] DTO в контроллере импортирован **значением**, не `import type` (иначе `ValidationPipe`
      молча пропускает проверку из-за метатипа `Object`)
- [ ] Правила категорий продублированы в `packages/shared/src/schemas/category.ts` — если
      меняется DTO, синхронизирована и Zod-схема
- [ ] Формы на фронте используют `zodResolver` поверх схем из `@expense/shared`, а не
      самодельную валидацию

### Авторизация и доступ к данным
- [ ] Новый роут либо защищён глобальным `JwtAuthGuard`, либо явно помечен `@Public()`
- [ ] Не добавлен локальный `@UseGuards(JwtAuthGuard)` в feature-модуле (уронит старт с
      `UnknownDependenciesException` — guard уже глобальный через `APP_GUARD` в `AuthModule`)
- [ ] Запросы к транзакциям/категориям фильтруются по `userId` из JWT — нет доступа к чужой
      записи по прямому id

### Работа с БД
- [ ] Prisma-клиент получен через `@Inject(PRISMA)`, а не через `extends PrismaClient`
- [ ] Ошибки Prisma (`P2002`, `P2025`, `P2003`) обёрнуты через `isPrismaError`, а не
      всплывают как 500
- [ ] Изменения схемы сопровождаются миграцией (`prisma migrate dev`), `prisma generate`
      актуален

### Деньги
- [ ] Суммы — `Decimal(12, 2)` в БД, строка в JSON; нигде не появляется `float`/`number`
      для денежных значений
- [ ] Форматирование сумм на фронте — через `formatMoney`, не форматирование на месте

### FSD (apps/web)
- [ ] Импорты идут только вниз: `app → views → widgets → features → entities → shared`
- [ ] Нет кросс-импортов внутри одного слоя
- [ ] `app/` не содержит логики — только роутинг, `page.tsx` в 3–5 строк, `metadata`
- [ ] Общий код, используемый несколькими слайсами, поднят в `shared`, а не скопирован
- [ ] Новые shadcn-компоненты: импорт `cn` поправлен на `@/shared/lib/utils` (CLI пишет
      несуществующий `from "cn"`), лишние зависимости (`cn`, `next-themes`) не добавлены

### Сессия и proxy
- [ ] Токены не читаются и не пишутся напрямую из клиентского JS — только через
      `entities/session/api/session.ts` (`server-only`)
- [ ] `redirect()` в Server Action вызван вне `try/catch`
- [ ] Ошибки api превращены в текст тоста через `apiErrorMessage`, а не показаны как есть
- [ ] Изменения в `proxy.ts` не ломают отсечение префетчей (`config.matcher` /
      `missing: [next-router-prefetch, purpose=prefetch]`) — иначе параллельный refresh
      выбьет пользователя

### Версии стека — не «чинить» без причины
- [ ] `apps/api` остаётся ESM (`"type": "module"`), относительные импорты — с `.js`
- [ ] TypeScript не поднят на 7.x
- [ ] `prisma`/`@prisma/client` не подняты без явного пиннинга на конкретную версию
- [ ] Порты 3001 (web) / 4001 (api) / 5433 (postgres) не «исправлены» обратно на дефолтные
- [ ] Версии зависимостей в PR проверены по `npm view <пакет> version`, а не по памяти

## Стиль
- DTO: `CreateEntityDto`, `UpdateEntityDto` (`apps/api/src/modules/*/dto`)
- Zod-схемы в `packages/shared/src/schemas/*.ts`, типы — через `z.infer`
- Server Actions: `*.action.ts` в `features/*/api`
- FSD-сущности: `entities/<domain>`, публичный API слайса — через `index.ts`

## Пропускать при ревью
- Файлы миграций Prisma (`apps/api/prisma/migrations/**`)
- `package-lock.json` и другие lock-файлы
- `*.log` файлы
- Сгенерированный код (`packages/shared/dist/**`, Prisma client)
