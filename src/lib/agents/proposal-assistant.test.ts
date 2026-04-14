import { describe, expect, it } from "bun:test";
import {
  proposalAssistant,
  PROPOSAL_ASSISTANT_SYSTEM_PROMPT,
  PROPOSAL_ASSISTANT_TOOLS,
} from "./proposal-assistant";

describe("proposalAssistant", () => {
  it("has the correct id", () => {
    expect(proposalAssistant.id).toBe("proposal-assistant");
  });

  it("has the correct name", () => {
    expect(proposalAssistant.name).toBe("Proposal Assistant");
  });

  it("exports a system prompt", () => {
    expect(PROPOSAL_ASSISTANT_SYSTEM_PROMPT).toContain("Proposal Assistant");
    expect(PROPOSAL_ASSISTANT_SYSTEM_PROMPT).toContain("Title");
    expect(PROPOSAL_ASSISTANT_SYSTEM_PROMPT).toContain("Description");
    expect(PROPOSAL_ASSISTANT_SYSTEM_PROMPT).toContain("Budget");
  });

  it("has validate_proposal and submit_proposal tools", () => {
    expect(PROPOSAL_ASSISTANT_TOOLS.validate_proposal).toBeDefined();
    expect(PROPOSAL_ASSISTANT_TOOLS.submit_proposal).toBeDefined();
  });
});

describe("validate_proposal tool", () => {
  const validateTool = PROPOSAL_ASSISTANT_TOOLS.validate_proposal;

  it("reports missing fields when input is empty", async () => {
    const result = await validateTool.execute(
      {},
      {} as Parameters<typeof validateTool.execute>[1]
    );
    expect(result.valid).toBe(false);
    expect(result.missingFields).toContain("title");
    expect(result.missingFields).toContain("description");
    expect(result.missingFields).toContain("teamInfo");
    expect(result.missingFields).toContain("budget");
  });

  it("returns valid for complete valid input", async () => {
    const result = await validateTool.execute(
      {
        title: "Community Solar Grid",
        description:
          "A project to install community solar panels in underserved neighborhoods, providing clean energy and reducing electricity costs for residents.",
        teamInfo: "Led by Jane Smith, 10 years in renewable energy engineering",
        budget: 50000,
        externalLinks: [],
      },
      {} as Parameters<typeof validateTool.execute>[1]
    );
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("returns validation errors for invalid field values", async () => {
    const result = await validateTool.execute(
      {
        title: "Hi",
        description: "Short",
        teamInfo: "Me",
        budget: -100,
        externalLinks: [],
      },
      {} as Parameters<typeof validateTool.execute>[1]
    );
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe("submit_proposal tool", () => {
  const submitTool = PROPOSAL_ASSISTANT_TOOLS.submit_proposal;

  it("returns success with valid proposal data", async () => {
    const result = await submitTool.execute(
      {
        title: "Community Solar Grid",
        description:
          "A project to install community solar panels in underserved neighborhoods, providing clean energy and reducing electricity costs for residents.",
        teamInfo: "Led by Jane Smith, 10 years in renewable energy engineering",
        budget: 50000,
        externalLinks: [],
      },
      {} as Parameters<typeof submitTool.execute>[1]
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.proposal).toBeDefined();
      expect(result.proposal?.title).toBe("Community Solar Grid");
    }
  });

  it("returns error for invalid proposal data", async () => {
    const result = await submitTool.execute(
      {
        title: "Hi",
        description: "Too short",
        teamInfo: "Me",
        budget: -1,
      },
      {} as Parameters<typeof submitTool.execute>[1]
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeDefined();
    }
  });
});
