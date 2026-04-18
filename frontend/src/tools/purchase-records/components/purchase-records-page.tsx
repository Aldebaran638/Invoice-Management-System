import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { AlertCircle, Pencil, Plus, Search, ShieldAlert, Trash2 } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import type { UseFormSetError } from "react-hook-form"

import useAuth from "@/hooks/useAuth"
import useCustomToast from "@/hooks/useCustomToast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  createCategory,
  createPurchaseRecord,
  createSubcategory,
  deletePurchaseRecord,
  getApiErrorMessage,
  getApiFieldErrors,
  getPurchaseRecord,
  isForbiddenError,
  listCategories,
  listPurchaseRecords,
  listSubcategories,
  updateCategory,
  updatePurchaseRecord,
  updateSubcategory,
} from "../api"
import {
  categoryFormSchema,
  purchaseRecordFormSchema,
  subcategoryFormSchema,
} from "../schemas"
import { usePurchaseRecordFilters } from "../hooks/use-purchase-record-filters"
import type {
  ApiFieldErrorDetails,
  Category,
  CategoryFormValues,
  PurchaseRecord,
  PurchaseRecordFormValues,
  PurchaseRecordsView,
  Subcategory,
  SubcategoryFormValues,
} from "../types"

const OTHER_EXPENSE_CATEGORY_NAME = "其他费用"
const ALL_VALUE = "__all__"

interface PurchaseRecordsPageProps {
  view: PurchaseRecordsView
}

