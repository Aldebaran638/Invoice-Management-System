import { z } from "zod"

export const expenseSubcategoryItemSchema = z.object({
  id: z.number(),
  name: z.string(),
  major_category_id: z.number(),
  major_category_name: z.string().default(""),
  description: z.string().nullable().optional().default(null),
})

export const expenseSubcategoryUpsertSchema = z.object({
  name: z.string().min(1),
  major_category_id: z.number().int().positive(),
  description: z.string().nullable(),
})

export const expenseSubcategoryListSchema = z.object({
  data: z.object({
    list: z.array(expenseSubcategoryItemSchema).optional().default([]),
    total: z.number().optional().default(0),
  }),
})

export const expenseSubcategoryDetailSchema = z.object({
  data: expenseSubcategoryItemSchema,
})

export const expenseSubcategoryCreateSchema = z.object({
  data: expenseSubcategoryItemSchema,
})

export const expenseSubcategoryUpdateSchema = z.object({
  data: expenseSubcategoryItemSchema,
})

export const expenseSubcategoryDeleteSchema = z.object({
  message: z.string().optional(),
  data: z
    .object({
      message: z.string(),
    })
    .optional(),
})
