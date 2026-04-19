import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { AlertCircle, Plus, Search, ShieldAlert } from "lucide-react"
import { useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { DataTable } from "@/components/Common/DataTable"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { LoadingButton } from "@/components/ui/loading-button"
import useCustomToast from "@/hooks/useCustomToast"
import {
  createPurchaseRecordSummary,
  deletePurchaseRecordSummary,
  getApiErrorMessage,
  isForbiddenError,
  updatePurchaseRecordSummary,
} from "../api"
import { usePurchaseRecordSummaryDetail, usePurchaseRecordSummaryList } from "../hooks/use-purchase-record-summary"
import type { PurchaseRecordSummaryItem, PurchaseRecordSummaryUpsertPayload } from "../types"
import { buildColumns } from "./columns"

const recordFormSchema = z.object({
  purchase_date: z.string().min(1, "购买日期不能为空"),
  name: z.string().min(1, "名称不能为空"),
  amount: z
    .string()
    .optional()
    .refine((value) => !value || !Number.isNaN(Number(value)), {
      message: "购买金额必须为数字",
    }),
})

type RecordFormData = z.infer<typeof recordFormSchema>

function toUpsertPayload(data: RecordFormData): PurchaseRecordSummaryUpsertPayload {
  const normalizedAmount = data.amount?.trim()
  return {
    purchase_date: data.purchase_date,
    name: data.name,
    amount: normalizedAmount ? Number(normalizedAmount) : null,
  }
}

function formatAmount(amount: number | string | null) {
  if (amount === null) {
    return "-"
  }

  const value = typeof amount === "string" ? Number(amount) : amount
  return Number.isFinite(value) ? value.toFixed(2) : "-"
}

export default function PurchaseRecordSummaryPage() {
  const queryClient = useQueryClient()
  const { showErrorToast, showSuccessToast } = useCustomToast()

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<PurchaseRecordSummaryItem | null>(null)
  const [deletingRecord, setDeletingRecord] = useState<PurchaseRecordSummaryItem | null>(null)
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null)

  const listQuery = usePurchaseRecordSummaryList()
  const detailQuery = usePurchaseRecordSummaryDetail(selectedRecordId ?? undefined)

  const records = listQuery.data?.data.records ?? []

  const createForm = useForm<RecordFormData>({
    resolver: zodResolver(recordFormSchema),
    mode: "onBlur",
    defaultValues: {
      purchase_date: "",
      name: "",
      amount: "",
    },
  })

  const editForm = useForm<RecordFormData>({
    resolver: zodResolver(recordFormSchema),
    mode: "onBlur",
    defaultValues: {
      purchase_date: "",
      name: "",
      amount: "",
    },
  })

  const invalidateList = () => {
    queryClient.invalidateQueries({ queryKey: ["purchase-record-summary", "list"] })
  }

  const createMutation = useMutation({
    mutationFn: createPurchaseRecordSummary,
    onSuccess: () => {
      showSuccessToast("新增购买记录成功")
      setIsCreateOpen(false)
      createForm.reset()
    },
    onError: (error) => {
      showErrorToast(getApiErrorMessage(error))
    },
    onSettled: invalidateList,
  })

  const updateMutation = useMutation({
    mutationFn: ({ recordId, payload }: { recordId: string; payload: PurchaseRecordSummaryUpsertPayload }) =>
      updatePurchaseRecordSummary(recordId, payload),
    onSuccess: () => {
      showSuccessToast("编辑购买记录成功")
      setEditingRecord(null)
    },
    onError: (error) => {
      showErrorToast(getApiErrorMessage(error))
    },
    onSettled: invalidateList,
  })

  const deleteMutation = useMutation({
    mutationFn: deletePurchaseRecordSummary,
    onSuccess: () => {
      showSuccessToast("删除购买记录成功")
      setDeletingRecord(null)
      if (selectedRecordId) {
        setSelectedRecordId(null)
      }
    },
    onError: (error) => {
      showErrorToast(getApiErrorMessage(error))
    },
    onSettled: invalidateList,
  })

  const openEditDialog = (recordId: string) => {
    const record = records.find((item) => item.id === recordId)
    if (!record) {
      return
    }

    editForm.reset({
      purchase_date: record.purchase_date.slice(0, 10),
      name: record.name,
      amount: record.amount === null ? "" : String(record.amount),
    })
    setEditingRecord(record)
  }

  const openDeleteDialog = (recordId: string) => {
    const record = records.find((item) => item.id === recordId)
    if (!record) {
      return
    }

    setDeletingRecord(record)
  }

  const submitCreate = (data: RecordFormData) => {
    createMutation.mutate(toUpsertPayload(data))
  }

  const submitEdit = (data: RecordFormData) => {
    if (!editingRecord) {
      return
    }

    updateMutation.mutate({
      recordId: editingRecord.id,
      payload: toUpsertPayload(data),
    })
  }

  const submitDelete = () => {
    if (!deletingRecord) {
      return
    }

    deleteMutation.mutate(deletingRecord.id)
  }

  const columns = useMemo(
    () =>
      buildColumns({
        onOpenDetail: (id) => setSelectedRecordId(id),
        onOpenEdit: openEditDialog,
        onOpenDelete: openDeleteDialog,
        deletingRecordId: deletingRecord?.id ?? null,
      }),
    [deletingRecord?.id, records],
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">购买记录汇总</h1>
          <p className="text-muted-foreground">当前仅显示你自己的未删除购买记录。</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2" />
          新增购买记录
        </Button>
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
                <span>{formatAmount(detailQuery.data.data.amount)}</span>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>新增购买记录</DialogTitle>
            <DialogDescription>仅填写购买日期、名称、购买金额。</DialogDescription>
          </DialogHeader>

          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(submitCreate)} className="space-y-4">
              <FormField
                control={createForm.control}
                name="purchase_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      购买日期 <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      名称 <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="请输入名称" type="text" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>购买金额</FormLabel>
                    <FormControl>
                      <Input placeholder="可选，例：88.00" type="text" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline" disabled={createMutation.isPending}>
                    取消
                  </Button>
                </DialogClose>
                <LoadingButton type="submit" loading={createMutation.isPending}>
                  保存
                </LoadingButton>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editingRecord)} onOpenChange={(open) => !open && setEditingRecord(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>编辑购买记录</DialogTitle>
            <DialogDescription>仅允许编辑购买日期、名称、购买金额。</DialogDescription>
          </DialogHeader>

          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(submitEdit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="purchase_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      购买日期 <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      名称 <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="请输入名称" type="text" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>购买金额</FormLabel>
                    <FormControl>
                      <Input placeholder="可选，例：88.00" type="text" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline" disabled={updateMutation.isPending}>
                    取消
                  </Button>
                </DialogClose>
                <LoadingButton type="submit" loading={updateMutation.isPending}>
                  保存
                </LoadingButton>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deletingRecord)} onOpenChange={(open) => !open && setDeletingRecord(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>删除购买记录</DialogTitle>
            <DialogDescription>
              删除后该记录将逻辑删除，并且默认列表不再显示。是否确认删除？
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={deleteMutation.isPending}>
                取消
              </Button>
            </DialogClose>
            <LoadingButton
              variant="destructive"
              loading={deleteMutation.isPending}
              onClick={submitDelete}
            >
              删除
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
