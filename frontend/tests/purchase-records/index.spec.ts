import { expect, test, type Page } from "@playwright/test"

import { firstSuperuser, firstSuperuserPassword } from "../config"
import { createUser } from "../utils/privateApi"
import { randomEmail, randomPassword } from "../utils/random"
import { logInUser } from "../utils/user"

const otherExpenseCategoryName = "其他费用"
const purchaseDate = "2026-04-18"

let userEmail = ""
let userPassword = ""
let ensuredSubcategoryName = ""

async function gotoPurchaseRecordsFromSidebar(page: Page) {
  await expect(page.getByRole("button", { name: "购买记录" })).toBeVisible()
  await page.getByRole("button", { name: "购买记录" }).click()
  await page.getByRole("link", { name: "购买记录汇总" }).click()
  await expect(page).toHaveURL(/\/purchase-records/)
}

async function ensureOtherExpenseCategoryAndSubcategory(page: Page) {
  await logInUser(page, firstSuperuser, firstSuperuserPassword)

  await page.goto("/purchase-records?view=categories")
  const categoryRow = page.getByRole("row").filter({
    hasText: otherExpenseCategoryName,
  })

  if ((await categoryRow.count()) === 0) {
    await page.getByRole("button", { name: "新增大类" }).click()
    const createDialog = page.getByRole("dialog")
    await createDialog.getByLabel("大类名称").fill(otherExpenseCategoryName)
    await createDialog.getByRole("button", { name: "保存" }).click()
    await expect(page.getByText("大类创建成功")).toBeVisible()
  }

  ensuredSubcategoryName = `预置小类-${Date.now()}`

  await page.goto("/purchase-records?view=subcategories")
  await page.getByRole("button", { name: "新增小类" }).click()
  const subcategoryDialog = page.getByRole("dialog")
  await subcategoryDialog.getByLabel("大类").click()
  await page.getByRole("option", { name: otherExpenseCategoryName }).click()
  await subcategoryDialog.getByLabel("小类名称").fill(ensuredSubcategoryName)
  await subcategoryDialog.getByRole("button", { name: "保存" }).click()
  await expect(page.getByText("小类创建成功")).toBeVisible()
}

