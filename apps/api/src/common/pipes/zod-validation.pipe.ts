import { BadRequestException, type PipeTransform } from '@nestjs/common';
import { z, type ZodType } from 'zod';

/**
 * Валидация входных данных схемами из @expense/shared — один контракт на фронт и бэк.
 * Использование: @Body(new ZodValidationPipe(createExpenseSchema)) dto: CreateExpenseInput
 */
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodType<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        message: 'Ошибка валидации',
        issues: z.treeifyError(result.error),
      });
    }
    return result.data;
  }
}
