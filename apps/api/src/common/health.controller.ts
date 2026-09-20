import { Controller, Get } from '@nestjs/common';
import { Public } from './decorators/public.decorator.js';
import { CurrentUser, type AuthUser } from './decorators/current-user.decorator.js';

@Controller('health')
export class HealthController {
  @Public()
  @Get()
  check(): { status: string; ts: string } {
    return { status: 'ok', ts: new Date().toISOString() };
  }

  // Тестовый эндпоинт: не публичный, требует валидный access-токен.
  // Удобно дёрнуть curl'ом, чтобы проверить, что JwtAuthGuard и CurrentUser работают.
  @Get('secure')
  secure(@CurrentUser() user: AuthUser): { status: string; userId: string } {
    return { status: 'ok', userId: user.id };
  }
}
