/** Команда ротации refresh-токена — обрабатывается {@link RefreshTokensHandler}. */
export class RefreshTokensCommand {
  constructor(public readonly refreshToken: string) {}
}
