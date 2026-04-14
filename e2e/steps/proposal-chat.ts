import { createBdd } from "playwright-bdd";
import { expect } from "@playwright/test";

const { When: when, Then: then } = createBdd();

// --- Chat Interface Assertions ---

then("I should see the chat interface as the default view", async ({ page }) => {
  await expect(page.getByTestId("chat-messages")).toBeVisible();
  await expect(page.getByTestId("chat-input-form")).toBeVisible();
});

then("I should see a welcome message", async ({ page }) => {
  await expect(
    page.getByText("Welcome to the Proposal Assistant"),
  ).toBeVisible();
});

then("I should see the classic proposal form", async ({ page }) => {
  await expect(page.getByLabel("Title")).toBeVisible();
  await expect(page.getByLabel("Description")).toBeVisible();
});

// --- Tab Switching ---

when("I click the {string} tab", async ({ page }, tabName: string) => {
  await page.getByRole("tab", { name: tabName }).click();
});

// --- Chat Interaction ---

when(
  "I type a message {string} in the chat input",
  async ({ page }, message: string) => {
    await page.getByTestId("chat-input").fill(message);
  },
);

when("I click the send button", async ({ page }) => {
  await page.getByRole("button", { name: "Send" }).click();
});

then("the chat input should be cleared", async ({ page }) => {
  const input = page.getByTestId("chat-input");
  await expect(input).toHaveValue("");
});

then("the send button should be disabled", async ({ page }) => {
  await expect(page.getByRole("button", { name: "Send" })).toBeDisabled();
});
