import { createBdd } from "playwright-bdd";
import { expect } from "@playwright/test";

const { Then } = createBdd();

Then(
  "I should see one of: error state, empty state, or history list",
  async ({ page }) => {
    const errorState = page.getByText(/could not load reputation data/i);
    const emptyState = page.getByText(/no reputation history/i);
    const reputationCard = page.getByText(/On-Chain Reputation/i);

    // At least one specific state MUST render — no catch-all
    await expect(
      errorState.or(emptyState).or(reputationCard),
    ).toBeVisible({ timeout: 15_000 });
  },
);
