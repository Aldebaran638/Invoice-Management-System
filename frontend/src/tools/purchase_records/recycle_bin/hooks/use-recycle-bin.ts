import { useQuery } from "@tanstack/react-query"

import {
  getRecycleBinRecordDetail,
  listRecycleBinRecords,
} from "../api"

export function useRecycleBinList() {
  return useQuery({
    queryKey: ["recycle-bin", "list"],
    queryFn: listRecycleBinRecords,
    retry: false,
  })
}

export function useRecycleBinDetail(recordId?: string) {
  return useQuery({
    queryKey: ["recycle-bin", "detail", recordId],
    queryFn: () => getRecycleBinRecordDetail(recordId as string),
    enabled: Boolean(recordId),
    retry: false,
  })
}
