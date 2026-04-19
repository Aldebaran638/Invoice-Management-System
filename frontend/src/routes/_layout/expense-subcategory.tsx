import { createFileRoute, redirect } from "@tanstack/react-router"

import { UsersService } from "@/client"
import ExpenseSubcategoryPage from "@/tools/system-management/expense-subcategory"

export const Route = createFileRoute("/_layout/expense-subcategory")({
  component: ExpenseSubcategoryRoute,
  beforeLoad: async () => {
    const user = await UsersService.readUserMe()
    if (!user.is_superuser) {
      throw redirect({ to: "/" })
    }
  },
  head: () => ({
    meta: [
      {
        title: "费用小类管理 - FastAPI Cloud",
      },
    ],
  }),
})

function ExpenseSubcategoryRoute() {
  return <ExpenseSubcategoryPage />
}
