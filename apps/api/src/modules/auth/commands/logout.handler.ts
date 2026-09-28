import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { UnauthorizedException } from '@nestjs/common';
import { TokensService } from '../tokens.service.js';
import { LogoutCommand } from './logout.command.js';

/**
 * Обрабатывает {@link LogoutCommand}: проверяет, что refresh-токен принадлежит
 * вызывающему пользователю, и отзывает его.
 */
@CommandHandler(LogoutCommand)
export class LogoutHandler implements ICommandHandler<LogoutCommand> {
  constructor(private readonly tokens: TokensService) {}

  /** @throws UnauthorizedException если токен недействителен или принадлежит другому пользователю */
  async execute(command: LogoutCommand): Promise<void> {
    const { userId, recordId } = await this.tokens.verify(command.refreshToken);
    if (userId !== command.userId) {
      throw new UnauthorizedException('Недействительный refresh-токен');
    }
    await this.tokens.revokeById(recordId);
  }
}
