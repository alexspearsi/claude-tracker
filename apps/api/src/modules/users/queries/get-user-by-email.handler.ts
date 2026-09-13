import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import {
  GetUserByEmailQuery,
  type UserCredentials,
} from '../../../contracts/users/get-user-by-email.query.js';
import { UsersService } from '../users.service.js';

@QueryHandler(GetUserByEmailQuery)
export class GetUserByEmailHandler implements IQueryHandler<GetUserByEmailQuery> {
  constructor(private readonly users: UsersService) {}

  execute(query: GetUserByEmailQuery): Promise<UserCredentials | null> {
    return this.users.findByEmail(query.email);
  }
}
