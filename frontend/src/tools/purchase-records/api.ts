import { ApiError, OpenAPI } from "@/client"
import { request } from "@/client/core/request"
import type {
    ApiErrorResponse,
    ApiFieldErrorDetails,
    ApiSuccessResponse,
    Category,
    CategoryListData,
    CategoryPayload,
    CategoryQueryParams,
    PurchaseRecord,
    PurchaseRecordListData,
    PurchaseRecordPayload,
    PurchaseRecordQueryParams,
    RequestEnvelope,
    Subcategory,
    SubcategoryListData,
    SubcategoryPayload,
    SubcategoryQueryParams,
} from "./types"

const DEFAULT_ERRORS = {
    400: "Bad Request",
    401: "Unauthorized",
    403: "Forbidden",
    404: "Not Found",
    422: "Validation Error",
}

function normalizeAmount(value: number | string) {
    const amount = typeof value === "string" ? Number(value) : value
    return Number.isFinite(amount) ? amount : 0
}

function normalizePurchaseRecord(record: PurchaseRecord): PurchaseRecord {
    return {
        ...record,
        amount: normalizeAmount(record.amount),
    }
}

function buildEnvelope<TPayload>(payload: TPayload): RequestEnvelope<TPayload> {
    return {
        request_id:
            typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
                ? `req-${crypto.randomUUID()}`
                : `req-${Date.now()}`,
        ts: Date.now(),
        payload,
    }
}

export function getApiErrorMessage(error: unknown) {
    if (error instanceof ApiError) {
        const body = error.body as ApiErrorResponse | undefined
        return body?.message || error.message || "接口请求失败"
    }

    if (error instanceof Error) {
        return error.message
    }

    return "接口请求失败"
}

export function getApiFieldErrors(error: unknown): ApiFieldErrorDetails {
    if (error instanceof ApiError) {
        const body = error.body as ApiErrorResponse | undefined
        return body?.error?.details ?? {}
    }

    return {}
}

export function isForbiddenError(error: unknown) {
    return error instanceof ApiError && error.status === 403
}

export function listPurchaseRecords(query: PurchaseRecordQueryParams) {
    return request<ApiSuccessResponse<PurchaseRecordListData>>(OpenAPI, {
        method: "GET",
        url: "/api/v1/purchase-records/records",
        query,
        errors: DEFAULT_ERRORS,
    }).then((response) => ({
        ...response,
        data: {
            ...response.data,
            records: response.data.records.map(normalizePurchaseRecord),
        },
    }))
}

export function getPurchaseRecord(recordId: string) {
    return request<ApiSuccessResponse<PurchaseRecord>>(OpenAPI, {
        method: "GET",
        url: "/api/v1/purchase-records/records/{record_id}",
        path: {
            record_id: recordId,
        },
        errors: DEFAULT_ERRORS,
    }).then((response) => ({
        ...response,
        data: normalizePurchaseRecord(response.data),
    }))
}

export function createPurchaseRecord(payload: PurchaseRecordPayload) {
    return request<ApiSuccessResponse<PurchaseRecord>>(OpenAPI, {
        method: "POST",
        url: "/api/v1/purchase-records/records",
        body: buildEnvelope(payload),
        mediaType: "application/json",
        errors: DEFAULT_ERRORS,
    }).then((response) => ({
        ...response,
        data: normalizePurchaseRecord(response.data),
    }))
}

export function updatePurchaseRecord(recordId: string, payload: PurchaseRecordPayload) {
    return request<ApiSuccessResponse<PurchaseRecord>>(OpenAPI, {
        method: "PATCH",
        url: "/api/v1/purchase-records/records/{record_id}",
        path: {
            record_id: recordId,
        },
        body: buildEnvelope(payload),
        mediaType: "application/json",
        errors: DEFAULT_ERRORS,
    }).then((response) => ({
        ...response,
        data: normalizePurchaseRecord(response.data),
    }))
}

export function deletePurchaseRecord(recordId: string) {
    return request<
        ApiSuccessResponse<{
            id: string
            is_deleted: boolean
            deleted_at: string | null
        }>
    >(OpenAPI, {
        method: "DELETE",
        url: "/api/v1/purchase-records/records/{record_id}",
        path: {
            record_id: recordId,
        },
        errors: DEFAULT_ERRORS,
    })
}

export function listCategories(query: CategoryQueryParams) {
    return request<ApiSuccessResponse<CategoryListData>>(OpenAPI, {
        method: "GET",
        url: "/api/v1/purchase-records/categories",
        query,
        errors: DEFAULT_ERRORS,
    })
}

export function createCategory(payload: CategoryPayload) {
    return request<ApiSuccessResponse<Category>>(OpenAPI, {
        method: "POST",
        url: "/api/v1/purchase-records/categories",
        body: buildEnvelope(payload),
        mediaType: "application/json",
        errors: DEFAULT_ERRORS,
    })
}

export function updateCategory(categoryId: string, payload: CategoryPayload) {
    return request<ApiSuccessResponse<Category>>(OpenAPI, {
        method: "PATCH",
        url: "/api/v1/purchase-records/categories/{category_id}",
        path: {
            category_id: categoryId,
        },
        body: buildEnvelope(payload),
        mediaType: "application/json",
        errors: DEFAULT_ERRORS,
    })
}

export function listSubcategories(query: SubcategoryQueryParams) {
    return request<ApiSuccessResponse<SubcategoryListData>>(OpenAPI, {
        method: "GET",
        url: "/api/v1/purchase-records/subcategories",
        query,
        errors: DEFAULT_ERRORS,
    })
}

export function createSubcategory(payload: SubcategoryPayload) {
    return request<ApiSuccessResponse<Subcategory>>(OpenAPI, {
        method: "POST",
        url: "/api/v1/purchase-records/subcategories",
        body: buildEnvelope(payload),
        mediaType: "application/json",
        errors: DEFAULT_ERRORS,
    })
}

export function updateSubcategory(
    subcategoryId: string,
    payload: SubcategoryPayload,
) {
    return request<ApiSuccessResponse<Subcategory>>(OpenAPI, {
        method: "PATCH",
        url: "/api/v1/purchase-records/subcategories/{subcategory_id}",
        path: {
            subcategory_id: subcategoryId,
        },
        body: buildEnvelope(payload),
        mediaType: "application/json",
        errors: DEFAULT_ERRORS,
    })
}
