import { describe, it, expect } from "bun:test";
import { ProposalInputSchema } from "@/types";

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
