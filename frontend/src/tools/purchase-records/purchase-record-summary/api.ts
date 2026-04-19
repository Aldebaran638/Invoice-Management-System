import { ApiError, OpenAPI } from "@/client"
import { request } from "@/client/core/request"
import {
  purchaseRecordSummaryDetailSchema,
  purchaseRecordSummaryListSchema,
} from "./schemas"
import type {
  PurchaseRecordSummaryDetailResponse,
  PurchaseRecordSummaryListResponse,
} from "./types"

const DEFAULT_ERRORS = {
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
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
