/** Результат команды/запросов о пользователе — без passwordHash. */
export interface UserRecord {
  id: string;
  email: string;
  name: string | null;
  createdAt: Date;
}

export class CreateUserCommand {
  constructor(
    public readonly email: string,
    public readonly passwordHash: string,
    public readonly name?: string | null,
  ) {}
}
