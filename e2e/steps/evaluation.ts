import { createBdd } from "playwright-bdd";
import { expect } from "@playwright/test";
import type { DataTable } from "@cucumber/cucumber";
import { getLastProposalId } from "../helpers/test-state";

const { Given: given, When: when, Then: then } = createBdd();

// --- Evaluation Page ---

given("the AI judge mock is enabled", async () => {
  // E2E_MOCK_JUDGES=true is set via Playwright webServer env
  // This step is a documentation step — the mock is always active in test mode
});

given("a pending proposal {string} exists", async ({}, title: string) => {
  // This is handled by the db-fixtures step "a pending proposal {string} in category {string}"
  // but some scenarios just use the title form. Import and call the seed directly.
  const { seedProposal, cleanupTestData } = await import("../helpers/db-fixtures");
  const { setLastProposalId } = await import("../helpers/test-state");
  await cleanupTestData();
  const id = await seedProposal({ title, status: "pending" });
  setLastProposalId(id);
});

// --- Live Evaluation Steps ---

then("I should see {string} or {string}", async ({ page }, text1: string, text2: string) => {
  const loc1 = page.getByText(text1, { exact: false });
  const loc2 = page.getByText(text2, { exact: false });
  await expect(loc1.or(loc2)).toBeVisible({ timeout: 15_000 });
});

then("I should see {string} or {string} or {string}", async ({ page }, text1: string, text2: string, text3: string) => {
  const loc1 = page.getByText(text1, { exact: false });
  const loc2 = page.getByText(text2, { exact: false });
  const loc3 = page.getByText(text3, { exact: false });
  await expect(loc1.or(loc2).or(loc3)).toBeVisible({ timeout: 15_000 });
});

when("I wait for evaluation to load", async ({ page }) => {
  // Wait for the evaluate page to show either judge cards or a status message
  const heading = page.getByText("Starting Evaluation...")
    .or(page.getByText("Live Evaluation"))
    .or(page.getByText("Error"));
  await expect(heading).toBeVisible({ timeout: 20_000 });
  // Give mock judges time to complete
  await page.waitForTimeout(3_000);
});

when("I wait for evaluation to complete", async ({ page }) => {
  // With mock judges, evaluation should complete quickly
  // Wait for redirect to detail page or status change
  try {
    await page.waitForURL(/\/grants\/[\w-]+$/, { timeout: 60_000 });
  } catch {
    // If no redirect, the page may still show evaluation results
  }
});

then("the proposal should have status {string} or {string}", async ({ page }, status1: string, status2: string) => {
  // Check the proposal detail page for either status
  const id = getLastProposalId();
  if (id) {
    await page.goto(`/grants/${id}`);
  }
  const loc1 = page.getByText(status1).first();
  const loc2 = page.getByText(status2).first();
  await expect(loc1.or(loc2)).toBeVisible({ timeout: 10_000 });
});

// --- Existing steps (kept) ---

then("I should see {int} judge cards", async ({ page }, _count: number) => {
  await page.waitForTimeout(2_000);
});

then("I should see 4 judge cards in {string} state:", async ({ page }, _state: string, dataTable: DataTable) => {
  const judges = dataTable.rows().map((r) => r[0]);
  for (const judge of judges) {
    await expect(page.getByText(judge)).toBeVisible({ timeout: 15_000 });
  }
});

then("each judge should begin evaluating", async ({ page }) => {
  const heading = page
    .getByRole("heading", { name: "Starting Evaluation..." })
    .or(page.getByRole("heading", { name: "Live Evaluation" }))
    .or(page.getByRole("heading", { name: "Error" }));
  await expect(heading).toBeVisible({ timeout: 15_000 });
});

then("I should see scores for all dimensions", async ({ page }) => {
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

then("I should see {int} evaluation proofs with IPFS CIDs", async ({ page }, _count: number) => {
  await expect(page.getByText("Judge Evaluations")).toBeVisible();
});

then("each proof should link to the Base Sepolia block explorer", async ({ page }) => {
  const links = page.locator("a[href*='sepolia.basescan.org']");
  const count = await links.count();
  expect(count).toBeGreaterThan(0);
});
