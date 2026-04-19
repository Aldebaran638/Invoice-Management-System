import { createFileRoute, redirect } from "@tanstack/react-router"

import { UsersService } from "@/client"
import ExpenseCategoryPage from "@/tools/system-management/expense-category"

export const Route = createFileRoute("/_layout/expense-category")({
  component: ExpenseCategoryRoute,
  beforeLoad: async () => {
    const user = await UsersService.readUserMe()
    if (!user.is_superuser) {
      throw redirect({ to: "/" })
    }
  },
  head: () => ({
    meta: [
      {
        title: "费用大类管理 - FastAPI Cloud",
      },
    ],
  }),
})

function ExpenseCategoryRoute() {
  return <ExpenseCategoryPage />
}
