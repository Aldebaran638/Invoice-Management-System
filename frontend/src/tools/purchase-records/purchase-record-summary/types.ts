export type PurchaseRecordSummaryItem = {
  id: string
  purchase_date: string
  name: string
  amount: number | string | null
  founder_name: string
  major_category_id: number
  major_category_name: string
  sub_category_id: number | null
  sub_category_name: string | null
  remarks: string | null
}

export type PurchaseRecordSummaryUpsertPayload = {
  purchase_date: string
  name: string
  amount: number | null
  founder_name: string
  major_category_id: number
  sub_category_id: number | null
  remarks: string | null
}

export type PurchaseRecordSummaryListQuery = {
  major_category_id?: number
  sub_category_id?: number
}

export type ExpenseCategoryOption = {
  id: number
  name: string
  description: string | null
}

export type ExpenseSubcategoryOption = {
  id: number
  name: string
  major_category_id: number
  major_category_name: string
  description: string | null
}

export type PurchaseRecordSummaryListResponse = {
  data: {
    list: PurchaseRecordSummaryItem[]
    total: number
  }
}

export type PurchaseRecordSummaryDetailResponse = {
  data: PurchaseRecordSummaryItem
}

export type PurchaseRecordSummaryCreateResponse = {
  data: PurchaseRecordSummaryItem
}

export type PurchaseRecordSummaryUpdateResponse = {
  data: PurchaseRecordSummaryItem
}

export type PurchaseRecordSummaryDeleteResponse = {
  data?: {
    message: string
  }
  message?: string
}

export type ExpenseCategoryOptionListResponse = {
  data: {
    list: ExpenseCategoryOption[]
    total: number
  }
}

export type ExpenseSubcategoryOptionListResponse = {
  data: {
    list: ExpenseSubcategoryOption[]
    total: number
  }
}
