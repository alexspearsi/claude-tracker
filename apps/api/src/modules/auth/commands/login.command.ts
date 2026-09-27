/** Команда входа по email и паролю — обрабатывается {@link LoginHandler}. */
export class LoginCommand {
  constructor(
    public readonly email: string,
    public readonly password: string,
  ) {}
}
