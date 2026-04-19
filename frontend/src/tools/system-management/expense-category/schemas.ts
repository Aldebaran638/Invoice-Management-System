import { z } from "zod"

export const expenseCategoryItemSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable().optional().default(null),
})

export const expenseCategoryUpsertSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable(),
})

export const expenseCategoryListSchema = z.object({
  data: z.object({
    list: z.array(expenseCategoryItemSchema).optional().default([]),
    total: z.number().optional().default(0),
  }),
})

export const expenseCategoryDetailSchema = z.object({
  data: expenseCategoryItemSchema,
})

export const expenseCategoryCreateSchema = z.object({
  data: expenseCategoryItemSchema,
})

export const expenseCategoryUpdateSchema = z.object({
  data: expenseCategoryItemSchema,
})

export const expenseCategoryDeleteSchema = z.object({
  message: z.string().optional(),
  data: z
    .object({
      message: z.string(),
    })
    .optional(),
})
