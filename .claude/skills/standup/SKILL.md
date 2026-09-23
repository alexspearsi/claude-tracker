---
name: standup
description: Сформировать отчёт о работе за вчерашний день по коммитам
userInvocable: true       # только ручной вызов, Claude не вызывает автоматически
allowedTools:
  - Bash(git *)
  - Bash(date)
model: claude-sonnet-4-5
---