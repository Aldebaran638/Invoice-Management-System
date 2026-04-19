import { useQuery } from "@tanstack/react-query"

import { getExpenseCategoryDetail, listExpenseCategory } from "../api"

export function useExpenseCategoryList() {
  return useQuery({
    queryKey: ["expense-category", "list"],
    queryFn: listExpenseCategory,
    retry: false,
  })
}

export function useExpenseCategoryDetail(id?: number) {
  return useQuery({
    queryKey: ["expense-category", "detail", id ?? null],
    queryFn: () => getExpenseCategoryDetail(id as number),
    enabled: Number.isFinite(id),
    retry: false,
  })
}
