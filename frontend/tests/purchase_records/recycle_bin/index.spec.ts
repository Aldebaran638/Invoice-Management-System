import { expect, test, type Page } from "@playwright/test"

type RecycleRecord = {
  id: string
  purchase_date: string
  name: string
  amount: number | null
  deleted_at: string | null
  owner: "self" | "other"
}

function toListItem(record: RecycleRecord) {
  return {
    id: record.id,
    purchase_date: record.purchase_date,
    name: record.name,
    amount: record.amount,
    deleted_at: record.deleted_at,
  }
}

async function mockRecycleBinApi(
  page: Page,
  initialRecords: RecycleRecord[],
  options?: {
    forbiddenDetailIds?: string[]
  },
) {
  const records = [...initialRecords]
  const forbiddenDetailIds = new Set(options?.forbiddenDetailIds ?? [])

  await page.route("**/api/v1/purchase_records/recycle_bin**", async (route) => {
    const url = new URL(route.request().url())
    const method = route.request().method()
    const path = url.pathname

    if (method === "GET" && path === "/api/v1/purchase_records/recycle_bin") {
      const items = records
        .filter((record) => record.owner === "self" && record.deleted_at !== null)
        .map((record) => toListItem(record))

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: { records: items } }),
      })
      return
    }

    const detailMatch = path.match(/^\/api\/v1\/purchase_records\/recycle_bin\/([^/]+)$/)
    if (detailMatch && method === "GET") {
      const recordId = detailMatch[1]
      const target = records.find((record) => record.id === recordId)

      if (!target || target.deleted_at === null) {
        await route.fulfill({
          status: 404,
          contentType: "application/json",
          body: JSON.stringify({ detail: "not found" }),
        })
        return
      }

      if (target.owner === "other" || forbiddenDetailIds.has(recordId)) {
        await route.fulfill({
          status: 403,
          contentType: "application/json",
          body: JSON.stringify({ detail: "forbidden" }),
        })
        return
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: toListItem(target) }),
      })
      return
    }

    const restoreMatch = path.match(
      /^\/api\/v1\/purchase_records\/recycle_bin\/([^/]+)\/restore$/,
    )
    if (restoreMatch && method === "POST") {
      const recordId = restoreMatch[1]
      const target = records.find((record) => record.id === recordId)

      if (!target || target.deleted_at === null) {
        await route.fulfill({
          status: 404,
          contentType: "application/json",
          body: JSON.stringify({ detail: "not found" }),
        })
        return
      }

      if (target.owner === "other") {
        await route.fulfill({
          status: 403,
          contentType: "application/json",
          body: JSON.stringify({ detail: "forbidden" }),
        })
        return
      }

      target.deleted_at = null

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ message: "restored" }),
      })
      return
    }

    await route.fallback()
  })
}

test.describe("回收站", () => {
  test.describe.configure({ mode: "serial" })

  test("侧边栏进入页面", async ({ page }) => {
    await mockRecycleBinApi(page, [])

    await page.goto("/")
    await page.getByRole("button", { name: "购买记录" }).click()
    await page.getByRole("link", { name: "回收站" }).click()

    await expect(page).toHaveURL(/\/recycle-bin/)
    await expect(page.getByRole("heading", { name: "回收站", exact: true })).toBeVisible()
  })

  test("列表只显示已删除记录", async ({ page }) => {
    await mockRecycleBinApi(page, [
      {
        id: "deleted-1",
        purchase_date: "2026-04-16",
        name: "已删除记录",
        amount: 12.5,
        deleted_at: "2026-04-18T10:00:00Z",
        owner: "self",
      },
      {
        id: "active-1",
        purchase_date: "2026-04-17",
        name: "未删除记录",
        amount: 22,
        deleted_at: null,
        owner: "self",
      },
    ])

    await page.goto("/recycle-bin")

    await expect(page.getByText("已删除记录")).toBeVisible()
    await expect(page.getByText("未删除记录")).not.toBeVisible()
  })

  test("详情查看成功", async ({ page }) => {
    await mockRecycleBinApi(page, [
      {
        id: "deleted-2",
        purchase_date: "2026-04-10",
        name: "可查看详情",
        amount: 88,
        deleted_at: "2026-04-18T08:00:00Z",
        owner: "self",
      },
    ])

    await page.goto("/recycle-bin")
    await page.getByRole("button", { name: "查看详情" }).click()

    const detailDialog = page.getByRole("dialog", { name: "回收站详情" })
    await expect(detailDialog.getByText("可查看详情")).toBeVisible()
    await expect(detailDialog.getByText("2026-04-10")).toBeVisible()
    await expect(detailDialog.getByText("88.00")).toBeVisible()
    await expect(detailDialog.getByText("2026-04-18")).toBeVisible()
  })

  test("查看他人已删除记录失败", async ({ page }) => {
    await mockRecycleBinApi(page, [
      {
        id: "forbidden-1",
        purchase_date: "2026-04-09",
        name: "受限记录",
        amount: 30,
        deleted_at: "2026-04-18T09:00:00Z",
        owner: "self",
      },
    ], {
      forbiddenDetailIds: ["forbidden-1"],
    })

    await page.goto("/recycle-bin")

    await page.getByRole("button", { name: "查看详情" }).click()
    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByText("登录已过期")).toBeVisible()
  })

  test("恢复成功后列表立刻消失", async ({ page }) => {
    await mockRecycleBinApi(page, [
      {
        id: "restore-1",
        purchase_date: "2026-04-12",
        name: "待恢复记录",
        amount: 66,
        deleted_at: "2026-04-18T11:00:00Z",
        owner: "self",
      },
      {
        id: "keep-1",
        purchase_date: "2026-04-11",
        name: "保留删除记录",
        amount: 55,
        deleted_at: "2026-04-18T12:00:00Z",
        owner: "self",
      },
    ])

    await page.goto("/recycle-bin")

    const row = page.getByRole("row", { name: /待恢复记录/ })
    await row.getByRole("button", { name: "恢复" }).click()

    await expect(page.getByText("待恢复记录")).not.toBeVisible()
    await expect(page.getByText("保留删除记录")).toBeVisible()
  })
})
