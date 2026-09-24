import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AuthUser } from '../../common/decorators/current-user.decorator.js';

/** Полезная нагрузка access-токена. */
export interface JwtPayload {
  sub: string;
  email: string;
}

/**
 * Passport-стратегия `jwt`: достаёт access-токен из заголовка `Authorization: Bearer`,
 * проверяет подпись и срок действия секретом `JWT_ACCESS_SECRET`. Используется глобальным
 * `JwtAuthGuard` — подключена через `PassportModule` в `AuthModule`.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  /** Passport вызывает после успешной проверки подписи — результат кладётся в `request.user`. */
  validate(payload: JwtPayload): AuthUser {
    return { id: payload.sub, email: payload.email };
  }
}
