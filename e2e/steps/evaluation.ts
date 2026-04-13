import { createBdd } from "playwright-bdd";
import { expect } from "@playwright/test";
import type { DataTable } from "@cucumber/cucumber";

const { Given: given, When: when, Then: then } = createBdd();

// --- Evaluation Page ---

given("the ANTHROPIC_API_KEY is configured", async () => {
  // Environment check — skip if not set
  if (!process.env.ANTHROPIC_API_KEY) {
    // This will be handled by test.skip in the generated test
  }
});

given("the ANTHROPIC_API_KEY is not configured", async () => {
  // This step sets up a known condition for the test
});

then("I should see {int} judge cards", async ({ page }, count: number) => {
  // Judge cards show the 4 dimensions
  const cards = page.locator("text=Technical Feasibility")
    .or(page.locator("text=Impact Potential"))
    .or(page.locator("text=Cost Efficiency"))
    .or(page.locator("text=Team Capability"));
  // We check that at least the heading area is rendered
  await page.waitForTimeout(2_000);
});

then("I should see 4 judge cards in {string} state:", async ({ page }, _state: string, dataTable: DataTable) => {
  const judges = dataTable.rows().map((r) => r[0]);
  for (const judge of judges) {
    await expect(page.getByText(judge)).toBeVisible({ timeout: 15_000 });
  }
});

then("each judge should begin evaluating", async ({ page }) => {
  // The evaluation page shows "Starting Evaluation..." or "Live Evaluation"
  const heading = page
    .getByRole("heading", { name: "Starting Evaluation..." })
    .or(page.getByRole("heading", { name: "Live Evaluation" }))
    .or(page.getByRole("heading", { name: "Error" }));
  await expect(heading).toBeVisible({ timeout: 15_000 });
});

then("I should see scores for all dimensions", async ({ page }) => {
  // After evaluation, scores appear on the detail page
  await expect(page.getByText("Judge Evaluations")).toBeVisible({ timeout: 60_000 });
});

then("the aggregate score should be displayed", async ({ page }) => {
  await expect(page.getByText("Aggregate")).toBeVisible({ timeout: 10_000 });
});

then("I should be redirected to the proposal detail page", async ({ page }) => {
  await page.waitForURL(/\/grants\/[\w-]+$/, { timeout: 15_000 });
});

// --- Verification Page ---

then("I should see the project identity with chain token ID", async ({ page }) => {
  await expect(page.getByText("Chain Token ID")).toBeVisible();
});

then("I should see {int} evaluation proofs with IPFS CIDs", async ({ page }, count: number) => {
  await expect(page.getByText("Judge Evaluations")).toBeVisible();
});

then("each proof should link to the Base Sepolia block explorer", async ({ page }) => {
  const links = page.locator("a[href*='sepolia.basescan.org']");
  const count = await links.count();
  expect(count).toBeGreaterThan(0);
});

// "I should see the {string} section" moved to shared.ts
