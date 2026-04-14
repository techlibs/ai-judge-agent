import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import type { EvaluationResult } from "@/lib/evaluation/workflow";

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
  return new NextRequest("http://localhost/api/evaluate", init);
}

function createInvalidJsonRequest(): NextRequest {
  return new NextRequest("http://localhost/api/evaluate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "not valid json{{{",
  });
}

const mockRequireApiKey = vi.mocked(requireApiKey);
const mockValidateOrigin = vi.mocked(validateOrigin);
const mockCheckRateLimit = vi.mocked(checkEvaluationTriggerLimit);
const mockRunWorkflow = vi.mocked(runEvaluationWorkflow);

describe("POST /api/evaluate", () => {
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
    const body = await response.json();
    expect(body.error).toBe("MISSING_API_KEY");
  });

  it("returns 403 when origin validation fails", async () => {
    mockValidateOrigin.mockReturnValue(
      NextResponse.json(
        { error: "INVALID_ORIGIN", message: "Origin not allowed" },
        { status: 403 }
      )
    );

    const response = await POST(createRequest(validProposal));

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBe("INVALID_ORIGIN");
  });

  it("returns 429 when rate limited", async () => {
    mockCheckRateLimit.mockReturnValue({ success: false, retryAfter: 3600 });

    const response = await POST(createRequest(validProposal));

    expect(response.status).toBe(429);
    const body = await response.json();
    expect(body.error).toBe("Rate limit exceeded");
    expect(body.retryAfter).toBe(3600);
  });

  it("returns 400 on invalid JSON", async () => {
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
    expect(body.details).toBeDefined();
  });

  it("returns 200 with evaluation result on success", async () => {
    const mockResult: EvaluationResult = {
      proposalId: "test-id",
      aggregateScoreBps: 7500,
      dimensions: [
        {
          dimension: "tech",
          evaluation: {
            score: 8000,
            confidence: "high",
            recommendation: "fund",
            justification: "Solid technical approach",
            keyFindings: ["Good architecture"],
            risks: ["Timeline tight"],
            ipeAlignment: { proTechnology: 80, proFreedom: 75, proHumanProgress: 90 },
          },
          qualityScores: null,
          attempts: 1,
        },
      ],
      anomalyFlags: [],
      evaluatedAt: "2026-01-15T12:00:00.000Z",
    };

    mockRunWorkflow.mockResolvedValue(mockResult);

    const response = await POST(createRequest(validProposal));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.proposalId).toBe("test-id");
    expect(body.aggregateScore).toBe(7500);
    expect(body.dimensions).toHaveLength(1);
    expect(body.dimensions[0].dimension).toBe("tech");
    expect(body.dimensions[0].score).toBe(8000);
    expect(body.anomalyFlags).toEqual([]);
  });

  it("returns 500 when workflow throws", async () => {
    mockRunWorkflow.mockRejectedValue(new Error("LLM unavailable"));

    const response = await POST(createRequest(validProposal));

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Evaluation failed");
    expect(body.proposalId).toBeDefined();
  });
});
