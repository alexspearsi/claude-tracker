import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { PRISMA, type Prisma } from '../../prisma/prisma.provider.js';
import { isPrismaError, PrismaErrorCode } from '../../prisma/prisma-errors.js';
import type { UserCredentials } from '../../contracts/users/get-user-by-email.query.js';
import type { UserRecord } from '../../contracts/users/create-user.command.js';

@Injectable()
export class UsersService {
  constructor(@Inject(PRISMA) private readonly prisma: Prisma) {}

  async create(email: string, passwordHash: string, name?: string | null): Promise<UserRecord> {
    try {
      const user = await this.prisma.user.create({
        data: { email, passwordHash, name: name ?? null },
      });
      return { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt };
    } catch (error) {
      if (isPrismaError(error, PrismaErrorCode.UniqueViolation)) {
        throw new ConflictException('Email уже занят');
      }
      throw error;
    }
  }

  async findByEmail(email: string): Promise<UserCredentials | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
      passwordHash: user.passwordHash,
    };
  }

  async findById(id: string): Promise<UserRecord | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) return null;
    return { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt };
  }
}
