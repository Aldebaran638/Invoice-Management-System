import { z } from "zod"

export const purchaseRecordSummaryItemSchema = z.object({
  id: z.string(),
  purchase_date: z.string(),
  name: z.string(),
  amount: z.union([z.number(), z.string(), z.null()]),
  founder_name: z.string().default(""),
  major_category_id: z.number().default(0),
  major_category_name: z.string().default(""),
  sub_category_id: z.number().nullable().default(null),
  sub_category_name: z.string().nullable().default(null),
  remarks: z.string().nullable().default(null),
})

export const purchaseRecordSummaryUpsertSchema = z.object({
  purchase_date: z.string().min(1),
  name: z.string().min(1),
  amount: z.number().nullable(),
  founder_name: z.string().min(1),
  major_category_id: z.number().int().positive(),
  sub_category_id: z.number().int().positive().nullable(),
  remarks: z.string().nullable(),
})

export const purchaseRecordSummaryListSchema = z.object({
  data: z.object({
    list: z.array(purchaseRecordSummaryItemSchema).optional(),
    records: z.array(purchaseRecordSummaryItemSchema).optional(),
    total: z.number().optional(),
  }),
})

export const purchaseRecordSummaryDetailSchema = z.object({
  data: purchaseRecordSummaryItemSchema,
})

export const purchaseRecordSummaryCreateSchema = z.object({
  data: purchaseRecordSummaryItemSchema,
})

export const purchaseRecordSummaryUpdateSchema = z.object({
  data: purchaseRecordSummaryItemSchema,
})

export const purchaseRecordSummaryDeleteSchema = z.object({
  data: z
    .object({
      message: z.string(),
    })
    .optional(),
  message: z.string().optional(),
})

export const expenseCategoryOptionSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable().optional().default(null),
})

export const expenseCategoryOptionListSchema = z.object({
  data: z.object({
    list: z.array(expenseCategoryOptionSchema).optional().default([]),
    total: z.number().optional().default(0),
  }),
})

export const expenseSubcategoryOptionSchema = z.object({
  id: z.number(),
  name: z.string(),
  major_category_id: z.number(),
  major_category_name: z.string().optional().default(""),
  description: z.string().nullable().optional().default(null),
})

export const expenseSubcategoryOptionListSchema = z.object({
  data: z.object({
    list: z.array(expenseSubcategoryOptionSchema).optional().default([]),
    total: z.number().optional().default(0),
  }),
})
