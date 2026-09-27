import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CategoriesController } from './categories.controller.js';
import { CategoriesService } from './categories.service.js';

/**
 * Модуль категорий: CRUD с изоляцией по пользователю.
 * `UsersModule` не импортируется — существование пользователя проверяется через `QueryBus`
 * и контракт `GetUserByIdQuery`, а не прямой инъекцией `UsersService`.
 */
@Module({
  imports: [CqrsModule],
  controllers: [CategoriesController],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
