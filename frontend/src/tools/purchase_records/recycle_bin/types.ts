export type RecycleBinRecord = {
  id: string
  purchase_date: string
  name: string
  amount: number | string | null
  deleted_at: string
}

export type RecycleBinListResponse = {
  data: {
    records: RecycleBinRecord[]
  }
}

export type RecycleBinDetailResponse = {
  data: RecycleBinRecord
}

export type RecycleBinRestoreResponse = {
  message: string
}
