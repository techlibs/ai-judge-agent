import { createBdd } from "playwright-bdd";
import { expect } from "@playwright/test";

const { Then } = createBdd();

Then(
  "I should see one of: error state, empty state, or history list",
  async ({ page }) => {
    const errorState = page.getByText(/could not load reputation data/i);
    const emptyState = page.getByText(/no reputation history/i);
    const historyList = page
      .locator("[data-testid='reputation-list']")
      .or(page.getByRole("list"));

    const hasError = await errorState.isVisible().catch(() => false);
    const isEmpty = await emptyState.isVisible().catch(() => false);
    const hasHistory = await historyList.isVisible().catch(() => false);

    expect(hasError || isEmpty || hasHistory).toBeTruthy();
  },
);
