---
name: commit
description: Правила веток (GitHub Flow), коммитов (Conventional Commits) и PR для этого репозитория. Используй при создании веток, коммитов и Pull Request'ов.
model: sonnet
---

# Ветки — GitHub Flow

Работаем по GitHub Flow: `master` — всегда деплойный, изменения идут через короткоживущие
ветки и Pull Request.

- Новую работу начинай от актуального `master`: `git checkout master && git pull`, затем
  `git checkout -b <тип>/<короткое-название>`.
- Префикс ветки — `feature/`, `fix/`, `chore/`, `docs/` по смыслу изменений; название —
  коротко и на английском (`feature/dashboard`, а не `feature/glavnyj-ekran`).
- Коммитить и пушить в ветку можно часто, до готовности — открывать PR в `master` можно и
  до завершения работы (черновиком), чтобы был виден прогресс и CI.
- Слияние в `master` — через PR (`gh pr create`), не прямым пушем в `master`.
- После мержа ветку удаляй — GitHub делает это в UI, локально: `git branch -d <ветка>`.

**Перед `gh pr create` смотри `git diff master...HEAD`** (а не только последний коммит) —
описание PR должно перечислять реализованное и изменённые/добавленные endpoints по всей
ветке, а не только по свежему коммиту. Заголовок — по Conventional Commits (см. ниже).
Тело PR — коротким `## Summary` (что сделано, какие endpoints) и `## Test plan`.

# Соглашение о коммитах

Используй Conventional Commits:

- Тип: feat, fix, docs, refactor, test, ci
- Область (scope): модуль или область изменений
- Описание на английском, кратко
- Breaking changes помечай восклицательным знаком
