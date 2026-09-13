import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CategoriesController } from './categories.controller.js';
import { CategoriesService } from './categories.service.js';

// UsersModule не импортируется: пользователя проверяем через QueryBus и контракт GetUserByIdQuery
@Module({
  imports: [CqrsModule],
  controllers: [CategoriesController],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
