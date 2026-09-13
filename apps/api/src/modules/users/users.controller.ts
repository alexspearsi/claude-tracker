import { Controller, Get, NotFoundException } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import type { UserProfile } from '@expense/shared';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator.js';
import { GetUserByIdQuery } from '../../contracts/users/get-user-by-id.query.js';
import type { UserRecord } from '../../contracts/users/create-user.command.js';

@Controller('users')
export class UsersController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('me')
  async me(@CurrentUser() user: AuthUser): Promise<UserProfile> {
    const record = await this.queryBus.execute<GetUserByIdQuery, UserRecord | null>(
      new GetUserByIdQuery(user.id),
    );
    if (!record) {
      throw new NotFoundException('Пользователь не найден');
    }
    return {
      id: record.id,
      email: record.email,
      name: record.name,
      createdAt: record.createdAt.toISOString(),
    };
  }
}
