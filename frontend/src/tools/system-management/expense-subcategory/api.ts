import { ApiError, OpenAPI } from "@/client"
import { request } from "@/client/core/request"
import {
  expenseSubcategoryCreateSchema,
  expenseSubcategoryDeleteSchema,
  expenseSubcategoryDetailSchema,
  expenseSubcategoryListSchema,
  expenseSubcategoryUpdateSchema,
} from "./schemas"
import type {
  ExpenseSubcategoryCreateResponse,
  ExpenseSubcategoryDeleteResponse,
  ExpenseSubcategoryDetailResponse,
  ExpenseSubcategoryListResponse,
  ExpenseSubcategoryUpdateResponse,
  ExpenseSubcategoryUpsertPayload,
} from "./types"

const DEFAULT_ERRORS = {
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  422: "Validation Error",
}

function requestEnvelope<T>(payload: T) {
  return {
    request_id: `frontend-${Date.now()}`,
    ts: Date.now(),
    payload,
  }
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

export async function listExpenseSubcategory(majorCategoryId?: number) {
  const response = await request<ExpenseSubcategoryListResponse>(OpenAPI, {
    method: "GET",
    url: "/api/v1/system-management/expense-subcategory",
    query: {
      page: 1,
      page_size: 200,
      ...(majorCategoryId ? { major_category_id: majorCategoryId } : {}),
    },
    errors: DEFAULT_ERRORS,
  })

  return expenseSubcategoryListSchema.parse(response)
}

export async function getExpenseSubcategoryDetail(id: number) {
  const response = await request<ExpenseSubcategoryDetailResponse>(OpenAPI, {
    method: "GET",
    url: "/api/v1/system-management/expense-subcategory/{id}",
    path: { id },
    errors: DEFAULT_ERRORS,
  })

  return expenseSubcategoryDetailSchema.parse(response)
}

export async function createExpenseSubcategory(payload: ExpenseSubcategoryUpsertPayload) {
  const response = await request<ExpenseSubcategoryCreateResponse>(OpenAPI, {
    method: "POST",
    url: "/api/v1/system-management/expense-subcategory",
    body: requestEnvelope(payload),
    errors: DEFAULT_ERRORS,
  })

  return expenseSubcategoryCreateSchema.parse(response)
}

export async function updateExpenseSubcategory(id: number, payload: ExpenseSubcategoryUpsertPayload) {
  const response = await request<ExpenseSubcategoryUpdateResponse>(OpenAPI, {
    method: "PUT",
    url: "/api/v1/system-management/expense-subcategory/{id}",
    path: { id },
    body: requestEnvelope(payload),
    errors: DEFAULT_ERRORS,
  })

  return expenseSubcategoryUpdateSchema.parse(response)
}

export async function deleteExpenseSubcategory(id: number) {
  const response = await request<ExpenseSubcategoryDeleteResponse>(OpenAPI, {
    method: "DELETE",
    url: "/api/v1/system-management/expense-subcategory/{id}",
    path: { id },
    errors: DEFAULT_ERRORS,
  })

  return expenseSubcategoryDeleteSchema.parse(response)
}
