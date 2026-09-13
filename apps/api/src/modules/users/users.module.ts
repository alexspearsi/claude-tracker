import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CreateUserHandler } from './commands/create-user.handler.js';
import { GetUserByEmailHandler } from './queries/get-user-by-email.handler.js';
import { GetUserByIdHandler } from './queries/get-user-by-id.handler.js';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';

@Module({
  imports: [CqrsModule],
  controllers: [UsersController],
  providers: [UsersService, CreateUserHandler, GetUserByEmailHandler, GetUserByIdHandler],
  exports: [],
})
export class UsersModule {}
