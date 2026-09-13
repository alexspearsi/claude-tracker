import { Body, Controller, Get, HttpCode, HttpStatus, NotFoundException, Post } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  loginSchema,
  refreshSchema,
  registerSchema,
  type AuthTokens,
  type LoginInput,
  type RefreshInput,
  type RegisterInput,
  type UserProfile,
} from '@expense/shared';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { GetUserByIdQuery } from '../../contracts/users/get-user-by-id.query.js';
import type { UserRecord } from '../../contracts/users/create-user.command.js';
import { LoginCommand } from './commands/login.command.js';
import { LogoutCommand } from './commands/logout.command.js';
import { RefreshTokensCommand } from './commands/refresh-tokens.command.js';
import { RegisterCommand } from './commands/register.command.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Public()
  @Post('register')
  register(@Body(new ZodValidationPipe(registerSchema)) dto: RegisterInput): Promise<AuthTokens> {
    return this.commandBus.execute(new RegisterCommand(dto.email, dto.password, dto.name));
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body(new ZodValidationPipe(loginSchema)) dto: LoginInput): Promise<AuthTokens> {
    return this.commandBus.execute(new LoginCommand(dto.email, dto.password));
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body(new ZodValidationPipe(refreshSchema)) dto: RefreshInput): Promise<AuthTokens> {
    return this.commandBus.execute(new RefreshTokensCommand(dto.refreshToken));
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(refreshSchema)) dto: RefreshInput,
  ): Promise<void> {
    return this.commandBus.execute(new LogoutCommand(user.id, dto.refreshToken));
  }

  @Get('me')
  async me(@CurrentUser() user: AuthUser): Promise<UserProfile> {
    const record = await this.queryBus.execute<GetUserByIdQuery, UserRecord | null>(
      new GetUserByIdQuery(user.id),
    );
    if (!record) {
      throw new NotFoundException('Пользователь не найден');
    }
    return {
      id: record.id,
      email: record.email,
      name: record.name,
      createdAt: record.createdAt.toISOString(),
    };
  }
}
