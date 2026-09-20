import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { TransactionType } from '../../generated/prisma/enums.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { isPrismaError, PrismaErrorCode } from '../../prisma/prisma-errors.js';
import type { CreateTransactionDto } from './dto/create-transaction.dto.js';
import { LIMIT_DEFAULT } from './dto/transaction-validation.js';
import type { TransactionQueryDto } from './dto/transaction-query.dto.js';
import type { UpdateTransactionDto } from './dto/update-transaction.dto.js';
import type {
  SummaryCategoryItem,
  TransactionDto,
  TransactionListDto,
  TransactionSummary,
} from './transaction.types.js';

interface TransactionRecord {
  id: string;
  amount: Prisma.Decimal;
  type: TransactionType;
  description: string | null;
  date: Date;
  categoryId: string;
  createdAt: Date;
}

const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  // Все методы фильтруют по userId: транзакции одного пользователя не видны другому.
  async findAll(userId: string, query: TransactionQueryDto): Promise<TransactionListDto> {
    const where = {
      userId,
      ...(query.type ? { type: query.type } : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...buildDateFilter(query.dateFrom, query.dateTo),
    };

    // where переиспользуется в обоих запросах: total должен считаться по тем же
    // фильтрам, что и сама страница, иначе при активном фильтре число будет неверным.
    const [records, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        // вторичный ключ сортировки: без него skip/take даёт дубли и пропуски между
        // страницами, если у нескольких транзакций одна и та же date
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        take: query.limit ?? LIMIT_DEFAULT,
        skip: query.offset ?? 0,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return { items: records.map(toTransaction), total };
  }

  async findOne(userId: string, id: string): Promise<TransactionDto> {
    const record = await this.prisma.transaction.findFirst({ where: { id, userId } });
    if (!record) {
      throw new NotFoundException('Транзакция не найдена');
    }
    return toTransaction(record);
  }

  async create(userId: string, dto: CreateTransactionDto): Promise<TransactionDto> {
    await this.assertCategoryBelongsToUser(userId, dto.categoryId);

    try {
      const record = await this.prisma.transaction.create({
        data: {
          userId,
          categoryId: dto.categoryId,
          amount: dto.amount, // строка → Decimal напрямую, без float
          type: dto.type,
          date: new Date(dto.date),
          description: dto.description ?? null,
        },
      });
      return toTransaction(record);
    } catch (error) {
      throw toHttpError(error);
    }
  }

  async update(userId: string, id: string, dto: UpdateTransactionDto): Promise<TransactionDto> {
    if (dto.categoryId !== undefined) {
      await this.assertCategoryBelongsToUser(userId, dto.categoryId);
    }

    try {
      const record = await this.prisma.transaction.update({
        where: { id, userId },
        data: {
          amount: dto.amount,
          type: dto.type,
          categoryId: dto.categoryId,
          date: dto.date === undefined ? undefined : new Date(dto.date),
          description: dto.description,
        },
      });
      return toTransaction(record);
    } catch (error) {
      throw toHttpError(error);
    }
  }

  async remove(userId: string, id: string): Promise<void> {
    try {
      await this.prisma.transaction.delete({ where: { id, userId } });
    } catch (error) {
      throw toHttpError(error);
    }
  }

  async summary(userId: string, month: number, year: number): Promise<TransactionSummary> {
    // Колонки — TIMESTAMP(3) без таймзоны, Prisma пишет UTC. Локальный new Date(year, month-1, 1)
    // сместил бы границу на offset машины и утащил чужие дни в соседний месяц.
    const from = new Date(Date.UTC(year, month - 1, 1));
    const to = new Date(Date.UTC(year, month, 1)); // month=12 сам перекатывается на январь
    const where = { userId, date: { gte: from, lt: to } };

    const [byType, byCategoryRaw] = await Promise.all([
      this.prisma.transaction.groupBy({ by: ['type'], where, _sum: { amount: true } }),
      this.prisma.transaction.groupBy({
        by: ['categoryId', 'type'],
        where,
        _sum: { amount: true },
      }),
    ]);

    const zero = new Prisma.Decimal(0);
    const income = byType.find((r) => r.type === TransactionType.INCOME)?._sum.amount ?? zero;
    const expense = byType.find((r) => r.type === TransactionType.EXPENSE)?._sum.amount ?? zero;
    const balance = income.minus(expense);

    const categoryIds = [...new Set(byCategoryRaw.map((r) => r.categoryId))];
    const categories = categoryIds.length
      ? await this.prisma.category.findMany({
          where: { id: { in: categoryIds }, userId },
          select: { id: true, name: true, color: true },
        })
      : [];
    const categoryById = new Map(categories.map((c) => [c.id, c]));

    const byCategory: SummaryCategoryItem[] = byCategoryRaw
      .map((row) => {
        const category = categoryById.get(row.categoryId);
        return {
          categoryId: row.categoryId,
          name: category?.name ?? '',
          color: category?.color ?? '',
          type: row.type,
          total: (row._sum.amount ?? zero).toFixed(2),
        };
      })
      .sort((a, b) => Number(b.total) - Number(a.total));

    return {
      month,
      year,
      from: from.toISOString(),
      to: to.toISOString(),
      income: income.toFixed(2),
      expense: expense.toFixed(2),
      balance: balance.toFixed(2),
      byCategory,
    };
  }

  /**
   * Категория ищется вместе с userId: чужая категория неотличима от несуществующей,
   * иначе транзакцию можно было бы привязать к категории другого пользователя.
   */
  private async assertCategoryBelongsToUser(userId: string, categoryId: string): Promise<void> {
    const category = await this.prisma.category.findFirst({
      where: { id: categoryId, userId },
      select: { id: true },
    });
    if (!category) {
      throw new NotFoundException('Категория не найдена');
    }
  }
}

/**
 * dateTo трактуется включительно: если прислали дату без времени (2026-09-30),
 * lte по полуночи отрезал бы весь последний день, поэтому берём lt следующих суток.
 */
function buildDateFilter(dateFrom?: string, dateTo?: string): { date?: { gte?: Date; lt?: Date } } {
  if (!dateFrom && !dateTo) {
    return {};
  }
  const date: { gte?: Date; lt?: Date } = {};
  if (dateFrom) {
    date.gte = new Date(dateFrom);
  }
  if (dateTo) {
    const to = new Date(dateTo);
    date.lt = dateTo.includes('T') ? new Date(to.getTime() + 1) : new Date(to.getTime() + DAY_MS);
  }
  return { date };
}

function toTransaction(record: TransactionRecord): TransactionDto {
  return {
    id: record.id,
    amount: record.amount.toFixed(2), // точная строка, Number между БД и JSON не появляется
    type: record.type,
    description: record.description,
    date: record.date.toISOString(),
    categoryId: record.categoryId,
    createdAt: record.createdAt.toISOString(),
  };
}

function toHttpError(error: unknown): unknown {
  // where { id, userId }: чужая транзакция неотличима от несуществующей
  if (isPrismaError(error, PrismaErrorCode.RecordNotFound)) {
    return new NotFoundException('Транзакция не найдена');
  }
  // гонка: категорию удалили между проверкой и вставкой
  if (isPrismaError(error, PrismaErrorCode.ForeignKeyViolation)) {
    return new ConflictException('Категория недоступна');
  }
  return error;
}
