import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { AuthController } from './auth.controller.js';
import { LoginHandler } from './commands/login.handler.js';
import { LogoutHandler } from './commands/logout.handler.js';
import { RefreshTokensHandler } from './commands/refresh-tokens.handler.js';
import { RegisterHandler } from './commands/register.handler.js';
import { JwtStrategy } from './jwt.strategy.js';
import { TokensService } from './tokens.service.js';

@Module({
  imports: [ConfigModule, PassportModule, JwtModule.register({}), CqrsModule],
  controllers: [AuthController],
  providers: [
    TokensService,
    JwtStrategy,
    RegisterHandler,
    LoginHandler,
    RefreshTokensHandler,
    LogoutHandler,
    // Guard регистрируется здесь — только в этом модуле доступен PassportModule
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
  exports: [],
})
export class AuthModule {}
