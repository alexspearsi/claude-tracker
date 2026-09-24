/** Результат команды/запросов о пользователе — без passwordHash. */
export interface UserRecord {
  id: string;
  email: string;
  name: string | null;
  createdAt: Date;
}

/**
 * Команда создания пользователя — CQRS-контракт между `AuthModule` (регистрация) и
 * `UsersModule` (единственный обработчик, `CreateUserHandler`), не пересекается напрямую.
 * @param passwordHash пароль уже захеширован вызывающим — сервис пользователей паролей не хеширует
 */
export class CreateUserCommand {
  constructor(
    public readonly email: string,
    public readonly passwordHash: string,
    public readonly name?: string | null,
  ) {}
}
