import { createBdd } from "playwright-bdd";
import { expect } from "@playwright/test";

const { Given: given, When: when, Then: then } = createBdd();

// --- Golden Path steps (unique to this feature) ---

then("I should be redirected to {string}", async ({ page }, path: string) => {
  const pattern = path.replace(/\{[^}]+\}/g, "[\\w-]+");
  // Submit + IPFS upload can take a while
  await page.waitForURL(new RegExp(pattern), { timeout: 30_000 });
});

when("all {int} judges have completed", async ({ page }, _count: number) => {
  // Wait for finalization redirect or timeout
  await page.waitForURL(/\/grants\/[\w-]+$/, { timeout: 120_000 });
});

then("I should see {string}", async ({ page }, text: string) => {
  await expect(page.getByText(text)).toBeVisible({ timeout: 10_000 });
});
