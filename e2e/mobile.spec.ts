import { test, expect } from "@playwright/test";

// Use chromium with mobile viewport (not webkit device — webkit not installed)
test.use({ viewport: { width: 375, height: 812 }, isMobile: true });

test.describe("Mobile responsive (UI-05)", () => {
  test("proposals list renders on mobile", async ({ page }) => {
    await page.goto("/proposals");
    await expect(page.getByRole("heading", { name: "All Proposals" })).toBeVisible();
    await expect(page.getByText("IPE City Grants")).toBeVisible();

    await page.screenshot({ path: "e2e/screenshots/reference/mobile-proposals-list.png" });
  });

  test("submit form is usable on mobile", async ({ page }) => {
    await page.goto("/proposals/new");
    await expect(page.getByRole("heading", { name: "Submit a Proposal" })).toBeVisible();

    await expect(page.getByLabel(/title/i)).toBeVisible();
    await expect(page.getByLabel(/description/i)).toBeVisible();
    await expect(page.getByLabel(/team/i)).toBeVisible();
    await expect(page.getByLabel(/budget/i)).toBeVisible();

    await page.getByLabel(/title/i).fill("Mobile test");
    await expect(page.getByLabel(/title/i)).toHaveValue("Mobile test");

    await page.screenshot({ path: "e2e/screenshots/reference/mobile-submit-form.png" });
  });

  test("navigation works on mobile", async ({ page }) => {
    await page.goto("/");
    await page.waitForURL("**/proposals");
    expect(page.url()).toContain("/proposals");

    await page.screenshot({ path: "e2e/screenshots/reference/mobile-navigation.png" });
  });

  test("evaluation page renders on mobile", async ({ page }) => {
    await page.goto("/proposals/1/evaluation");
    await expect(
      page.getByRole("heading", { name: /Proposal Evaluation/i }),
    ).toBeVisible();

    await page.screenshot({ path: "e2e/screenshots/reference/mobile-evaluation.png" });
  });
});
