# Phase 2: Транзакции - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-21
**Phase:** 2-Транзакции
**Areas discussed:** Тип транзакции, UI-паттерн формы, Фильтры, Визуализация суммы, Роут /expenses

---

## Тип транзакции

| Option | Description | Selected |
|--------|-------------|----------|
| Переключатель/табы | Сегментированный контрол вверху формы | ✓ |
| Выпадающий список (select) | Как в поле категории | |

**User's choice:** Переключатель/табы (рекомендуется)

---

## UI-паттерн формы

| Option | Description | Selected |
|--------|-------------|----------|
| Dialog на обоих экранах | Одинаковый UX на dashboard quick-add и /expenses | ✓ |
| Dialog на dashboard, инлайн-форма на /expenses | | |

**User's choice:** Dialog на обоих экранах (рекомендуется)

---

## Фильтры на /expenses

| Option | Description | Selected |
|--------|-------------|----------|
| Панель фильтров над таблицей | Период, тип, категория видны сразу | ✓ |
| Свёрнутый блок фильтров (по кнопке) | | |

**User's choice:** Панель фильтров над таблицей (рекомендуется)

---

## Визуализация суммы

| Option | Description | Selected |
|--------|-------------|----------|
| Цвет + знак (зелёный +, красный −) | Как на дашборде уже (TransactionAmount) | ✓ |
| Только цвет, без знака | | |

**User's choice:** Цвет + знак (рекомендуется) — переиспользовать существующий `TransactionAmount`

---

## Роут /expenses

Пользователь подтвердил: переименование `/expenses` вне скоупа этой фазы, остаётся техдолгом (см. `.claude/CLAUDE.md` «Известное расхождение имён»).

---

## Claude's Discretion

- Расположение кнопки быстрого добавления на дашборде
- Набор полей фильтра периода (dropdown vs date range picker)

## Deferred Ideas

- Переименование `/expenses` — техдолг, не в этой фазе
