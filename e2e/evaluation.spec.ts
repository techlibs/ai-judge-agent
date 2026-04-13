import { test, expect } from "@playwright/test";

test.describe("Evaluation page", () => {
  test("shows evaluation page content", async ({ page }) => {
    await page.goto("/proposals/1/evaluation");

    // Page always shows the heading regardless of proposal load state
    await expect(
      page.getByRole("heading", { name: /Proposal Evaluation/i }),
    ).toBeVisible();
  });

  test("shows idle state or error state", async ({ page }) => {
    await page.goto("/proposals/1/evaluation");

    // Either shows "Ready for evaluation" (proposal loaded) or error text (proposal failed to load)
    const readyText = page.getByText(/ready for evaluation/i);
    const errorText = page.getByText(/failed to load proposal/i);

    await expect(readyText.or(errorText)).toBeVisible({ timeout: 10_000 });
  });

  test("has back to proposal link", async ({ page }) => {
    await page.goto("/proposals/1/evaluation");

    const backLink = page.getByRole("link", { name: /back to proposal/i });
    await expect(backLink).toBeVisible();
  });
});
