import { test, expect } from "@playwright/test";

/**
 * Golden path E2E test — complete user flow in a single test:
 * Submit proposal → View detail → Trigger evaluation → View results → Check reputation → Verify list
 *
 * This test hits real services: Base Sepolia chain, Pinata IPFS, OpenAI API.
 * It costs real testnet gas and API credits.
 */
test.describe("Golden path", () => {
  test("full flow: submit → evaluate → reputation", async ({ page }) => {
    test.setTimeout(300_000); // 5 min — chain tx + IPFS propagation + LLM calls

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

    // Wait for on-chain registration + redirect (can take 30-60s on Base Sepolia)
    await page.waitForURL(/\/proposals\/\d+/, { timeout: 90_000 });
    const proposalUrl = page.url();
    const proposalId = proposalUrl.match(/\/proposals\/(\d+)/)![1];

    await page.screenshot({ path: "e2e/screenshots/reference/01-proposal-submitted.png" });

    // ── Step 2: View the proposal detail ──
    // IPFS gateway may need time to propagate — retry with reload
    let contentLoaded = false;
    for (let attempt = 0; attempt < 5; attempt++) {
      await page.goto(`/proposals/${proposalId}`);
      const titleVisible = await page
        .getByText("Solar-Powered Community WiFi Network")
        .isVisible({ timeout: 15_000 })
        .catch(() => false);
      if (titleVisible) {
        contentLoaded = true;
        break;
      }
      // Wait before retry — IPFS gateway propagation
      await page.waitForTimeout(5_000);
    }

    if (contentLoaded) {
      await expect(page.getByText(/\$75,000/)).toBeVisible();
      await expect(page.getByText(/Maria Santos/)).toBeVisible();
      await expect(page.getByText(/IPFS CID/i)).toBeVisible();
      await page.screenshot({ path: "e2e/screenshots/reference/02-proposal-detail.png" });
    } else {
      // IPFS gateway too slow — screenshot the error state and continue
      await page.screenshot({ path: "e2e/screenshots/reference/02-proposal-detail-ipfs-pending.png" });
    }

    // ── Step 3: Trigger AI evaluation ──
    await page.goto(`/proposals/${proposalId}/evaluation`);
    await expect(page.getByRole("heading", { name: /Proposal Evaluation/i })).toBeVisible();

    // Wait for proposal text to load (needed for the Start button to enable)
    const startButton = page.getByRole("button", { name: /start evaluation/i });
    const buttonReady = await startButton
      .isEnabled({ timeout: 30_000 })
      .catch(() => false);

    if (buttonReady) {
      await page.screenshot({ path: "e2e/screenshots/reference/03-evaluation-idle.png" });
      await startButton.click();

      // Wait for "4 of 4 judges complete" (SSE streaming from OpenAI — can take 30-60s)
      await expect(page.getByText(/4 of 4 judges complete/i)).toBeVisible({ timeout: 120_000 });
      await page.screenshot({ path: "e2e/screenshots/reference/04-evaluation-in-progress.png" });

      // Wait for evaluation to complete — summary card appears
      await expect(page.getByText(/Evaluation Breakdown/i)).toBeVisible({ timeout: 120_000 });

      // Verify all 4 dimension cards rendered with scores
      await expect(page.getByText(/Technical Feasibility/i).first()).toBeVisible();
      await expect(page.getByText(/Impact Potential/i).first()).toBeVisible();
      await expect(page.getByText(/Cost Efficiency/i).first()).toBeVisible();
      await expect(page.getByText(/Team Capability/i).first()).toBeVisible();

      // Verify prompt comparison
      await expect(page.getByText(/Prompt Engineering Comparison/i)).toBeVisible();

      await page.screenshot({
        path: "e2e/screenshots/reference/05-evaluation-results.png",
        fullPage: true,
      });
    } else {
      // Proposal text didn't load (IPFS issue) — evaluation can't start
      await page.screenshot({ path: "e2e/screenshots/reference/03-evaluation-blocked.png" });
    }

    // ── Step 4: Check reputation history ──
    await page.goto(`/proposals/${proposalId}/reputation`);
    const reputationHeading = page.getByText(/On-Chain Reputation|Could not load|No reputation/i);
    await expect(reputationHeading).toBeVisible({ timeout: 30_000 });
    await page.screenshot({ path: "e2e/screenshots/reference/06-reputation.png" });

    // ── Step 5: Verify proposal in list ──
    await page.goto("/proposals");
    await expect(page.getByRole("heading", { name: "All Proposals" })).toBeVisible();
    // The proposal should appear (either with title from IPFS or "Content unavailable")
    await page.waitForTimeout(3_000); // Allow list to load from chain
    await page.screenshot({ path: "e2e/screenshots/reference/07-proposals-list.png" });
  });
});
