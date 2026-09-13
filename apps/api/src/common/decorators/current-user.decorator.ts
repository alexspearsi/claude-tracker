import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

export interface AuthUser {
  id: string;
  email: string;
}

/** Достаёт пользователя, положенного в запрос JwtStrategy. */
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthUser => {
  const request = ctx.switchToHttp().getRequest<{ user: AuthUser }>();
  return request.user;
});
