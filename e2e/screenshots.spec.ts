import { test } from "@playwright/test";

/**
 * Screenshot capture suite — not assertions, just page captures
 * for documentation and visual review.
 */
test.describe("Page Screenshots", () => {
  test("capture landing page", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "e2e/screenshots/01-landing.png", fullPage: true });
  });

  test("capture grants listing (empty)", async ({ page }) => {
    await page.goto("/grants");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "e2e/screenshots/02-grants-list-empty.png", fullPage: true });
  });

  test("capture grants search", async ({ page }) => {
    await page.goto("/grants?search=solar");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "e2e/screenshots/03-grants-search.png", fullPage: true });
  });

  test("capture 404 page", async ({ page }) => {
    await page.goto("/grants/nonexistent");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "e2e/screenshots/04-proposal-404.png", fullPage: true });
  });

  test("capture operator dashboard redirect", async ({ page }) => {
    await page.goto("/dashboard/operator");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "e2e/screenshots/05-operator-auth-redirect.png", fullPage: true });
  });
});
