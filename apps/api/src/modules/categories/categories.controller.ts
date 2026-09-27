import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import type { Category } from '@expense/shared';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator.js';
import { CategoriesService } from './categories.service.js';
// DTO импортируются значениями, не через `import type`: глобальный ValidationPipe берёт класс
// из метаданных параметра, а для type-only импорта там окажется Object и проверка молча пропустится.
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';

/**
 * HTTP CRUD категорий текущего пользователя.
 * Защита — глобальный JwtAuthGuard из AuthModule; локальный @UseGuards здесь уронит старт.
 */
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  /** Список категорий текущего пользователя, отсортированный по имени. */
  @Get()
  findAll(@CurrentUser() user: AuthUser): Promise<Category[]> {
    return this.categories.findAll(user.id);
  }

  /**
   * Создаёт категорию для текущего пользователя.
   * @throws NotFoundException если пользователь из токена уже удалён
   * @throws ConflictException при дубликате названия
   */
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateCategoryDto): Promise<Category> {
    return this.categories.create(user.id, dto);
  }

  /**
   * Обновляет категорию текущего пользователя.
   * @throws NotFoundException если категория не найдена или принадлежит другому пользователю
   * @throws ConflictException при дубликате названия
   */
  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ): Promise<Category> {
    return this.categories.update(user.id, id, dto);
  }

  /**
   * Удаляет категорию текущего пользователя.
   * @throws NotFoundException если категория не найдена или принадлежит другому пользователю
   * @throws ConflictException если по категории есть транзакции
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.categories.remove(user.id, id);
  }
}
