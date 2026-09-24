import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Test } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: {
    user: {
      create: jest.Mock<(...args: unknown[]) => Promise<unknown>>;
      findUnique: jest.Mock<(...args: unknown[]) => Promise<unknown>>;
    };
  };

  beforeEach(async () => {
    prisma = {
      user: {
        create: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
        findUnique: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(UsersService);
  });

  describe('create', () => {
    it('создаёт пользователя и возвращает публичную запись без passwordHash', async () => {
      const createdAt = new Date('2026-01-01T00:00:00.000Z');
      prisma.user.create.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Тест',
        passwordHash: 'hash',
        createdAt,
      });

      const result = await service.create('test@example.com', 'hash', 'Тест');

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: { email: 'test@example.com', passwordHash: 'hash', name: 'Тест' },
      });
      expect(result).toEqual({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Тест',
        createdAt,
      });
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('подставляет null, если имя не передано', async () => {
      prisma.user.create.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        name: null,
        passwordHash: 'hash',
        createdAt: new Date(),
      });

      await service.create('test@example.com', 'hash');

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: { email: 'test@example.com', passwordHash: 'hash', name: null },
      });
    });

    it('переводит нарушение unique-констрейнта email в ConflictException', async () => {
      prisma.user.create.mockRejectedValue({ code: 'P2002' });

      await expect(service.create('taken@example.com', 'hash')).rejects.toThrow(
        ConflictException,
      );
    });

    it('пробрасывает остальные ошибки как есть', async () => {
      const unexpected = new Error('db down');
      prisma.user.create.mockRejectedValue(unexpected);

      await expect(service.create('test@example.com', 'hash')).rejects.toThrow(unexpected);
    });
  });

  describe('findByEmail', () => {
    it('возвращает пользователя вместе с passwordHash', async () => {
      const createdAt = new Date();
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        name: null,
        passwordHash: 'hash',
        createdAt,
      });

      const result = await service.findByEmail('test@example.com');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(result).toEqual({
        id: 'user-1',
        email: 'test@example.com',
        name: null,
        createdAt,
        passwordHash: 'hash',
      });
    });

    it('возвращает null, если пользователь не найден', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await service.findByEmail('missing@example.com');

      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('возвращает публичную запись без passwordHash', async () => {
      const createdAt = new Date();
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Тест',
        passwordHash: 'hash',
        createdAt,
      });

      const result = await service.findById('user-1');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 'user-1' } });
      expect(result).toEqual({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Тест',
        createdAt,
      });
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('возвращает null, если пользователь не найден', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await service.findById('missing-id');

      expect(result).toBeNull();
    });
  });
});
