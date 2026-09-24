#!/bin/bash
CURRENT=$(git branch --show-current)
if [ "$CURRENT" = "main" ] || [ "$CURRENT" = "develop" ]; then
  echo "Нельзя создавать PR из ветки $CURRENT. Создай feature-ветку."
  exit 2
fi
COMMITS=$(git log main..HEAD --oneline | wc -l)
if [ "$COMMITS" -eq 0 ]; then
  echo "Нет коммитов относительно main."
  exit 2
fi
echo "Ветка готова: $COMMITS коммит(ов)"
exit 0