export default function PurchaseRecordsPage({
  view,
}: PurchaseRecordsPageProps) {
  const navigate = useNavigate()
  const { user: currentUser } = useAuth()
  const isSuperuser = currentUser?.is_superuser ?? false
  const hasPermission = view === "records" || isSuperuser

  const switchView = (nextView: PurchaseRecordsView) => {
    navigate({
      to: "/purchase-records",
      search: { view: nextView },
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">购买记录汇总</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={view === "records" ? "default" : "outline"}
            onClick={() => switchView("records")}
          >
            购买记录
          </Button>
          {isSuperuser && (
            <>
              <Button
                variant={view === "categories" ? "default" : "outline"}
                onClick={() => switchView("categories")}
              >
                大类
              </Button>
              <Button
                variant={view === "subcategories" ? "default" : "outline"}
                onClick={() => switchView("subcategories")}
              >
                小类
              </Button>
            </>
          )}
        </div>
      </div>

      {!hasPermission ? (
        <PermissionDeniedState onBack={() => switchView("records")} />
      ) : null}

      {hasPermission && view === "records" ? <RecordsSection /> : null}
      {hasPermission && view === "categories" ? <CategoriesSection /> : null}
      {hasPermission && view === "subcategories" ? <SubcategoriesSection /> : null}
    </div>
  )
}

function RecordsSection() {
  const queryClient = useQueryClient()
  const { user: currentUser } = useAuth()
  const { showErrorToast, showSuccessToast } = useCustomToast()
  const isSuperuser = currentUser?.is_superuser ?? false
  const {
    appliedFilters,
    applyFilters,
    draftFilters,
    resetFilters,
    setDraftFilters,
    setPage,
    setPageSize,
    validationError,
    setValidationError,
  } = usePurchaseRecordFilters()
  const [createOpen, setCreateOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<PurchaseRecord | null>(null)
  const [deletingRecord, setDeletingRecord] = useState<PurchaseRecord | null>(null)

  const categoriesQuery = useQuery({
    queryKey: ["purchase-records", "record-categories", isSuperuser],
    queryFn: () => listCategories({ active_only: isSuperuser ? false : true }),
  })

  const selectedCategory = categoriesQuery.data?.data.categories.find(
    (category) => category.id === draftFilters.category_id,
  )
  const shouldLoadFilterSubcategories =
    selectedCategory?.name === OTHER_EXPENSE_CATEGORY_NAME

  const subcategoriesQuery = useQuery({
    queryKey: [
      "purchase-records",
      "record-subcategories",
      draftFilters.category_id,
      isSuperuser,
    ],
    queryFn: () =>
      listSubcategories({
        category_id: draftFilters.category_id || undefined,
        active_only: isSuperuser ? false : true,
      }),
    enabled: shouldLoadFilterSubcategories,
  })

  const recordsQuery = useQuery({
    queryKey: ["purchase-records", "records", appliedFilters],
    queryFn: () => listPurchaseRecords(appliedFilters),
  })

  const records = recordsQuery.data?.data.records ?? []
  const total = recordsQuery.data?.data.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / appliedFilters.page_size))

  const onFilterSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    applyFilters()
  }

  const onFilterReset = () => {
    resetFilters()
  }

  const onCategoryChange = (value: string) => {
    setDraftFilters((current) => ({
      ...current,
      category_id: value === ALL_VALUE ? "" : value,
      subcategory_id: "",
      page: 1,
    }))
    setValidationError(null)
  }

  const onSubcategoryChange = (value: string) => {
    setDraftFilters((current) => ({
      ...current,
      subcategory_id: value === ALL_VALUE ? "" : value,
      page: 1,
    }))
    setValidationError(null)
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>筛选条件</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" onSubmit={onFilterSubmit}>
            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="record-title-filter">
                标题关键字
              </label>
              <Input
                id="record-title-filter"
                value={draftFilters.title ?? ""}
                onChange={(event) =>
                  setDraftFilters((current) => ({
                    ...current,
                    title: event.target.value,
                    page: 1,
                  }))
                }
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">大类</label>
              <Select
                value={draftFilters.category_id || ALL_VALUE}
                onValueChange={onCategoryChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="全部大类" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_VALUE}>全部大类</SelectItem>
                  {(categoriesQuery.data?.data.categories ?? []).map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">小类</label>
              <Select
                value={draftFilters.subcategory_id || ALL_VALUE}
                onValueChange={onSubcategoryChange}
                disabled={!shouldLoadFilterSubcategories}
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={
                      shouldLoadFilterSubcategories ? "全部小类" : "仅“其他费用”可选"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_VALUE}>全部小类</SelectItem>
                  {(subcategoriesQuery.data?.data.subcategories ?? []).map((subcategory) => (
                    <SelectItem key={subcategory.id} value={subcategory.id}>
                      {subcategory.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="record-owner-filter">
                上传人ID
              </label>
              <Input
                id="record-owner-filter"
                value={draftFilters.owner_id ?? ""}
                onChange={(event) =>
                  setDraftFilters((current) => ({
                    ...current,
                    owner_id: event.target.value,
                    page: 1,
                  }))
                }
                disabled={!isSuperuser}
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="record-date-start">
                开始日期
              </label>
              <Input
                id="record-date-start"
                type="date"
                value={draftFilters.purchase_date_start ?? ""}
                onChange={(event) =>
                  setDraftFilters((current) => ({
                    ...current,
                    purchase_date_start: event.target.value,
                    page: 1,
                  }))
                }
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="record-date-end">
                结束日期
              </label>
              <Input
                id="record-date-end"
                type="date"
                value={draftFilters.purchase_date_end ?? ""}
                onChange={(event) =>
                  setDraftFilters((current) => ({
                    ...current,
                    purchase_date_end: event.target.value,
                    page: 1,
                  }))
                }
              />
            </div>

            <div className="flex items-end gap-2 xl:col-span-2">
              <Button type="submit">查询</Button>
              <Button type="button" variant="outline" onClick={onFilterReset}>
                重置
              </Button>
            </div>
          </form>

          {validationError ? (
            <div className="mt-4">
              <Alert variant="destructive">
                <AlertCircle />
                <AlertTitle>参数校验错误</AlertTitle>
                <AlertDescription>{validationError}</AlertDescription>
              </Alert>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle>购买记录</CardTitle>
          <RecordFormDialog
            categories={categoriesQuery.data?.data.categories ?? []}
            mode="create"
            onOpenChange={setCreateOpen}
            open={createOpen}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ["purchase-records", "records"] })
              showSuccessToast("购买记录创建成功")
            }}
            onError={showErrorToast}
          >
            <Button>
              <Plus />
              新增购买记录
            </Button>
          </RecordFormDialog>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {recordsQuery.isLoading ? <LoadingState title="购买记录加载中" /> : null}

          {!recordsQuery.isLoading && recordsQuery.isError ? (
            <ErrorState message={getApiErrorMessage(recordsQuery.error)} />
          ) : null}

          {!recordsQuery.isLoading && !recordsQuery.isError && records.length === 0 ? (
            <EmptyState
              title="暂无购买记录"
              description="当前筛选条件下没有可显示的购买记录。"
            />
          ) : null}

          {!recordsQuery.isLoading && !recordsQuery.isError && records.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>标题</TableHead>
                      <TableHead>备注</TableHead>
                      <TableHead>金额</TableHead>
                      <TableHead>购买日期</TableHead>
                      <TableHead>大类</TableHead>
                      <TableHead>小类</TableHead>
                      <TableHead>上传人</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.title}</TableCell>
                        <TableCell className="max-w-xs text-muted-foreground">
                          <span className="line-clamp-2 break-all">{record.remark || "-"}</span>
                        </TableCell>
                        <TableCell>{formatAmount(record.amount)}</TableCell>
                        <TableCell>{formatDate(record.purchase_date)}</TableCell>
                        <TableCell>{record.category_name}</TableCell>
                        <TableCell>{record.subcategory_name || "-"}</TableCell>
                        <TableCell>{record.owner_name}</TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingRecord(record)}
                            >
                              <Pencil />
                              编辑
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setDeletingRecord(record)}
                            >
                              <Trash2 />
                              删除
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="text-sm text-muted-foreground">
                  共 <span className="font-medium text-foreground">{total}</span> 条记录
                </div>
                <div className="flex flex-col gap-3 md:flex-row md:items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">每页条数</span>
                    <Select
                      value={String(appliedFilters.page_size)}
                      onValueChange={(value) => setPageSize(Number(value))}
                    >
                      <SelectTrigger className="w-[88px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[10, 20, 50].map((pageSize) => (
                          <SelectItem key={pageSize} value={String(pageSize)}>
                            {pageSize}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={appliedFilters.page <= 1}
                      onClick={() => setPage(appliedFilters.page - 1)}
                    >
                      上一页
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      第 {appliedFilters.page} / {totalPages} 页
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={appliedFilters.page >= totalPages}
                      onClick={() => setPage(appliedFilters.page + 1)}
                    >
                      下一页
                    </Button>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>

      <RecordFormDialog
        categories={categoriesQuery.data?.data.categories ?? []}
        mode="edit"
        recordId={editingRecord?.id}
        onOpenChange={(open) => {
          if (!open) {
            setEditingRecord(null)
          }
        }}
        open={Boolean(editingRecord)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["purchase-records", "records"] })
          showSuccessToast("购买记录更新成功")
          setEditingRecord(null)
        }}
        onError={showErrorToast}
      />

      <DeleteRecordDialog
        open={Boolean(deletingRecord)}
        record={deletingRecord}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingRecord(null)
          }
        }}
        onSuccess={async () => {
          await queryClient.invalidateQueries({
            queryKey: ["purchase-records", "records"],
          })
          showSuccessToast("购买记录已删除")
          setDeletingRecord(null)
        }}
        onError={(message) => showErrorToast(message)}
      />
    </div>
  )
}

