import { CommandHandler, type ICommandHandler, QueryBus } from '@nestjs/cqrs';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import type { AuthTokens } from '@expense/shared';
import {
  GetUserByEmailQuery,
  type UserCredentials,
} from '../../../contracts/users/get-user-by-email.query.js';
import { TokensService } from '../tokens.service.js';
import { LoginCommand } from './login.command.js';

const INVALID_CREDENTIALS = 'Неверный email или пароль';

@CommandHandler(LoginCommand)
export class LoginHandler implements ICommandHandler<LoginCommand> {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly tokens: TokensService,
  ) {}

  async execute(command: LoginCommand): Promise<AuthTokens> {
    const user = await this.queryBus.execute<GetUserByEmailQuery, UserCredentials | null>(
      new GetUserByEmailQuery(command.email),
    );
    if (!user || !(await bcrypt.compare(command.password, user.passwordHash))) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }
    return this.tokens.issue(user.id, user.email);
  }
}
