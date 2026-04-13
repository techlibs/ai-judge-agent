import { test, expect } from "@playwright/test";

test.describe("Operator Dashboard", () => {
  test("redirects unauthenticated users to sign-in", async ({ page }) => {
    await page.goto("/dashboard/operator");
    // Should redirect to auth sign-in page
    await expect(page).toHaveURL(/auth.*signin|api\/auth/);
  });
});
