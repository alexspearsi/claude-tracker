import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import {
  loginSchema,
  refreshSchema,
  registerSchema,
  type AuthTokens,
  type LoginInput,
  type RefreshInput,
  type RegisterInput,
} from '@expense/shared';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { LoginCommand } from './commands/login.command.js';
import { LogoutCommand } from './commands/logout.command.js';
import { RefreshTokensCommand } from './commands/refresh-tokens.command.js';
import { RegisterCommand } from './commands/register.command.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly commandBus: CommandBus) {}

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
}
