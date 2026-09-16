const formatter = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  // Prisma пишет даты в UTC (см. CLAUDE.md). Без фиксированной зоны дата зависела бы
  // от TZ процесса рендера — локально MSK, в контейнере UTC — и не совпадала бы с БД.
  timeZone: 'UTC',
});

/** Форматирует ISO-дату транзакции без учёта часового пояса машины. */
export function formatDate(iso: string): string {
  return formatter.format(new Date(iso));
}
