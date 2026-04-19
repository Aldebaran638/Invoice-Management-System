import { useQuery } from "@tanstack/react-query"

import {
  getPurchaseRecordSummaryDetail,
  listPurchaseRecordSummary,
} from "../api"

export function usePurchaseRecordSummaryList() {
  return useQuery({
    queryKey: ["purchase-record-summary", "list"],
    queryFn: listPurchaseRecordSummary,
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
