import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock server-only modules
vi.mock("next/headers", () => ({
  headers: vi.fn(),
}));

vi.mock("@/lib/evaluation/workflow", () => ({
  runEvaluationWorkflow: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkProposalSubmitLimit: vi.fn(),
}));

import { submitProposal, type ActionState } from "./actions";
import { headers } from "next/headers";
import { runEvaluationWorkflow } from "@/lib/evaluation/workflow";
import { checkProposalSubmitLimit } from "@/lib/rate-limit";

const mockedHeaders = vi.mocked(headers);
const mockedRunWorkflow = vi.mocked(runEvaluationWorkflow);
const mockedRateLimit = vi.mocked(checkProposalSubmitLimit);

function buildValidFormData(): FormData {
  const fd = new FormData();
  fd.set("title", "Build a community workspace in Florianopolis");
  fd.set(
    "description",
    "A detailed description of the workspace project that is over fifty characters to pass validation requirements."
  );
  fd.set(
    "problemStatement",
    "Remote workers lack dedicated spaces for collaboration."
  );
  fd.set(
    "proposedSolution",
    "Build a co-working space near IPE Village with 24/7 access."
  );
  fd.set("teamMembers", JSON.stringify([{ name: "Alice", role: "Lead" }]));
  fd.set("budgetAmount", "15000");
  fd.set(
    "budgetBreakdown",
    "Rent: $5000, Equipment: $5000, Operations: $5000 per quarter"
  );
  fd.set(
    "timeline",
    "Month 1: Setup, Month 2: Launch, Month 3: Community events"
  );
  fd.set("category", "infrastructure");
  fd.set("residencyDuration", "4-weeks");
  fd.set(
    "demoDayDeliverable",
    "Live demo of the workspace booking system and community metrics dashboard"
  );
  fd.set(
    "communityContribution",
    "Weekly co-working sessions open to all village residents, skill-sharing workshops"
  );
  fd.set("priorIpeParticipation", "false");
  fd.set("links", JSON.stringify([]));
  return fd;
}

const PREV_STATE: ActionState = { success: false };

describe("submitProposal", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mocks for happy path
    mockedHeaders.mockResolvedValue(
      new Headers({ "x-forwarded-for": "127.0.0.1" })
    );
    mockedRateLimit.mockReturnValue({ success: true, retryAfter: 0 });
    mockedRunWorkflow.mockResolvedValue({
      proposalId: "test-proposal-id",
      aggregateScoreBps: 7500,
      dimensions: [],
      anomalyFlags: [],
      evaluatedAt: new Date().toISOString(),
    });
  });

  it("returns success with proposalId and detailUrl for valid submission", async () => {
    const result = await submitProposal(PREV_STATE, buildValidFormData());

    expect(result.success).toBe(true);
    expect(result.proposalId).toBe("test-proposal-id");
    expect(result.detailUrl).toBe("/grants/test-proposal-id");
  });

  it("returns validation errors for invalid form data", async () => {
    const fd = new FormData();
    fd.set("title", ""); // too short
    fd.set("description", "Short");
    fd.set("problemStatement", "x");
    fd.set("proposedSolution", "x");
    fd.set("teamMembers", JSON.stringify([]));
    fd.set("budgetAmount", "-1");
    fd.set("budgetBreakdown", "x");
    fd.set("timeline", "x");
    fd.set("category", "invalid");
    fd.set("residencyDuration", "invalid");
    fd.set("demoDayDeliverable", "x");
    fd.set("communityContribution", "x");
    fd.set("priorIpeParticipation", "false");
    fd.set("links", JSON.stringify([]));

    const result = await submitProposal(PREV_STATE, fd);

    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
    // Should not have called the workflow
    expect(mockedRunWorkflow).not.toHaveBeenCalled();
  });

  it("returns rate limit error when limit is exceeded", async () => {
    mockedRateLimit.mockReturnValue({ success: false, retryAfter: 3200 });

    const result = await submitProposal(PREV_STATE, buildValidFormData());

    expect(result.success).toBe(false);
    expect(result.errors?.server?.[0]).toContain("Rate limit exceeded");
    expect(result.errors?.server?.[0]).toContain("3200");
  });

  it("returns server error when workflow throws", async () => {
    mockedRunWorkflow.mockRejectedValue(new Error("IPFS pinning failed"));

    const result = await submitProposal(PREV_STATE, buildValidFormData());

    expect(result.success).toBe(false);
    expect(result.errors?.server?.[0]).toBe("IPFS pinning failed");
  });

  it("returns generic server error for non-Error throws", async () => {
    mockedRunWorkflow.mockRejectedValue("string error");

    const result = await submitProposal(PREV_STATE, buildValidFormData());

    expect(result.success).toBe(false);
    expect(result.errors?.server?.[0]).toBe(
      "An unexpected error occurred. Please try again."
    );
  });

  it("parses teamMembers from JSON string in FormData", async () => {
    const fd = buildValidFormData();
    fd.set(
      "teamMembers",
      JSON.stringify([
        { name: "Alice", role: "Lead" },
        { name: "Bob", role: "Engineer" },
      ])
    );

    const result = await submitProposal(PREV_STATE, fd);
    expect(result.success).toBe(true);
  });

  it("handles missing teamMembers field gracefully", async () => {
    const fd = buildValidFormData();
    fd.delete("teamMembers");

    const result = await submitProposal(PREV_STATE, fd);
    // teamMembers defaults to [] via parseJsonField, which fails min(1) validation
    expect(result.success).toBe(false);
    expect(result.errors?.teamMembers).toBeDefined();
  });

  it("handles malformed JSON in teamMembers", async () => {
    const fd = buildValidFormData();
    fd.set("teamMembers", "not-valid-json");

    const result = await submitProposal(PREV_STATE, fd);
    // parseJsonField returns [] for invalid JSON, which fails min(1) validation
    expect(result.success).toBe(false);
  });

  it("reads IP from x-forwarded-for header", async () => {
    mockedHeaders.mockResolvedValue(
      new Headers({ "x-forwarded-for": "192.168.1.100" })
    );

    await submitProposal(PREV_STATE, buildValidFormData());

    expect(mockedRateLimit).toHaveBeenCalledWith("192.168.1.100");
  });

  it("falls back to 'unknown' IP when header is missing", async () => {
    mockedHeaders.mockResolvedValue(new Headers());

    await submitProposal(PREV_STATE, buildValidFormData());

    expect(mockedRateLimit).toHaveBeenCalledWith("unknown");
  });
});
