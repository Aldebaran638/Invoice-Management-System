import { expect, test, type Page } from "@playwright/test"

type MockRecord = {
  id: string
  purchase_date: string
  name: string
  amount: number | null
  founder_name: string
  major_category_id: number
  major_category_name: string
  sub_category_id: number | null
  sub_category_name: string | null
  remarks: string | null
  is_deleted: boolean
}

const categories = [
  { id: 1, name: "交通费用", description: null },
  { id: 4, name: "其他项目费用", description: null },
]

const subcategories = [
  {
    id: 1,
    name: "自动导航承载车",
    major_category_id: 4,
    major_category_name: "其他项目费用",
    description: null,
  },
]

function toPublicRecord(record: MockRecord) {
  return {
    id: record.id,
    purchase_date: record.purchase_date,
    name: record.name,
    amount: record.amount,
    founder_name: record.founder_name,
    major_category_id: record.major_category_id,
    major_category_name: record.major_category_name,
    sub_category_id: record.sub_category_id,
    sub_category_name: record.sub_category_name,
    remarks: record.remarks,
  }
}

async function mockApis(page: Page, initialRecords: MockRecord[]) {
  const records = [...initialRecords]

  await page.route("**/api/v1/system-management/expense-category**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: { list: categories, total: categories.length } }),
    })
  })

  await page.route("**/api/v1/system-management/expense-subcategory**", async (route) => {
    const url = new URL(route.request().url())
    const majorCategoryId = url.searchParams.get("major_category_id")
    const list = majorCategoryId
      ? subcategories.filter((item) => item.major_category_id === Number(majorCategoryId))
      : subcategories

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: { list, total: list.length } }),
    })
  })

  await page.route("**/api/v1/purchase-records/purchase-record-summary**", async (route) => {
    const method = route.request().method()
    const url = new URL(route.request().url())
    const path = url.pathname

    if (method === "GET" && path === "/api/v1/purchase-records/purchase-record-summary/") {
      let list = records.filter((item) => !item.is_deleted)
      const majorCategoryId = url.searchParams.get("major_category_id")
      const subCategoryId = url.searchParams.get("sub_category_id")
      if (majorCategoryId) {
        list = list.filter((item) => item.major_category_id === Number(majorCategoryId))
      }
      if (subCategoryId) {
        list = list.filter((item) => item.sub_category_id === Number(subCategoryId))
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: { list: list.map(toPublicRecord), total: list.length } }),
      })
      return
    }

    if (method === "POST" && path === "/api/v1/purchase-records/purchase-record-summary/") {
      const payload = (route.request().postDataJSON() ?? {}) as Record<string, unknown>
      const majorCategory = categories.find((item) => item.id === Number(payload.major_category_id))
      const subCategory = subcategories.find((item) => item.id === Number(payload.sub_category_id)) ?? null

      const created: MockRecord = {
        id: `record-${records.length + 1}`,
        purchase_date: String(payload.purchase_date),
        name: String(payload.name),
        amount: payload.amount ? Number(payload.amount) : null,
        founder_name: String(payload.founder_name),
        major_category_id: Number(payload.major_category_id),
        major_category_name: majorCategory?.name ?? "",
        sub_category_id: subCategory?.id ?? null,
        sub_category_name: subCategory?.name ?? null,
        remarks: (payload.remarks as string | null) ?? null,
        is_deleted: false,
      }

      records.push(created)

      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ data: toPublicRecord(created) }),
      })
      return
    }

    const detailMatch = path.match(/^\/api\/v1\/purchase-records\/purchase-record-summary\/([^/]+)$/)
    if (!detailMatch) {
      await route.fallback()
      return
    }

    const id = detailMatch[1]
    const target = records.find((item) => item.id === id)

    if (!target || target.is_deleted) {
      await route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ detail: "not found" }) })
      return
    }

    if (method === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: toPublicRecord(target) }) })
      return
    }

    if (method === "PUT") {
      const payload = (route.request().postDataJSON() ?? {}) as Record<string, unknown>
      const majorCategory = categories.find((item) => item.id === Number(payload.major_category_id))
      const subCategory = subcategories.find((item) => item.id === Number(payload.sub_category_id)) ?? null

      target.purchase_date = String(payload.purchase_date)
      target.name = String(payload.name)
      target.amount = payload.amount ? Number(payload.amount) : null
      target.founder_name = String(payload.founder_name)
      target.major_category_id = Number(payload.major_category_id)
      target.major_category_name = majorCategory?.name ?? ""
      target.sub_category_id = subCategory?.id ?? null
      target.sub_category_name = subCategory?.name ?? null
      target.remarks = (payload.remarks as string | null) ?? null

      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: toPublicRecord(target) }) })
      return
    }

    if (method === "DELETE") {
      target.is_deleted = true
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { message: "deleted" } }) })
      return
    }

    await route.fallback()
  })
}

