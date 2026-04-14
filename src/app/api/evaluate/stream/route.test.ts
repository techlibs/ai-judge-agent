import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/evaluation/workflow", () => ({
  runEvaluationWorkflow: vi.fn(),
}));

vi.mock("@/lib/security-log", () => ({
  logSecurityEvent: vi.fn(),
}));

vi.mock("@/lib/validate-origin", () => ({
  validateOrigin: vi.fn(),
}));

vi.mock("@/lib/api-auth", () => ({
  requireApiKey: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkEvaluationTriggerLimit: vi.fn(),
}));

import { POST } from "./route";
import { runEvaluationWorkflow } from "@/lib/evaluation/workflow";
import { validateOrigin } from "@/lib/validate-origin";
import { requireApiKey } from "@/lib/api-auth";
import { checkEvaluationTriggerLimit } from "@/lib/rate-limit";
import { NextResponse } from "next/server";

const validProposal = {
  proposal: {
    title: "Build a community garden for IPE City residents",
    description:
      "A comprehensive plan to transform unused urban space into a thriving community garden that serves as both a food source and gathering place for IPE City residents.",
    problemStatement:
      "IPE City lacks accessible green spaces for community gathering and local food production.",
    proposedSolution:
      "We will convert the vacant lot on Rua das Flores into a 500sqm community garden with raised beds, composting station, and gathering area.",
    teamMembers: [{ name: "Alice", role: "Lead" }],
    budgetAmount: 50000,
    budgetBreakdown:
      "Materials: 25000, Labor: 15000, Tools: 5000, Contingency: 5000",
    timeline: "Phase 1: Design (2 weeks), Phase 2: Build (4 weeks), Phase 3: Plant (2 weeks)",
    category: "community" as const,
    residencyDuration: "4-weeks" as const,
    demoDayDeliverable:
      "Live walkthrough of the completed garden with planted beds and irrigation system",
    communityContribution:
      "Weekly gardening workshops and monthly harvest festivals open to all residents",
    priorIpeParticipation: false,
    links: [],
  },
};

function createRequest(body?: unknown): NextRequest {
  const init: { method: string; headers: Record<string, string>; body?: string } = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }
  return new NextRequest("http://localhost/api/evaluate/stream", init);
}

function createInvalidJsonRequest(): NextRequest {
  return new NextRequest("http://localhost/api/evaluate/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "not valid json{{{",
  });
}

const mockRequireApiKey = vi.mocked(requireApiKey);
const mockValidateOrigin = vi.mocked(validateOrigin);
const mockCheckRateLimit = vi.mocked(checkEvaluationTriggerLimit);
const mockRunWorkflow = vi.mocked(runEvaluationWorkflow);

describe("POST /api/evaluate/stream", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireApiKey.mockReturnValue(null);
    mockValidateOrigin.mockReturnValue(null);
    mockCheckRateLimit.mockReturnValue({ success: true, retryAfter: 0 });
  });

  it("returns 401 when API key auth fails", async () => {
    mockRequireApiKey.mockReturnValue(
      NextResponse.json(
        { error: "MISSING_API_KEY", message: "x-api-key header is required" },
        { status: 401 }
      )
    );

    const response = await POST(createRequest(validProposal));

    expect(response.status).toBe(401);
  });

  it("returns 429 when rate limited", async () => {
    mockCheckRateLimit.mockReturnValue({ success: false, retryAfter: 3600 });

    const response = await POST(createRequest(validProposal));

    expect(response.status).toBe(429);
    const body = await response.json();
    expect(body.error).toBe("Rate limit exceeded");
  });

  it("returns 400 on invalid JSON body", async () => {
    const response = await POST(createInvalidJsonRequest());

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid JSON body");
  });

  it("returns 400 on invalid schema", async () => {
    const response = await POST(createRequest({ proposal: { title: "x" } }));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Invalid request");
  });

  it("returns text/event-stream response on success", async () => {
    mockRunWorkflow.mockResolvedValue({
      proposalId: "test-id",
      aggregateScoreBps: 7500,
      dimensions: [],
      anomalyFlags: [],
      evaluatedAt: "2026-01-15T12:00:00.000Z",
    });

    const response = await POST(createRequest(validProposal));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/event-stream");
    expect(response.headers.get("cache-control")).toBe(
      "no-cache, no-transform"
    );
  });
});
