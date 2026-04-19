export type PurchaseRecordSummaryItem = {
  id: string
  purchase_date: string
  name: string
  amount: number | string | null
}

export type PurchaseRecordSummaryUpsertPayload = {
  purchase_date: string
  name: string
  amount: number | null
}

export type PurchaseRecordSummaryListResponse = {
  data: {
    records: PurchaseRecordSummaryItem[]
  }
}

export type PurchaseRecordSummaryDetailResponse = {
  data: PurchaseRecordSummaryItem
}

export type PurchaseRecordSummaryCreateResponse = {
  data: PurchaseRecordSummaryItem
}

export type PurchaseRecordSummaryUpdateResponse = {
  data: PurchaseRecordSummaryItem
}

export type PurchaseRecordSummaryDeleteResponse = {
  message: string
}
