import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { UnauthorizedException } from '@nestjs/common';
import { TokensService } from '../tokens.service.js';
import { LogoutCommand } from './logout.command.js';

@CommandHandler(LogoutCommand)
export class LogoutHandler implements ICommandHandler<LogoutCommand> {
  constructor(private readonly tokens: TokensService) {}

  async execute(command: LogoutCommand): Promise<void> {
    const { userId, recordId } = await this.tokens.verify(command.refreshToken);
    if (userId !== command.userId) {
      throw new UnauthorizedException('Недействительный refresh-токен');
    }
    await this.tokens.revokeById(recordId);
  }
}
