import { ApiError, OpenAPI } from "@/client"
import { request } from "@/client/core/request"
import {
  expenseCategoryCreateSchema,
  expenseCategoryDeleteSchema,
  expenseCategoryDetailSchema,
  expenseCategoryListSchema,
  expenseCategoryUpdateSchema,
} from "./schemas"
import type {
  ExpenseCategoryCreateResponse,
  ExpenseCategoryDeleteResponse,
  ExpenseCategoryDetailResponse,
  ExpenseCategoryListResponse,
  ExpenseCategoryUpdateResponse,
  ExpenseCategoryUpsertPayload,
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

export async function listExpenseCategory() {
  const response = await request<ExpenseCategoryListResponse>(OpenAPI, {
    method: "GET",
    url: "/api/v1/system-management/expense-category",
    query: {
      page: 1,
      page_size: 200,
    },
    errors: DEFAULT_ERRORS,
  })

  return expenseCategoryListSchema.parse(response)
}

export async function getExpenseCategoryDetail(id: number) {
  const response = await request<ExpenseCategoryDetailResponse>(OpenAPI, {
    method: "GET",
    url: "/api/v1/system-management/expense-category/{id}",
    path: { id },
    errors: DEFAULT_ERRORS,
  })

  return expenseCategoryDetailSchema.parse(response)
}

export async function createExpenseCategory(payload: ExpenseCategoryUpsertPayload) {
  const response = await request<ExpenseCategoryCreateResponse>(OpenAPI, {
    method: "POST",
    url: "/api/v1/system-management/expense-category",
    body: requestEnvelope(payload),
    errors: DEFAULT_ERRORS,
  })

  return expenseCategoryCreateSchema.parse(response)
}

export async function updateExpenseCategory(id: number, payload: ExpenseCategoryUpsertPayload) {
  const response = await request<ExpenseCategoryUpdateResponse>(OpenAPI, {
    method: "PUT",
    url: "/api/v1/system-management/expense-category/{id}",
    path: { id },
    body: requestEnvelope(payload),
    errors: DEFAULT_ERRORS,
  })

  return expenseCategoryUpdateSchema.parse(response)
}

export async function deleteExpenseCategory(id: number) {
  const response = await request<ExpenseCategoryDeleteResponse>(OpenAPI, {
    method: "DELETE",
    url: "/api/v1/system-management/expense-category/{id}",
    path: { id },
    errors: DEFAULT_ERRORS,
  })

  return expenseCategoryDeleteSchema.parse(response)
}
