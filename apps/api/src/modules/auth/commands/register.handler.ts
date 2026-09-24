import { CommandHandler, type ICommandHandler, CommandBus } from '@nestjs/cqrs';
import * as bcrypt from 'bcrypt';
import type { AuthTokens } from '@expense/shared';
import {
  CreateUserCommand,
  type UserRecord,
} from '../../../contracts/users/create-user.command.js';
import { TokensService } from '../tokens.service.js';
import { RegisterCommand } from './register.command.js';

const PASSWORD_HASH_ROUNDS = 10;

/**
 * Обрабатывает {@link RegisterCommand}: хеширует пароль, создаёт пользователя через
 * `users`-модуль (`CreateUserCommand`) и сразу выдаёт пару токенов.
 */
@CommandHandler(RegisterCommand)
export class RegisterHandler implements ICommandHandler<RegisterCommand> {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly tokens: TokensService,
  ) {}

  /** @throws ConflictException если email уже занят (см. `UsersService.create`) */
  async execute(command: RegisterCommand): Promise<AuthTokens> {
    const passwordHash = await bcrypt.hash(command.password, PASSWORD_HASH_ROUNDS);
    const user = await this.commandBus.execute<CreateUserCommand, UserRecord>(
      new CreateUserCommand(command.email, passwordHash, command.name),
    );
    return this.tokens.issue(user.id, user.email);
  }
}
