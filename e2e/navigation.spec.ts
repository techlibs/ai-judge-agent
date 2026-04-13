import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
  test("landing page renders with heading", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "IPE City Grants" })
    ).toBeVisible();
    await expect(page.locator("main")).toBeVisible();
  });

  test("grants listing page is reachable", async ({ page }) => {
    await page.goto("/grants");
    await expect(
      page.getByRole("heading", { name: "Grant Proposals" })
    ).toBeVisible();
  });

  test("grants page shows search input", async ({ page }) => {
    await page.goto("/grants");
    await expect(
      page.getByPlaceholder("Search proposals...")
    ).toBeVisible();
  });
});
