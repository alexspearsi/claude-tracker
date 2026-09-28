import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import type { Category } from '@expense/shared';
import { GetUserByIdQuery } from '../../contracts/users/get-user-by-id.query.js';
import type { UserRecord } from '../../contracts/users/create-user.command.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { isPrismaError, PrismaErrorCode } from '../../prisma/prisma-errors.js';
import type { CreateCategoryDto } from './dto/create-category.dto.js';
import type { UpdateCategoryDto } from './dto/update-category.dto.js';

/** Форма строки `Category` в Prisma — до сериализации `createdAt` в ISO-строку. */
interface CategoryRecord {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  createdAt: Date;
}

/**
 * CRUD категорий с изоляцией по пользователю: все методы фильтруют по `userId`, поэтому
 * категория одного пользователя не видна и не доступна для изменения другому.
 */
@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queryBus: QueryBus,
  ) {}

  /** Возвращает все категории пользователя, отсортированные по имени. */
  async findAll(userId: string): Promise<Category[]> {
    const records = await this.prisma.category.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    });
    return records.map(toCategory);
  }

  /**
   * Создаёт категорию, предварительно убедившись через `UsersModule` (по шине CQRS), что
   * пользователь из access-токена ещё существует — токен мог пережить удаление аккаунта.
   * @throws NotFoundException если пользователь уже удалён
   * @throws ConflictException если у пользователя уже есть категория с таким названием
   */
  async create(userId: string, dto: CreateCategoryDto): Promise<Category> {
    // Токен мог пережить удаление пользователя — сверяемся с модулем users через шину
    const user = await this.queryBus.execute<GetUserByIdQuery, UserRecord | null>(
      new GetUserByIdQuery(userId),
    );
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    try {
      const record = await this.prisma.category.create({
        data: { userId, name: dto.name, color: dto.color, icon: dto.icon },
      });
      return toCategory(record);
    } catch (error) {
      throw toHttpError(error);
    }
  }

  /**
   * Обновляет категорию пользователя.
   * @throws NotFoundException если категории с таким id нет у этого пользователя
   * @throws ConflictException при конфликте уникального названия
   */
  async update(userId: string, id: string, dto: UpdateCategoryDto): Promise<Category> {
    try {
      const record = await this.prisma.category.update({
        where: { id, userId },
        data: { name: dto.name, color: dto.color, icon: dto.icon },
      });
      return toCategory(record);
    } catch (error) {
      throw toHttpError(error);
    }
  }

  /**
   * Удаляет категорию пользователя.
   * @throws NotFoundException если категории с таким id нет у этого пользователя
   * @throws ConflictException если по категории есть транзакции (`onDelete: Restrict`)
   */
  async remove(userId: string, id: string): Promise<void> {
    try {
      await this.prisma.category.delete({ where: { id, userId } });
    } catch (error) {
      throw toHttpError(error);
    }
  }
}

/** Приводит запись Prisma к контракту `Category` — сериализует `createdAt` в ISO-строку. */
function toCategory(record: CategoryRecord): Category {
  return {
    id: record.id,
    name: record.name,
    color: record.color,
    icon: record.icon,
    createdAt: record.createdAt.toISOString(),
  };
}

/** Переводит известные ошибки Prisma (unique/not found/FK) в HTTP-исключения Nest. */
function toHttpError(error: unknown): unknown {
  if (isPrismaError(error, PrismaErrorCode.UniqueViolation)) {
    return new ConflictException('Категория с таким названием уже есть');
  }
  // where { id, userId }: чужая категория неотличима от несуществующей
  if (isPrismaError(error, PrismaErrorCode.RecordNotFound)) {
    return new NotFoundException('Категория не найдена');
  }
  // onDelete: Restrict на Transaction.category — обнулить categoryId нельзя, история не стирается
  if (isPrismaError(error, PrismaErrorCode.ForeignKeyViolation)) {
    return new ConflictException('Нельзя удалить категорию, пока по ней есть транзакции');
  }
  return error;
}
