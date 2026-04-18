import { useState } from "react"

import { recordFilterSchema } from "../schemas"
import type { PurchaseRecordQueryParams } from "../types"

const initialFilters: PurchaseRecordQueryParams = {
  page: 1,
  page_size: 10,
  title: "",
  category_id: "",
  subcategory_id: "",
  purchase_date_start: "",
  purchase_date_end: "",
  owner_id: "",
}

function sanitizeFilters(filters: PurchaseRecordQueryParams) {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== "" && value != null),
  ) as PurchaseRecordQueryParams
}

export function usePurchaseRecordFilters() {
  const [draftFilters, setDraftFilters] =
    useState<PurchaseRecordQueryParams>(initialFilters)
  const [appliedFilters, setAppliedFilters] =
    useState<PurchaseRecordQueryParams>(initialFilters)
  const [validationError, setValidationError] = useState<string | null>(null)

  const applyFilters = () => {
    const result = recordFilterSchema.safeParse(draftFilters)

    if (!result.success) {
      setValidationError(result.error.issues[0]?.message ?? "筛选条件不合法")
      return false
    }

    setAppliedFilters(sanitizeFilters(result.data))
    setValidationError(null)
    return true
  }

  const resetFilters = () => {
    setDraftFilters(initialFilters)
    setAppliedFilters(initialFilters)
    setValidationError(null)
  }

  const setPage = (page: number) => {
    setAppliedFilters((current) => ({ ...current, page }))
    setDraftFilters((current) => ({ ...current, page }))
  }

  const setPageSize = (pageSize: number) => {
    setAppliedFilters((current) => ({ ...current, page: 1, page_size: pageSize }))
    setDraftFilters((current) => ({ ...current, page: 1, page_size: pageSize }))
  }

  return {
    appliedFilters,
    applyFilters,
    draftFilters,
    resetFilters,
    setAppliedFilters,
    setDraftFilters,
    setPage,
    setPageSize,
    validationError,
    setValidationError,
  }
}