function CategoriesSection() {
  const queryClient = useQueryClient()
  const { showErrorToast, showSuccessToast } = useCustomToast()
  const [open, setOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)

  const categoriesQuery = useQuery({
    queryKey: ["purchase-records", "categories", false],
    queryFn: () => listCategories({ active_only: false }),
  })

  const categories = categoriesQuery.data?.data.categories ?? []

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle>大类</CardTitle>
        <CategoryDialog
          mode="create"
          onOpenChange={setOpen}
          open={open}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["purchase-records", "categories"] })
            showSuccessToast("大类创建成功")
          }}
          onError={showErrorToast}
        >
          <Button>
            <Plus />
            新增大类
          </Button>
        </CategoryDialog>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {categoriesQuery.isLoading ? <LoadingState title="大类加载中" /> : null}
        {!categoriesQuery.isLoading && categoriesQuery.isError ? (
          <ErrorState message={getApiErrorMessage(categoriesQuery.error)} />
        ) : null}
        {!categoriesQuery.isLoading && !categoriesQuery.isError && categories.length === 0 ? (
          <EmptyState title="暂无大类" description="请先新增大类。" />
        ) : null}
        {!categoriesQuery.isLoading && !categoriesQuery.isError && categories.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>名称</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium">{category.name}</TableCell>
                    <TableCell>
                      <StatusBadge active={category.is_active} />
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingCategory(category)}
                        >
                          <Pencil />
                          编辑
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : null}
      </CardContent>

      <CategoryDialog
        category={editingCategory}
        mode="edit"
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setEditingCategory(null)
          }
        }}
        open={Boolean(editingCategory)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["purchase-records", "categories"] })
          showSuccessToast("大类更新成功")
          setEditingCategory(null)
        }}
        onError={showErrorToast}
      />
    </Card>
  )
}

