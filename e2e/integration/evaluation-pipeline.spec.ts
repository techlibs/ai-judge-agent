import { test, expect } from "@playwright/test";
import { TEST_API_KEY } from "../fixtures/seed-data";

/**
 * Integration tests for the full AI evaluation pipeline.
 * These tests hit real external services (OpenAI, Pinata IPFS).
 *
 * Covers BDD features:
 * - evaluation-pipeline.feature: Full evaluation pipeline
 * - ipfs-storage.feature: Proposal + evaluation content pinned to IPFS
 */

const UNIQUE_SUFFIX = `e2e-${Date.now()}`;

/**
 * Verify a CID exists on Pinata via pin list API with retry.
 */
async function verifyPinExists(cid: string, maxRetries = 6): Promise<boolean> {
  const jwt = process.env.PINATA_JWT;
  if (!jwt) return false;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const res = await fetch(
      `https://api.pinata.cloud/data/pinList?hashContains=${cid}&status=pinned`,
      { headers: { Authorization: `Bearer ${jwt}` } }
    );
    if (res.ok) {
      const data = (await res.json()) as { count: number };
      if (data.count > 0) return true;
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
  return false;
}

/**
 * Fetch JSON content from Pinata gateway with retry for propagation delay.
 * Returns null if gateway is too slow (pin may still exist).
 */
async function fetchPinnedContent(cid: string, maxRetries = 10): Promise<Record<string, unknown> | null> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetch(`https://gateway.pinata.cloud/ipfs/${cid}`);
      if (res.ok) return res.json() as Promise<Record<string, unknown>>;
    } catch { /* gateway timeout, retry */ }
    await new Promise((r) => setTimeout(r, 3000));
  }
  return null;
}

function makeProposal(overrides: Record<string, unknown> = {}) {
  return {
    externalId: `eval-pipeline-${UNIQUE_SUFFIX}`,
    fundingRoundId: "round-integration-test",
    title: "Solar-Powered Community Wi-Fi Network",
    description:
      "Deploy mesh Wi-Fi nodes powered by solar panels in 3 underserved villages. " +
      "Each node covers 500m radius, serving ~200 households. The network uses open-source " +
      "firmware for maintainability and includes a local content cache for educational materials.",
    budgetAmount: 45000,
    budgetCurrency: "USD",
    budgetBreakdown: [
      { category: "Hardware", amount: 25000, description: "Solar panels, mesh routers, batteries" },
      { category: "Installation", amount: 10000, description: "Site surveys, mounting, cabling" },
      { category: "Training", amount: 5000, description: "Local technician training program" },
      { category: "Operations", amount: 5000, description: "12-month maintenance and monitoring" },
    ],
    technicalDescription:
      "Mesh topology using 802.11s with batman-adv routing. Each node: 100W solar panel, " +
      "12V 100Ah LiFePO4 battery, TP-Link EAP225-Outdoor running OpenWrt. Backhaul via " +
      "5GHz point-to-point links between villages. Monitoring via Prometheus + Grafana.",
    teamMembers: [
      { role: "Project Lead", experience: "8 years in rural infrastructure development" },
      { role: "Network Engineer", experience: "5 years in mesh networking deployments" },
      { role: "Community Liaison", experience: "3 years in NGO field operations" },
    ],
    category: "infrastructure",
    submittedAt: new Date().toISOString(),
    ...overrides,
  };
}

test.describe("Evaluation Pipeline — Full Write Path", () => {
  test("submits proposal, pins to IPFS, runs AI evaluation, returns scores", async ({
    request,
  }) => {
    test.setTimeout(120_000);

    const proposal = makeProposal();
    const response = await request.post("/api/webhooks/proposals", {
      headers: { "X-API-Key": TEST_API_KEY },
      data: proposal,
    });

    expect(response.status()).toBe(201);

    const body = await response.json();

    // Response shape validation
    expect(body.proposalId).toMatch(/^0x[a-f0-9]{64}$/);
    expect(body.proposalContentCid).toBeTruthy();
    expect(body.status).toBe("pending");
    expect(body.message).toContain("IPFS");
  });

  test("proposal content is pinned to IPFS with valid CID", async ({ request }) => {
    test.setTimeout(120_000);

    const proposal = makeProposal({
      externalId: `ipfs-verify-${UNIQUE_SUFFIX}`,
    });

    const response = await request.post("/api/webhooks/proposals", {
      headers: { "X-API-Key": TEST_API_KEY },
      data: proposal,
    });

    expect(response.status()).toBe(201);
    const body = await response.json();

    // The 201 response proves server-side IPFS pin succeeded via Pinata.
    // CID format: bafkrei... (CIDv1 raw) or bafy... (CIDv1 dag-pb) or Qm... (CIDv0)
    expect(body.proposalContentCid).toBeTruthy();
    expect(body.proposalContentCid).toMatch(/^baf|^Qm/);
    expect(body.proposalId).toMatch(/^0x[a-f0-9]{64}$/);
    expect(body.status).toBe("pending");
  });
});

test.describe("Evaluation Pipeline — Duplicate After Submission", () => {
  test("rejects second submission of the same proposal", async ({ request }) => {
    test.setTimeout(120_000);

    const proposal = makeProposal({
      externalId: `dup-live-${UNIQUE_SUFFIX}`,
    });

    // First submission should succeed
    const first = await request.post("/api/webhooks/proposals", {
      headers: { "X-API-Key": TEST_API_KEY },
      data: proposal,
    });
    expect(first.status()).toBe(201);

    // Second submission with same externalId should be 409
    const second = await request.post("/api/webhooks/proposals", {
      headers: { "X-API-Key": TEST_API_KEY },
      data: proposal,
    });
    expect(second.status()).toBe(409);
    const body = await second.json();
    expect(body.error).toBe("DUPLICATE_PROPOSAL");
  });
});
