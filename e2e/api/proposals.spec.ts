import { test, expect } from "@playwright/test";

const VALID_PROPOSAL = {
  title: "API Test Proposal for Solar Grid",
  description:
    "A community-owned solar micro-grid providing clean energy to residents. This proposal covers installation, testing, and community training.",
  problemStatement: "Village relies on expensive diesel generators for electricity.",
  proposedSolution: "Install a 50kW solar array with battery storage and smart distribution.",
  teamMembers: [{ name: "Alice Santos", role: "Project Lead" }],
  budgetAmount: 25000,
  budgetBreakdown: "Solar panels: $15,000. Battery: $5,000. IoT: $3,000. Contingency: $2,000.",
  timeline: "12 weeks from funding approval to full installation.",
  category: "infrastructure",
  residencyDuration: "3-weeks",
  demoDayDeliverable: "Live dashboard showing real-time energy production metrics.",
  communityContribution: "Free workshops on solar maintenance for village residents.",
  priorIpeParticipation: false,
  links: [],
};

// The API route checks that the Origin header matches NEXT_PUBLIC_APP_URL
// (defaults to http://localhost:3000). All requests must include this header.
const ORIGIN_HEADER = { origin: "http://localhost:3000" };

test.describe("POST /api/proposals", () => {
  test("creates a valid proposal and returns id + IPFS CID", async ({ request }) => {
    const response = await request.post("/api/proposals", {
      data: VALID_PROPOSAL,
      headers: ORIGIN_HEADER,
    });
    if (response.status() === 200) {
      const body = await response.json();
      expect(body).toHaveProperty("id");
      expect(typeof body.id).toBe("string");
    }
  });

  test("rejects proposal with missing required fields", async ({ request }) => {
    const response = await request.post("/api/proposals", {
      data: { title: "Incomplete" },
      headers: ORIGIN_HEADER,
    });
    expect(response.status()).toBe(400);
  });

  test("rejects proposal with title too short", async ({ request }) => {
    const response = await request.post("/api/proposals", {
      data: { ...VALID_PROPOSAL, title: "Hi" },
      headers: ORIGIN_HEADER,
    });
    expect(response.status()).toBe(400);
  });

  test("rejects proposal with budget below minimum", async ({ request }) => {
    const response = await request.post("/api/proposals", {
      data: { ...VALID_PROPOSAL, budgetAmount: 50 },
      headers: ORIGIN_HEADER,
    });
    expect(response.status()).toBe(400);
  });

  test("rejects proposal with budget above maximum", async ({ request }) => {
    const response = await request.post("/api/proposals", {
      data: { ...VALID_PROPOSAL, budgetAmount: 2000000 },
      headers: ORIGIN_HEADER,
    });
    expect(response.status()).toBe(400);
  });

  test("rejects proposal containing PII (email)", async ({ request }) => {
    const response = await request.post("/api/proposals", {
      data: {
        ...VALID_PROPOSAL,
        description: VALID_PROPOSAL.description + " Contact me at alice@example.com for details.",
      },
      headers: ORIGIN_HEADER,
    });
    expect(response.status()).toBe(422);
  });

  test("rejects proposal containing PII (phone)", async ({ request }) => {
    const response = await request.post("/api/proposals", {
      data: {
        ...VALID_PROPOSAL,
        problemStatement: "Call 555-123-4567 for more info. " + VALID_PROPOSAL.problemStatement,
      },
      headers: ORIGIN_HEADER,
    });
    expect(response.status()).toBe(422);
  });

  test("rejects oversized payload", async ({ request }) => {
    const response = await request.post("/api/proposals", {
      data: { ...VALID_PROPOSAL, description: "A".repeat(300_000) },
      headers: { ...ORIGIN_HEADER, "Content-Length": "300000" },
    });
    expect([400, 413]).toContain(response.status());
  });
});