function SubcategoriesSection() {
  const queryClient = useQueryClient()
  const { showErrorToast, showSuccessToast } = useCustomToast()
  const [open, setOpen] = useState(false)
  const [editingSubcategory, setEditingSubcategory] = useState<Subcategory | null>(null)
  const [categoryFilter, setCategoryFilter] = useState(ALL_VALUE)

  const categoriesQuery = useQuery({
    queryKey: ["purchase-records", "subcategories-categories"],
    queryFn: () => listCategories({ active_only: false }),
  })

  const subcategoriesQuery = useQuery({
    queryKey: ["purchase-records", "subcategories", categoryFilter],
    queryFn: () =>
      listSubcategories({
        category_id: categoryFilter === ALL_VALUE ? undefined : categoryFilter,
        active_only: false,
      }),
  })

  const categories = categoriesQuery.data?.data.categories ?? []
  const subcategories = subcategoriesQuery.data?.data.subcategories ?? []

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <CardTitle>小类</CardTitle>
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full md:w-[220px]">
              <SelectValue placeholder="全部大类" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>全部大类</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <SubcategoryDialog
            categories={categories}
            mode="create"
            onOpenChange={setOpen}
            open={open}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ["purchase-records", "subcategories"] })
              showSuccessToast("小类创建成功")
            }}
            onError={showErrorToast}
          >
            <Button>
              <Plus />
              新增小类
            </Button>
          </SubcategoryDialog>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {(categoriesQuery.isLoading || subcategoriesQuery.isLoading) ? (
          <LoadingState title="小类加载中" />
        ) : null}
        {!categoriesQuery.isLoading && !subcategoriesQuery.isLoading && (categoriesQuery.isError || subcategoriesQuery.isError) ? (
          <ErrorState
            message={getApiErrorMessage(categoriesQuery.error ?? subcategoriesQuery.error)}
          />
        ) : null}
        {!categoriesQuery.isLoading && !subcategoriesQuery.isLoading && !categoriesQuery.isError && !subcategoriesQuery.isError && subcategories.length === 0 ? (
          <EmptyState title="暂无小类" description="当前条件下没有可显示的小类。" />
        ) : null}
        {!categoriesQuery.isLoading && !subcategoriesQuery.isLoading && !categoriesQuery.isError && !subcategoriesQuery.isError && subcategories.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>大类</TableHead>
                  <TableHead>名称</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subcategories.map((subcategory) => (
                  <TableRow key={subcategory.id}>
                    <TableCell>{subcategory.category_name}</TableCell>
                    <TableCell className="font-medium">{subcategory.name}</TableCell>
                    <TableCell>
                      <StatusBadge active={subcategory.is_active} />
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingSubcategory(subcategory)}
                        >
                          <Pencil />
                          编辑
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : null}
      </CardContent>

      <SubcategoryDialog
        categories={categories}
        mode="edit"
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setEditingSubcategory(null)
          }
        }}
        open={Boolean(editingSubcategory)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["purchase-records", "subcategories"] })
          showSuccessToast("小类更新成功")
          setEditingSubcategory(null)
        }}
        onError={showErrorToast}
        subcategory={editingSubcategory}
      />
    </Card>
  )
}

