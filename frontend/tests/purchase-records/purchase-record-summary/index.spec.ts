import { expect, test, type Page } from "@playwright/test"

const listPathPattern = /\/api\/v1\/purchase-records\/purchase-record-summary\/?$/
const detailPathPattern =
  /\/api\/v1\/purchase-records\/purchase-record-summary\/[^/?#]+$/

type MockRecord = {
  id: string
  purchase_date: string
  name: string
  amount: number | null
  is_deleted: boolean
}

function toPublicRecord(record: MockRecord) {
  return {
    id: record.id,
    purchase_date: record.purchase_date,
    name: record.name,
    amount: record.amount,
  }
}

async function mockPurchaseRecordSummaryApi(page: Page, initialRecords: MockRecord[]) {
  const records = [...initialRecords]

  await page.route(listPathPattern, async (route) => {
    const method = route.request().method()

    if (method === "GET") {
      const visibleRecords = records
        .filter((item) => !item.is_deleted)
        .map((item) => toPublicRecord(item))

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: { records: visibleRecords } }),
      })
      return
    }

    if (method === "POST") {
      const payload = (route.request().postDataJSON() ?? {}) as {
        purchase_date?: string
        name?: string
        amount?: number | null
      }

      if (!payload.purchase_date || !payload.name) {
        await route.fulfill({
          status: 422,
          contentType: "application/json",
          body: JSON.stringify({ detail: "Validation error" }),
        })
        return
      }

      const newRecord: MockRecord = {
        id: `rec-${records.length + 1}`,
        purchase_date: payload.purchase_date,
        name: payload.name,
        amount: payload.amount ?? null,
        is_deleted: false,
      }

      records.push(newRecord)

      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ data: toPublicRecord(newRecord) }),
      })
      return
    }

    await route.fallback()
  })

  await page.route(detailPathPattern, async (route) => {
    const method = route.request().method()
    const id = route.request().url().split("/").pop()
    const targetRecord = records.find((item) => item.id === id)

    if (!targetRecord || targetRecord.is_deleted) {
      await route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Purchase record not found" }),
      })
      return
    }

    if (method === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: toPublicRecord(targetRecord) }),
      })
      return
    }

    if (method === "PUT") {
      const payload = (route.request().postDataJSON() ?? {}) as {
        purchase_date?: string
        name?: string
        amount?: number | null
      }

      if (!payload.purchase_date || !payload.name) {
        await route.fulfill({
          status: 422,
          contentType: "application/json",
          body: JSON.stringify({ detail: "Validation error" }),
        })
        return
      }

      targetRecord.purchase_date = payload.purchase_date
      targetRecord.name = payload.name
      targetRecord.amount = payload.amount ?? null

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: toPublicRecord(targetRecord) }),
      })
      return
    }

    if (method === "DELETE") {
      targetRecord.is_deleted = true

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ message: "deleted" }),
      })
      return
    }

    await route.fallback()
  })
}

test.describe("购买记录汇总", () => {
  test.describe.configure({ mode: "serial" })

  test("侧边栏进入页面", async ({ page }) => {
    await mockPurchaseRecordSummaryApi(page, [])

    await page.goto("/")
    await page.getByRole("button", { name: "购买记录" }).click()
    await page.getByRole("link", { name: "购买记录汇总" }).click()

    await expect(page).toHaveURL(/\/purchase-record-summary/)
    await expect(page.getByRole("heading", { name: "购买记录汇总" })).toBeVisible()
  })

  test("列表默认不显示已删除记录", async ({ page }) => {
    await mockPurchaseRecordSummaryApi(page, [
      {
        id: "active-1",
        purchase_date: "2026-04-18",
        name: "在用记录",
        amount: 123.4,
        is_deleted: false,
      },
      {
        id: "deleted-1",
        purchase_date: "2026-04-17",
        name: "已删除记录",
        amount: 88,
        is_deleted: true,
      },
    ])

    await page.goto("/purchase-record-summary")

    await expect(page.getByText("在用记录")).toBeVisible()
    await expect(page.getByText("已删除记录")).not.toBeVisible()
  })

  test("新增购买记录成功", async ({ page }) => {
    await mockPurchaseRecordSummaryApi(page, [])

    await page.goto("/purchase-record-summary")
    await page.getByRole("button", { name: "新增购买记录" }).click()

    await page.getByLabel("购买日期 *").fill("2026-04-19")
    await page.getByLabel("名称 *").fill("新增记录")
    await page.getByLabel("购买金额").fill("456.78")
    await page.getByRole("button", { name: "保存" }).click()

    await expect(page.getByText("新增记录")).toBeVisible()
    await expect(page.getByText("456.78")).toBeVisible()
  })

  test("必填字段校验失败", async ({ page }) => {
    await mockPurchaseRecordSummaryApi(page, [])

    await page.goto("/purchase-record-summary")
    await page.getByRole("button", { name: "新增购买记录" }).click()

    await page.getByRole("button", { name: "保存" }).click()

    await expect(page.getByText("购买日期不能为空")).toBeVisible()
    await expect(page.getByText("名称不能为空")).toBeVisible()
  })

  test("编辑自己的购买记录成功", async ({ page }) => {
    await mockPurchaseRecordSummaryApi(page, [
      {
        id: "edit-1",
        purchase_date: "2026-04-15",
        name: "待编辑记录",
        amount: 200,
        is_deleted: false,
      },
    ])

    await page.goto("/purchase-record-summary")

    const row = page.getByRole("row", { name: /待编辑记录/ })
    await row.getByRole("button", { name: "编辑" }).click()

    await page.getByLabel("名称 *").fill("已编辑记录")
    await page.getByRole("button", { name: "保存" }).click()

    await expect(page.getByText("已编辑记录")).toBeVisible()
    await expect(page.getByText("待编辑记录")).not.toBeVisible()
  })

  test("删除自己的购买记录成功", async ({ page }) => {
    await mockPurchaseRecordSummaryApi(page, [
      {
        id: "del-1",
        purchase_date: "2026-04-16",
        name: "待删除记录",
        amount: 99,
        is_deleted: false,
      },
    ])

    await page.goto("/purchase-record-summary")

    const row = page.getByRole("row", { name: /待删除记录/ })
    await row.getByRole("button", { name: "删除" }).click()
    await page.getByRole("button", { name: "删除" }).click()

    await expect(page.getByText("待删除记录")).not.toBeVisible()
  })

  test("删除后列表隐藏记录", async ({ page }) => {
    await mockPurchaseRecordSummaryApi(page, [
      {
        id: "del-2",
        purchase_date: "2026-04-16",
        name: "将被隐藏记录",
        amount: 108,
        is_deleted: false,
      },
      {
        id: "keep-1",
        purchase_date: "2026-04-18",
        name: "保留记录",
        amount: 208,
        is_deleted: false,
      },
    ])

    await page.goto("/purchase-record-summary")

    const row = page.getByRole("row", { name: /将被隐藏记录/ })
    await row.getByRole("button", { name: "删除" }).click()
    await page.getByRole("button", { name: "删除" }).click()

    await expect(page.getByText("将被隐藏记录")).not.toBeVisible()
    await expect(page.getByText("保留记录")).toBeVisible()
  })
})
