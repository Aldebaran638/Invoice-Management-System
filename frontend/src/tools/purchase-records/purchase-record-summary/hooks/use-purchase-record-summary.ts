import { useQuery } from "@tanstack/react-query"

import {
  getPurchaseRecordSummaryDetail,
  listExpenseCategoryOptions,
  listExpenseSubcategoryOptions,
  listPurchaseRecordSummary,
} from "../api"
import type { PurchaseRecordSummaryListQuery } from "../types"

export function usePurchaseRecordSummaryList(query?: PurchaseRecordSummaryListQuery) {
  return useQuery({
    queryKey: ["purchase-record-summary", "list", query?.major_category_id ?? null, query?.sub_category_id ?? null],
    queryFn: () => listPurchaseRecordSummary(query),
    retry: false,
  })
}

export function usePurchaseRecordSummaryDetail(recordId?: string) {
  return useQuery({
    queryKey: ["purchase-record-summary", "detail", recordId],
    queryFn: () => getPurchaseRecordSummaryDetail(recordId as string),
    enabled: Boolean(recordId),
    retry: false,
  })
}

export function useExpenseCategoryOptions() {
  return useQuery({
    queryKey: ["purchase-record-summary", "expense-category-options"],
    queryFn: listExpenseCategoryOptions,
    retry: false,
  })
}

export function useExpenseSubcategoryOptions(majorCategoryId?: number) {
  return useQuery({
    queryKey: ["purchase-record-summary", "expense-subcategory-options", majorCategoryId ?? null],
    queryFn: () => listExpenseSubcategoryOptions(majorCategoryId),
    retry: false,
  })
}
