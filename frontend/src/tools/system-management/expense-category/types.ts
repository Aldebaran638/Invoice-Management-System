export type ExpenseCategoryItem = {
  id: number
  name: string
  description: string | null
}

export type ExpenseCategoryUpsertPayload = {
  name: string
  description: string | null
}

export type ExpenseCategoryListResponse = {
  data: {
    list: ExpenseCategoryItem[]
    total: number
  }
}

export type ExpenseCategoryDetailResponse = {
  data: ExpenseCategoryItem
}

export type ExpenseCategoryCreateResponse = {
  data: ExpenseCategoryItem
}

export type ExpenseCategoryUpdateResponse = {
  data: ExpenseCategoryItem
}

export type ExpenseCategoryDeleteResponse = {
  message?: string
  data?: {
    message: string
  }
}
