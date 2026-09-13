import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

/**
 * В Prisma 7 PrismaClient — не класс, а конструктор с интерфейсом, поэтому наследование
 * (привычное `extends PrismaClient`) типов не даёт. Клиент отдаётся провайдером по токену,
 * а подключение к БД идёт только через driver adapter.
 */
export const PRISMA = Symbol('PRISMA_CLIENT');

export type Prisma = PrismaClient;

export const prismaProvider = {
  provide: PRISMA,
  inject: [ConfigService],
  useFactory: (config: ConfigService): PrismaClient =>
    new PrismaClient({
      adapter: new PrismaPg({
        connectionString: config.getOrThrow<string>('DATABASE_URL'),
      }),
    }),
};
