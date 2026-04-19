import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { AlertCircle, Plus, Search, ShieldAlert } from "lucide-react"
import { useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { DataTable } from "@/components/Common/DataTable"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
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
  createExpenseCategory,
  deleteExpenseCategory,
  getApiErrorMessage,
  isForbiddenError,
  updateExpenseCategory,
} from "../api"
import { useExpenseCategoryDetail, useExpenseCategoryList } from "../hooks/use-expense-category"
import type { ExpenseCategoryItem, ExpenseCategoryUpsertPayload } from "../types"
import { buildColumns } from "./columns"

const formSchema = z.object({
  name: z.string().min(1, "大类名称不能为空"),
  description: z.string().optional(),
})

type FormData = z.infer<typeof formSchema>

function toPayload(data: FormData): ExpenseCategoryUpsertPayload {
  return {
    name: data.name.trim(),
    description: data.description?.trim() || null,
  }
}

export default function ExpenseCategoryPage() {
  const queryClient = useQueryClient()
  const { showErrorToast, showSuccessToast } = useCustomToast()

  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [editingItem, setEditingItem] = useState<ExpenseCategoryItem | null>(null)
  const [deletingItem, setDeletingItem] = useState<ExpenseCategoryItem | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  const listQuery = useExpenseCategoryList()
  const detailQuery = useExpenseCategoryDetail(selectedId ?? undefined)

  const records = listQuery.data?.data.list ?? []

  const createForm = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: "onBlur",
    defaultValues: {
      name: "",
      description: "",
    },
  })

  const editForm = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: "onBlur",
    defaultValues: {
      name: "",
      description: "",
    },
  })

  const invalidateList = () => {
    queryClient.invalidateQueries({ queryKey: ["expense-category", "list"] })
  }

  const createMutation = useMutation({
    mutationFn: createExpenseCategory,
    onSuccess: () => {
      showSuccessToast("新增费用大类成功")
      setIsCreateOpen(false)
      createForm.reset()
    },
    onError: (error) => showErrorToast(getApiErrorMessage(error)),
    onSettled: invalidateList,
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: ExpenseCategoryUpsertPayload }) =>
      updateExpenseCategory(id, payload),
    onSuccess: () => {
      showSuccessToast("编辑费用大类成功")
      setEditingItem(null)
    },
    onError: (error) => showErrorToast(getApiErrorMessage(error)),
    onSettled: invalidateList,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteExpenseCategory,
    onSuccess: () => {
      showSuccessToast("删除费用大类成功")
      setDeletingItem(null)
    },
    onError: (error) => showErrorToast(getApiErrorMessage(error)),
    onSettled: invalidateList,
  })

  const columns = useMemo(
    () =>
      buildColumns({
        onOpenDetail: (id) => setSelectedId(id),
        onOpenEdit: (id) => {
          const item = records.find((record) => record.id === id)
          if (!item) {
            return
          }

          editForm.reset({
            name: item.name,
            description: item.description ?? "",
          })
          setEditingItem(item)
        },
        onOpenDelete: (id) => {
          const item = records.find((record) => record.id === id)
          if (!item) {
            return
          }

          setDeletingItem(item)
        },
        deletingId: deletingItem?.id ?? null,
      }),
    [deletingItem?.id, records, editForm],
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">费用大类管理</h1>
          <p className="text-muted-foreground">仅管理员可访问，用于维护费用大类基础数据。</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2" />
          新增费用大类
        </Button>
      </div>

      {listQuery.isLoading ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">费用大类加载中</div>
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
            <h3 className="text-lg font-semibold">暂无费用大类</h3>
            <p className="text-sm text-muted-foreground">请点击右上角按钮创建费用大类。</p>
          </div>
        </div>
      ) : null}

      {!listQuery.isLoading && !listQuery.isError && records.length > 0 ? <DataTable columns={columns} data={records} /> : null}

      <Dialog open={Boolean(selectedId)} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>费用大类详情</DialogTitle>
            <DialogDescription>查看费用大类基础信息。</DialogDescription>
          </DialogHeader>
          {detailQuery.isLoading ? <div className="text-sm text-muted-foreground">详情加载中</div> : null}
          {!detailQuery.isLoading && detailQuery.data?.data ? (
            <div className="grid gap-3 text-sm">
              <div className="grid grid-cols-[96px_1fr] gap-2"><span className="text-muted-foreground">名称</span><span>{detailQuery.data.data.name}</span></div>
              <div className="grid grid-cols-[96px_1fr] gap-2"><span className="text-muted-foreground">描述</span><span>{detailQuery.data.data.description || "-"}</span></div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>新增费用大类</DialogTitle>
            <DialogDescription>请填写费用大类信息。</DialogDescription>
          </DialogHeader>
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit((value) => createMutation.mutate(toPayload(value)))} className="space-y-4">
              <FormField control={createForm.control} name="name" render={({ field }) => (<FormItem><FormLabel>大类名称 <span className="text-destructive">*</span></FormLabel><FormControl><Input placeholder="请输入大类名称" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={createForm.control} name="description" render={({ field }) => (<FormItem><FormLabel>描述</FormLabel><FormControl><Input placeholder="可选" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <DialogFooter>
                <DialogClose asChild><Button variant="outline" disabled={createMutation.isPending}>取消</Button></DialogClose>
                <LoadingButton type="submit" loading={createMutation.isPending}>保存</LoadingButton>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editingItem)} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>编辑费用大类</DialogTitle>
            <DialogDescription>可修改费用大类名称和描述。</DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form
              onSubmit={editForm.handleSubmit((value) => {
                if (!editingItem) {
                  return
                }
                updateMutation.mutate({ id: editingItem.id, payload: toPayload(value) })
              })}
              className="space-y-4"
            >
              <FormField control={editForm.control} name="name" render={({ field }) => (<FormItem><FormLabel>大类名称 <span className="text-destructive">*</span></FormLabel><FormControl><Input placeholder="请输入大类名称" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={editForm.control} name="description" render={({ field }) => (<FormItem><FormLabel>描述</FormLabel><FormControl><Input placeholder="可选" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <DialogFooter>
                <DialogClose asChild><Button variant="outline" disabled={updateMutation.isPending}>取消</Button></DialogClose>
                <LoadingButton type="submit" loading={updateMutation.isPending}>保存</LoadingButton>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deletingItem)} onOpenChange={(open) => !open && setDeletingItem(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>删除费用大类</DialogTitle>
            <DialogDescription>删除前请确认该大类无关联购买记录和小类。</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" disabled={deleteMutation.isPending}>取消</Button></DialogClose>
            <LoadingButton
              variant="destructive"
              loading={deleteMutation.isPending}
              onClick={() => {
                if (!deletingItem) {
                  return
                }
                deleteMutation.mutate(deletingItem.id)
              }}
            >
              删除
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
