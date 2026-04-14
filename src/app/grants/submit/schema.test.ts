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
