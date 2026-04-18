import { z } from "zod"

export const purchaseRecordsViewSchema = z.object({
    view: z
        .enum(["records", "categories", "subcategories"])
        .catch("records")
        .default("records"),
})

export const recordFilterSchema = z
    .object({
        page: z.number().int().min(1),
        page_size: z.number().int().min(1).max(100),
        title: z.string().trim().optional(),
        category_id: z.string().trim().optional(),
        subcategory_id: z.string().trim().optional(),
        purchase_date_start: z.string().trim().optional(),
        purchase_date_end: z.string().trim().optional(),
        owner_id: z.string().trim().optional(),
    })
    .refine(
        (data) => {
            if (!data.purchase_date_start || !data.purchase_date_end) {
                return true
            }

            return data.purchase_date_start <= data.purchase_date_end
        },
        {
            message: "开始日期不能晚于结束日期",
            path: ["purchase_date_end"],
        },
    )

export const purchaseRecordFormSchema = z.object({
    title: z.string().trim().min(1, { message: "标题不能为空" }),
    remark: z.string().trim(),
    amount: z
        .string()
        .trim()
        .min(1, { message: "金额不能为空" })
        .regex(/^(0|[1-9]\d*)(\.\d{1,2})?$/, {
            message: "金额最多保留两位小数",
        }),
    purchase_date: z.string().trim().min(1, { message: "购买日期不能为空" }),
    category_id: z.string().trim().min(1, { message: "大类不能为空" }),
    subcategory_id: z.string().trim(),
})

export const categoryFormSchema = z.object({
    name: z.string().trim().min(1, { message: "大类名称不能为空" }),
    is_active: z.boolean(),
})

export const subcategoryFormSchema = z.object({
    category_id: z.string().trim().min(1, { message: "大类不能为空" }),
    name: z.string().trim().min(1, { message: "小类名称不能为空" }),
    is_active: z.boolean(),
})