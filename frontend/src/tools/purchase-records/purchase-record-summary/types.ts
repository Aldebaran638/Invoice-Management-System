export type PurchaseRecordSummaryItem = {
  id: string
  purchase_date: string
  name: string
  amount: number | string
}

export type PurchaseRecordSummaryListResponse = {
  data: {
    records: PurchaseRecordSummaryItem[]
  }
}

export type PurchaseRecordSummaryDetailResponse = {
  data: PurchaseRecordSummaryItem
}
