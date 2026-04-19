import { useQuery } from "@tanstack/react-query"

import { getExpenseSubcategoryDetail, listExpenseSubcategory } from "../api"

export function useExpenseSubcategoryList(majorCategoryId?: number) {
  return useQuery({
    queryKey: ["expense-subcategory", "list", majorCategoryId ?? null],
    queryFn: () => listExpenseSubcategory(majorCategoryId),
    retry: false,
  })
}

export function useExpenseSubcategoryDetail(id?: number) {
  return useQuery({
    queryKey: ["expense-subcategory", "detail", id ?? null],
    queryFn: () => getExpenseSubcategoryDetail(id as number),
    enabled: Number.isFinite(id),
    retry: false,
  })
}
