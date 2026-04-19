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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import useAuth from "@/hooks/useAuth"
import useCustomToast from "@/hooks/useCustomToast"
import {
  createPurchaseRecordSummary,
  deletePurchaseRecordSummary,
  getApiErrorMessage,
  isForbiddenError,
  updatePurchaseRecordSummary,
} from "../api"
import {
  useExpenseCategoryOptions,
  useExpenseSubcategoryOptions,
  usePurchaseRecordSummaryDetail,
  usePurchaseRecordSummaryList,
} from "../hooks/use-purchase-record-summary"
import type {
  ExpenseCategoryOption,
  ExpenseSubcategoryOption,
  PurchaseRecordSummaryItem,
  PurchaseRecordSummaryUpsertPayload,
} from "../types"
import { buildColumns } from "./columns"
import { PurchaseImageUpload } from "./purchase-image-upload"
import { getPurchaseImageUrl, PurchaseImageDetail } from "./purchase-image-viewer"

const OTHER_PROJECT_CATEGORY_NAME = "其他项目费用"

const defaultMajorCategories: ExpenseCategoryOption[] = [
  { id: 1, name: "交通费用", description: null },
  { id: 2, name: "膳食/应酬费用", description: null },
  { id: 3, name: "汽车费用", description: null },
  { id: 4, name: "其他项目费用", description: null },
]

const defaultSubCategories: ExpenseSubcategoryOption[] = [
  { id: 1, name: "自动导航承载车", major_category_id: 4, major_category_name: "其他项目费用", description: null },
  { id: 2, name: "智能喷漆机器人", major_category_id: 4, major_category_name: "其他项目费用", description: null },
  { id: 3, name: "钢筋折弯与结扎机器人", major_category_id: 4, major_category_name: "其他项目费用", description: null },
  { id: 4, name: "生产线车队调度", major_category_id: 4, major_category_name: "其他项目费用", description: null },
  { id: 5, name: "研发部开销", major_category_id: 4, major_category_name: "其他项目费用", description: null },
]

const recordFormSchema = z
  .object({
    purchase_date: z.string().min(1, "购买日期不能为空"),
    name: z.string().min(1, "名称不能为空"),
    amount: z.string().optional().refine((value) => !value || !Number.isNaN(Number(value)), {
      message: "购买金额必须为数字",
    }),
    founder_name: z.string().min(1, "创始人不能为空"),
    major_category_id: z.string().min(1, "大类不能为空"),
    major_category_name: z.string().min(1),
    sub_category_id: z.string().optional(),
    remarks: z.string().optional(),
    purchase_image_url: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.major_category_name !== OTHER_PROJECT_CATEGORY_NAME && value.sub_category_id?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `仅选择“${OTHER_PROJECT_CATEGORY_NAME}”时允许填写小类`,
        path: ["sub_category_id"],
      })
    }
  })

type RecordFormData = z.infer<typeof recordFormSchema>

function toUpsertPayload(data: RecordFormData): PurchaseRecordSummaryUpsertPayload {
  const normalizedAmount = data.amount?.trim()
  const normalizedSubCategoryId = data.sub_category_id?.trim()
  const normalizedRemarks = data.remarks?.trim()
  const normalizedImageUrl = data.purchase_image_url?.trim()
  const allowSubCategory = data.major_category_name === OTHER_PROJECT_CATEGORY_NAME

  const payload = {
    purchase_date: data.purchase_date,
    name: data.name,
    amount: normalizedAmount ? Number(normalizedAmount) : null,
    founder_name: data.founder_name,
    major_category_id: Number(data.major_category_id),
    sub_category_id: allowSubCategory && normalizedSubCategoryId ? Number(normalizedSubCategoryId) : null,
    remarks: normalizedRemarks || null,
    purchase_image_url: normalizedImageUrl || null,
  }

  return payload as PurchaseRecordSummaryUpsertPayload
}

function formatAmount(amount: number | string | null) {
  if (amount === null) {
    return "-"
  }

  const value = typeof amount === "string" ? Number(amount) : amount
  return Number.isFinite(value) ? value.toFixed(2) : "-"
}

function mergeMajorCategoryOptions(fromApi: ExpenseCategoryOption[], records: PurchaseRecordSummaryItem[]) {
  const map = new Map<number, ExpenseCategoryOption>()

  for (const item of defaultMajorCategories) {
    map.set(item.id, item)
  }

  for (const item of fromApi) {
    map.set(item.id, item)
  }

  for (const item of records) {
    if (!map.has(item.major_category_id)) {
      map.set(item.major_category_id, {
        id: item.major_category_id,
        name: item.major_category_name,
        description: null,
      })
    }
  }

  return Array.from(map.values())
}

