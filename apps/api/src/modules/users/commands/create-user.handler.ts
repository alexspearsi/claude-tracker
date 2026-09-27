import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import {
  CreateUserCommand,
  type UserRecord,
} from '../../../contracts/users/create-user.command.js';
import { UsersService } from '../users.service.js';

/** Обрабатывает {@link CreateUserCommand}, делегируя в {@link UsersService.create}. */
@CommandHandler(CreateUserCommand)
export class CreateUserHandler implements ICommandHandler<CreateUserCommand> {
  constructor(private readonly users: UsersService) {}

  /** @throws ConflictException если email уже занят */
  execute(command: CreateUserCommand): Promise<UserRecord> {
    return this.users.create(command.email, command.passwordHash, command.name);
  }
}
