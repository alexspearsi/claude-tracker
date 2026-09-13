import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import type { AuthTokens } from '@expense/shared';
import { TokensService } from '../tokens.service.js';
import { RefreshTokensCommand } from './refresh-tokens.command.js';

@CommandHandler(RefreshTokensCommand)
export class RefreshTokensHandler implements ICommandHandler<RefreshTokensCommand> {
  constructor(private readonly tokens: TokensService) {}

  async execute(command: RefreshTokensCommand): Promise<AuthTokens> {
    const { userId, email, recordId } = await this.tokens.verify(command.refreshToken);
    // Ротация: старый токен отзывается, выдаётся новая пара.
    await this.tokens.revokeById(recordId);
    return this.tokens.issue(userId, email);
  }
}
