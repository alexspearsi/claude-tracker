---
phase: "2"
slug: "tranzaktsii"
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-09-21"
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None configured — тестов в проекте нет, раннер не настроен (подтверждено в 02-RESEARCH.md: нет jest/vitest конфигов, нет `test` script) |
| **Config file** | none |
| **Quick run command** | none available |
| **Full suite command** | none available |

---

## Sampling Rate

- **After every task commit:** `npm run typecheck` (ловит класс ошибок расхождения DTO/схемы — главный риск этой фазы)
- **After every plan wave:** `npm run typecheck && npm --prefix apps/web run lint`
- **Before `/gsd-verify-work`:** ручной UAT-прогон TXN-01..06
- **Max feedback latency:** N/A — раннер отсутствует

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-01-* | 02 | 1 | TXN-01..06 | V4/V5 | Транзакция создаётся/редактируется/удаляется только владельцем; сервер — источник правды | manual-only | — | ❌ нет фреймворка | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements.* Введение тестового фреймворка —
отдельное инфраструктурное решение, не входит в эту фазу (тот же прецедент, что в Phase 1).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Добавление транзакции (тип, сумма, категория, дата, описание) | TXN-01 | Нет тест-раннера | Открыть Dialog с `/dashboard` или `/expenses`, заполнить форму, сохранить — транзакция появляется в списке |
| Редактирование транзакции | TXN-02 | Нет тест-раннера | Открыть «Редактировать» у существующей транзакции, изменить поля, сохранить — изменения отражены |
| Удаление транзакции с подтверждением | TXN-03 | Нет тест-раннера | Удалить через AlertDialog — транзакция исчезает из списка |
| `/expenses` — рабочий список с пагинацией | TXN-04 | Нет тест-раннера | Открыть `/expenses` — показывается полный список транзакций с пагинацией |
| Быстрое добавление с дашборда (общая форма) | TXN-05 | Нет тест-раннера | Открыть Dialog с `/dashboard` — та же форма, что и на `/expenses` |
| Фильтрация по периоду/типу/категории | TXN-06 | Нет тест-раннера | Применить фильтры на `/expenses` — список сужается корректно |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies — N/A, manual-only по обоснованному исключению
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify — N/A, автопроверок в проекте нет
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < N/A
- [ ] `nyquist_compliant: true` — deferred, если проект добавит тест-раннер позже

**Approval:** pending
