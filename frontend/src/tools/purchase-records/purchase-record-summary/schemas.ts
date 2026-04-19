import { z } from "zod"

export const purchaseRecordSummaryItemSchema = z.object({
  id: z.string(),
  purchase_date: z.string(),
  name: z.string(),
  amount: z.union([z.number(), z.string()]),
})

export const purchaseRecordSummaryListSchema = z.object({
  data: z.object({
    records: z.array(purchaseRecordSummaryItemSchema),
  }),
})

export const purchaseRecordSummaryDetailSchema = z.object({
  data: purchaseRecordSummaryItemSchema,
})
