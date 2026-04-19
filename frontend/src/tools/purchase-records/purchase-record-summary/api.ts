import { ApiError, OpenAPI } from "@/client"
import { request } from "@/client/core/request"
import {
  expenseCategoryOptionListSchema,
  expenseSubcategoryOptionListSchema,
  purchaseRecordSummaryCreateSchema,
  purchaseRecordSummaryDeleteSchema,
  purchaseRecordSummaryDetailSchema,
  purchaseRecordSummaryListSchema,
  purchaseRecordSummaryUpdateSchema,
} from "./schemas"
import type {
  ExpenseCategoryOptionListResponse,
  ExpenseSubcategoryOptionListResponse,
  PurchaseRecordSummaryListQuery,
  PurchaseRecordSummaryCreateResponse,
  PurchaseRecordSummaryDeleteResponse,
  PurchaseRecordSummaryDetailResponse,
  PurchaseRecordSummaryListResponse,
  PurchaseRecordSummaryUpdateResponse,
  PurchaseRecordSummaryUpsertPayload,
} from "./types"

const DEFAULT_ERRORS = {
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  422: "Validation Error",
}

export function getApiErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    const detail = (error.body as { detail?: string } | undefined)?.detail
    return detail || error.message || "接口请求失败"
  }

  if (error instanceof Error) {
    return error.message
  }

  return "接口请求失败"
}

export function isForbiddenError(error: unknown) {
  return error instanceof ApiError && error.status === 403
}

export async function listPurchaseRecordSummary(
  query?: PurchaseRecordSummaryListQuery,
) {
  const response = await request<PurchaseRecordSummaryListResponse>(OpenAPI, {
    method: "GET",
    // Keep the request URL identical to the backend route to avoid cross-origin redirects.
    url: "/api/v1/purchase-records/purchase-record-summary/",
    query: {
      ...(query?.major_category_id ? { major_category_id: query.major_category_id } : {}),
      ...(query?.sub_category_id ? { sub_category_id: query.sub_category_id } : {}),
    },
    errors: DEFAULT_ERRORS,
  })

  const parsed = purchaseRecordSummaryListSchema.parse(response)
  return {
    ...parsed,
    data: {
      list: parsed.data.list ?? parsed.data.records ?? [],
      total: parsed.data.total ?? parsed.data.list?.length ?? parsed.data.records?.length ?? 0,
    },
  }
}

export async function getPurchaseRecordSummaryDetail(recordId: string) {
  const response = await request<PurchaseRecordSummaryDetailResponse>(OpenAPI, {
    method: "GET",
    url: "/api/v1/purchase-records/purchase-record-summary/{record_id}",
    path: {
      record_id: recordId,
    },
    errors: DEFAULT_ERRORS,
  })

  return purchaseRecordSummaryDetailSchema.parse(response)
}

export async function createPurchaseRecordSummary(
  payload: PurchaseRecordSummaryUpsertPayload,
) {
  const response = await request<PurchaseRecordSummaryCreateResponse>(OpenAPI, {
    method: "POST",
    url: "/api/v1/purchase-records/purchase-record-summary/",
    body: payload,
    errors: DEFAULT_ERRORS,
  })

  return purchaseRecordSummaryCreateSchema.parse(response)
}

export async function updatePurchaseRecordSummary(
  recordId: string,
  payload: PurchaseRecordSummaryUpsertPayload,
) {
  const response = await request<PurchaseRecordSummaryUpdateResponse>(OpenAPI, {
    method: "PUT",
    url: "/api/v1/purchase-records/purchase-record-summary/{record_id}",
    path: {
      record_id: recordId,
    },
    body: payload,
    errors: DEFAULT_ERRORS,
  })

  return purchaseRecordSummaryUpdateSchema.parse(response)
}

export async function deletePurchaseRecordSummary(recordId: string) {
  const response = await request<PurchaseRecordSummaryDeleteResponse>(OpenAPI, {
    method: "DELETE",
    url: "/api/v1/purchase-records/purchase-record-summary/{record_id}",
    path: {
      record_id: recordId,
    },
    errors: DEFAULT_ERRORS,
  })

  return purchaseRecordSummaryDeleteSchema.parse(response)
}

export async function listExpenseCategoryOptions() {
  const response = await request<ExpenseCategoryOptionListResponse>(OpenAPI, {
    method: "GET",
    url: "/api/v1/system-management/expense-category",
    query: {
      page: 1,
      page_size: 200,
    },
    errors: DEFAULT_ERRORS,
  })

  return expenseCategoryOptionListSchema.parse(response)
}

export async function listExpenseSubcategoryOptions(majorCategoryId?: number) {
  const response = await request<ExpenseSubcategoryOptionListResponse>(OpenAPI, {
    method: "GET",
    url: "/api/v1/system-management/expense-subcategory",
    query: {
      page: 1,
      page_size: 200,
      ...(majorCategoryId ? { major_category_id: majorCategoryId } : {}),
    },
    errors: DEFAULT_ERRORS,
  })

  return expenseSubcategoryOptionListSchema.parse(response)
}
