import { test, expect } from "@playwright/test";

/**
 * Golden path E2E test — complete user flow in a single test:
 * Submit proposal → View detail → Trigger evaluation → View results → Check reputation → Verify list
 *
 * This test hits real services: Base Sepolia chain, Pinata IPFS, OpenAI API.
 * It costs real testnet gas and API credits.
 *
 * ZERO conditional skipping — every step must pass or the test fails.
 */
test.describe("Golden path", () => {
  test("full flow: submit → evaluate → reputation", async ({ page, request }) => {
    test.setTimeout(300_000);

    // ── Step 1: Submit a proposal ──
    await page.goto("/proposals/new");
    await expect(page.getByRole("heading", { name: "Submit a Proposal" })).toBeVisible();

    await page.getByLabel(/title/i).fill("Solar-Powered Community WiFi Network");
    await page.getByLabel(/description/i).fill(
      "This project aims to deploy a solar-powered mesh WiFi network across underserved communities in the IPE City region. " +
      "The network will provide free internet access to approximately 5,000 residents, enabling digital inclusion and economic opportunity. " +
      "We will install 25 solar-powered access points with mesh networking capability, ensuring resilient coverage even during power outages.",
    );
    await page.getByLabel(/team/i).fill(
      "Led by Maria Santos (10 years telecom infrastructure) and João Silva (solar energy engineer). " +
      "Supported by 3 field technicians and a community liaison team.",
    );
    await page.getByLabel(/budget/i).fill("75000");

    await page.getByRole("button", { name: /submit proposal/i }).click();

    // Wait for on-chain registration + redirect
    await page.waitForURL(/\/proposals\/\d+/, { timeout: 90_000 });
    const proposalUrl = page.url();
    const proposalId = proposalUrl.match(/\/proposals\/(\d+)/)![1];

    // Verify on-chain registration via API
    const apiResponse = await request.get(`/api/proposals/${proposalId}`);
    expect(apiResponse.ok()).toBeTruthy();

    await page.screenshot({ path: "e2e/screenshots/reference/01-proposal-submitted.png" });

    // ── Step 2: View proposal detail — IPFS content MUST load ──
    await page.goto(`/proposals/${proposalId}`);
    await expect(page.getByText("Solar-Powered Community WiFi Network")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/\$75,000/)).toBeVisible();
    await expect(page.getByText(/Maria Santos/)).toBeVisible();
    await expect(page.getByText(/IPFS CID/i)).toBeVisible();

    await page.screenshot({ path: "e2e/screenshots/reference/02-proposal-detail.png" });

    // ── Step 3: Trigger AI evaluation — MUST complete ──
    await page.goto(`/proposals/${proposalId}/evaluation`);
    await expect(page.getByRole("heading", { name: /Proposal Evaluation/i })).toBeVisible();

    const startButton = page.getByRole("button", { name: /start evaluation/i });
    await expect(startButton).toBeEnabled({ timeout: 30_000 });

    await page.screenshot({ path: "e2e/screenshots/reference/03-evaluation-idle.png" });
    await startButton.click();

    // Wait for all 4 judges to complete
    await expect(page.getByText(/4 of 4 judges complete/i)).toBeVisible({ timeout: 120_000 });
    await page.screenshot({ path: "e2e/screenshots/reference/04-evaluation-in-progress.png" });

    // Wait for final results — summary card MUST appear
    await expect(page.getByText(/Evaluation Breakdown/i)).toBeVisible({ timeout: 120_000 });

    // Verify all 4 dimension cards
    await expect(page.getByText(/Technical Feasibility/i).first()).toBeVisible();
    await expect(page.getByText(/Impact Potential/i).first()).toBeVisible();
    await expect(page.getByText(/Cost Efficiency/i).first()).toBeVisible();
    await expect(page.getByText(/Team Capability/i).first()).toBeVisible();

    // Verify prompt comparison section
    await expect(page.getByText(/Prompt Engineering Comparison/i)).toBeVisible();

    await page.screenshot({
      path: "e2e/screenshots/reference/05-evaluation-results.png",
      fullPage: true,
    });

    // ── Step 4: Check reputation — MUST show on-chain data ──
    await page.goto(`/proposals/${proposalId}/reputation`);
    await expect(page.getByText(/On-Chain Reputation/i)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/Based on \d+ evaluation/i)).toBeVisible();
    await expect(page.getByText(/Reputation History/i)).toBeVisible();

    await page.screenshot({ path: "e2e/screenshots/reference/06-reputation.png" });

    // ── Step 5: Verify proposal in list ──
    await page.goto("/proposals");
    await expect(page.getByRole("heading", { name: "All Proposals" })).toBeVisible();
    await expect(page.getByText(/Solar-Powered/i).first()).toBeVisible({ timeout: 15_000 });

    await page.screenshot({ path: "e2e/screenshots/reference/07-proposals-list.png" });
  });
});
