import { expect, test } from "@playwright/test"

test("Sidebar keeps unrelated tool groups unchanged after navigation", async ({
  page,
}) => {
  await page.goto("/")

  await expect(page.getByText("\u5de5\u5177\u680f")).toBeVisible()
  await expect(
    page.getByRole("button", { name: "\u5de5\u4f5c\u53f0" }),
  ).toBeVisible()
  await expect(
    page.getByRole("button", { name: "\u7cfb\u7edf\u7ba1\u7406" }),
  ).toBeVisible()

  await page.getByRole("button", { name: "\u5de5\u4f5c\u53f0" }).click()
  await expect(
    page.getByRole("link", { name: "\u4eea\u8868\u76d8" }),
  ).not.toBeVisible()

  await expect(
    page.getByRole("link", { name: "\u4e2a\u4eba\u8bbe\u7f6e" }),
  ).toBeVisible()
  await page.getByRole("link", { name: "\u4e2a\u4eba\u8bbe\u7f6e" }).click()

  await expect(
    page.getByRole("link", { name: "\u4eea\u8868\u76d8" }),
  ).not.toBeVisible()
  await expect(
    page.getByRole("link", { name: "\u4e2a\u4eba\u8bbe\u7f6e" }),
  ).toBeVisible()
  await expect(
    page.getByRole("heading", { name: "User Settings" }),
  ).toBeVisible()
})
