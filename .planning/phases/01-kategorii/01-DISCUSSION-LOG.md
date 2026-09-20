# Phase 1: Категории - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-20
**Phase:** 1-Категории
**Areas discussed:** UI-паттерн формы, Цвет категории, Список категорий, Удаление, Пустое состояние

---

[auto] Режим `--auto` — все области выбраны автоматически, для каждого вопроса выбран рекомендованный вариант без интерактивных запросов.

## UI-паттерн формы

| Option | Description | Selected |
|--------|-------------|----------|
| Dialog (модалка) | Создание/редактирование через shadcn `Dialog`, одна форма на create+edit | ✓ |
| Отдельная страница | `/categories/new`, `/categories/[id]/edit` | |
| Inline в списке | Разворачиваемая строка списка | |

**User's choice:** [auto] Dialog (рекомендованный вариант — согласуется с research/ARCHITECTURE.md)
**Notes:** Одна общая форма `CategoryForm` для create и edit.

---

## Цвет категории

| Option | Description | Selected |
|--------|-------------|----------|
| Preset-палитра (8–12 свотчей) | Фиксированный набор цветов-кнопок | ✓ |
| Полный color picker (HSB/RGB) | — | |

**User's choice:** [auto] Preset-палитра — уже зафиксировано в PROJECT.md как решение (Out of Scope: full color picker)
**Notes:** —

---

## Список категорий

| Option | Description | Selected |
|--------|-------------|----------|
| Простой список/таблица | Имя + `CategoryDot` + действия | ✓ |
| Карточки/сетка | — | |

**User's choice:** [auto] Простой список — консистентно с остальным приложением (таблицы для транзакций тоже простые)
**Notes:** —

---

## Удаление

| Option | Description | Selected |
|--------|-------------|----------|
| AlertDialog подтверждение + маппинг 409 в понятное сообщение | ✓ | ✓ |
| Прямое удаление без подтверждения | | |

**User's choice:** [auto] AlertDialog + явная обработка 409
**Notes:** Сообщение о блокировке — прямо в диалоге/тосте, не сырая ошибка API.

---

## Пустое состояние

| Option | Description | Selected |
|--------|-------------|----------|
| Простое сообщение + кнопка "Создать категорию" | ✓ | ✓ |
| Иллюстрация/онбординг | | |

**User's choice:** [auto] Простое сообщение
**Notes:** —

---

## Claude's Discretion

- Точный набор из 8–12 цветов палитры
- Расположение кнопки "Добавить категорию" на странице

## Deferred Ideas

None — discussion stayed within phase scope.
