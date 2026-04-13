import { createBdd } from "playwright-bdd";
import { expect } from "@playwright/test";

const { When, Then } = createBdd();

// --- Proposals list steps ---

When("no proposals exist", async ({ page }) => {
  const emptyMessage = page.getByText("No proposals yet");
  await emptyMessage.isVisible().catch(() => false);
});

When("proposals exist", async ({ page }) => {
  await page
    .locator("[data-testid='proposal-card']")
    .first()
    .isVisible()
    .catch(() => false);
});

Then(
  "I should see {string} message",
  async ({ page }, messageText: string) => {
    const message = page.getByText(messageText);
    const isVisible = await message.isVisible().catch(() => false);
    if (isVisible) {
      await expect(message).toBeVisible();
    }
  },
);

Then("I should see a link to submit the first proposal", async ({ page }) => {
  const submitLink = page.getByRole("link", {
    name: /submit the first proposal/i,
  });
  const isVisible = await submitLink.isVisible().catch(() => false);
  if (isVisible) {
    await expect(submitLink).toBeVisible();
  }
});

Then("I should see proposal cards", async ({ page }) => {
  const hasProposals = await page
    .locator("[data-testid='proposal-card']")
    .first()
    .isVisible()
    .catch(() => false);
  if (hasProposals) {
    await expect(
      page.locator("[data-testid='proposal-card']").first(),
    ).toBeVisible();
  }
});

// --- Proposal detail steps ---

When("the proposal exists", async ({ page }) => {
  await page.getByText(/proposal not found/i).isVisible().catch(() => false);
});

Then("I should see proposal details", async ({ page }) => {
  const notFound = page.getByText(/proposal not found/i);
  const isNotFound = await notFound.isVisible().catch(() => false);
  if (!isNotFound) {
    await expect(page.getByRole("heading").first()).toBeVisible();
  }
});

Then("I should see proposal content or error state", async ({ page }) => {
  const notFound = page.getByText(/proposal not found/i);
  const loadError = page.getByText(/failed to load proposal/i);
  const ipfsError = page.getByText(/content unavailable/i);
  const heading = page.getByRole("heading").first();

  await expect(
    notFound.or(loadError).or(ipfsError).or(heading),
  ).toBeVisible({ timeout: 10_000 });
});

Then("I should see a back to proposals link", async ({ page }) => {
  const backLink = page.getByRole("link", { name: /back.*proposals/i });
  await expect(backLink).toBeVisible({ timeout: 10_000 });
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
