/**
 * Запрос пользователя по id без `passwordHash` — CQRS-контракт для профиля
 * (`UsersController.me`) и для других модулей, которым нужно проверить, что пользователь
 * из access-токена всё ещё существует (например, `CategoriesService.create`).
 */
export class GetUserByIdQuery {
  constructor(public readonly id: string) {}
}
