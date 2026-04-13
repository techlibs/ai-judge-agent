import { test, expect } from "@playwright/test";

test.describe("Proposal submission form", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/proposals/new");
  });

  test("shows page title", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Submit a Proposal" })).toBeVisible();
  });

  test("renders all required form fields", async ({ page }) => {
    await expect(page.getByLabel(/title/i)).toBeVisible();
    await expect(page.getByLabel(/description/i)).toBeVisible();
    await expect(page.getByLabel(/team/i)).toBeVisible();
    await expect(page.getByLabel(/budget/i)).toBeVisible();
  });

  test("shows external links field", async ({ page }) => {
    await expect(page.getByText(/external links/i)).toBeVisible();
  });

  test("validates title minimum length", async ({ page }) => {
    const titleInput = page.getByLabel(/title/i);
    await titleInput.fill("ab");
    await page.getByRole("button", { name: /submit/i }).click();

    await expect(page.getByText(/at least 5 characters/i)).toBeVisible({ timeout: 5_000 });
  });

  test("validates description minimum length", async ({ page }) => {
    const descriptionInput = page.getByLabel(/description/i);
    await descriptionInput.fill("Too short");
    await page.getByRole("button", { name: /submit/i }).click();

    await expect(page.getByText(/at least 50 characters/i)).toBeVisible({ timeout: 5_000 });
  });

  test("validates team info minimum length", async ({ page }) => {
    const teamInput = page.getByLabel(/team/i);
    await teamInput.fill("Short");
    await page.getByRole("button", { name: /submit/i }).click();

    await expect(page.getByText(/at least 10 characters/i)).toBeVisible({ timeout: 5_000 });
  });

  test("validates budget", async ({ page }) => {
    // Budget field defaults to 0, submitting should show a validation error
    await page.getByRole("button", { name: /submit/i }).click();

    await expect(page.getByText(/budget must be positive/i)).toBeVisible({ timeout: 5_000 });
  });
});
