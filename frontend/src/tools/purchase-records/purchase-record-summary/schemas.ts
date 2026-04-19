import { z } from "zod"

export const purchaseRecordSummaryItemSchema = z.object({
  id: z.string(),
  purchase_date: z.string(),
  name: z.string(),
  amount: z.union([z.number(), z.string(), z.null()]),
})

export const purchaseRecordSummaryUpsertSchema = z.object({
  purchase_date: z.string().min(1),
  name: z.string().min(1),
  amount: z.number().nullable(),
})

export const purchaseRecordSummaryListSchema = z.object({
  data: z.object({
    records: z.array(purchaseRecordSummaryItemSchema),
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
  message: z.string(),
})
