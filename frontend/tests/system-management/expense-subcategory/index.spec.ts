import { expect, test, type Page } from "@playwright/test"

type Category = {
  id: number
  name: string
  description: string | null
}

type Subcategory = {
  id: number
  name: string
  major_category_id: number
  major_category_name: string
  description: string | null
}

async function mockExpenseSubcategoryApis(page: Page, categories: Category[], initial: Subcategory[]) {
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
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: { list: categories, total: categories.length } }),
    })
  })

  await page.route("**/api/v1/system-management/expense-subcategory**", async (route) => {
    const method = route.request().method()
    const url = new URL(route.request().url())
    const path = url.pathname

    if (method === "GET" && path === "/api/v1/system-management/expense-subcategory") {
      const majorCategoryId = url.searchParams.get("major_category_id")
      const result = majorCategoryId
        ? list.filter((item) => item.major_category_id === Number(majorCategoryId))
        : list
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: { list: result, total: result.length } }),
      })
      return
    }

    if (method === "POST" && path === "/api/v1/system-management/expense-subcategory") {
      const body = (route.request().postDataJSON() ?? {}) as { payload?: { name?: string; major_category_id?: number; description?: string | null } }
      const category = categories.find((item) => item.id === body.payload?.major_category_id)
      const next: Subcategory = {
        id: list.length + 1,
        name: body.payload?.name ?? "",
        major_category_id: body.payload?.major_category_id ?? 0,
        major_category_name: category?.name ?? "",
        description: body.payload?.description ?? null,
      }
      list.push(next)
      await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ data: next }) })
      return
    }

    const idMatch = path.match(/^\/api\/v1\/system-management\/expense-subcategory\/(\d+)$/)
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
      const body = (route.request().postDataJSON() ?? {}) as { payload?: { name?: string; major_category_id?: number; description?: string | null } }
      const category = categories.find((item) => item.id === body.payload?.major_category_id)
      target.name = body.payload?.name ?? target.name
      target.major_category_id = body.payload?.major_category_id ?? target.major_category_id
      target.major_category_name = category?.name ?? target.major_category_name
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

test.describe("费用小类管理", () => {
  test("进入页面并完成CRUD与筛选", async ({ page }) => {
    const categories = [
      { id: 1, name: "交通费用", description: null },
      { id: 4, name: "其他项目费用", description: null },
    ]

    await mockExpenseSubcategoryApis(page, categories, [
      {
        id: 1,
        name: "自动导航承载车",
        major_category_id: 4,
        major_category_name: "其他项目费用",
        description: null,
      },
    ])

    await page.goto("/expense-subcategory")
    await expect(page.getByRole("heading", { name: "费用小类管理" })).toBeVisible()

    await page.getByRole("button", { name: "新增费用小类" }).click()
    const dialog = page.getByRole("dialog", { name: "新增费用小类" })
    await dialog.getByLabel("小类名称 *").fill("新测试小类")
    await dialog.getByRole("combobox").first().click()
    await page.getByRole("option", { name: "其他项目费用" }).click()
    await dialog.getByRole("button", { name: "保存" }).click()

    await expect(page.getByText("新测试小类")).toBeVisible()

    await page.getByText("按所属大类筛选").locator("..")
    await page.locator("button:has-text('全部大类')").first().click()
    await page.getByRole("option", { name: "其他项目费用" }).click()
    await expect(page.getByText("新测试小类")).toBeVisible()
  })
})
