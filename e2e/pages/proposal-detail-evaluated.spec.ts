import { test, expect } from "@playwright/test";
import {
  DISPUTED_PROPOSAL_ID,
  FUNDED_PROPOSAL_ID,
} from "../fixtures/seed-data";

test.describe("Proposal Detail — Evaluated", () => {
  test("displays proposal title and metadata", async ({ page }) => {
    await page.goto(`/grants/${DISPUTED_PROPOSAL_ID}`);
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("h1")).toHaveText(/.+/);
    await expect(page.getByText(/infrastructure|defi|education|healthcare/i).first()).toBeVisible();
    await expect(page.getByText(/USD/).first()).toBeVisible();
    await expect(page.getByText(/Team size:/i).first()).toBeVisible();
  });

  test("displays description section", async ({ page }) => {
    await page.goto(`/grants/${DISPUTED_PROPOSAL_ID}`);
    await expect(page.getByRole("heading", { name: "Description" })).toBeVisible();
    await expect(page.locator("h2:has-text('Description') + *")).toBeVisible();
  });

  test("displays evaluation score", async ({ page }) => {
    await page.goto(`/grants/${DISPUTED_PROPOSAL_ID}`);
    await expect(page.getByRole("heading", { name: "Evaluation Score" })).toBeVisible();
  });

  test("displays adjusted score with reputation", async ({ page }) => {
    await page.goto(`/grants/${DISPUTED_PROPOSAL_ID}`);
    await expect(page.getByText(/Adjusted/i)).toBeVisible();
  });

  test("displays reputation bonus badge", async ({ page }) => {
    await page.goto(`/grants/${DISPUTED_PROPOSAL_ID}`);
    await expect(page.getByText("Reputation Bonus Active")).toBeVisible();
  });

  test("displays 4 dimension scores as expandable details", async ({ page }) => {
    await page.goto(`/grants/${DISPUTED_PROPOSAL_ID}`);
    const summaries = page.locator("details summary");
    await expect(summaries).toHaveCount(4);
    await expect(page.getByText("Technical Feasibility", { exact: true })).toBeVisible();
    await expect(page.getByText("Impact Potential", { exact: true })).toBeVisible();
    await expect(page.getByText("Cost Efficiency", { exact: true })).toBeVisible();
    await expect(page.getByText("Team Capability", { exact: true })).toBeVisible();
  });

  test("expanding dimension shows reasoning", async ({ page }) => {
    await page.goto(`/grants/${DISPUTED_PROPOSAL_ID}`);
    const firstSummary = page.locator("details summary").first();
    await firstSummary.click();
    await expect(page.getByRole("heading", { name: "Reasoning" }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Criteria Applied" }).first()).toBeVisible();
  });

  test("displays disputes section", async ({ page }) => {
    await page.goto(`/grants/${DISPUTED_PROPOSAL_ID}`);
    await expect(page.getByRole("heading", { name: "Disputes" })).toBeVisible();
  });

  test("dispute shows status and votes", async ({ page }) => {
    await page.goto(`/grants/${DISPUTED_PROPOSAL_ID}`);
    await expect(page.getByText("open").first()).toBeVisible();
    await expect(page.getByText(/uphold/i).first()).toBeVisible();
    await expect(page.getByText(/overturn/i).first()).toBeVisible();
  });

  test("displays verification section with links", async ({ page }) => {
    await page.goto(`/grants/${DISPUTED_PROPOSAL_ID}`);
    await expect(page.getByRole("heading", { name: "Verification", exact: true })).toBeVisible();
    await expect(page.locator("a[href*='basescan.org']").first()).toBeVisible();
    await expect(page.locator("a[href*='ipfs']").first()).toBeVisible();
  });

  test("fund release shows tx link", async ({ page }) => {
    await page.goto(`/grants/${FUNDED_PROPOSAL_ID}`);
    await expect(page.getByRole("heading", { name: "Fund Release" })).toBeVisible();
    await expect(page.getByText("95.0%")).toBeVisible();
    await expect(page.locator("a[href*='basescan.org/tx/']")).toBeVisible();
  });

  test("back link navigates to grants list", async ({ page }) => {
    await page.goto(`/grants/${DISPUTED_PROPOSAL_ID}`);
    await page.getByRole("link", { name: /Back to proposals/ }).click();
    await expect(page).toHaveURL(/\/grants$/);
  });
});
