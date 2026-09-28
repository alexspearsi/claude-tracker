/** Команда регистрации нового пользователя — обрабатывается {@link RegisterHandler}. */
export class RegisterCommand {
  constructor(
    public readonly email: string,
    public readonly password: string,
    public readonly name?: string,
  ) {}
}
