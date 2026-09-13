import { z } from 'zod';

export const categoryColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Цвет в формате #RRGGBB');

export const createCategorySchema = z.object({
  name: z.string().min(1).max(50),
  color: categoryColorSchema.default('#64748b'),
  icon: z.string().max(50).optional(),
});

export const updateCategorySchema = createCategorySchema.partial();

export const categorySchema = z.object({
  id: z.uuid(),
  name: z.string(),
  color: z.string(),
  icon: z.string().nullable(),
  createdAt: z.iso.datetime(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type Category = z.infer<typeof categorySchema>;
