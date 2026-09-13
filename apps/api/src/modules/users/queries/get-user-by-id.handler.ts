import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { GetUserByIdQuery } from '../../../contracts/users/get-user-by-id.query.js';
import type { UserRecord } from '../../../contracts/users/create-user.command.js';
import { UsersService } from '../users.service.js';

@QueryHandler(GetUserByIdQuery)
export class GetUserByIdHandler implements IQueryHandler<GetUserByIdQuery> {
  constructor(private readonly users: UsersService) {}

  execute(query: GetUserByIdQuery): Promise<UserRecord | null> {
    return this.users.findById(query.id);
  }
}
