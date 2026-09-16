/** name в api nullable — показываем email, чтобы шапка не оказалась пустой. */
export function userDisplayName(user: { name: string | null; email: string }): string {
  return user.name?.trim() || user.email;
}
