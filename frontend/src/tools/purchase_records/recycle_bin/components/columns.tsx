import type { ColumnDef } from "@tanstack/react-table"

import { Button } from "@/components/ui/button"
import type { RecycleBinRecord } from "../types"

type BuildColumnsOptions = {
  onOpenDetail: (id: string) => void
  onRestore: (id: string) => void
  restoringRecordId?: string | null
}

function formatAmount(amount: number | string | null) {
  if (amount === null) {
    return "-"
  }

  const value = typeof amount === "string" ? Number(amount) : amount
  return Number.isFinite(value) ? value.toFixed(2) : "-"
}

function formatDate(value: string) {
  return value.slice(0, 10)
}

export function buildColumns({
  onOpenDetail,
  onRestore,
  restoringRecordId,
}: BuildColumnsOptions): ColumnDef<RecycleBinRecord>[] {
  return [
    {
      accessorKey: "purchase_date",
      header: "购买日期",
      cell: ({ row }) => formatDate(row.original.purchase_date),
    },
    {
      accessorKey: "name",
      header: "名称",
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    {
      accessorKey: "amount",
      header: "购买金额",
      cell: ({ row }) => formatAmount(row.original.amount),
    },
    {
      accessorKey: "deleted_at",
      header: "删除日期",
      cell: ({ row }) => formatDate(row.original.deleted_at),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">操作</span>,
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={() => onOpenDetail(row.original.id)}>
            查看详情
          </Button>
          <Button
            size="sm"
            onClick={() => onRestore(row.original.id)}
            disabled={restoringRecordId === row.original.id}
          >
            恢复
          </Button>
        </div>
      ),
    },
  ]
}
