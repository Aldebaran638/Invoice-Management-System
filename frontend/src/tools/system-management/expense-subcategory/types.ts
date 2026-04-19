export type ExpenseSubcategoryItem = {
  id: number
  name: string
  major_category_id: number
  major_category_name: string
  description: string | null
}

export type ExpenseSubcategoryUpsertPayload = {
  name: string
  major_category_id: number
  description: string | null
}

export type ExpenseSubcategoryListResponse = {
  data: {
    list: ExpenseSubcategoryItem[]
    total: number
  }
}

export type ExpenseSubcategoryDetailResponse = {
  data: ExpenseSubcategoryItem
}

export type ExpenseSubcategoryCreateResponse = {
  data: ExpenseSubcategoryItem
}

export type ExpenseSubcategoryUpdateResponse = {
  data: ExpenseSubcategoryItem
}

export type ExpenseSubcategoryDeleteResponse = {
  message?: string
  data?: {
    message: string
  }
}
