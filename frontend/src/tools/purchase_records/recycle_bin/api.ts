import { ApiError, OpenAPI } from "@/client"
import { request } from "@/client/core/request"
import {
  recycleBinDetailSchema,
  recycleBinListSchema,
  recycleBinRestoreSchema,
} from "./schemas"
import type {
  RecycleBinDetailResponse,
  RecycleBinListResponse,
  RecycleBinRestoreResponse,
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

export async function listRecycleBinRecords() {
  const response = await request<RecycleBinListResponse>(OpenAPI, {
    method: "GET",
    url: "/api/v1/purchase_records/recycle_bin",
    errors: DEFAULT_ERRORS,
  })

  return recycleBinListSchema.parse(response)
}

export async function getRecycleBinRecordDetail(recordId: string) {
  const response = await request<RecycleBinDetailResponse>(OpenAPI, {
    method: "GET",
    url: "/api/v1/purchase_records/recycle_bin/{record_id}",
    path: {
      record_id: recordId,
    },
    errors: DEFAULT_ERRORS,
  })

  return recycleBinDetailSchema.parse(response)
}

export async function restoreRecycleBinRecord(recordId: string) {
  const response = await request<RecycleBinRestoreResponse>(OpenAPI, {
    method: "POST",
    url: "/api/v1/purchase_records/recycle_bin/{record_id}/restore",
    path: {
      record_id: recordId,
    },
    errors: DEFAULT_ERRORS,
  })

  return recycleBinRestoreSchema.parse(response)
}
