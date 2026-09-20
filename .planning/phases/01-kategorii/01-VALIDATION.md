---
phase: "1"
slug: "kategorii"
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-09-20"
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None configured — тестов в проекте нет, раннер не настроен (`.claude/CLAUDE.md`) |
| **Config file** | none |
| **Quick run command** | none available |
| **Full suite command** | none available |
| **Estimated runtime** | N/A |

---

## Sampling Rate

- **After every task commit:** manual smoke test in `npm run dev:web` (нет автоматического quick-run)
- **After every plan wave:** полный ручной проход CAT-01..CAT-05 на реальной/seed-категории, с транзакциями и без
- **Before `/gsd-verify-work`:** ручной прогон всех критериев успеха фазы
- **Max feedback latency:** N/A — раннер отсутствует, обратная связь только через ручную проверку в dev-сервере

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-01-* | 01 | 1 | CAT-01..05 | V4/V5 | Категория создаётся/редактируется/удаляется только владельцем; сервер — источник правды | manual-only | — | ❌ нет фреймворка | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements.* Введение тестового фреймворка ради пяти UI-поведений — отдельное инфраструктурное решение, не входит в эту узкоскоуповую CRUD-фазу.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Создание категории (имя + цвет из палитры) | CAT-01 | Нет тест-раннера в проекте | Открыть `/categories`, нажать "Добавить категорию", заполнить имя и выбрать цвет-свотч, сохранить — категория появляется в списке |
| Редактирование категории | CAT-02 | Нет тест-раннера в проекте | В списке нажать "Редактировать" на существующей категории, изменить имя/цвет, сохранить — изменения отражены в списке |
| Удаление категории без транзакций | CAT-03 | Нет тест-раннера в проекте | Удалить категорию без связанных транзакций через AlertDialog — категория исчезает из списка |
| Блокировка удаления категории с транзакциями | CAT-04 | Нет тест-раннера в проекте | Попытаться удалить категорию, у которой есть транзакции — показывается понятное сообщение о блокировке (не сырая ошибка API), категория не удаляется |
| `/categories` как рабочий CRUD-список | CAT-05 | Нет тест-раннера в проекте | Открыть `/categories` — показывается реальный список категорий пользователя, а не заглушка "Категории" |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies — N/A, manual-only phase per justified exception
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify — N/A, no automated verify available project-wide
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < N/A
- [ ] `nyquist_compliant: true` set in frontmatter — deferred to `/gsd-validate-phase` if project adds a test runner later

**Approval:** pending
