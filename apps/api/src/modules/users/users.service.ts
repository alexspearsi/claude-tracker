import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { isPrismaError, PrismaErrorCode } from '../../prisma/prisma-errors.js';
import type { UserCredentials } from '../../contracts/users/get-user-by-email.query.js';
import type { UserRecord } from '../../contracts/users/create-user.command.js';

/**
 * CRUD-доступ к пользователям поверх Prisma. Методы возвращают либо `UserRecord` (без
 * `passwordHash`), либо `UserCredentials` (с ним) — в зависимости от того, нужен ли
 * вызывающему хеш пароля для сверки при логине.
 */
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Создаёт пользователя с уже захешированным паролем.
   * @param passwordHash bcrypt-хеш, хеширование — забота вызывающего (`RegisterHandler`)
   * @throws ConflictException если email уже занят (нарушение unique-констрейнта)
   */
  async create(email: string, passwordHash: string, name?: string | null): Promise<UserRecord> {
    try {
      const user = await this.prisma.user.create({
        data: {
          email,
          passwordHash,
          name: name ?? null,
        },
      });
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
      };
    } catch (error) {
      if (isPrismaError(error, PrismaErrorCode.UniqueViolation)) {
        throw new ConflictException('Email уже занят');
      }
      throw error;
    }
  }

  /** Ищет пользователя по email вместе с `passwordHash` — для проверки пароля при логине. */
  async findByEmail(email: string): Promise<UserCredentials | null> {
    const user = await this.prisma.user.findUnique({
      where: {
        email,
      },
    });
    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
      passwordHash: user.passwordHash,
    };
  }

  /** Ищет пользователя по id без `passwordHash` — для профиля и JWT-стратегии. */
  async findById(id: string): Promise<UserRecord | null> {
    const user = await this.prisma.user.findUnique({
      where: {
        id,
      },
    });
    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
    };
  }
}
