import { describe, it, expect } from "vitest";
import { proposalAssistant, validatePartialProposal, extractCompleteProposal, PROPOSAL_ASSISTANT_SYSTEM_PROMPT } from "../proposal-assistant";
import { proposalFormSchema } from "@/app/grants/submit/schema";

const COMPLETE_PROPOSAL = {
  title: "Build a decentralized grant tracking tool",
  description:
    "This project will create an open-source tool for tracking grant allocations transparently across communities, enabling accountability and trust.",
  category: "infrastructure" as const,
  budgetAmount: 25000,
  budgetCurrency: "USD" as const,
  technicalDescription:
    "We will build using Next.js for the frontend and Solidity smart contracts on Base for on-chain transparency and full auditability.",
  teamMembers: [
    { role: "Lead Engineer", experience: "5 years of full-stack development with Web3 projects" },
  ],
  budgetBreakdown: [],
};

describe("proposalAssistant agent", () => {
  it("has the correct id and name", () => {
    expect(proposalAssistant.name).toBe("proposal-assistant");
  });

  it("exports both tools", () => {
    expect(validatePartialProposal).toBeDefined();
    expect(validatePartialProposal.id).toBe("validatePartialProposal");
    expect(extractCompleteProposal).toBeDefined();
    expect(extractCompleteProposal.id).toBe("extractCompleteProposal");
  });

  it("has a system prompt mentioning all required fields", () => {
    expect(PROPOSAL_ASSISTANT_SYSTEM_PROMPT).toContain("Title");
    expect(PROPOSAL_ASSISTANT_SYSTEM_PROMPT).toContain("Category");
    expect(PROPOSAL_ASSISTANT_SYSTEM_PROMPT).toContain("Description");
    expect(PROPOSAL_ASSISTANT_SYSTEM_PROMPT).toContain("Technical Description");
    expect(PROPOSAL_ASSISTANT_SYSTEM_PROMPT).toContain("Budget Amount");
    expect(PROPOSAL_ASSISTANT_SYSTEM_PROMPT).toContain("Budget Currency");
    expect(PROPOSAL_ASSISTANT_SYSTEM_PROMPT).toContain("Team Members");
  });

  it("mentions all valid categories in the system prompt", () => {
    expect(PROPOSAL_ASSISTANT_SYSTEM_PROMPT).toContain("infrastructure");
    expect(PROPOSAL_ASSISTANT_SYSTEM_PROMPT).toContain("education");
    expect(PROPOSAL_ASSISTANT_SYSTEM_PROMPT).toContain("community");
    expect(PROPOSAL_ASSISTANT_SYSTEM_PROMPT).toContain("research");
    expect(PROPOSAL_ASSISTANT_SYSTEM_PROMPT).toContain("governance");
  });
});

describe("proposal schema validation (used by extractCompleteProposal tool)", () => {
  it("accepts a valid complete proposal", () => {
    const result = proposalFormSchema.safeParse(COMPLETE_PROPOSAL);
    expect(result.success).toBe(true);
  });

  it("rejects empty title", () => {
    const result = proposalFormSchema.safeParse({ ...COMPLETE_PROPOSAL, title: "" });
    expect(result.success).toBe(false);
  });

  it("rejects short description", () => {
    const result = proposalFormSchema.safeParse({ ...COMPLETE_PROPOSAL, description: "Too short" });
    expect(result.success).toBe(false);
  });

  it("rejects negative budget", () => {
    const result = proposalFormSchema.safeParse({ ...COMPLETE_PROPOSAL, budgetAmount: -100 });
    expect(result.success).toBe(false);
  });

  it("rejects missing team members", () => {
    const result = proposalFormSchema.safeParse({ ...COMPLETE_PROPOSAL, teamMembers: [] });
    expect(result.success).toBe(false);
  });

  it("rejects invalid category", () => {
    const result = proposalFormSchema.safeParse({ ...COMPLETE_PROPOSAL, category: "invalid" });
    expect(result.success).toBe(false);
  });

  it("accepts proposal without budget breakdown", () => {
    const { budgetBreakdown: _, ...withoutBreakdown } = COMPLETE_PROPOSAL;
    const result = proposalFormSchema.safeParse(withoutBreakdown);
    expect(result.success).toBe(true);
  });
});
