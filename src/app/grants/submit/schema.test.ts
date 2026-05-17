import { describe, it, expect } from "vitest";
import { proposalFormSchema } from "./schema";

const validProposal = {
  title: "Build a community workspace in Florianopolis",
  description:
    "A detailed description of the workspace project that is over fifty characters to pass validation.",
  problemStatement:
    "Remote workers lack dedicated spaces for collaboration.",
  proposedSolution:
    "Build a co-working space near IPE Village with 24/7 access.",
  teamMembers: [{ name: "Alice", role: "Lead" }],
  budgetAmount: 15000,
  budgetBreakdown:
    "Rent: $5000, Equipment: $5000, Operations: $5000 per quarter",
  timeline: "Month 1: Setup, Month 2: Launch, Month 3: Community events",
  category: "infrastructure" as const,
  residencyDuration: "4-weeks" as const,
  demoDayDeliverable:
    "Live demo of the workspace booking system and community metrics dashboard",
  communityContribution:
    "Weekly co-working sessions open to all village residents, skill-sharing workshops",
  priorIpeParticipation: false,
  links: [],
};

describe("proposalFormSchema", () => {
  it("accepts a valid proposal", () => {
    const result = proposalFormSchema.safeParse(validProposal);
    expect(result.success).toBe(true);
  });

  it("rejects empty title", () => {
    const result = proposalFormSchema.safeParse({
      ...validProposal,
      title: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects short description", () => {
    const result = proposalFormSchema.safeParse({
      ...validProposal,
      description: "Too short",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid category", () => {
    const result = proposalFormSchema.safeParse({
      ...validProposal,
      category: "invalid-category",
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative budget", () => {
    const result = proposalFormSchema.safeParse({
      ...validProposal,
      budgetAmount: -100,
    });
    expect(result.success).toBe(false);
  });

  it("rejects budget over 1M", () => {
    const result = proposalFormSchema.safeParse({
      ...validProposal,
      budgetAmount: 1_500_000,
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty team", () => {
    const result = proposalFormSchema.safeParse({
      ...validProposal,
      teamMembers: [],
    });
    expect(result.success).toBe(false);
  });

  it("accepts links with valid URLs", () => {
    const result = proposalFormSchema.safeParse({
      ...validProposal,
      links: ["https://github.com/example"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects links with invalid URLs", () => {
    const result = proposalFormSchema.safeParse({
      ...validProposal,
      links: ["not-a-url"],
    });
    expect(result.success).toBe(false);
  });
});

describe("proposalFormSchema — extended coverage", () => {
  it("rejects title exceeding 200 characters", () => {
    const result = proposalFormSchema.safeParse({
      ...validProposal,
      title: "A".repeat(201),
    });
    expect(result.success).toBe(false);
  });

  it("rejects title shorter than 5 characters", () => {
    const result = proposalFormSchema.safeParse({
      ...validProposal,
      title: "Hey",
    });
    expect(result.success).toBe(false);
  });

  it("rejects description exceeding 5000 characters", () => {
    const result = proposalFormSchema.safeParse({
      ...validProposal,
      description: "A".repeat(5001),
    });
    expect(result.success).toBe(false);
  });

  it("rejects problemStatement shorter than 20 characters", () => {
    const result = proposalFormSchema.safeParse({
      ...validProposal,
      problemStatement: "Too short",
    });
    expect(result.success).toBe(false);
  });

  it("rejects problemStatement exceeding 3000 characters", () => {
    const result = proposalFormSchema.safeParse({
      ...validProposal,
      problemStatement: "A".repeat(3001),
    });
    expect(result.success).toBe(false);
  });

  it("rejects proposedSolution shorter than 20 characters", () => {
    const result = proposalFormSchema.safeParse({
      ...validProposal,
      proposedSolution: "Too short",
    });
    expect(result.success).toBe(false);
  });

  it("rejects team member with empty name", () => {
    const result = proposalFormSchema.safeParse({
      ...validProposal,
      teamMembers: [{ name: "", role: "Lead" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects team member with empty role", () => {
    const result = proposalFormSchema.safeParse({
      ...validProposal,
      teamMembers: [{ name: "Alice", role: "" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects more than 20 team members", () => {
    const members = Array.from({ length: 21 }, (_, i) => ({
      name: `Person ${i}`,
      role: "Member",
    }));
    const result = proposalFormSchema.safeParse({
      ...validProposal,
      teamMembers: members,
    });
    expect(result.success).toBe(false);
  });

  it("accepts exactly 20 team members", () => {
    const members = Array.from({ length: 20 }, (_, i) => ({
      name: `Person ${i}`,
      role: "Member",
    }));
    const result = proposalFormSchema.safeParse({
      ...validProposal,
      teamMembers: members,
    });
    expect(result.success).toBe(true);
  });

  it("rejects zero budget", () => {
    const result = proposalFormSchema.safeParse({
      ...validProposal,
      budgetAmount: 0,
    });
    expect(result.success).toBe(false);
  });

  it("accepts budget at exactly 1,000,000", () => {
    const result = proposalFormSchema.safeParse({
      ...validProposal,
      budgetAmount: 1_000_000,
    });
    expect(result.success).toBe(true);
  });

  it("rejects budgetBreakdown shorter than 10 characters", () => {
    const result = proposalFormSchema.safeParse({
      ...validProposal,
      budgetBreakdown: "Short",
    });
    expect(result.success).toBe(false);
  });

  it("rejects timeline shorter than 10 characters", () => {
    const result = proposalFormSchema.safeParse({
      ...validProposal,
      timeline: "Week one",
    });
    expect(result.success).toBe(false);
  });

  it("accepts all valid categories", () => {
    const categories = [
      "infrastructure",
      "research",
      "community",
      "education",
      "creative",
    ] as const;
    for (const category of categories) {
      const result = proposalFormSchema.safeParse({
        ...validProposal,
        category,
      });
      expect(result.success).toBe(true);
    }
  });

  it("accepts all valid residency durations", () => {
    const durations = ["3-weeks", "4-weeks", "5-weeks"] as const;
    for (const residencyDuration of durations) {
      const result = proposalFormSchema.safeParse({
        ...validProposal,
        residencyDuration,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid residency duration", () => {
    const result = proposalFormSchema.safeParse({
      ...validProposal,
      residencyDuration: "2-weeks",
    });
    expect(result.success).toBe(false);
  });

  it("rejects demoDayDeliverable shorter than 10 characters", () => {
    const result = proposalFormSchema.safeParse({
      ...validProposal,
      demoDayDeliverable: "Short",
    });
    expect(result.success).toBe(false);
  });

  it("rejects communityContribution shorter than 10 characters", () => {
    const result = proposalFormSchema.safeParse({
      ...validProposal,
      communityContribution: "Short",
    });
    expect(result.success).toBe(false);
  });

  it("accepts priorIpeParticipation as true", () => {
    const result = proposalFormSchema.safeParse({
      ...validProposal,
      priorIpeParticipation: true,
    });
    expect(result.success).toBe(true);
  });

  it("rejects more than 10 links", () => {
    const links = Array.from(
      { length: 11 },
      (_, i) => `https://example.com/${i}`
    );
    const result = proposalFormSchema.safeParse({
      ...validProposal,
      links,
    });
    expect(result.success).toBe(false);
  });

  it("defaults links to empty array when omitted", () => {
    const { links: _links, ...withoutLinks } = validProposal;
    const result = proposalFormSchema.safeParse(withoutLinks);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.links).toEqual([]);
    }
  });

  it("rejects non-number budgetAmount", () => {
    const result = proposalFormSchema.safeParse({
      ...validProposal,
      budgetAmount: "not-a-number",
    });
    expect(result.success).toBe(false);
  });

  it("trims whitespace from title", () => {
    const result = proposalFormSchema.safeParse({
      ...validProposal,
      title: "  Build a community workspace in Florianopolis  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe(
        "Build a community workspace in Florianopolis"
      );
    }
  });
});
