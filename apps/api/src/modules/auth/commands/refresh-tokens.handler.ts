import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import type { AuthTokens } from '@expense/shared';
import { TokensService } from '../tokens.service.js';
import { RefreshTokensCommand } from './refresh-tokens.command.js';

/**
 * Обрабатывает {@link RefreshTokensCommand}: проверяет старый refresh-токен, отзывает его
 * и выдаёт новую пару access/refresh (ротация — параллельный обмен одним и тем же токеном
 * невозможен, второй запрос получит 401).
 */
@CommandHandler(RefreshTokensCommand)
export class RefreshTokensHandler implements ICommandHandler<RefreshTokensCommand> {
  constructor(private readonly tokens: TokensService) {}

  /** @throws UnauthorizedException если токен недействителен, отозван или просрочен */
  async execute(command: RefreshTokensCommand): Promise<AuthTokens> {
    const { userId, email, recordId } = await this.tokens.verify(command.refreshToken);
    // Ротация: старый токен отзывается, выдаётся новая пара.
    await this.tokens.revokeById(recordId);
    return this.tokens.issue(userId, email);
  }
}
