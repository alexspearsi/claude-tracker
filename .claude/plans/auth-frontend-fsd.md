# Фронтенд авторизации: вход и регистрация на shadcn/ui + Feature Slice Design

## Статус: выполнено

Токены — в httpOnly-куках, выставляются Server Actions. Перестройка под FSD полная:
`src/lib` и `src/components/ui` переехали в `src/shared`.

**Отклонения и дополнения к плану:**
- CLI shadcn 4.21.0 сгенерировал компоненты с импортом `from "cn"` — несуществующего
  npm-пакета вместо алиаса `@/shared/lib/utils` — и доустановил мусорные зависимости
  `cn@0.3.0` и `next-themes`. Импорты исправлены, пакеты удалены, `sonner.tsx` переписан
  без `next-themes` (провайдера тем в проекте нет, тема задаётся `prefers-color-scheme`).
  Версии `radix-ui` и `sonner` перезакреплены точными (`--save-exact`).
- `globals.css` пришлось расширить: компоненты shadcn используют токены `popover`, `ring`,
  `input`, `destructive`, `*-foreground` и `--radius`, которых в исходном наборе не было —
  без них кнопки и поля остались бы без цветов.
- Добавлена кнопка выхода (`features/auth/ui/logout-button.tsx`) в шапке
  `app/(dashboard)/layout.tsx`: `logout.action.ts` иначе оставался мёртвым кодом, а без
  выхода нечем сбросить сессию при ручной проверке.
- Схема формы регистрации вынесена в `features/auth/model/register-form-schema.ts`:
  в контракте `name` необязательное (`min(1).optional()`), а пустой input отдаёт `''`
  и валидация падала бы на незаполненном поле.
- Проверка в браузере: цвета `<button>` на машине переопределяются самим Chrome
  (даже inline `background-color: red !important` не применяется, `color` приходит
  системный `rgb(7,151,225)`) — расширение или принудительная тёмная тема. Разметка и CSS
  корректны: тот же класс `bg-primary` на `div` красит фон как надо.

## Чеклист реализации

**1. Каркас FSD**
- [x] `src/lib/utils.ts` → `src/shared/lib/utils.ts`
- [x] `src/lib/api-client.ts` → `src/shared/api/api-client.ts`
- [x] Удалены `src/lib/session.ts`, пустые `src/features/*/.gitkeep`, `src/components/`
- [x] `components.json`: алиасы на `@/shared/*`
- [x] `src/shared/config/routes.ts` — `ROUTES`, `PROTECTED_ROUTES`, `GUEST_ROUTES`

**2. shadcn/ui**
- [x] `npx shadcn@4.21.0 add button input label card form sonner`
- [x] Импорты `cn` исправлены, лишние зависимости удалены
- [x] Токены темы в `globals.css` дополнены, `tailwind.config.js` не появился
- [x] `<Toaster position="top-center" richColors />` в `src/app/layout.tsx`

**3. Сессия (`entities/session`)**
- [x] `setSession` / `getSession` / `clearSession` поверх `await cookies()`
- [x] `httpOnly`, `sameSite: 'lax'`, `path: '/'`, `secure` только в production
- [x] `maxAge`: access 15 мин, refresh 30 дней
- [x] `import 'server-only'`

**4. Server Actions (`features/auth/api`)**
- [x] `login.action.ts`, `register.action.ts`, `logout.action.ts`
- [x] Повторная валидация входа Zod-схемой из `@expense/shared`
- [x] `redirect` вне `try/catch`
- [x] `shared/api/error-message.ts`: разбор `{ statusCode, path, timestamp, error }`,
      включая `issues` от `z.treeifyError`

**5. Формы (`features/auth/ui`)**
- [x] `login-form.tsx`, `register-form.tsx` на react-hook-form + zodResolver
- [x] Пустое имя уходит как отсутствующее поле
- [x] `isSubmitting` → кнопка disabled + спиннер
- [x] Русские сообщения валидации в `packages/shared/src/schemas/auth.ts`

**6. Экраны**
- [x] `views/login`, `views/register` (карточки со ссылками друг на друга)
- [x] `app/(auth)/layout.tsx`, страницы-обёртки с `metadata`
- [x] `app/page.tsx` — пути из `ROUTES`

