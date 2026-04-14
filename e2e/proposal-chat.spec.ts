import { test, expect } from "@playwright/test";

test.describe("Proposal chat interface", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/proposals/new");
  });

  test("shows page title", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Submit a Proposal" })
    ).toBeVisible();
  });

  test("shows chat tab as default active tab", async ({ page }) => {
    await expect(
      page.getByRole("tab", { name: /chat with ai/i })
    ).toBeVisible();
    await expect(
      page.getByRole("tab", { name: /use form/i })
    ).toBeVisible();
  });

  test("shows chat placeholder message", async ({ page }) => {
    await expect(
      page.getByText(/tell me about your project idea/i)
    ).toBeVisible();
  });

  test("shows chat input field and send button", async ({ page }) => {
    await expect(
      page.getByPlaceholder(/tell me about your project idea/i)
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /send/i })).toBeVisible();
  });

  test("send button is disabled when input is empty", async ({ page }) => {
    await expect(page.getByRole("button", { name: /send/i })).toBeDisabled();
  });

  test("send button is enabled when input has text", async ({ page }) => {
    await page
      .getByPlaceholder(/tell me about your project idea/i)
      .fill("I want to build a community garden");
    await expect(page.getByRole("button", { name: /send/i })).toBeEnabled();
  });

  test("can switch to form tab and back", async ({ page }) => {
    // Switch to form tab
    await page.getByRole("tab", { name: /use form/i }).click();

    // Form fields should be visible
    await expect(page.getByLabel(/title/i)).toBeVisible();

    // Switch back to chat tab
    await page.getByRole("tab", { name: /chat with ai/i }).click();

    // Chat input should be visible again
    await expect(
      page.getByPlaceholder(/tell me about your project idea/i)
    ).toBeVisible();
  });

  test("form tab shows the classic proposal form", async ({ page }) => {
    await page.getByRole("tab", { name: /use form/i }).click();

    await expect(page.getByLabel(/title/i)).toBeVisible();
    await expect(page.getByLabel(/description/i)).toBeVisible();
    await expect(page.getByLabel(/team/i)).toBeVisible();
    await expect(page.getByLabel(/budget/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /submit proposal/i })
    ).toBeVisible();
  });
});
