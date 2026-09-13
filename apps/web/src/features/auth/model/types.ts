/**
 * Что возвращает Server Action формы: при успехе управление уходит в redirect
 * (он бросает NEXT_REDIRECT и ничего не возвращает), при ошибке — текст для тоста.
 */
export type AuthActionState = { error: string } | undefined;
