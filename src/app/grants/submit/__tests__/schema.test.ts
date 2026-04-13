import { describe, it, expect } from "vitest";
import { proposalFormSchema } from "@/app/grants/submit/schema";

const VALID_FORM_DATA = {
  title: "Build a decentralized grant tracking tool",
  description:
    "This project will create an open-source tool for tracking grant allocations transparently across communities, enabling accountability.",
  category: "infrastructure" as const,
  budgetAmount: 25000,
  budgetCurrency: "USD" as const,
  technicalDescription:
    "We will build using Next.js for the frontend and Solidity smart contracts on Base for on-chain transparency and auditability.",
  teamMembers: [
    { role: "Lead Engineer", experience: "5 years of full-stack development with Web3 projects" },
  ],
  budgetBreakdown: [],
};

describe("proposalFormSchema", () => {
  it("accepts a valid form submission", () => {
    const result = proposalFormSchema.safeParse(VALID_FORM_DATA);
    expect(result.success).toBe(true);
  });

  describe("title", () => {
    it("rejects empty title", () => {
      const result = proposalFormSchema.safeParse({ ...VALID_FORM_DATA, title: "" });
      expect(result.success).toBe(false);
    });

    it("rejects title longer than 200 characters", () => {
      const result = proposalFormSchema.safeParse({
        ...VALID_FORM_DATA,
        title: "a".repeat(201),
      });
      expect(result.success).toBe(false);
    });

    it("accepts title at exactly 200 characters", () => {
      const result = proposalFormSchema.safeParse({
        ...VALID_FORM_DATA,
        title: "a".repeat(200),
      });
      expect(result.success).toBe(true);
    });
  });

  describe("description", () => {
    it("rejects description shorter than 50 characters", () => {
      const result = proposalFormSchema.safeParse({
        ...VALID_FORM_DATA,
        description: "Too short.",
      });
      expect(result.success).toBe(false);
    });

    it("rejects description longer than 10000 characters", () => {
      const result = proposalFormSchema.safeParse({
        ...VALID_FORM_DATA,
        description: "x".repeat(10001),
      });
      expect(result.success).toBe(false);
    });

    it("accepts description at exactly 50 characters", () => {
      const result = proposalFormSchema.safeParse({
        ...VALID_FORM_DATA,
        description: "a".repeat(50),
      });
      expect(result.success).toBe(true);
    });
  });

  describe("category", () => {
    it("accepts all valid categories", () => {
      const validCategories = [
        "infrastructure",
        "education",
        "community",
        "research",
        "governance",
      ] as const;

      for (const category of validCategories) {
        const result = proposalFormSchema.safeParse({ ...VALID_FORM_DATA, category });
        expect(result.success).toBe(true);
      }
    });

    it("rejects invalid category", () => {
      const result = proposalFormSchema.safeParse({
        ...VALID_FORM_DATA,
        category: "unknown",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("budgetAmount", () => {
    it("rejects non-positive budget", () => {
      expect(proposalFormSchema.safeParse({ ...VALID_FORM_DATA, budgetAmount: 0 }).success).toBe(false);
      expect(proposalFormSchema.safeParse({ ...VALID_FORM_DATA, budgetAmount: -100 }).success).toBe(false);
    });

    it("rejects budget exceeding 100,000,000", () => {
      const result = proposalFormSchema.safeParse({
        ...VALID_FORM_DATA,
        budgetAmount: 100_000_001,
      });
      expect(result.success).toBe(false);
    });

    it("accepts budget at exactly 100,000,000", () => {
      const result = proposalFormSchema.safeParse({
        ...VALID_FORM_DATA,
        budgetAmount: 100_000_000,
      });
      expect(result.success).toBe(true);
    });
  });

  describe("budgetCurrency", () => {
    it("accepts USD and ETH", () => {
      expect(proposalFormSchema.safeParse({ ...VALID_FORM_DATA, budgetCurrency: "USD" }).success).toBe(true);
      expect(proposalFormSchema.safeParse({ ...VALID_FORM_DATA, budgetCurrency: "ETH" }).success).toBe(true);
    });

    it("rejects unknown currency", () => {
      const result = proposalFormSchema.safeParse({ ...VALID_FORM_DATA, budgetCurrency: "BTC" });
      expect(result.success).toBe(false);
    });
  });

  describe("technicalDescription", () => {
    it("rejects description shorter than 50 characters", () => {
      const result = proposalFormSchema.safeParse({
        ...VALID_FORM_DATA,
        technicalDescription: "Too brief.",
      });
      expect(result.success).toBe(false);
    });

    it("rejects description longer than 10000 characters", () => {
      const result = proposalFormSchema.safeParse({
        ...VALID_FORM_DATA,
        technicalDescription: "t".repeat(10001),
      });
      expect(result.success).toBe(false);
    });
  });

  describe("teamMembers", () => {
    it("rejects empty team", () => {
      const result = proposalFormSchema.safeParse({ ...VALID_FORM_DATA, teamMembers: [] });
      expect(result.success).toBe(false);
    });

    it("rejects more than 20 team members", () => {
      const result = proposalFormSchema.safeParse({
        ...VALID_FORM_DATA,
        teamMembers: Array.from({ length: 21 }, () => ({
          role: "Engineer",
          experience: "3 years experience",
        })),
      });
      expect(result.success).toBe(false);
    });

    it("rejects team member with empty role", () => {
      const result = proposalFormSchema.safeParse({
        ...VALID_FORM_DATA,
        teamMembers: [{ role: "", experience: "5 years" }],
      });
      expect(result.success).toBe(false);
    });

    it("rejects team member with empty experience", () => {
      const result = proposalFormSchema.safeParse({
        ...VALID_FORM_DATA,
        teamMembers: [{ role: "Engineer", experience: "" }],
      });
      expect(result.success).toBe(false);
    });
  });

  describe("budgetBreakdown", () => {
    it("accepts empty breakdown (optional)", () => {
      const result = proposalFormSchema.safeParse({
        ...VALID_FORM_DATA,
        budgetBreakdown: [],
      });
      expect(result.success).toBe(true);
    });

    it("accepts valid breakdown items", () => {
      const result = proposalFormSchema.safeParse({
        ...VALID_FORM_DATA,
        budgetBreakdown: [
          { category: "Engineering", amount: 15000, description: "Core dev work" },
          { category: "Design", amount: 5000, description: "UI and branding" },
        ],
      });
      expect(result.success).toBe(true);
    });

    it("rejects breakdown items with non-positive amount", () => {
      const result = proposalFormSchema.safeParse({
        ...VALID_FORM_DATA,
        budgetBreakdown: [{ category: "Engineering", amount: 0, description: "desc" }],
      });
      expect(result.success).toBe(false);
    });

    it("rejects more than 20 breakdown items", () => {
      const result = proposalFormSchema.safeParse({
        ...VALID_FORM_DATA,
        budgetBreakdown: Array.from({ length: 21 }, (_, i) => ({
          category: "Cat",
          amount: i + 1,
          description: "desc",
        })),
      });
      expect(result.success).toBe(false);
    });
  });
});
