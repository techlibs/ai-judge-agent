import { test, expect } from "@playwright/test";

test.describe("Evaluation page", () => {
  test("shows page heading", async ({ page }) => {
    await page.goto("/proposals/1/evaluation");

    await expect(
      page.getByRole("heading", { name: /Proposal Evaluation/i }),
    ).toBeVisible();
  });

  test("shows ready state or proposal load error", async ({ page }) => {
    await page.goto("/proposals/1/evaluation");

    // Both are valid states — but at least one MUST appear
    const readyText = page.getByText(/ready for evaluation/i);
    const errorText = page.getByText(/failed to load proposal/i);

    await expect(readyText.or(errorText)).toBeVisible({ timeout: 10_000 });
  });

  test("has back to proposal link", async ({ page }) => {
    await page.goto("/proposals/1/evaluation");

    await expect(
      page.getByRole("link", { name: /back to proposal/i }),
    ).toBeVisible();
  });
});
