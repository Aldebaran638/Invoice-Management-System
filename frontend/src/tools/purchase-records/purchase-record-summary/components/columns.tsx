import type { ColumnDef } from "@tanstack/react-table"

import { Button } from "@/components/ui/button"
import type { PurchaseRecordSummaryItem } from "../types"

type BuildColumnsOptions = {
  onOpenDetail: (id: string) => void
}

function formatAmount(amount: number | string) {
  const value = typeof amount === "string" ? Number(amount) : amount
  return Number.isFinite(value) ? value.toFixed(2) : "0.00"
}

function formatDate(value: string) {
  return value.slice(0, 10)
}

export function buildColumns({
  onOpenDetail,
}: BuildColumnsOptions): ColumnDef<PurchaseRecordSummaryItem>[] {
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
      id: "detail",
      header: () => <span className="sr-only">详情</span>,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <Button size="sm" variant="outline" onClick={() => onOpenDetail(row.original.id)}>
            查看详情
          </Button>
        </div>
      ),
    },
  ]
}