function mergeSubCategoryOptions(fromApi: ExpenseSubcategoryOption[], records: PurchaseRecordSummaryItem[]) {
  const map = new Map<number, ExpenseSubcategoryOption>()

  for (const item of defaultSubCategories) {
    map.set(item.id, item)
  }

  for (const item of fromApi) {
    map.set(item.id, item)
  }

  for (const item of records) {
    if (item.sub_category_id === null || !item.sub_category_name) {
      continue
    }

    if (!map.has(item.sub_category_id)) {
      map.set(item.sub_category_id, {
        id: item.sub_category_id,
        name: item.sub_category_name,
        major_category_id: item.major_category_id,
        major_category_name: item.major_category_name,
        description: null,
      })
    }
  }

  return Array.from(map.values())
}

export default function PurchaseRecordSummaryPageV2() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { showErrorToast, showSuccessToast } = useCustomToast()

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<PurchaseRecordSummaryItem | null>(null)
  const [deletingRecord, setDeletingRecord] = useState<PurchaseRecordSummaryItem | null>(null)
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null)

  const [majorCategoryFilter, setMajorCategoryFilter] = useState<string>("all")
  const [subCategoryFilter, setSubCategoryFilter] = useState<string>("all")

  const listQuery = usePurchaseRecordSummaryList({
    major_category_id: majorCategoryFilter === "all" ? undefined : Number(majorCategoryFilter),
    sub_category_id: subCategoryFilter === "all" ? undefined : Number(subCategoryFilter),
  })
  const detailQuery = usePurchaseRecordSummaryDetail(selectedRecordId ?? undefined)

  const categoryOptionsQuery = useExpenseCategoryOptions()
  const subCategoryOptionsQuery = useExpenseSubcategoryOptions(
    majorCategoryFilter === "all" ? undefined : Number(majorCategoryFilter),
  )

  const records = listQuery.data?.data.list ?? []

  const majorCategoryOptions = useMemo(
    () => mergeMajorCategoryOptions(categoryOptionsQuery.data?.data.list ?? [], records),
    [categoryOptionsQuery.data?.data.list, records],
  )

  const subCategoryOptions = useMemo(
    () => mergeSubCategoryOptions(subCategoryOptionsQuery.data?.data.list ?? [], records),
    [subCategoryOptionsQuery.data?.data.list, records],
  )

  const visibleSubCategoryFilters = useMemo(() => {
    if (majorCategoryFilter === "all") {
      return subCategoryOptions
    }

    const selectedMajorId = Number(majorCategoryFilter)
    return subCategoryOptions.filter((item) => item.major_category_id === selectedMajorId)
  }, [majorCategoryFilter, subCategoryOptions])

  const createForm = useForm<RecordFormData>({
    resolver: zodResolver(recordFormSchema),
    mode: "onBlur",
    defaultValues: {
      purchase_date: "",
      name: "",
      amount: "",
      founder_name: "",
      major_category_id: "",
      major_category_name: "",
      sub_category_id: "",
      remarks: "",
      purchase_image_url: "",
    },
  })

  const editForm = useForm<RecordFormData>({
    resolver: zodResolver(recordFormSchema),
    mode: "onBlur",
    defaultValues: {
      purchase_date: "",
      name: "",
      amount: "",
      founder_name: "",
      major_category_id: "",
      major_category_name: "",
      sub_category_id: "",
      remarks: "",
      purchase_image_url: "",
    },
  })

  const createMajorCategoryName = createForm.watch("major_category_name")
  const createMajorCategoryId = createForm.watch("major_category_id")
  const editMajorCategoryName = editForm.watch("major_category_name")
  const editMajorCategoryId = editForm.watch("major_category_id")

  const createSubCategoryOptions = useMemo(() => {
    if (!createMajorCategoryId) {
      return []
    }

    return subCategoryOptions.filter((item) => item.major_category_id === Number(createMajorCategoryId))
  }, [createMajorCategoryId, subCategoryOptions])

  const editSubCategoryOptions = useMemo(() => {
    if (!editMajorCategoryId) {
      return []
    }

    return subCategoryOptions.filter((item) => item.major_category_id === Number(editMajorCategoryId))
  }, [editMajorCategoryId, subCategoryOptions])

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
      founder_name: record.founder_name,
      major_category_id: String(record.major_category_id),
      major_category_name: record.major_category_name,
      sub_category_id: record.sub_category_id === null ? "" : String(record.sub_category_id),
      remarks: record.remarks ?? "",
      purchase_image_url: getPurchaseImageUrl(record) ?? "",
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
    [deletingRecord?.id],
  )

  const isSuperuser = Boolean(user?.is_superuser)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">购买记录汇总</h1>
          <p className="text-muted-foreground">
            {isSuperuser
              ? "当前为管理员视角：可查看全部用户的未删除购买记录。"
              : "当前为普通用户视角：仅显示你自己的未删除购买记录。"}
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2" />
          新增购买记录
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">按大类筛选</p>
          <Select
            value={majorCategoryFilter}
            onValueChange={(value) => {
              setMajorCategoryFilter(value)
              setSubCategoryFilter("all")
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="全部大类" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部大类</SelectItem>
              {majorCategoryOptions.map((item) => (
                <SelectItem key={item.id} value={String(item.id)}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">按小类筛选</p>
          <Select value={subCategoryFilter} onValueChange={setSubCategoryFilter}>
            <SelectTrigger>
              <SelectValue placeholder="全部小类" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部小类</SelectItem>
              {visibleSubCategoryFilters.map((item) => (
                <SelectItem key={item.id} value={String(item.id)}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-end">
          <Button
            variant="outline"
            onClick={() => {
              setMajorCategoryFilter("all")
              setSubCategoryFilter("all")
            }}
          >
            重置筛选
          </Button>
        </div>
      </div>

      {listQuery.isLoading ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">购买记录汇总加载中</div>
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
            <p className="text-sm text-muted-foreground">当前权限与筛选条件下没有可显示的购买记录。</p>
          </div>
        </div>
      ) : null}

      {!listQuery.isLoading && !listQuery.isError && records.length > 0 ? <DataTable columns={columns} data={records} /> : null}

      <Dialog open={Boolean(selectedRecordId)} onOpenChange={(open) => !open && setSelectedRecordId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>购买记录详情</DialogTitle>
            <DialogDescription>展示购买记录全部字段。</DialogDescription>
          </DialogHeader>

          {detailQuery.isLoading ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">购买记录详情加载中</div>
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
              <div className="grid grid-cols-[96px_1fr] gap-2"><span className="text-muted-foreground">购买日期</span><span>{detailQuery.data.data.purchase_date.slice(0, 10)}</span></div>
              <div className="grid grid-cols-[96px_1fr] gap-2"><span className="text-muted-foreground">名称</span><span>{detailQuery.data.data.name}</span></div>
              <div className="grid grid-cols-[96px_1fr] gap-2"><span className="text-muted-foreground">购买金额</span><span>{formatAmount(detailQuery.data.data.amount)}</span></div>
              <div className="grid grid-cols-[96px_1fr] gap-2"><span className="text-muted-foreground">创始人</span><span>{detailQuery.data.data.founder_name || "-"}</span></div>
              <div className="grid grid-cols-[96px_1fr] gap-2"><span className="text-muted-foreground">大类</span><span>{detailQuery.data.data.major_category_name || "-"}</span></div>
              <div className="grid grid-cols-[96px_1fr] gap-2"><span className="text-muted-foreground">小类</span><span>{detailQuery.data.data.sub_category_name || "-"}</span></div>
              <div className="grid grid-cols-[96px_1fr] gap-2"><span className="text-muted-foreground">备注</span><span>{detailQuery.data.data.remarks || "-"}</span></div>
              <PurchaseImageDetail url={getPurchaseImageUrl(detailQuery.data.data)} alt={`购买记录-${detailQuery.data.data.name}-图片`} />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>新增购买记录</DialogTitle>
            <DialogDescription>请填写购买记录完整信息。</DialogDescription>
          </DialogHeader>

          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(submitCreate)} className="space-y-4">
              <FormField control={createForm.control} name="purchase_date" render={({ field }) => (<FormItem><FormLabel>购买日期 <span className="text-destructive">*</span></FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={createForm.control} name="name" render={({ field }) => (<FormItem><FormLabel>名称 <span className="text-destructive">*</span></FormLabel><FormControl><Input placeholder="请输入名称" type="text" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={createForm.control} name="amount" render={({ field }) => (<FormItem><FormLabel>购买金额</FormLabel><FormControl><Input placeholder="可选，例：88.00" type="text" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={createForm.control} name="founder_name" render={({ field }) => (<FormItem><FormLabel>创始人 <span className="text-destructive">*</span></FormLabel><FormControl><Input placeholder="请输入创始人" type="text" {...field} /></FormControl><FormMessage /></FormItem>)} />

              <FormField
                control={createForm.control}
                name="major_category_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>大类 <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={(value) => {
                        field.onChange(value)
                        const selectedMajor = majorCategoryOptions.find((item) => String(item.id) === value)
                        createForm.setValue("major_category_name", selectedMajor?.name ?? "")
                        if (selectedMajor?.name !== OTHER_PROJECT_CATEGORY_NAME) {
                          createForm.setValue("sub_category_id", "")
                        }
                      }}>
                        <SelectTrigger><SelectValue placeholder="请选择费用大类" /></SelectTrigger>
                        <SelectContent>
                          {majorCategoryOptions.map((item) => (
                            <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {createMajorCategoryName === OTHER_PROJECT_CATEGORY_NAME ? (
                <FormField
                  control={createForm.control}
                  name="sub_category_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>小类</FormLabel>
                      <FormControl>
                        <Select value={field.value || "none"} onValueChange={(value) => field.onChange(value === "none" ? "" : value)}>
                          <SelectTrigger><SelectValue placeholder="可选：请选择小类" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">不选择小类</SelectItem>
                            {createSubCategoryOptions.map((item) => (
                              <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : null}

              <FormField control={createForm.control} name="remarks" render={({ field }) => (<FormItem><FormLabel>备注</FormLabel><FormControl><Input placeholder="可选" type="text" {...field} /></FormControl><FormMessage /></FormItem>)} />

              <FormField
                control={createForm.control}
                name="purchase_image_url"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <PurchaseImageUpload
                        value={field.value || null}
                        onChange={(url) => field.onChange(url || "")}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <DialogClose asChild><Button variant="outline" disabled={createMutation.isPending}>取消</Button></DialogClose>
                <LoadingButton type="submit" loading={createMutation.isPending}>保存</LoadingButton>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editingRecord)} onOpenChange={(open) => !open && setEditingRecord(null)}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>编辑购买记录</DialogTitle>
            <DialogDescription>可编辑购买记录完整信息。</DialogDescription>
          </DialogHeader>

          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(submitEdit)} className="space-y-4">
              <FormField control={editForm.control} name="purchase_date" render={({ field }) => (<FormItem><FormLabel>购买日期 <span className="text-destructive">*</span></FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={editForm.control} name="name" render={({ field }) => (<FormItem><FormLabel>名称 <span className="text-destructive">*</span></FormLabel><FormControl><Input placeholder="请输入名称" type="text" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={editForm.control} name="amount" render={({ field }) => (<FormItem><FormLabel>购买金额</FormLabel><FormControl><Input placeholder="可选，例：88.00" type="text" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={editForm.control} name="founder_name" render={({ field }) => (<FormItem><FormLabel>创始人 <span className="text-destructive">*</span></FormLabel><FormControl><Input placeholder="请输入创始人" type="text" {...field} /></FormControl><FormMessage /></FormItem>)} />

              <FormField
                control={editForm.control}
                name="major_category_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>大类 <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={(value) => {
                        field.onChange(value)
                        const selectedMajor = majorCategoryOptions.find((item) => String(item.id) === value)
                        editForm.setValue("major_category_name", selectedMajor?.name ?? "")
                        if (selectedMajor?.name !== OTHER_PROJECT_CATEGORY_NAME) {
                          editForm.setValue("sub_category_id", "")
                        }
                      }}>
                        <SelectTrigger><SelectValue placeholder="请选择费用大类" /></SelectTrigger>
                        <SelectContent>
                          {majorCategoryOptions.map((item) => (
                            <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {editMajorCategoryName === OTHER_PROJECT_CATEGORY_NAME ? (
                <FormField
                  control={editForm.control}
                  name="sub_category_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>小类</FormLabel>
                      <FormControl>
                        <Select value={field.value || "none"} onValueChange={(value) => field.onChange(value === "none" ? "" : value)}>
                          <SelectTrigger><SelectValue placeholder="可选：请选择小类" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">不选择小类</SelectItem>
                            {editSubCategoryOptions.map((item) => (
                              <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : null}

              <FormField control={editForm.control} name="remarks" render={({ field }) => (<FormItem><FormLabel>备注</FormLabel><FormControl><Input placeholder="可选" type="text" {...field} /></FormControl><FormMessage /></FormItem>)} />

              <FormField
                control={editForm.control}
                name="purchase_image_url"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <PurchaseImageUpload
                        value={field.value || null}
                        onChange={(url) => field.onChange(url || "")}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <DialogClose asChild><Button variant="outline" disabled={updateMutation.isPending}>取消</Button></DialogClose>
                <LoadingButton type="submit" loading={updateMutation.isPending}>保存</LoadingButton>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deletingRecord)} onOpenChange={(open) => !open && setDeletingRecord(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>删除购买记录</DialogTitle>
            <DialogDescription>删除后该记录将逻辑删除，并且默认列表不再显示。是否确认删除？</DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <DialogClose asChild><Button variant="outline" disabled={deleteMutation.isPending}>取消</Button></DialogClose>
            <LoadingButton variant="destructive" loading={deleteMutation.isPending} onClick={submitDelete}>删除</LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