function RecordFormDialog({
  categories,
  children,
  mode,
  onError,
  onOpenChange,
  onSuccess,
  open,
  recordId,
}: {
  categories: Category[]
  children?: React.ReactNode
  mode: "create" | "edit"
  onError: (message: string) => void
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  open: boolean
  recordId?: string
}) {
  const form = useForm<PurchaseRecordFormValues>({
    resolver: zodResolver(purchaseRecordFormSchema),
    mode: "onBlur",
    defaultValues: {
      title: "",
      remark: "",
      amount: "0.00",
      purchase_date: "",
      category_id: "",
      subcategory_id: "",
    },
  })
  const [formError, setFormError] = useState<string | null>(null)
  const selectedCategoryId = form.watch("category_id")

  const detailQuery = useQuery({
    queryKey: ["purchase-records", "record-detail", recordId],
    queryFn: () => getPurchaseRecord(recordId as string),
    enabled: open && mode === "edit" && Boolean(recordId),
  })

  const mergedCategories = useMemo(() => {
    const detail = detailQuery.data?.data
    if (!detail?.category_id || categories.some((item) => item.id === detail.category_id)) {
      return categories
    }

    return [
      ...categories,
      {
        id: detail.category_id,
        name: detail.category_name,
        is_active: true,
      },
    ]
  }, [categories, detailQuery.data?.data])

  const selectedCategory = mergedCategories.find(
    (category) => category.id === selectedCategoryId,
  )
  const requiresSubcategory = selectedCategory?.name === OTHER_EXPENSE_CATEGORY_NAME

  const subcategoriesQuery = useQuery({
    queryKey: [
      "purchase-records",
      "dialog-subcategories",
      selectedCategoryId,
      mode,
      recordId,
    ],
    queryFn: () =>
      listSubcategories({
        category_id: selectedCategoryId,
        active_only: true,
      }),
    enabled: open && Boolean(selectedCategoryId) && requiresSubcategory,
  })

  const mergedSubcategories = useMemo(() => {
    const subcategories = subcategoriesQuery.data?.data.subcategories ?? []
    const detail = detailQuery.data?.data

    if (
      !detail?.subcategory_id ||
      subcategories.some((item) => item.id === detail.subcategory_id)
    ) {
      return subcategories
    }

    return [
      ...subcategories,
      {
        id: detail.subcategory_id,
        category_id: detail.category_id,
        category_name: detail.category_name,
        name: detail.subcategory_name || "",
        is_active: true,
      },
    ]
  }, [detailQuery.data?.data, subcategoriesQuery.data?.data.subcategories])

  useEffect(() => {
    if (!open) {
      form.reset({
        title: "",
        remark: "",
        amount: "0.00",
        purchase_date: "",
        category_id: "",
        subcategory_id: "",
      })
      setFormError(null)
      return
    }

    if (mode === "create") {
      form.reset({
        title: "",
        remark: "",
        amount: "0.00",
        purchase_date: "",
        category_id: "",
        subcategory_id: "",
      })
      setFormError(null)
      return
    }

    const detail = detailQuery.data?.data
    if (!detail) {
      return
    }

    form.reset({
      title: detail.title,
      remark: detail.remark,
      amount: formatAmount(detail.amount),
      purchase_date: normalizeDateValue(detail.purchase_date),
      category_id: detail.category_id,
      subcategory_id: detail.subcategory_id || "",
    })
    setFormError(null)
  }, [detailQuery.data?.data, form, mode, open])

  useEffect(() => {
    if (!requiresSubcategory && form.getValues("subcategory_id")) {
      form.setValue("subcategory_id", "")
    }
  }, [form, requiresSubcategory])

  const mutation = useMutation({
    mutationFn: (values: PurchaseRecordFormValues) => {
      const payload = {
        title: values.title.trim(),
        remark: values.remark.trim(),
        amount: Number(Number(values.amount).toFixed(2)),
        purchase_date: values.purchase_date,
        category_id: values.category_id,
        subcategory_id: requiresSubcategory ? values.subcategory_id : null,
      }

      if (mode === "create") {
        return createPurchaseRecord(payload)
      }

      return updatePurchaseRecord(recordId as string, payload)
    },
    onSuccess: () => {
      form.reset()
      setFormError(null)
      onOpenChange(false)
      onSuccess()
    },
    onError: (error) => {
      const message = getApiErrorMessage(error)
      setFormError(message)
      applyFieldErrors(getApiFieldErrors(error), form.setError)
      onError(message)
    },
  })

  const onSubmit = (values: PurchaseRecordFormValues) => {
    if (requiresSubcategory && !values.subcategory_id) {
      form.setError("subcategory_id", { message: "小类不能为空" })
      setFormError("参数校验错误")
      return
    }

    if (!requiresSubcategory && values.subcategory_id) {
      form.setValue("subcategory_id", "")
    }

    mutation.mutate(values)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children ? <DialogTrigger asChild>{children}</DialogTrigger> : null}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "新增购买记录" : "编辑购买记录"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "填写购买记录信息后保存。"
              : "更新购买记录信息后保存。"}
          </DialogDescription>
        </DialogHeader>

        {mode === "edit" && detailQuery.isLoading ? <LoadingState title="购买记录详情加载中" /> : null}
        {mode === "edit" && detailQuery.isError ? (
          <ErrorState message={getApiErrorMessage(detailQuery.error)} />
        ) : null}

        {(mode === "create" || detailQuery.data?.data) && !detailQuery.isError ? (
          <Form {...form}>
            <form className="flex flex-col gap-4" onSubmit={form.handleSubmit(onSubmit)}>
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>标题</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="remark"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>备注</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>金额</FormLabel>
                      <FormControl>
                        <Input inputMode="decimal" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="purchase_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>购买日期</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="category_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>大类</FormLabel>
                      <Select
                        value={field.value || undefined}
                        onValueChange={(value) => {
                          field.onChange(value)
                          form.setValue("subcategory_id", "")
                        }}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="请选择大类" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {mergedCategories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="subcategory_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>小类</FormLabel>
                      <Select
                        value={field.value || undefined}
                        onValueChange={field.onChange}
                        disabled={!requiresSubcategory}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue
                              placeholder={
                                requiresSubcategory ? "请选择小类" : "大类不是“其他费用”时留空"
                              }
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {mergedSubcategories.map((subcategory) => (
                            <SelectItem key={subcategory.id} value={subcategory.id}>
                              {subcategory.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {formError ? (
                <Alert variant="destructive">
                  <AlertCircle />
                  <AlertTitle>
                    {isForbiddenError(detailQuery.error) || isForbiddenError(mutation.error)
                      ? "权限不足"
                      : "接口失败"}
                  </AlertTitle>
                  <AlertDescription>{formError}</AlertDescription>
                </Alert>
              ) : null}

              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline" disabled={mutation.isPending}>
                    取消
                  </Button>
                </DialogClose>
                <LoadingButton type="submit" loading={mutation.isPending}>
                  保存
                </LoadingButton>
              </DialogFooter>
            </form>
          </Form>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function DeleteRecordDialog({
  onError,
  onOpenChange,
  onSuccess,
  open,
  record,
}: {
  onError: (message: string) => void
  onOpenChange: (open: boolean) => void
  onSuccess: () => void | Promise<void>
  open: boolean
  record: PurchaseRecord | null
}) {
  const mutation = useMutation({
    mutationFn: () => deletePurchaseRecord(record?.id as string),
    onSuccess: () => {
      onOpenChange(false)
      void onSuccess()
    },
    onError: (error) => {
      onError(getApiErrorMessage(error))
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>删除购买记录</DialogTitle>
          <DialogDescription>
            删除后当前工具界面将隐藏该记录。确认删除“{record?.title}”吗？
          </DialogDescription>
        </DialogHeader>
        {mutation.isError ? (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertTitle>{isForbiddenError(mutation.error) ? "权限不足" : "接口失败"}</AlertTitle>
            <AlertDescription>{getApiErrorMessage(mutation.error)}</AlertDescription>
          </Alert>
        ) : null}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={mutation.isPending}>
              取消
            </Button>
          </DialogClose>
          <LoadingButton
            type="button"
            variant="destructive"
            loading={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            删除
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CategoryDialog({
  category,
  children,
  mode,
  onError,
  onOpenChange,
  onSuccess,
  open,
}: {
  category?: Category | null
  children?: React.ReactNode
  mode: "create" | "edit"
  onError: (message: string) => void
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  open: boolean
}) {
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: "",
      is_active: true,
    },
  })
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      form.reset({ name: "", is_active: true })
      setFormError(null)
      return
    }

    form.reset({
      name: category?.name ?? "",
      is_active: category?.is_active ?? true,
    })
    setFormError(null)
  }, [category, form, open])

  const mutation = useMutation({
    mutationFn: (values: CategoryFormValues) => {
      if (mode === "create") {
        return createCategory(values)
      }

      return updateCategory(category?.id as string, values)
    },
    onSuccess: () => {
      onOpenChange(false)
      onSuccess()
    },
    onError: (error) => {
      const message = getApiErrorMessage(error)
      setFormError(message)
      applyFieldErrors(getApiFieldErrors(error), form.setError)
      onError(message)
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children ? <DialogTrigger asChild>{children}</DialogTrigger> : null}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "新增大类" : "编辑大类"}</DialogTitle>
          <DialogDescription>
            {mode === "create" ? "填写大类信息后保存。" : "更新大类信息后保存。"}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="flex flex-col gap-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>大类名称</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="font-normal">启用</FormLabel>
                </FormItem>
              )}
            />
            {formError ? (
              <Alert variant="destructive">
                <AlertCircle />
                <AlertTitle>{isForbiddenError(mutation.error) ? "权限不足" : "接口失败"}</AlertTitle>
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            ) : null}
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" disabled={mutation.isPending}>
                  取消
                </Button>
              </DialogClose>
              <LoadingButton type="submit" loading={mutation.isPending}>
                保存
              </LoadingButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

function SubcategoryDialog({
  categories,
  children,
  mode,
  onError,
  onOpenChange,
  onSuccess,
  open,
  subcategory,
}: {
  categories: Category[]
  children?: React.ReactNode
  mode: "create" | "edit"
  onError: (message: string) => void
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  open: boolean
  subcategory?: Subcategory | null
}) {
  const form = useForm<SubcategoryFormValues>({
    resolver: zodResolver(subcategoryFormSchema),
    defaultValues: {
      category_id: "",
      name: "",
      is_active: true,
    },
  })
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      form.reset({
        category_id: "",
        name: "",
        is_active: true,
      })
      setFormError(null)
      return
    }

    form.reset({
      category_id: subcategory?.category_id ?? "",
      name: subcategory?.name ?? "",
      is_active: subcategory?.is_active ?? true,
    })
    setFormError(null)
  }, [form, open, subcategory])

  const mutation = useMutation({
    mutationFn: (values: SubcategoryFormValues) => {
      if (mode === "create") {
        return createSubcategory(values)
      }

      return updateSubcategory(subcategory?.id as string, values)
    },
    onSuccess: () => {
      onOpenChange(false)
      onSuccess()
    },
    onError: (error) => {
      const message = getApiErrorMessage(error)
      setFormError(message)
      applyFieldErrors(getApiFieldErrors(error), form.setError)
      onError(message)
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children ? <DialogTrigger asChild>{children}</DialogTrigger> : null}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "新增小类" : "编辑小类"}</DialogTitle>
          <DialogDescription>
            {mode === "create" ? "填写小类信息后保存。" : "更新小类信息后保存。"}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form className="flex flex-col gap-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
            <FormField
              control={form.control}
              name="category_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>大类</FormLabel>
                  <Select value={field.value || undefined} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="请选择大类" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>小类名称</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="font-normal">启用</FormLabel>
                </FormItem>
              )}
            />
            {formError ? (
              <Alert variant="destructive">
                <AlertCircle />
                <AlertTitle>{isForbiddenError(mutation.error) ? "权限不足" : "接口失败"}</AlertTitle>
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            ) : null}
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" disabled={mutation.isPending}>
                  取消
                </Button>
              </DialogClose>
              <LoadingButton type="submit" loading={mutation.isPending}>
                保存
              </LoadingButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

function LoadingState({ title }: { title: string }) {
  return (
    <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
      {title}
    </div>
  )
}

function EmptyState({
  description,
  title,
}: {
  description: string
  title: string
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-10 text-center">
      <div className="rounded-full bg-muted p-4">
        <Search className="h-8 w-8 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <Alert variant="destructive">
      <AlertCircle />
      <AlertTitle>接口失败</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  )
}

function PermissionDeniedState({ onBack }: { onBack: () => void }) {
  return (
    <Alert variant="destructive">
      <ShieldAlert />
      <AlertTitle>权限不足</AlertTitle>
      <AlertDescription>
        当前用户无权访问该页面内容。
        <div className="mt-3">
          <Button variant="outline" onClick={onBack}>
            返回购买记录
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  )
}

function StatusBadge({ active }: { active: boolean }) {
  return <Badge variant={active ? "default" : "outline"}>{active ? "启用" : "停用"}</Badge>
}

function formatAmount(amount: number | string) {
  const normalizedAmount = typeof amount === "string" ? Number(amount) : amount

  if (!Number.isFinite(normalizedAmount)) {
    return "0.00"
  }

  return normalizedAmount.toFixed(2)
}

function formatDate(value: string) {
  return value.slice(0, 10)
}

function normalizeDateValue(value: string) {
  return value.slice(0, 10)
}

function applyFieldErrors<TFieldValues extends Record<string, unknown>>(
  fieldErrors: ApiFieldErrorDetails,
  setError: UseFormSetError<TFieldValues>,
) {
  Object.entries(fieldErrors).forEach(([field, message]) => {
    if (!message) {
      return
    }

    const nextMessage = Array.isArray(message) ? message.join("，") : message
    setError(field as Parameters<typeof setError>[0], {
      message: nextMessage,
    })
  })
}
