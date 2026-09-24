import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Test } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { TransactionsService } from './transactions.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import { TransactionType } from '../../generated/prisma/enums.js';
import type { CreateTransactionDto } from './dto/create-transaction.dto.js';
import type { UpdateTransactionDto } from './dto/update-transaction.dto.js';
import type { TransactionQueryDto } from './dto/transaction-query.dto.js';

type AsyncFn = (...args: unknown[]) => Promise<unknown>;

const USER_ID = 'user-1';

function makeRecord(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'tx-1',
    amount: new Prisma.Decimal('100.50'),
    type: TransactionType.EXPENSE,
    description: 'Обед',
    date: new Date('2026-09-10T00:00:00.000Z'),
    categoryId: 'cat-1',
    createdAt: new Date('2026-09-10T00:00:00.000Z'),
    ...overrides,
  };
}

describe('TransactionsService', () => {
  let service: TransactionsService;
  let prisma: {
    transaction: {
      findMany: jest.Mock<AsyncFn>;
      count: jest.Mock<AsyncFn>;
      findFirst: jest.Mock<AsyncFn>;
      create: jest.Mock<AsyncFn>;
      update: jest.Mock<AsyncFn>;
      delete: jest.Mock<AsyncFn>;
      groupBy: jest.Mock<AsyncFn>;
    };
    category: {
      findFirst: jest.Mock<AsyncFn>;
      findMany: jest.Mock<AsyncFn>;
    };
  };

  beforeEach(async () => {
    prisma = {
      transaction: {
        findMany: jest.fn<AsyncFn>(),
        count: jest.fn<AsyncFn>(),
        findFirst: jest.fn<AsyncFn>(),
        create: jest.fn<AsyncFn>(),
        update: jest.fn<AsyncFn>(),
        delete: jest.fn<AsyncFn>(),
        groupBy: jest.fn<AsyncFn>(),
      },
      category: {
        findFirst: jest.fn<AsyncFn>(),
        findMany: jest.fn<AsyncFn>(),
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [TransactionsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(TransactionsService);
  });

  describe('findAll', () => {
    it('фильтрует по userId и отдаёт total по тем же фильтрам, что и страница', async () => {
      const query: TransactionQueryDto = { categoryId: 'cat-1', limit: 10, offset: 0 };
      prisma.transaction.findMany.mockResolvedValue([makeRecord()]);
      prisma.transaction.count.mockResolvedValue(1);

      const result = await service.findAll(USER_ID, query);

      expect(prisma.transaction.findMany).toHaveBeenCalledWith({
        where: { userId: USER_ID, categoryId: 'cat-1' },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        take: 10,
        skip: 0,
      });
      expect(prisma.transaction.count).toHaveBeenCalledWith({
        where: { userId: USER_ID, categoryId: 'cat-1' },
      });
      expect(result.total).toBe(1);
      expect(result.items[0]).toEqual({
        id: 'tx-1',
        amount: '100.50',
        type: TransactionType.EXPENSE,
        description: 'Обед',
        date: '2026-09-10T00:00:00.000Z',
        categoryId: 'cat-1',
        createdAt: '2026-09-10T00:00:00.000Z',
      });
    });

    it('подставляет дефолтные limit/offset, если не переданы', async () => {
      prisma.transaction.findMany.mockResolvedValue([]);
      prisma.transaction.count.mockResolvedValue(0);

      await service.findAll(USER_ID, {});

      expect(prisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 20, skip: 0 }),
      );
    });

    it('dateTo без времени трактует включительно (захватывает весь день)', async () => {
      prisma.transaction.findMany.mockResolvedValue([]);
      prisma.transaction.count.mockResolvedValue(0);

      await service.findAll(USER_ID, { dateTo: '2026-09-30' });

      const where = (prisma.transaction.findMany.mock.calls[0]![0] as { where: { date: { lt: Date } } })
        .where;
      expect(where.date.lt.toISOString()).toBe('2026-10-01T00:00:00.000Z');
    });
  });

  describe('findOne', () => {
    it('возвращает транзакцию, если она принадлежит пользователю', async () => {
      prisma.transaction.findFirst.mockResolvedValue(makeRecord());

      const result = await service.findOne(USER_ID, 'tx-1');

      expect(prisma.transaction.findFirst).toHaveBeenCalledWith({
        where: { id: 'tx-1', userId: USER_ID },
      });
      expect(result.id).toBe('tx-1');
    });

    it('бросает NotFoundException, если транзакция не найдена или чужая', async () => {
      prisma.transaction.findFirst.mockResolvedValue(null);

      await expect(service.findOne(USER_ID, 'missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    const dto: CreateTransactionDto = {
      amount: '100.50',
      type: TransactionType.EXPENSE,
      categoryId: 'cat-1',
      date: '2026-09-10T00:00:00.000Z',
      description: 'Обед',
    };

    it('проверяет принадлежность категории пользователю перед созданием', async () => {
      prisma.category.findFirst.mockResolvedValue({ id: 'cat-1' });
      prisma.transaction.create.mockResolvedValue(makeRecord());

      await service.create(USER_ID, dto);

      expect(prisma.category.findFirst).toHaveBeenCalledWith({
        where: { id: 'cat-1', userId: USER_ID },
        select: { id: true },
      });
      expect(prisma.transaction.create).toHaveBeenCalledWith({
        data: {
          userId: USER_ID,
          categoryId: 'cat-1',
          amount: '100.50',
          type: TransactionType.EXPENSE,
          date: new Date('2026-09-10T00:00:00.000Z'),
          description: 'Обед',
        },
      });
    });

    it('бросает NotFoundException, если категория чужая или не существует', async () => {
      prisma.category.findFirst.mockResolvedValue(null);

      await expect(service.create(USER_ID, dto)).rejects.toThrow(NotFoundException);
      expect(prisma.transaction.create).not.toHaveBeenCalled();
    });

    it('переводит гонку по внешнему ключу (P2003) в ConflictException', async () => {
      prisma.category.findFirst.mockResolvedValue({ id: 'cat-1' });
      prisma.transaction.create.mockRejectedValue({ code: 'P2003' });

      await expect(service.create(USER_ID, dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    const dto: UpdateTransactionDto = { amount: '200.00' };

    it('обновляет транзакцию текущего пользователя', async () => {
      prisma.transaction.update.mockResolvedValue(makeRecord({ amount: new Prisma.Decimal('200.00') }));

      const result = await service.update(USER_ID, 'tx-1', dto);

      expect(prisma.transaction.update).toHaveBeenCalledWith({
        where: { id: 'tx-1', userId: USER_ID },
        data: {
          amount: '200.00',
          type: undefined,
          categoryId: undefined,
          date: undefined,
          description: undefined,
        },
      });
      expect(result.amount).toBe('200.00');
    });

    it('перепроверяет категорию, если categoryId передан', async () => {
      prisma.category.findFirst.mockResolvedValue({ id: 'cat-2' });
      prisma.transaction.update.mockResolvedValue(makeRecord({ categoryId: 'cat-2' }));

      await service.update(USER_ID, 'tx-1', { categoryId: 'cat-2' });

      expect(prisma.category.findFirst).toHaveBeenCalledWith({
        where: { id: 'cat-2', userId: USER_ID },
        select: { id: true },
      });
    });

    it('бросает NotFoundException, если новая категория чужая', async () => {
      prisma.category.findFirst.mockResolvedValue(null);

      await expect(service.update(USER_ID, 'tx-1', { categoryId: 'cat-x' })).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.transaction.update).not.toHaveBeenCalled();
    });

    it('переводит P2025 (не нашли запись по id+userId) в NotFoundException', async () => {
      prisma.transaction.update.mockRejectedValue({ code: 'P2025' });

      await expect(service.update(USER_ID, 'missing', dto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('удаляет транзакцию текущего пользователя', async () => {
      prisma.transaction.delete.mockResolvedValue(makeRecord());

      await service.remove(USER_ID, 'tx-1');

      expect(prisma.transaction.delete).toHaveBeenCalledWith({
        where: { id: 'tx-1', userId: USER_ID },
      });
    });

    it('переводит P2025 в NotFoundException (чужая или несуществующая транзакция)', async () => {
      prisma.transaction.delete.mockRejectedValue({ code: 'P2025' });

      await expect(service.remove(USER_ID, 'missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('summary', () => {
    it('считает income/expense/balance и разбивку по категориям за месяц', async () => {
      prisma.transaction.groupBy
        .mockResolvedValueOnce([
          { type: TransactionType.INCOME, _sum: { amount: new Prisma.Decimal('1000') } },
          { type: TransactionType.EXPENSE, _sum: { amount: new Prisma.Decimal('300') } },
        ])
        .mockResolvedValueOnce([
          {
            categoryId: 'cat-1',
            type: TransactionType.EXPENSE,
            _sum: { amount: new Prisma.Decimal('300') },
          },
        ]);
      prisma.category.findMany.mockResolvedValue([
        { id: 'cat-1', name: 'Еда', color: '#ff0000' },
      ]);

      const result = await service.summary(USER_ID, 9, 2026);

      expect(result.income).toBe('1000.00');
      expect(result.expense).toBe('300.00');
      expect(result.balance).toBe('700.00');
      expect(result.from).toBe('2026-09-01T00:00:00.000Z');
      expect(result.to).toBe('2026-10-01T00:00:00.000Z');
      expect(result.byCategory).toEqual([
        { categoryId: 'cat-1', name: 'Еда', color: '#ff0000', type: TransactionType.EXPENSE, total: '300.00' },
      ]);
    });

    it('возвращает нули без обращения к category.findMany, если транзакций за месяц нет', async () => {
      prisma.transaction.groupBy.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

      const result = await service.summary(USER_ID, 1, 2026);

      expect(result.income).toBe('0.00');
      expect(result.expense).toBe('0.00');
      expect(result.balance).toBe('0.00');
      expect(result.byCategory).toEqual([]);
      expect(prisma.category.findMany).not.toHaveBeenCalled();
    });

    it('декабрь перекатывает границу to на январь следующего года', async () => {
      prisma.transaction.groupBy.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

      const result = await service.summary(USER_ID, 12, 2026);

      expect(result.to).toBe('2027-01-01T00:00:00.000Z');
    });
  });
});
