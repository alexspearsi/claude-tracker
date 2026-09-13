import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { CreateUserCommand, type UserRecord } from '../../../contracts/users/create-user.command.js';
import { UsersService } from '../users.service.js';

@CommandHandler(CreateUserCommand)
export class CreateUserHandler implements ICommandHandler<CreateUserCommand> {
  constructor(private readonly users: UsersService) {}

  execute(command: CreateUserCommand): Promise<UserRecord> {
    return this.users.create(command.email, command.passwordHash, command.name);
  }
}
