import { z } from 'zod';
import { registerSchema } from '@expense/shared';

/**
 * В контракте api `name` — необязательное поле, но в форме оно всегда строка:
 * незаполненный input отдаёт '', и `min(1)` из registerSchema уронил бы валидацию
 * пустого поля. Поэтому для формы требование непустоты снимается, а перед отправкой
 * пустая строка превращается в undefined (см. register-form.tsx).
 */
export const registerFormSchema = registerSchema.extend({
  name: z.string().max(80, 'Не длиннее 80 символов'),
  agreeToTerms: z
    .boolean()
    .refine((value) => value, { message: 'Нужно согласиться с условиями' }),
});

export type RegisterFormValues = z.infer<typeof registerFormSchema>;
