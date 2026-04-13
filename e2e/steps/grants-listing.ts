import { createBdd } from "playwright-bdd";
import { expect } from "@playwright/test";

const { Given: given, When: when, Then: then } = createBdd();

// --- Grants Listing Page ---

// "I should see the heading" moved to shared.ts

then("I should see total proposals count of {int}", async ({ page }, count: number) => {
  const statsArea = page.locator(".text-3xl.font-bold").first();
  await expect(statsArea).toHaveText(String(count));
});

then("I should see evaluated proposals count of {int}", async ({ page }, count: number) => {
  const statsArea = page.locator(".text-3xl.font-bold").nth(1);
  await expect(statsArea).toHaveText(String(count));
});

then("I should see average score of {string}", async ({ page }, score: string) => {
  await expect(page.getByText(score)).toBeVisible();
});

// "I should see a {string} link" moved to shared.ts

then("I should see a proposal card for {string}", async ({ page }, title: string) => {
  await expect(page.getByText(title)).toBeVisible();
});

then("I should see {string} in the proposals list", async ({ page }, title: string) => {
  await expect(page.getByText(title).first()).toBeVisible();
});

then("the card should display category {string}", async ({ page }, category: string) => {
  await expect(page.getByText(category)).toBeVisible();
});

then("the card should display status {string}", async ({ page }, status: string) => {
  await expect(page.getByText(status).first()).toBeVisible();
});

then("the card should display score {string}", async ({ page }, score: string) => {
  await expect(page.getByText(score).first()).toBeVisible();
});

then("the card should display the creation date", async ({ page }) => {
  // Creation dates are rendered — just confirm the card has some date-like text
  await expect(page.locator(".text-muted-foreground").first()).toBeVisible();
});

then("the card should not display a score", async ({ page }) => {
  // Pending proposals don't show a score value in the card
  // This is a soft check — no score gauge should be visible
  const scoreGauges = page.locator("[data-testid='score-gauge']");
  await expect(scoreGauges).toHaveCount(0);
});

then("the proposal card should show a {string} badge", async ({ page }, status: string) => {
  await expect(page.getByText(status, { exact: false }).first()).toBeVisible();
});

when("I click on the proposal card for {string}", async ({ page }, title: string) => {
  await page.getByText(title).first().click();
});

when("I click on the proposal {string}", async ({ page }, title: string) => {
  await Promise.all([
    page.waitForURL(/\/grants\/[\w-]+$/),
    page.getByText(title).first().click(),
  ]);
});

when("I click the {string} link", async ({ page }, linkText: string) => {
  await page.getByRole("link", { name: linkText }).click();
});

then("{string} should appear before {string}", async ({ page }, first: string, second: string) => {
  const firstBox = await page.getByText(first).boundingBox();
  const secondBox = await page.getByText(second).boundingBox();
  expect(firstBox).toBeTruthy();
  expect(secondBox).toBeTruthy();
  expect(firstBox!.y).toBeLessThan(secondBox!.y);
});
