import { test, expect } from "@playwright/test";

test.describe("Proposal Chat Interface", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/grants/submit");
  });

  test("shows chat interface by default", async ({ page }) => {
    // Chat tab should be active
    const chatTab = page.getByRole("button", { name: "Chat with AI" });
    await expect(chatTab).toHaveAttribute("aria-current", "page");

    // Welcome message should be visible
    await expect(
      page.getByText("I'm here to help you create a grant proposal")
    ).toBeVisible();

    // Chat input should be visible
    await expect(page.getByPlaceholder("Describe your project...")).toBeVisible();
  });

  test("can switch to form fallback", async ({ page }) => {
    const formTab = page.getByRole("button", { name: "Use Form" });
    await formTab.click();

    // Form should be visible
    await expect(page.getByLabel("Proposal Title")).toBeVisible();
    await expect(page.getByLabel("Category")).toBeVisible();

    // Chat should be hidden
    await expect(page.getByPlaceholder("Describe your project...")).not.toBeVisible();
  });

  test("can switch back to chat from form", async ({ page }) => {
    // Switch to form
    await page.getByRole("button", { name: "Use Form" }).click();
    await expect(page.getByLabel("Proposal Title")).toBeVisible();

    // Switch back to chat
    await page.getByRole("button", { name: "Chat with AI" }).click();
    await expect(page.getByPlaceholder("Describe your project...")).toBeVisible();
  });

  test("send button is disabled when input is empty", async ({ page }) => {
    const sendButton = page.getByRole("button", { name: "Send" });
    await expect(sendButton).toBeDisabled();
  });

  test("can type in the chat input", async ({ page }) => {
    const input = page.getByPlaceholder("Describe your project...");
    await input.fill("I want to build a decentralized voting system");
    await expect(input).toHaveValue("I want to build a decentralized voting system");

    // Send button should be enabled
    const sendButton = page.getByRole("button", { name: "Send" });
    await expect(sendButton).toBeEnabled();
  });
});
