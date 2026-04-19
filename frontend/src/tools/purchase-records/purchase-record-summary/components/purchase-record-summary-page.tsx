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
import useAuth from "@/hooks/useAuth"
import {
  getApiErrorMessage,
  isForbiddenError,
} from "../api"
import { usePurchaseRecordSummaryDetail, usePurchaseRecordSummaryList } from "../hooks/use-purchase-record-summary"
import { buildColumns } from "./columns"

export default function PurchaseRecordSummaryPage() {
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null)
  const { user: currentUser } = useAuth()

  const listQuery = usePurchaseRecordSummaryList()
  const detailQuery = usePurchaseRecordSummaryDetail(selectedRecordId ?? undefined)

  const records = listQuery.data?.data.records ?? []

  const columns = useMemo(
    () =>
      buildColumns({
        onOpenDetail: (id) => setSelectedRecordId(id),
      }),
    [],
  )

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">购买记录汇总</h1>
        <p className="text-muted-foreground">
          {currentUser?.is_superuser
            ? "当前显示全部购买记录。"
            : "当前仅显示你自己的购买记录。"}
        </p>
      </div>

      {listQuery.isLoading ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          购买记录汇总加载中
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
            <h3 className="text-lg font-semibold">暂无购买记录</h3>
            <p className="text-sm text-muted-foreground">当前权限下没有可显示的购买记录。</p>
          </div>
        </div>
      ) : null}

      {!listQuery.isLoading && !listQuery.isError && records.length > 0 ? (
        <DataTable columns={columns} data={records} />
      ) : null}

      <Dialog open={Boolean(selectedRecordId)} onOpenChange={(open) => !open && setSelectedRecordId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>购买记录详情</DialogTitle>
            <DialogDescription>仅展示购买日期、名称、购买金额。</DialogDescription>
          </DialogHeader>

          {detailQuery.isLoading ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
              购买记录详情加载中
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
                <span>
                  {typeof detailQuery.data.data.amount === "string"
                    ? Number(detailQuery.data.data.amount).toFixed(2)
                    : detailQuery.data.data.amount.toFixed(2)}
                </span>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