test.describe("购买记录汇总", () => {
  test("展示新增字段列", async ({ page }) => {
    await mockApis(page, [
      {
        id: "r-1",
        purchase_date: "2026-04-19",
        name: "测试记录",
        amount: 100,
        founder_name: "张三",
        major_category_id: 4,
        major_category_name: "其他项目费用",
        sub_category_id: 1,
        sub_category_name: "自动导航承载车",
        remarks: "测试备注",
        is_deleted: false,
      },
    ])

    await page.goto("/purchase-record-summary")

    await expect(page.getByText("测试记录")).toBeVisible()
    await expect(page.getByRole("columnheader", { name: "创始人" })).toBeVisible()
    await expect(page.getByRole("columnheader", { name: "大类" })).toBeVisible()
    await expect(page.getByRole("columnheader", { name: "小类" })).toBeVisible()
    await expect(page.getByRole("columnheader", { name: "备注" })).toBeVisible()
    await expect(page.getByText("张三")).toBeVisible()
  })

  test("新增记录时仅在其他项目费用显示小类", async ({ page }) => {
    await mockApis(page, [])

    await page.goto("/purchase-record-summary")
    await page.getByRole("button", { name: "新增购买记录" }).click()

    const dialog = page.getByRole("dialog", { name: "新增购买记录" })

    await dialog.getByLabel("购买日期 *").fill("2026-04-19")
    await dialog.getByLabel("名称 *").fill("条件小类记录")
    await dialog.getByLabel("创始人 *").fill("李四")

    await dialog.getByRole("combobox").first().click()
    await page.getByRole("option", { name: "其他项目费用" }).click()

    await dialog.getByRole("combobox").nth(1).click()
    await page.getByRole("option", { name: "自动导航承载车" }).click()

    await dialog.getByRole("button", { name: "保存" }).click()
    await expect(page.getByText("条件小类记录")).toBeVisible()
  })

  test("支持按大类和小类筛选", async ({ page }) => {
    await mockApis(page, [
      {
        id: "r-2",
        purchase_date: "2026-04-19",
        name: "交通记录",
        amount: 50,
        founder_name: "王五",
        major_category_id: 1,
        major_category_name: "交通费用",
        sub_category_id: null,
        sub_category_name: null,
        remarks: null,
        is_deleted: false,
      },
      {
        id: "r-3",
        purchase_date: "2026-04-19",
        name: "其他项目记录",
        amount: 200,
        founder_name: "赵六",
        major_category_id: 4,
        major_category_name: "其他项目费用",
        sub_category_id: 1,
        sub_category_name: "自动导航承载车",
        remarks: null,
        is_deleted: false,
      },
    ])

    await page.goto("/purchase-record-summary")

    await page.getByRole("combobox").first().click()
    await page.getByRole("option", { name: "其他项目费用" }).click()

    await expect(page.getByText("交通记录")).not.toBeVisible()
    await expect(page.getByText("其他项目记录")).toBeVisible()

    await page.getByRole("combobox").nth(1).click()
    await page.getByRole("option", { name: "自动导航承载车" }).click()

    await expect(page.getByText("其他项目记录")).toBeVisible()
  })
})
