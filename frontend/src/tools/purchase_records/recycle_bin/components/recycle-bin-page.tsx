import { useMutation, useQueryClient } from "@tanstack/react-query"
import { AlertCircle, Search, ShieldAlert } from "lucide-react"
import { useMemo, useState } from "react"

import { DataTable } from "@/components/Common/DataTable"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import useCustomToast from "@/hooks/useCustomToast"
import {
  getApiErrorMessage,
  isForbiddenError,
  restoreRecycleBinRecord,
} from "../api"
import { useRecycleBinDetail, useRecycleBinList } from "../hooks/use-recycle-bin"
import type { RecycleBinListResponse } from "../types"
import { buildColumns } from "./columns"

function formatAmount(amount: number | string | null) {
  if (amount === null) {
    return "-"
  }

  const value = typeof amount === "string" ? Number(amount) : amount
  return Number.isFinite(value) ? value.toFixed(2) : "-"
}

export default function RecycleBinPage() {
  const queryClient = useQueryClient()
  const { showErrorToast, showSuccessToast } = useCustomToast()

  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null)
  const [restoringRecordId, setRestoringRecordId] = useState<string | null>(null)

  const listQuery = useRecycleBinList()
  const detailQuery = useRecycleBinDetail(selectedRecordId ?? undefined)

  const records = listQuery.data?.data.records ?? []

  const restoreMutation = useMutation({
    mutationFn: restoreRecycleBinRecord,
    onSuccess: (_response, recordId) => {
      showSuccessToast("恢复成功")

      queryClient.setQueryData(
        ["recycle-bin", "list"],
        (prev: RecycleBinListResponse | undefined) => {
          if (!prev) {
            return prev
          }

          return {
            data: {
              records: prev.data.records.filter((record) => record.id !== recordId),
            },
          }
        },
      )

      queryClient.invalidateQueries({ queryKey: ["recycle-bin", "list"] })

      if (selectedRecordId === recordId) {
        setSelectedRecordId(null)
      }
    },
    onError: (error) => {
      showErrorToast(getApiErrorMessage(error))
    },
    onSettled: () => {
      setRestoringRecordId(null)
    },
  })

  const handleRestore = (recordId: string) => {
    setRestoringRecordId(recordId)
    restoreMutation.mutate(recordId)
  }

  const columns = useMemo(
    () =>
      buildColumns({
        onOpenDetail: (id) => setSelectedRecordId(id),
        onRestore: handleRestore,
        restoringRecordId,
      }),
    [restoringRecordId],
  )

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">回收站</h1>
        <p className="text-muted-foreground">仅展示你自己已逻辑删除的购买记录，可执行恢复操作。</p>
      </div>

      {listQuery.isLoading ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          回收站加载中
        </div>
      ) : null}

      {!listQuery.isLoading && listQuery.isError ? (
        <Alert variant="destructive">
          {isForbiddenError(listQuery.error) ? <ShieldAlert /> : <AlertCircle />}
          <AlertTitle>{isForbiddenError(listQuery.error) ? "权限不足" : "接口失败"}</AlertTitle>
          <AlertDescription>{getApiErrorMessage(listQuery.error)}</AlertDescription>
        </Alert>
      ) : null}

      {!listQuery.isLoading && !listQuery.isError && records.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-10 text-center">
          <div className="rounded-full bg-muted p-4">
            <Search className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">回收站为空</h3>
            <p className="text-sm text-muted-foreground">当前没有可恢复的已删除记录。</p>
          </div>
        </div>
      ) : null}

      {!listQuery.isLoading && !listQuery.isError && records.length > 0 ? (
        <DataTable columns={columns} data={records} />
      ) : null}

      <Dialog open={Boolean(selectedRecordId)} onOpenChange={(open) => !open && setSelectedRecordId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>回收站详情</DialogTitle>
            <DialogDescription>仅展示购买日期、名称、购买金额、删除日期。</DialogDescription>
          </DialogHeader>

          {detailQuery.isLoading ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
              回收站详情加载中
            </div>
          ) : null}

          {!detailQuery.isLoading && detailQuery.isError ? (
            <Alert variant="destructive">
              {isForbiddenError(detailQuery.error) ? <ShieldAlert /> : <AlertCircle />}
              <AlertTitle>{isForbiddenError(detailQuery.error) ? "权限不足" : "接口失败"}</AlertTitle>
              <AlertDescription>{getApiErrorMessage(detailQuery.error)}</AlertDescription>
            </Alert>
          ) : null}

          {!detailQuery.isLoading && !detailQuery.isError && detailQuery.data?.data ? (
            <div className="grid gap-3 text-sm">
              <div className="grid grid-cols-[96px_1fr] gap-2">
                <span className="text-muted-foreground">购买日期</span>
                <span>{detailQuery.data.data.purchase_date.slice(0, 10)}</span>
              </div>
              <div className="grid grid-cols-[96px_1fr] gap-2">
                <span className="text-muted-foreground">名称</span>
                <span>{detailQuery.data.data.name}</span>
              </div>
              <div className="grid grid-cols-[96px_1fr] gap-2">
                <span className="text-muted-foreground">购买金额</span>
                <span>{formatAmount(detailQuery.data.data.amount)}</span>
              </div>
              <div className="grid grid-cols-[96px_1fr] gap-2">
                <span className="text-muted-foreground">删除日期</span>
                <span>{detailQuery.data.data.deleted_at.slice(0, 10)}</span>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
