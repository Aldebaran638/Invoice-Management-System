import type { ColumnDef } from "@tanstack/react-table"

import { Button } from "@/components/ui/button"
import type { ExpenseSubcategoryItem } from "../types"

type BuildColumnsOptions = {
  onOpenDetail: (id: number) => void
  onOpenEdit: (id: number) => void
  onOpenDelete: (id: number) => void
  deletingId?: number | null
}

export function buildColumns({
  onOpenDetail,
  onOpenEdit,
  onOpenDelete,
  deletingId,
}: BuildColumnsOptions): ColumnDef<ExpenseSubcategoryItem>[] {
  return [
    {
      accessorKey: "name",
      header: "小类名称",
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    {
      accessorKey: "major_category_name",
      header: "所属大类",
      cell: ({ row }) => row.original.major_category_name || "-",
    },
    {
      accessorKey: "description",
      header: "描述",
      cell: ({ row }) => row.original.description || "-",
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
            disabled={deletingId === row.original.id}
          >
            删除
          </Button>
        </div>
      ),
    },
  ]
}
