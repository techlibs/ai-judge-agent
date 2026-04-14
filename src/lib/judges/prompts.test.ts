import { describe, it, expect } from "vitest";
import {
  getJudgePrompt,
  buildProposalContext,
  buildEnrichedProposalContext,
} from "./prompts";

const sampleProposal = {
  title: "Open Source Developer Toolkit",
  description: "A toolkit for open source developers in IPE City",
  problemStatement: "Developers lack proper tooling",
  proposedSolution: "Build a comprehensive toolkit",
  teamMembers: [
    { name: "Alice", role: "Lead Developer" },
    { name: "Bob", role: "Designer" },
  ],
  budgetAmount: 50000,
  budgetBreakdown: "Dev: $30k, Design: $15k, Infra: $5k",
  timeline: "3 months total",
  category: "infrastructure",
  residencyDuration: "4-weeks",
  demoDayDeliverable: "Working MVP demo",
  communityContribution: "Open workshops and code reviews",
  priorIpeParticipation: true,
  links: ["https://github.com/example/toolkit"],
};

describe("getJudgePrompt", () => {
  it("returns non-empty string for tech dimension", () => {
    const prompt = getJudgePrompt("tech");
    expect(prompt.length).toBeGreaterThan(0);
    expect(prompt).toContain("TECHNICAL FEASIBILITY");
  });

  it("returns non-empty string for impact dimension", () => {
    const prompt = getJudgePrompt("impact");
    expect(prompt.length).toBeGreaterThan(0);
    expect(prompt).toContain("IMPACT POTENTIAL");
  });

  it("returns non-empty string for cost dimension", () => {
    const prompt = getJudgePrompt("cost");
    expect(prompt.length).toBeGreaterThan(0);
    expect(prompt).toContain("COST EFFICIENCY");
  });

  it("returns non-empty string for team dimension", () => {
    const prompt = getJudgePrompt("team");
    expect(prompt.length).toBeGreaterThan(0);
    expect(prompt).toContain("TEAM CAPABILITY");
  });

  it("includes shared preamble for all dimensions", () => {
    const dimensions = ["tech", "impact", "cost", "team"] as const;
    for (const dim of dimensions) {
      const prompt = getJudgePrompt(dim);
      expect(prompt).toContain("AI Judge for IPE City grants");
      expect(prompt).toContain("ANTI-INJECTION INSTRUCTIONS");
      expect(prompt).toContain("EVALUATION RULES");
    }
  });

  it("includes weight information in each prompt", () => {
    expect(getJudgePrompt("tech")).toContain("25%");
    expect(getJudgePrompt("impact")).toContain("30%");
    expect(getJudgePrompt("cost")).toContain("20%");
    expect(getJudgePrompt("team")).toContain("25%");
  });

  it("includes dimension-specific evaluation criteria", () => {
    expect(getJudgePrompt("tech")).toContain("Architecture soundness");
    expect(getJudgePrompt("impact")).toContain("Problem significance");
    expect(getJudgePrompt("cost")).toContain("Budget justification");
    expect(getJudgePrompt("team")).toContain("Relevant experience");
  });
});

describe("buildProposalContext", () => {
  it("wraps content in <proposal> tags", () => {
    const result = buildProposalContext(sampleProposal);
    expect(result).toMatch(/^<proposal>/);
    expect(result).toMatch(/<\/proposal>$/);
  });

  it("includes the proposal title", () => {
    const result = buildProposalContext(sampleProposal);
    expect(result).toContain("Open Source Developer Toolkit");
  });

  it("includes the category", () => {
    const result = buildProposalContext(sampleProposal);
    expect(result).toContain("infrastructure");
  });

  it("includes the description", () => {
    const result = buildProposalContext(sampleProposal);
    expect(result).toContain("A toolkit for open source developers");
  });

  it("includes problem statement", () => {
    const result = buildProposalContext(sampleProposal);
    expect(result).toContain("Developers lack proper tooling");
  });

  it("includes proposed solution", () => {
    const result = buildProposalContext(sampleProposal);
    expect(result).toContain("Build a comprehensive toolkit");
  });

  it("lists team members with roles", () => {
    const result = buildProposalContext(sampleProposal);
    expect(result).toContain("- Alice: Lead Developer");
    expect(result).toContain("- Bob: Designer");
  });

  it("formats budget amount with commas", () => {
    const result = buildProposalContext(sampleProposal);
    expect(result).toContain("$50,000 USDC");
  });

  it("includes budget breakdown", () => {
    const result = buildProposalContext(sampleProposal);
    expect(result).toContain("Dev: $30k, Design: $15k, Infra: $5k");
  });

  it("includes timeline", () => {
    const result = buildProposalContext(sampleProposal);
    expect(result).toContain("3 months total");
  });

  it("includes residency duration", () => {
    const result = buildProposalContext(sampleProposal);
    expect(result).toContain("4-weeks");
  });

  it("includes demo day deliverable", () => {
    const result = buildProposalContext(sampleProposal);
    expect(result).toContain("Working MVP demo");
  });

  it("includes community contribution", () => {
    const result = buildProposalContext(sampleProposal);
    expect(result).toContain("Open workshops and code reviews");
  });

  it("shows 'Yes (returning Architect)' for prior participation", () => {
    const result = buildProposalContext(sampleProposal);
    expect(result).toContain("Yes (returning Architect)");
  });

  it("shows 'No (first time)' when no prior participation", () => {
    const noParticipation = { ...sampleProposal, priorIpeParticipation: false };
    const result = buildProposalContext(noParticipation);
    expect(result).toContain("No (first time)");
  });

  it("includes links", () => {
    const result = buildProposalContext(sampleProposal);
    expect(result).toContain("https://github.com/example/toolkit");
  });

  it("shows 'None provided' when links array is empty", () => {
    const noLinks = { ...sampleProposal, links: [] };
    const result = buildProposalContext(noLinks);
    expect(result).toContain("None provided");
  });
});

describe("buildEnrichedProposalContext", () => {
  it("includes the base proposal context", () => {
    const result = buildEnrichedProposalContext(sampleProposal, "## Market Context\nSome analysis");
    expect(result).toContain("<proposal>");
    expect(result).toContain("Open Source Developer Toolkit");
  });

  it("appends the market context section", () => {
    const marketContext = "## Market Analysis\nCompetitor landscape looks strong";
    const result = buildEnrichedProposalContext(sampleProposal, marketContext);
    expect(result).toContain(marketContext);
  });

  it("separates base context and market context with newlines", () => {
    const marketContext = "## Market";
    const result = buildEnrichedProposalContext(sampleProposal, marketContext);
    expect(result).toContain("</proposal>\n\n## Market");
  });
});
