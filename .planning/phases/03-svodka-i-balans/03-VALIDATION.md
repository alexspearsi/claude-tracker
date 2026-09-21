---
phase: "3"
slug: "svodka-i-balans"
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-09-21"
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None configured — тестов в проекте нет, раннер не настроен (подтверждено в 03-RESEARCH.md: `grep -rn "test"` по секциям `scripts` не дал совпадений ни в одном из трёх `package.json`; тот же вывод, что в 01-RESEARCH.md/02-RESEARCH.md) |
| **Config file** | none |
| **Quick run command** | none available |
| **Full suite command** | none available |

---

## Sampling Rate

- **After every task commit:** `npm run typecheck` (ловит расхождение зеркалируемых типов `TransactionSummary`/`SummaryCategoryItem` между api и `entities/transaction/model/types.ts`)
- **After every plan wave:** `npm run typecheck && npm --prefix apps/web run lint`
- **Before `/gsd-verify-work`:** ручной UAT-прогон сценариев SUM-01/SUM-02 ниже
- **Max feedback latency:** N/A — раннер отсутствует

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-01-* | 03 | 1 | SUM-01, SUM-02 | TBD | Сводка и разбивка по категориям видны только владельцу транзакций — сервер (`userId` из JWT) источник правды, фронт не строит собственных фильтров | manual-only | — | ❌ нет фреймворка | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements.* Введение тестового фреймворка —
project-wide инфраструктурное решение, не входит в скоуп этой фазы (тот же прецедент, что в
фазах 1 и 2).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Базовый рендер сводки за текущий месяц | SUM-01 | Нет тест-раннера | Зайти на `/dashboard` пользователем с транзакциями за текущий месяц — карточки «Баланс»/«Доходы»/«Расходы» показывают значения, совпадающие с прямым вызовом `GET /api/transactions/summary?month=&year=` за тот же период |
| Знак и цвет отрицательного баланса | SUM-01 | Нет тест-раннера | У пользователя с расходами больше доходов за месяц — баланс со знаком «−», карточка «Баланс» остаётся нейтрального цвета (не красная) |
| Пустой месяц | SUM-01 | Нет тест-раннера | Пользователь без транзакций за текущий месяц — три карточки показывают нули, под таблицей текст пустого состояния вместо таблицы без строк |
| Сортировка и содержимое строки таблицы категорий | SUM-02 | Нет тест-раннера | У пользователя ≥3 категорий с транзакциями за месяц — строки идут по убыванию суммы (сверить с `byCategory` из api), у каждой строки точка цвета + имя + знаковая сумма, без колонок «Тип»/«% от общего» |
| Дубли categoryId/type | SUM-02 | Нет тест-раннера | Категория, использованная и в доходной, и в расходной транзакции за месяц — две отдельные строки в таблице, без React-предупреждения о дублирующихся ключах в консоли |
| Ошибка/авторизация сводки | SUM-01 | Нет тест-раннера | Протухшая access-кука → редирект на `/session-expired`; 5xx только от `/transactions/summary` → текст ошибки рядом со сводкой, список последних транзакций рендерится независимо |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies — N/A, manual-only по обоснованному исключению
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify — N/A, автопроверок в проекте нет
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < N/A
- [ ] `nyquist_compliant: true` — deferred, если проект добавит тест-раннер позже

**Approval:** pending
