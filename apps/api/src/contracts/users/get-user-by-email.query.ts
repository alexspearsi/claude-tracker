import type { UserRecord } from './create-user.command.js';

/** UserRecord + passwordHash — используется только auth для сверки пароля. */
export interface UserCredentials extends UserRecord {
  passwordHash: string;
}

export class GetUserByEmailQuery {
  constructor(public readonly email: string) {}
}
