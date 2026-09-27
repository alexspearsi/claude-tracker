#!/bin/bash
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | node -e 'let d="";process.stdin.on("data",c=>d+=c);process.stdin.on("end",()=>{try{const j=JSON.parse(d);process.stdout.write((j.tool_input&&j.tool_input.file_path)||"");}catch(e){}})')

# Список защищённых паттернов
PROTECTED_PATTERNS=(".env" ".env.local" "prisma/migrations" "package-lock.json")

for PATTERN in "${PROTECTED_PATTERNS[@]}"; do
  if [[ "$FILE_PATH" == *"$PATTERN"* ]]; then
    echo "Заблокировано: $FILE_PATH является защищённым файлом." >&2
    echo "Добавьте изменения вручную в терминале." >&2
    exit 2
  fi
done

exit 0
