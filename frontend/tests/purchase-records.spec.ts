import { expect, test } from "@playwright/test"

import { firstSuperuser, firstSuperuserPassword } from "./config"
import { createUser } from "./utils/privateApi"
import { randomEmail, randomPassword } from "./utils/random"
import { logInUser } from "./utils/user"

const otherExpenseCategoryName = "其他费用"
const purchaseDate = "2026-04-18"
let createdSubcategoryName = ""
let userEmail = ""
let userPassword = ""

async function ensureOtherExpenseCategory(page: import("@playwright/test").Page) {
  await logInUser(page, firstSuperuser, firstSuperuserPassword)
  await page.goto("/purchase-records?view=categories")

  const categoryRow = page.getByRole("row").filter({
    hasText: otherExpenseCategoryName,
  })

  if ((await categoryRow.count()) === 0) {
    await page.getByRole("button", { name: "新增大类" }).click()
    await page.getByLabel("大类名称").fill(otherExpenseCategoryName)
    await page.getByRole("button", { name: "保存" }).click()
    await expect(page.getByText("大类创建成功")).toBeVisible()
  }

  createdSubcategoryName = `测试小类-${Date.now()}`

  await page.goto("/purchase-records?view=subcategories")
  await page.getByRole("button", { name: "新增小类" }).click()
  await page.getByLabel("大类").click()
  await page.getByRole("option", { name: otherExpenseCategoryName }).click()
  await page.getByLabel("小类名称").fill(createdSubcategoryName)
  await page.getByRole("button", { name: "保存" }).click()
  await expect(page.getByText("小类创建成功")).toBeVisible()
}

test.describe("购买记录汇总", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test.beforeAll(async ({ browser }) => {
    userEmail = randomEmail()
    userPassword = randomPassword()
    await createUser({ email: userEmail, password: userPassword })

    const page = await browser.newPage()
    await ensureOtherExpenseCategory(page)
    await page.close()
  })

  test.beforeEach(async ({ page }) => {
    await logInUser(page, userEmail, userPassword)
  })

  test("侧边栏入口可访问并正确渲染页面", async ({ page }) => {
    await expect(page.getByRole("button", { name: "购买记录" })).toBeVisible()
    await page.getByRole("button", { name: "购买记录" }).click()
    await page.getByRole("link", { name: "购买记录汇总" }).click()

    await expect(page).toHaveURL(/\/purchase-records/)
    await expect(page.getByRole("heading", { name: "购买记录汇总" })).toBeVisible()
  })

  test("普通用户可新增、编辑、删除自己的购买记录", async ({ page }) => {
    const title = `购买记录-${Date.now()}`
    const updatedTitle = `${title}-已更新`

    await page.goto("/purchase-records")

    await page.getByRole("button", { name: "新增购买记录" }).click()
    const createDialog = page.getByRole("dialog")
    await createDialog.getByLabel("标题").fill(title)
    await createDialog.getByLabel("备注").fill("测试备注")
    await createDialog.getByLabel("金额").fill("12.30")
    await createDialog.getByLabel("购买日期").fill(purchaseDate)
    await createDialog.getByLabel("大类").click()
    await page.getByRole("option", { name: otherExpenseCategoryName }).click()
    await createDialog.getByLabel("小类").click()
    await page.getByRole("option", { name: createdSubcategoryName }).click()
    await createDialog.getByRole("button", { name: "保存" }).click()

    await expect(page.getByText("购买记录创建成功")).toBeVisible()
    await expect(page.getByText(title)).toBeVisible()

    const recordRow = page.getByRole("row").filter({ hasText: title })
    await recordRow.getByRole("button", { name: "编辑" }).click()

    const editDialog = page.getByRole("dialog")
    await editDialog.getByLabel("标题").fill(updatedTitle)
    await editDialog.getByRole("button", { name: "保存" }).click()

    await expect(page.getByText("购买记录更新成功")).toBeVisible()
    await expect(page.getByText(updatedTitle)).toBeVisible()

    const updatedRow = page.getByRole("row").filter({ hasText: updatedTitle })
    await updatedRow.getByRole("button", { name: "删除" }).click()
    await page.getByRole("button", { name: "删除" }).click()

    await expect(page.getByText("购买记录已删除")).toBeVisible()
    await expect(page.getByText(updatedTitle)).not.toBeVisible()
  })

  test("筛选参数校验错误会显示提示", async ({ page }) => {
    await page.goto("/purchase-records")

    await page.getByLabel("开始日期").fill("2026-04-19")
    await page.getByLabel("结束日期").fill("2026-04-18")
    await page.getByRole("button", { name: "查询" }).click()

    await expect(page.getByText("参数校验错误")).toBeVisible()
    await expect(page.getByText("开始日期不能晚于结束日期")).toBeVisible()
  })

  test("普通用户访问管理员视图时显示权限不足", async ({ page }) => {
    await page.goto("/purchase-records?view=categories")

    await expect(page.getByText("权限不足")).toBeVisible()
    await expect(page.getByText("当前用户无权访问该页面内容")).toBeVisible()
  })
})
