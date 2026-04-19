import type { ColumnDef } from "@tanstack/react-table"

import { Button } from "@/components/ui/button"
import type { PurchaseRecordSummaryItem } from "../types"
import { getPurchaseImageUrl, PurchaseImageThumbnail } from "./purchase-image-viewer"

type BuildColumnsOptions = {
  onOpenDetail: (id: string) => void
  onOpenEdit: (id: string) => void
  onOpenDelete: (id: string) => void
  deletingRecordId?: string | null
}

function formatAmount(amount: number | string | null) {
  if (amount === null) {
    return "-"
  }

  const value = typeof amount === "string" ? Number(amount) : amount
  return Number.isFinite(value) ? value.toFixed(2) : "0.00"
}

function formatDate(value: string) {
  return value.slice(0, 10)
}

export function buildColumns({
  onOpenDetail,
  onOpenEdit,
  onOpenDelete,
  deletingRecordId,
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
      id: "purchase_image",
      header: "图片",
      cell: ({ row }) => (
        <PurchaseImageThumbnail
          url={getPurchaseImageUrl(row.original)}
          alt={`购买记录-${row.original.name}-缩略图`}
        />
      ),
    },
    {
      accessorKey: "founder_name",
      header: "创始人",
      cell: ({ row }) => row.original.founder_name || "-",
    },
    {
      accessorKey: "major_category_name",
      header: "大类",
      cell: ({ row }) => row.original.major_category_name || "-",
    },
    {
      accessorKey: "sub_category_name",
      header: "小类",
      cell: ({ row }) => row.original.sub_category_name || "-",
    },
    {
      accessorKey: "remarks",
      header: "备注",
      cell: ({ row }) => row.original.remarks || "-",
    },
    {
      id: "actions",
      header: () => <span className="sr-only">操作</span>,
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={() => onOpenDetail(row.original.id)}>
            查看详情
          </Button>
          <Button size="sm" variant="outline" onClick={() => onOpenEdit(row.original.id)}>
            编辑
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => onOpenDelete(row.original.id)}
            disabled={deletingRecordId === row.original.id}
          >
            删除
          </Button>
        </div>
      ),
    },
  ]
}
