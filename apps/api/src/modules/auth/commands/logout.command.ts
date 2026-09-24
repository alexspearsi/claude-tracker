/** Команда выхода: отзывает refresh-токен пользователя — обрабатывается {@link LogoutHandler}. */
export class LogoutCommand {
  constructor(
    public readonly userId: string,
    public readonly refreshToken: string,
  ) {}
}
