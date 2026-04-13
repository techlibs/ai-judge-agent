import { createBdd } from "playwright-bdd";
import { expect } from "@playwright/test";

const { Given: given, When: when, Then: then } = createBdd();

// --- Shared steps used across multiple features ---

then("I should see a {string} link", async ({ page }, linkText: string) => {
  await expect(page.getByRole("link", { name: linkText })).toBeVisible();
});

then("I should not see a {string} link", async ({ page }, linkText: string) => {
  await expect(page.getByRole("link", { name: linkText })).not.toBeVisible();
});

then("I should see the heading {string}", async ({ page }, heading: string) => {
  await expect(page.getByRole("heading", { name: heading })).toBeVisible();
});

when("I click {string}", async ({ page }, text: string) => {
  await page.getByRole("button", { name: text }).or(page.getByRole("link", { name: text })).click();
});

then("I should see that evaluation is in progress", async ({ page }) => {
  await expect(page.getByText("evaluating").first()).toBeVisible();
});

then("the link should point to {string}", async ({ page }, path: string) => {
  const pattern = path.replace(/\{[^}]+\}/g, "[\\w-]+");
  const link = page.getByRole("link").filter({ hasText: /Start Evaluation|Verify On-Chain/ }).first();
  const href = await link.getAttribute("href");
  expect(href).toMatch(new RegExp(pattern));
});

then("I should see the {string} section", async ({ page }, section: string) => {
  await expect(page.getByText(section)).toBeVisible();
});