**7. Защита роутов**
- [x] `src/proxy.ts` — оптимистичная проверка куки в обе стороны
- [x] `app/(dashboard)/layout.tsx` — `getSession()` + редирект, шапка с выходом

**8. CLAUDE.md**
- [x] Раздел «Фронтенд — Feature Slice Design»: слои, правило импортов, почему `views`,
      грабли CLI shadcn, сессия в куках
- [x] `proxy.ts` вместо `middleware.ts`
- [x] Путь к `formatMoney` обновлён, «Состояние» переписано

**9. Проверка**
- [x] `npm run typecheck`, `npm run lint` — без ошибок
- [x] Короткий пароль → «Минимум 8 символов» под полем, запроса к api нет
- [x] Регистрация нового email → редирект на `/expenses`, `document.cookie` токенов не видит
- [x] Повторная регистрация → тост «Email уже занят»
- [x] Вход с неверным паролем → тост «Неверный email или пароль»; с верным → `/expenses`
- [x] `/expenses` без кук → 307 на `/login`; `/login` с кукой → 307 на `/expenses`
- [x] Выход → куки удалены, редирект на `/login`

## Обновление истёкшего access-токена (выполнено отдельным заходом)

Access живёт 15 минут, refresh — 30 дней, и раньше по истечении access пользователя
выбрасывало в `/login`. Теперь пара обновляется прозрачно.

- [x] `entities/session/model/cookies.ts` — имена и опции кук вынесены из `api/session.ts`:
      их использует `proxy.ts`, которому нельзя импортировать модуль под `server-only`
- [x] `entities/session/lib/token-expiry.ts` — срок жизни куки берётся из `exp` самого JWT,
      а не из константы (иначе TTL пришлось бы синхронизировать с api вручную); подпись не
      проверяется, её проверяет api
- [x] `refreshSession()` в `entities/session/api/session.ts` — обмен для Server Actions,
      при неудаче чистит куки
- [x] `entities/session/api/proxy-session.ts` — `exchangeRefreshToken`, `setSessionCookies`,
      `clearSessionCookies`: в proxy куки ставятся на конкретный `NextResponse`, а не через
      `cookies()`
- [x] `proxy.ts` — при живом refresh и протухшем access меняет пару и пишет её в ответ;
      при неудачном обмене чистит куки и ведёт себя как при отсутствии сессии
- [x] `logoutAction` — при 401 обновляет пару и повторяет отзыв, иначе старый refresh
      остался бы валидным в базе все 30 дней после выхода
- [x] `CLAUDE.md` — разделы про обновление токена, ротацию и префетчи

**Отклонения:**
- Планировалась обёртка `authorizedFetch` с retry на 401 для всех запросов — не сделана:
  logout из-за ротации должен отправлять **новый** refresh в теле, общей обёрткой это не
  выражается, а других запросов к api из Server Actions пока нет. Добавить вместе с
  экранами трат и категорий.
- Префетчи пришлось отсекать в `config.matcher` (`missing`), а не внутри функции: Next 16
  вырезает `next-router-prefetch` и `rsc` из `request.headers` в proxy — проверено
  отладочным логом, заголовки не доходят вовсе. Это важно, потому что обмен отзывает старый
  refresh, и префетч параллельно с навигацией уронил бы сессию.
- Для проверки временно ставил `JWT_ACCESS_TTL=20s` в `apps/api/.env` (возвращён на `15m`).
  Попутно выяснилось, что остановка фоновой задачи `npm run dev:api` не убивает дочерний
  процесс node — порт остаётся занятым, и новый api молча падает с `EADDRINUSE`,
  продолжая отвечать старой конфигурацией.

**Проверено:**
- вход → ожидание истечения access → навигация: пользователь остаётся в приложении,
  в базе `total` +1 при неизменном числе активных токенов (старый отозван, новый выдан)
- валидный refresh без access → 200 и обе куки в ответе, сроки `Expires` совпадают с `exp`
  токенов (access — 20 с, refresh — 30 дней)
- битый refresh → 307 на `/login` и обе куки удалены
- запрос с `next-router-prefetch: 1` → ни одной куки в ответе, в базе ничего не меняется;
  такой же запрос без заголовка → обмен происходит

## Осталось на потом

- `authorizedFetch` с retry на 401 — вместе с первыми запросами к `/expenses`
  и `/categories` из Server Actions.
- Тестовый пользователь `fsd-test@example.com` остался в базе после ручной проверки.
