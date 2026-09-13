/** Коды ошибок Prisma, которые сервисы переводят в HTTP-исключения. */
export const PrismaErrorCode = {
  /** Нарушение unique-констрейнта. */
  UniqueViolation: 'P2002',
  /** update/delete не нашли запись по условию where. */
  RecordNotFound: 'P2025',
  /** Нарушение внешнего ключа: например, у категории остались транзакции (onDelete: Restrict). */
  ForeignKeyViolation: 'P2003',
} as const;

export type PrismaErrorCode = (typeof PrismaErrorCode)[keyof typeof PrismaErrorCode];

export function isPrismaError(error: unknown, code: PrismaErrorCode): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: unknown }).code === code
  );
}
