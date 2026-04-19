import { z } from "zod"

export const recycleBinRecordSchema = z.object({
  id: z.string(),
  purchase_date: z.string(),
  name: z.string(),
  amount: z.union([z.number(), z.string(), z.null()]),
  deleted_at: z.string(),
})

export const recycleBinListSchema = z.object({
  data: z.object({
    records: z.array(recycleBinRecordSchema),
  }),
})

export const recycleBinDetailSchema = z.object({
  data: recycleBinRecordSchema,
})

export const recycleBinRestoreSchema = z.object({
  message: z.string(),
})
