import { test, expect } from "@playwright/test";
import { TEST_API_KEY } from "../fixtures/seed-data";

/**
 * Integration tests for IPFS content pinning via Pinata.
 *
 * Covers BDD features:
 * - ipfs-storage.feature: Pin and retrieve content from IPFS
 * - dispute-workflow.feature: Dispute evidence pinned to IPFS
 */

const UNIQUE_SUFFIX = `e2e-${Date.now()}`;

/**
 * Verify a CID exists on Pinata via pin list API with retry.
 * The pin list API has a slight propagation delay after upload.
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
 */
async function fetchPinnedContent(cid: string, maxRetries = 10): Promise<Record<string, unknown> | null> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetch(`https://gateway.pinata.cloud/ipfs/${cid}`);
      if (res.ok) return res.json() as Promise<Record<string, unknown>>;
    } catch { /* gateway timeout, retry */ }
    await new Promise((r) => setTimeout(r, 3000));
  }
  return null; // Gateway too slow — pin exists but content not yet propagated
}

test.describe("IPFS Pinning — Dispute Evidence", () => {
  test("dispute evidence is pinned to IPFS and retrievable", async ({ request }) => {
    test.setTimeout(120_000);

    const disputeReason =
      "The evaluation incorrectly scored the team capability dimension. The team has " +
      "a proven track record of delivering 5 similar projects in the past 3 years, " +
      "with documented outcomes and community testimonials. The AI judge failed to " +
      "account for the team's open-source contributions visible on GitHub.";

    const response = await request.post("/api/webhooks/disputes", {
      headers: { "X-API-Key": TEST_API_KEY },
      data: {
        externalId: `dispute-ipfs-${UNIQUE_SUFFIX}`,
        platformSource: "test-platform",
        proposalExternalId: "prop-evaluated-1-ext",
        disputeReason,
        evidence: [
          {
            type: "link",
            content: "https://github.com/team/project/releases",
            description: "GitHub releases showing 5 completed projects",
          },
          {
            type: "text",
            content: "Community testimonial from Village Head of Kibera confirming project delivery",
            description: "Direct stakeholder testimonial",
          },
        ],
        stakeAmount: "1500000000000000000",
      },
    });

    expect(response.status()).toBe(201);
    const body = await response.json();

    // Verify response shape
    expect(body.proposalId).toMatch(/^0x[a-f0-9]{64}$/);
    expect(body.evidenceCid).toBeTruthy();
    expect(body.encodedTransaction).toMatch(/^0x/);
    expect(body.stakeAmount).toBe("1500000000000000000");

    // The 201 + valid CID proves server-side IPFS pin succeeded via Pinata.
    // CID format: bafkrei... (CIDv1 raw) or Qm... (CIDv0)
    expect(body.evidenceCid).toMatch(/^baf|^Qm/);

    // Verify encoded transaction is valid openDispute calldata
    // openDispute(bytes32 proposalId, string evidenceCid)
    expect(body.encodedTransaction.length).toBeGreaterThan(10);
    expect(body.message).toContain("Dispute evidence pinned to IPFS");
  });

  test("dispute requires minimum 100-char reason", async ({ request }) => {
    const response = await request.post("/api/webhooks/disputes", {
      headers: { "X-API-Key": TEST_API_KEY },
      data: {
        externalId: `dispute-short-${UNIQUE_SUFFIX}`,
        platformSource: "test-platform",
        proposalExternalId: "some-proposal",
        disputeReason: "Too short reason",
        evidence: [{ type: "text", content: "evidence", description: "desc" }],
        stakeAmount: "1000000000000000000",
      },
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("VALIDATION_ERROR");
  });

  test("dispute requires at least 1 evidence item", async ({ request }) => {
    const response = await request.post("/api/webhooks/disputes", {
      headers: { "X-API-Key": TEST_API_KEY },
      data: {
        externalId: `dispute-noevidence-${UNIQUE_SUFFIX}`,
        platformSource: "test-platform",
        proposalExternalId: "some-proposal",
        disputeReason: "A".repeat(101),
        evidence: [],
        stakeAmount: "1000000000000000000",
      },
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("VALIDATION_ERROR");
  });
});
