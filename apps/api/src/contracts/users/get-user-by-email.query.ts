import type { UserRecord } from './create-user.command.js';

/** UserRecord + passwordHash — используется только auth для сверки пароля. */
export interface UserCredentials extends UserRecord {
  passwordHash: string;
}

/**
 * Запрос пользователя по email вместе с `passwordHash` — CQRS-контракт между `AuthModule`
 * (сверка пароля при логине) и `UsersModule` (`GetUserByEmailHandler`).
 */
export class GetUserByEmailQuery {
  constructor(public readonly email: string) {}
}