test.describe("购买记录汇总", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test.beforeAll(async ({ browser }) => {
    userEmail = randomEmail()
    userPassword = randomPassword()
    await createUser({ email: userEmail, password: userPassword })

    const page = await browser.newPage()
    await ensureOtherExpenseCategoryAndSubcategory(page)
    await page.close()
  })

  test("普通用户可从侧边栏进入页面并完成列表筛选与失败提示", async ({ page }) => {
    await logInUser(page, userEmail, userPassword)
    await gotoPurchaseRecordsFromSidebar(page)

    await expect(page.getByRole("heading", { name: "购买记录汇总" })).toBeVisible()
    await expect(page.getByText("筛选条件")).toBeVisible()
    await expect(page.getByText("购买记录")).toBeVisible()

    await page.getByLabel("标题关键字").fill("关键字测试")
    await page.getByRole("button", { name: "查询" }).click()

    await page.getByLabel("开始日期").fill("2026-04-19")
    await page.getByLabel("结束日期").fill("2026-04-18")
    await page.getByRole("button", { name: "查询" }).click()
    await expect(page.getByText("参数校验错误")).toBeVisible()
    await expect(page.getByText("开始日期不能晚于结束日期")).toBeVisible()

    await page.getByRole("button", { name: "重置" }).click()
    await expect(page.getByLabel("标题关键字")).toHaveValue("")
    await expect(page.getByLabel("开始日期")).toHaveValue("")
    await expect(page.getByLabel("结束日期")).toHaveValue("")
  })

  test("普通用户可新增、编辑、删除购买记录并覆盖弹窗与表单失败流程", async ({ page }) => {
    await logInUser(page, userEmail, userPassword)
    await page.goto("/purchase-records")

    const title = `购买记录-${Date.now()}`
    const updatedTitle = `${title}-已更新`

    await page.getByRole("button", { name: "新增购买记录" }).click()
    const createDialog = page.getByRole("dialog")

    await createDialog.getByRole("button", { name: "保存" }).click()
    await expect(createDialog.getByText("标题不能为空")).toBeVisible()

    await createDialog.getByLabel("标题").fill(title)
    await createDialog.getByLabel("备注").fill("测试备注")
    await createDialog.getByLabel("金额").fill("12.30")
    await createDialog.getByLabel("购买日期").fill(purchaseDate)
    await createDialog.getByLabel("大类").click()
    await page.getByRole("option", { name: otherExpenseCategoryName }).click()

    await createDialog.getByRole("button", { name: "保存" }).click()
    await expect(createDialog.getByText("小类不能为空")).toBeVisible()
    await expect(createDialog.getByText("参数校验错误")).toBeVisible()

    await createDialog.getByLabel("小类").click()
    await page.getByRole("option", { name: ensuredSubcategoryName }).click()
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

    const deleteDialog = page.getByRole("dialog")
    await deleteDialog.getByRole("button", { name: "取消" }).click()
    await expect(updatedRow).toBeVisible()

    await updatedRow.getByRole("button", { name: "删除" }).click()
    await page.getByRole("button", { name: "删除" }).click()

    await expect(page.getByText("购买记录已删除")).toBeVisible()
    await expect(page.getByText(updatedTitle)).not.toBeVisible()
  })

  test("普通用户访问管理员视图时显示权限不足并可返回购买记录", async ({ page }) => {
    await logInUser(page, userEmail, userPassword)
    await page.goto("/purchase-records?view=categories")

    await expect(page.getByText("权限不足")).toBeVisible()
    await expect(page.getByText("当前用户无权访问该页面内容")).toBeVisible()

    await page.getByRole("button", { name: "返回购买记录" }).click()
    await expect(page).toHaveURL(/\/purchase-records\?view=records/)
  })

  test("管理员可完成大类新增与编辑", async ({ page }) => {
    await logInUser(page, firstSuperuser, firstSuperuserPassword)
    await page.goto("/purchase-records?view=categories")

    const categoryName = `测试大类-${Date.now()}`
    const updatedCategoryName = `${categoryName}-已更新`

    await page.getByRole("button", { name: "新增大类" }).click()
    const createDialog = page.getByRole("dialog")
    await createDialog.getByLabel("大类名称").fill(categoryName)
    await createDialog.getByRole("button", { name: "保存" }).click()

    await expect(page.getByText("大类创建成功")).toBeVisible()
    await expect(page.getByRole("row").filter({ hasText: categoryName })).toBeVisible()

    const categoryRow = page.getByRole("row").filter({ hasText: categoryName })
    await categoryRow.getByRole("button", { name: "编辑" }).click()

    const editDialog = page.getByRole("dialog")
    await editDialog.getByLabel("大类名称").fill(updatedCategoryName)
    await editDialog.getByLabel("启用").uncheck()
    await editDialog.getByRole("button", { name: "保存" }).click()

    await expect(page.getByText("大类更新成功")).toBeVisible()
    const updatedRow = page.getByRole("row").filter({ hasText: updatedCategoryName })
    await expect(updatedRow).toBeVisible()
    await expect(updatedRow.getByText("停用")).toBeVisible()
  })

  test("管理员可完成小类新增、编辑和按大类筛选", async ({ page }) => {
    await logInUser(page, firstSuperuser, firstSuperuserPassword)
    await page.goto("/purchase-records?view=subcategories")

    const subcategoryName = `测试小类-${Date.now()}`
    const updatedSubcategoryName = `${subcategoryName}-已更新`

    await page.getByRole("button", { name: "新增小类" }).click()
    const createDialog = page.getByRole("dialog")
    await createDialog.getByLabel("大类").click()
    await page.getByRole("option", { name: otherExpenseCategoryName }).click()
    await createDialog.getByLabel("小类名称").fill(subcategoryName)
    await createDialog.getByRole("button", { name: "保存" }).click()

    await expect(page.getByText("小类创建成功")).toBeVisible()
    await expect(page.getByRole("row").filter({ hasText: subcategoryName })).toBeVisible()

    const subcategoryRow = page.getByRole("row").filter({ hasText: subcategoryName })
    await subcategoryRow.getByRole("button", { name: "编辑" }).click()

    const editDialog = page.getByRole("dialog")
    await editDialog.getByLabel("小类名称").fill(updatedSubcategoryName)
    await editDialog.getByLabel("启用").uncheck()
    await editDialog.getByRole("button", { name: "保存" }).click()

    await expect(page.getByText("小类更新成功")).toBeVisible()

    await page.getByRole("combobox").first().click()
    await page.getByRole("option", { name: otherExpenseCategoryName }).click()

    const updatedRow = page.getByRole("row").filter({ hasText: updatedSubcategoryName })
    await expect(updatedRow).toBeVisible()
    await expect(updatedRow.getByText("停用")).toBeVisible()
  })
})
