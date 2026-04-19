import { ApiError, OpenAPI } from "@/client"
import { request } from "@/client/core/request"
import {
  purchaseRecordSummaryCreateSchema,
  purchaseRecordSummaryDeleteSchema,
  purchaseRecordSummaryDetailSchema,
  purchaseRecordSummaryListSchema,
  purchaseRecordSummaryUpdateSchema,
} from "./schemas"
import type {
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

export async function listPurchaseRecordSummary() {
  const response = await request<PurchaseRecordSummaryListResponse>(OpenAPI, {
    method: "GET",
    // Keep the request URL identical to the backend route to avoid cross-origin redirects.
    url: "/api/v1/purchase-records/purchase-record-summary/",
    errors: DEFAULT_ERRORS,
  })

  return purchaseRecordSummaryListSchema.parse(response)
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
