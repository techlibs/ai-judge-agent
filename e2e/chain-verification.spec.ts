import { test, expect } from "@playwright/test";

/**
 * Chain + IPFS verification tests — read-only, no gas cost.
 * Uses page.request to call API endpoints that read on-chain + IPFS data.
 */
test.describe("Chain and IPFS verification", () => {
  test("proposals API returns valid on-chain data", async ({ page }) => {
    const response = await page.request.get("/api/proposals");
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.proposals).toBeDefined();
    expect(Array.isArray(data.proposals)).toBeTruthy();

    if (data.proposals.length > 0) {
      const proposal = data.proposals[0];
      expect(proposal.tokenId).toBeDefined();
      expect(typeof proposal.tokenId).toBe("string");
      expect(proposal.status).toMatch(/^(submitted|evaluating|evaluated)$/);
    }
  });

  test("single proposal API returns IPFS CID", async ({ page }) => {
    const listResponse = await page.request.get("/api/proposals");
    const listData = await listResponse.json();

    test.skip(listData.proposals.length === 0, "No proposals on chain");

    const tokenId = listData.proposals[0].tokenId;
    const response = await page.request.get(`/api/proposals/${tokenId}`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.tokenId).toBe(tokenId);
    expect(data.ipfsCID).toMatch(/^(Qm|bafy)/);
    expect(data.owner).toMatch(/^0x[a-fA-F0-9]{40}$/);
  });

  test("reputation API returns valid score data", async ({ page }) => {
    const listResponse = await page.request.get("/api/proposals");
    const listData = await listResponse.json();

    const evaluated = listData.proposals.find(
      (p: { status: string }) => p.status === "evaluated",
    );
    test.skip(!evaluated, "No evaluated proposals on chain");

    const response = await page.request.get(`/api/reputation/${evaluated.tokenId}`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.summary.feedbackCount).toBeGreaterThan(0);
    expect(data.summary.averageScore).toBeGreaterThanOrEqual(0);
    expect(data.summary.averageScore).toBeLessThanOrEqual(100);
    expect(data.history.length).toBeGreaterThan(0);

    const entry = data.history[0];
    expect(entry.blockNumber).toBeGreaterThan(0);
    expect(entry.value).toBeGreaterThanOrEqual(0);
    expect(entry.value).toBeLessThanOrEqual(100);
  });

  test("IPFS content is retrievable and valid JSON", async ({ page }) => {
    const listResponse = await page.request.get("/api/proposals");
    const listData = await listResponse.json();

    test.skip(listData.proposals.length === 0, "No proposals on chain");

    const tokenId = listData.proposals[0].tokenId;
    const proposalResponse = await page.request.get(`/api/proposals/${tokenId}`);
    const proposalData = await proposalResponse.json();

    test.skip(!proposalData.ipfsCID?.startsWith("Qm"), "No valid CID");

    expect(proposalData.content).toBeDefined();
    expect(proposalData.content.title).toBeDefined();
    expect(typeof proposalData.content.title).toBe("string");
    expect(proposalData.content.title.length).toBeGreaterThan(0);
  });
});
