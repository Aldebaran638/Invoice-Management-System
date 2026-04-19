import { expect, test, type Page } from "@playwright/test"

type Category = {
  id: number
  name: string
  description: string | null
}

async function mockExpenseCategoryApi(page: Page, initial: Category[]) {
  const list = [...initial]

  await page.route("**/api/v1/users/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "admin-user",
        email: "admin@example.com",
        is_active: true,
        is_superuser: true,
      }),
    })
  })

  await page.route("**/api/v1/system-management/expense-category**", async (route) => {
    const method = route.request().method()
    const url = new URL(route.request().url())
    const path = url.pathname

    if (method === "GET" && path === "/api/v1/system-management/expense-category") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: { list, total: list.length } }),
      })
      return
    }

    if (method === "POST" && path === "/api/v1/system-management/expense-category") {
      const body = (route.request().postDataJSON() ?? {}) as { payload?: { name?: string; description?: string | null } }
      const next: Category = {
        id: list.length + 1,
        name: body.payload?.name ?? "",
        description: body.payload?.description ?? null,
      }
      list.push(next)
      await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ data: next }) })
      return
    }

    const idMatch = path.match(/^\/api\/v1\/system-management\/expense-category\/(\d+)$/)
    if (!idMatch) {
      await route.fallback()
      return
    }

    const id = Number(idMatch[1])
    const target = list.find((item) => item.id === id)

    if (!target) {
      await route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ detail: "not found" }) })
      return
    }

    if (method === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: target }) })
      return
    }

    if (method === "PUT") {
      const body = (route.request().postDataJSON() ?? {}) as { payload?: { name?: string; description?: string | null } }
      target.name = body.payload?.name ?? target.name
      target.description = body.payload?.description ?? target.description
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: target }) })
      return
    }

    if (method === "DELETE") {
      const idx = list.findIndex((item) => item.id === id)
      if (idx >= 0) {
        list.splice(idx, 1)
      }
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { message: "deleted" } }) })
      return
    }

    await route.fallback()
  })
}

test.describe("费用大类管理", () => {
  test("进入页面并完成CRUD", async ({ page }) => {
    await mockExpenseCategoryApi(page, [{ id: 1, name: "交通费用", description: "交通" }])

    await page.goto("/expense-category")
    await expect(page.getByRole("heading", { name: "费用大类管理" })).toBeVisible()

    await page.getByRole("button", { name: "新增费用大类" }).click()
    await page.getByLabel("大类名称 *").fill("办公费用")
    await page.getByLabel("描述").fill("办公相关")
    await page.getByRole("button", { name: "保存" }).click()

    await expect(page.getByText("办公费用")).toBeVisible()

    const row = page.getByRole("row", { name: /办公费用/ })
    await row.getByRole("button", { name: "编辑" }).click()
    await page.getByLabel("大类名称 *").fill("办公费用-修改")
    await page.getByRole("button", { name: "保存" }).click()
    await expect(page.getByText("办公费用-修改")).toBeVisible()

    const editedRow = page.getByRole("row", { name: /办公费用-修改/ })
    await editedRow.getByRole("button", { name: "删除" }).click()
    await page.getByRole("button", { name: "删除" }).click()
    await expect(page.getByText("办公费用-修改")).not.toBeVisible()
  })
})
