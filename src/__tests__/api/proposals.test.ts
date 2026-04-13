import { describe, it, expect, mock, beforeEach } from "bun:test";
import { ProposalInputSchema } from "@/types";

// ---------------------------------------------------------------------------
// Part 1: Schema validation tests (existing)
// ---------------------------------------------------------------------------

describe("ProposalInputSchema", () => {
  it("validates a complete proposal", () => {
    const input = {
      title: "Decentralized Identity for IPE Village",
      description: "A system that enables Architects to maintain portable digital identity across IPE Village sessions, preserving reputation and contribution history.",
      problemStatement: "Each IPE Village session starts fresh with no memory of past contributions.",
      proposedSolution: "Build an ERC-8004 compatible identity system that tracks Architect contributions.",
      teamMembers: [{ name: "Alice", role: "Lead Developer" }],
      budgetAmount: 5000,
      budgetBreakdown: "Development: $3000, Infrastructure: $1000, Testing: $1000",
      timeline: "4 weeks — Week 1-2: Core identity, Week 3: Integration, Week 4: Testing",
      category: "infrastructure" as const,
      residencyDuration: "4-weeks" as const,
      demoDayDeliverable: "Working identity portal with QR code check-in",
      communityContribution: "Weekly workshop on decentralized identity for other Architects",
      priorIpeParticipation: false,
      links: ["https://github.com/alice/ipe-identity"],
    };

    const result = ProposalInputSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("rejects proposal with title too short", () => {
    const input = {
      title: "Hi",
      description: "A".repeat(50),
      problemStatement: "A".repeat(20),
      proposedSolution: "A".repeat(20),
      teamMembers: [{ name: "Alice", role: "Dev" }],
      budgetAmount: 5000,
      budgetBreakdown: "A".repeat(20),
      timeline: "A".repeat(10),
      category: "infrastructure" as const,
      residencyDuration: "4-weeks" as const,
      demoDayDeliverable: "A".repeat(10),
      communityContribution: "A".repeat(10),
      priorIpeParticipation: false,
      links: [],
    };

    const result = ProposalInputSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects proposal with no team members", () => {
    const input = {
      title: "Valid Title Here",
      description: "A".repeat(50),
      problemStatement: "A".repeat(20),
      proposedSolution: "A".repeat(20),
      teamMembers: [],
      budgetAmount: 5000,
      budgetBreakdown: "A".repeat(20),
      timeline: "A".repeat(10),
      category: "infrastructure" as const,
      residencyDuration: "4-weeks" as const,
      demoDayDeliverable: "A".repeat(10),
      communityContribution: "A".repeat(10),
      priorIpeParticipation: false,
      links: [],
    };

    const result = ProposalInputSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Part 2: POST route handler tests
// ---------------------------------------------------------------------------

// Mock modules before importing the route
const mockStore: {
  proposals: Array<Record<string, unknown>>;
} = {
  proposals: [],
};

const mockDb = {
  insert(_table: unknown) {
    return {
      values(data: Record<string, unknown>) {
        mockStore.proposals.push({ ...data });
        return Promise.resolve();
      },
    };
  },
};

mock.module("@/lib/db/client", () => ({
  getDb: () => mockDb,
}));

let rateLimitSuccess = true;
let rateLimitReset = Date.now() + 3600_000;

mock.module("@/lib/rate-limit", () => ({
  proposalSubmitLimiter: {
    limit: async (_key: string) => ({
      success: rateLimitSuccess,
      reset: rateLimitReset,
    }),
  },
  evaluationTriggerLimiter: {
    limit: async (_key: string) => ({ success: true, reset: Date.now() }),
  },
  globalEvaluationLimiter: {
    limit: async (_key: string) => ({ success: true, reset: Date.now() }),
  },
}));

const ipfsUploads: Array<{ data: Record<string, unknown>; name: string }> = [];

mock.module("@/lib/ipfs/client", () => ({
  uploadJson: async (data: Record<string, unknown>, name: string) => {
    ipfsUploads.push({ data, name });
    return { cid: "QmTest123" };
  },
  ipfsUri: (cid: string) => `ipfs://${cid}`,
}));

mock.module("@/lib/security-log", () => ({
  logSecurityEvent: () => {},
}));

// Import route AFTER mocking
const { POST } = await import("@/app/api/proposals/route");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_PROPOSAL = {
  title: "Decentralized Identity for IPE Village",
  description: "A system that enables Architects to maintain portable digital identity across IPE Village sessions, preserving reputation and history.",
  problemStatement: "Each IPE Village session starts fresh with no memory.",
  proposedSolution: "Build an ERC-8004 compatible identity system.",
  teamMembers: [{ name: "Alice", role: "Lead Developer" }],
  budgetAmount: 5000,
  budgetBreakdown: "Development: $3000, Infrastructure: $1000, Testing: $1000",
  timeline: "4 weeks — Week 1-2: Core identity, Week 3: Integration, Week 4: Testing",
  category: "infrastructure",
  residencyDuration: "4-weeks",
  demoDayDeliverable: "Working identity portal with QR code check-in",
  communityContribution: "Weekly workshop on decentralized identity for other Architects",
  priorIpeParticipation: false,
  links: ["https://github.com/alice/ipe-identity"],
};

function createRequest(body: unknown, headers?: Record<string, string>) {
  const json = JSON.stringify(body);
  return new Request("http://localhost:3000/api/proposals", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "content-length": String(json.length),
      "origin": "http://localhost:3000",
      "x-forwarded-for": "127.0.0.1",
      ...headers,
    },
    body: json,
  });
}

describe("POST /api/proposals", () => {
  beforeEach(() => {
    mockStore.proposals.length = 0;
    ipfsUploads.length = 0;
    rateLimitSuccess = true;
    rateLimitReset = Date.now() + 3600_000;
  });

  it("returns 413 PAYLOAD_TOO_LARGE when content-length > 256KB", async () => {
    const request = createRequest(VALID_PROPOSAL, {
      "content-length": String(256 * 1024 + 1),
    });

    const result = await POST(request);
    const data = await result.json();

    expect(result.status).toBe(413);
    expect(data.error).toBe("PAYLOAD_TOO_LARGE");
  });

  it("returns 429 with Retry-After header when rate limited", async () => {
    rateLimitSuccess = false;
    rateLimitReset = Date.now() + 1800_000;

    const request = createRequest(VALID_PROPOSAL);
    const result = await POST(request);
    const data = await result.json();

    expect(result.status).toBe(429);
    expect(data.error).toBe("RATE_LIMITED");
    expect(result.headers.get("Retry-After")).toBeTruthy();
  });

  it("returns 422 PII_DETECTED when description contains an email", async () => {
    const body = {
      ...VALID_PROPOSAL,
      description: "Contact me at alice@example.com for details about the system.",
    };

    const request = createRequest(body);
    const result = await POST(request);
    const data = await result.json();

    expect(result.status).toBe(422);
    expect(data.error).toBe("PII_DETECTED");
  });

  it("returns 422 PII_DETECTED when description contains a phone number", async () => {
    const body = {
      ...VALID_PROPOSAL,
      description: "Call me at 555-123-4567 to discuss the identity system architecture.",
    };

    const request = createRequest(body);
    const result = await POST(request);
    const data = await result.json();

    expect(result.status).toBe(422);
    expect(data.error).toBe("PII_DETECTED");
  });

  it("returns 422 PII_DETECTED when description contains a CPF pattern", async () => {
    const body = {
      ...VALID_PROPOSAL,
      description: "My CPF is 123.456.789-00 and I want to build an identity system.",
    };

    const request = createRequest(body);
    const result = await POST(request);
    const data = await result.json();

    expect(result.status).toBe(422);
    expect(data.error).toBe("PII_DETECTED");
  });

  it("returns 422 PII_DETECTED when description contains an IP address", async () => {
    const body = {
      ...VALID_PROPOSAL,
      description: "Our server at 192.168.1.100 hosts the identity system prototype.",
    };

    const request = createRequest(body);
    const result = await POST(request);
    const data = await result.json();

    expect(result.status).toBe(422);
    expect(data.error).toBe("PII_DETECTED");
  });

  it("calls uploadJson with proposal data on valid submission", async () => {
    const request = createRequest(VALID_PROPOSAL);
    await POST(request);

    expect(ipfsUploads).toHaveLength(1);
    expect(ipfsUploads[0].data.title).toBe(VALID_PROPOSAL.title);
  });

  it("inserts proposal into DB with status pending on valid submission", async () => {
    const request = createRequest(VALID_PROPOSAL);
    const result = await POST(request);
    const data = await result.json();

    expect(result.status).toBe(200);
    expect(mockStore.proposals).toHaveLength(1);
    expect(mockStore.proposals[0].status).toBe("pending");
    expect(mockStore.proposals[0].ipfsCid).toBe("QmTest123");
    expect(data.id).toBeTruthy();
  });
});
