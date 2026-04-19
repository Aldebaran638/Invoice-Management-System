import { expect, test } from "@playwright/test"

const listPath = "**/api/v1/purchase-records/purchase-record-summary"
const detailPath = "**/api/v1/purchase-records/purchase-record-summary/*"

test.describe("购买记录汇总", () => {
  test.describe.configure({ mode: "serial" })

  test("可从侧边栏进入购买记录汇总页面", async ({ page }) => {
    await page.route(listPath, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: { records: [] } }),
      })
    })

    await page.goto("/")
    await page.getByRole("button", { name: "购买记录" }).click()
    await page.getByRole("link", { name: "购买记录汇总" }).click()

    await expect(page).toHaveURL(/\/purchase-record-summary/)
    await expect(page.getByRole("heading", { name: "购买记录汇总" })).toBeVisible()
  })

  test("列表可正确渲染购买日期、名称、购买金额", async ({ page }) => {
    await page.route(listPath, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            records: [
              {
                id: "rec-1",
                purchase_date: "2026-04-18",
                name: "办公鼠标",
                amount: "123.40",
              },
            ],
          },
        }),
      })
    })

    await page.goto("/purchase-record-summary")

    await expect(page.getByRole("columnheader", { name: "购买日期" })).toBeVisible()
    await expect(page.getByRole("columnheader", { name: "名称" })).toBeVisible()
    await expect(page.getByRole("columnheader", { name: "购买金额" })).toBeVisible()

    await expect(page.getByText("2026-04-18")).toBeVisible()
    await expect(page.getByText("办公鼠标")).toBeVisible()
    await expect(page.getByText("123.40")).toBeVisible()
  })

  test("可查看购买记录详情", async ({ page }) => {
    await page.route(listPath, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            records: [
              {
                id: "rec-2",
                purchase_date: "2026-04-19",
                name: "键盘",
                amount: "88.00",
              },
            ],
          },
        }),
      })
    })

    await page.route(detailPath, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            id: "rec-2",
            purchase_date: "2026-04-19",
            name: "键盘",
            amount: "88.00",
          },
        }),
      })
    })

    await page.goto("/purchase-record-summary")
    await page.getByRole("button", { name: "查看详情" }).click()

    const detailDialog = page.getByRole("dialog", { name: "购买记录详情" })
    await expect(detailDialog.getByRole("heading", { name: "购买记录详情" })).toBeVisible()
    await expect(detailDialog.getByText("2026-04-19")).toBeVisible()
    await expect(detailDialog.getByText("键盘")).toBeVisible()
    await expect(detailDialog.getByText("88.00")).toBeVisible()
  })

  test("普通用户仅可查看自己的购买记录", async ({ page }) => {
    await page.route(listPath, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            records: [
              {
                id: "own-record",
                purchase_date: "2026-04-20",
                name: "我的记录",
                amount: "10.00",
              },
            ],
          },
        }),
      })
    })

    await page.goto("/purchase-record-summary")

    await expect(page.getByText("我的记录")).toBeVisible()
    await expect(page.getByText("他人记录")).not.toBeVisible()
  })
})
