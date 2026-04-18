export type PurchaseRecordsView = "records" | "categories" | "subcategories"

export type ApiFieldErrorDetails = Record<
    string,
    string | string[] | undefined
>

export type ApiSuccessResponse<TData> = {
    version: string
    success: boolean
    code: string
    message: string
    request_id: string
    ts: number
    data: TData
}

export type ApiErrorResponse = {
    version: string
    success: boolean
    code: string
    message: string
    request_id: string
    ts: number
    error?: {
        details?: ApiFieldErrorDetails
    }
}

export type RequestEnvelope<TPayload> = {
    request_id: string
    ts: number
    payload: TPayload
}

export type PurchaseRecord = {
    id: string
    title: string
    remark: string
    amount: number | string
    purchase_date: string
    category_id: string
    category_name: string
    subcategory_id: string | null
    subcategory_name: string | null
    owner_id: string
    owner_name: string
}

export type PurchaseRecordListData = {
    records: PurchaseRecord[]
    total: number
}

export type PurchaseRecordQueryParams = {
    page: number
    page_size: number
    title?: string
    category_id?: string
    subcategory_id?: string
    purchase_date_start?: string
    purchase_date_end?: string
    owner_id?: string
}

export type PurchaseRecordPayload = {
    title: string
    remark: string
    amount: number
    purchase_date: string
    category_id: string
    subcategory_id?: string | null
}

export type PurchaseRecordFormValues = {
    title: string
    remark: string
    amount: string
    purchase_date: string
    category_id: string
    subcategory_id: string
}

export type Category = {
    id: string
    name: string
    is_active: boolean
}

export type CategoryListData = {
    categories: Category[]
}

export type CategoryQueryParams = {
    active_only?: boolean
}

export type CategoryPayload = {
    name: string
    is_active: boolean
}

export type CategoryFormValues = CategoryPayload

export type Subcategory = {
    id: string
    category_id: string
    category_name: string
    name: string
    is_active: boolean
}

export type SubcategoryListData = {
    subcategories: Subcategory[]
}

export type SubcategoryQueryParams = {
    category_id?: string
    active_only?: boolean
}

export type SubcategoryPayload = {
    category_id: string
    name: string
    is_active: boolean
}

export type SubcategoryFormValues = SubcategoryPayload