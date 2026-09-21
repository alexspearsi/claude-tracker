---
schema_version: 1
open_count: 0
waived_count: 0
fixed_count: 1
total_count: 1
last_updated: 2026-09-21T15:52:20.334Z
---

# Broken Windows Ledger

> Cross-phase defect register. With `workflow.windows_enforce` enabled, `/gsd-ship` blocks while `open_count > 0`.
> Waive with `gsd-tools windows waive <id> "<reason>"` (reason required).
> Mark fixed with `gsd-tools windows fixed <id>`.

| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |
|----|-------|------|------|------|-------------|--------|--------|-------------|-------------|
| 1 | 02 | unrun-verify | apps/web/src/widgets/expenses-list/ui/transaction-filters.tsx |  | Задача 1/2 плана 02-04: human-check панели фильтров (видимость, тип/период/категория сужают выдачу, копия URL воспроизводит ту же выдачу) не пройден вживую в браузере — нет инструмента браузерной автоматизации в этой worktree-сессии; логика подтверждена прямыми curl к GET /transactions с теми же query-параметрами. | fixed |  | 2026-09-21T15:41:07.870Z | 2026-09-21T15:52:20.334Z |

````json
[
  {
    "id": 1,
    "kind": "unrun-verify",
    "phase": "02",
    "file": "apps/web/src/widgets/expenses-list/ui/transaction-filters.tsx",
    "line": null,
    "description": "Задача 1/2 плана 02-04: human-check панели фильтров (видимость, тип/период/категория сужают выдачу, копия URL воспроизводит ту же выдачу) не пройден вживую в браузере — нет инструмента браузерной автоматизации в этой worktree-сессии; логика подтверждена прямыми curl к GET /transactions с теми же query-параметрами.",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-09-21T15:41:07.870Z",
    "resolved_at": "2026-09-21T15:52:20.334Z",
    "milestone": null
  }
]
````
