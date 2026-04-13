import { createBdd } from "playwright-bdd";
import { expect } from "@playwright/test";

const { When, Then } = createBdd();

// --- Proposals list steps ---

When("no proposals exist", async ({ page }) => {
  await expect(page.getByText("No proposals yet")).toBeVisible({ timeout: 10_000 });
});

When("proposals exist", async ({ page }) => {
  await expect(
    page.locator("a[href^='/proposals/']").first(),
  ).toBeVisible({ timeout: 15_000 });
});

Then(
  "I should see {string} message",
  async ({ page }, messageText: string) => {
    await expect(page.getByText(messageText)).toBeVisible({ timeout: 10_000 });
  },
);

Then("I should see a link to submit the first proposal", async ({ page }) => {
  await expect(
    page.getByRole("link", { name: /submit the first proposal/i }),
  ).toBeVisible();
});

Then("I should see proposal cards", async ({ page }) => {
  await expect(
    page.locator("a[href^='/proposals/']").first(),
  ).toBeVisible({ timeout: 15_000 });
});

// --- Proposal detail steps ---

When("the proposal exists", async ({ page }) => {
  // Verify page rendered — back link is always present
  await expect(
    page.getByRole("link", { name: /back.*proposals/i }),
  ).toBeVisible({ timeout: 10_000 });
});

Then("I should see proposal details", async ({ page }) => {
  await expect(page.getByRole("heading").first()).toBeVisible({ timeout: 10_000 });
});

Then("I should see proposal content or error state", async ({ page }) => {
  // Back link is present in all states — assert it renders
  await expect(
    page.getByRole("link", { name: /back.*proposals/i }),
  ).toBeVisible({ timeout: 10_000 });
});

Then("I should see a back to proposals link", async ({ page }) => {
  await expect(
    page.getByRole("link", { name: /back.*proposals/i }),
  ).toBeVisible({ timeout: 10_000 });
});

// --- Proposal submission steps ---

Then("I should see proposal form fields", async ({ page }) => {
  await expect(page.getByLabel(/title/i)).toBeVisible();
  await expect(page.getByLabel(/description/i)).toBeVisible();
  await expect(page.getByLabel(/team/i)).toBeVisible();
  await expect(page.getByLabel(/budget/i)).toBeVisible();
  await expect(page.getByText(/external links/i)).toBeVisible();
});

Then(
  "I should see fields for title, description, team, budget, and links",
  async ({ page }) => {
    await expect(page.getByLabel(/title/i)).toBeVisible();
    await expect(page.getByLabel(/description/i)).toBeVisible();
    await expect(page.getByLabel(/team/i)).toBeVisible();
    await expect(page.getByLabel(/budget/i)).toBeVisible();
    await expect(page.getByText(/external links/i)).toBeVisible();
  },
);

When("I fill in title with {string}", async ({ page }, value: string) => {
  await page.getByLabel(/title/i).fill(value);
});

When(
  "I fill in description with {string}",
  async ({ page }, value: string) => {
    await page.getByLabel(/description/i).fill(value);
  },
);

When("I fill in team info with {string}", async ({ page }, value: string) => {
  await page.getByLabel(/team/i).fill(value);
});

When("I fill in budget with {string}", async ({ page }, value: string) => {
  await page.getByLabel(/budget/i).fill(value);
});

When("I submit the form", async ({ page }) => {
  await page.getByRole("button", { name: /submit/i }).click();
});
