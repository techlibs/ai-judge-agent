import { describe, it, expect } from "vitest";
import { ProposalSubmissionSchema } from "./proposal-schema";

const validProposal = {
  title: "Open Source Developer Toolkit",
  description:
    "A comprehensive toolkit for open source developers in the IPE City ecosystem that provides debugging, testing, and deployment tools.",
  problemStatement: "Developers in IPE City lack proper collaborative tooling for building",
  proposedSolution: "Build an integrated toolkit with IDE plugins and CLI tools",
  teamMembers: [
    { name: "Alice Johnson", role: "Lead Developer" },
    { name: "Bob Smith", role: "UX Designer" },
  ],
  budgetAmount: 50000,
  budgetBreakdown: "Development: $30k, Design: $15k, Infrastructure: $5k",
  timeline: "Phase 1 (month 1): Design. Phase 2 (months 2-3): Build.",
  category: "infrastructure" as const,
  residencyDuration: "4-weeks" as const,
  demoDayDeliverable: "Working MVP with CLI tool and basic IDE integration",
  communityContribution: "Weekly open workshops and shared code reviews for village members",
  priorIpeParticipation: true,
  links: ["https://github.com/example/toolkit"],
};

describe("ProposalSubmissionSchema", () => {
  it("accepts a valid proposal", () => {
    const result = ProposalSubmissionSchema.safeParse(validProposal);
    expect(result.success).toBe(true);
  });

  describe("title", () => {
    it("rejects title under 5 characters", () => {
      const result = ProposalSubmissionSchema.safeParse({ ...validProposal, title: "abcd" });
      expect(result.success).toBe(false);
    });

    it("accepts title at exactly 5 characters", () => {
      const result = ProposalSubmissionSchema.safeParse({ ...validProposal, title: "abcde" });
      expect(result.success).toBe(true);
    });

    it("rejects title over 200 characters", () => {
      const result = ProposalSubmissionSchema.safeParse({
        ...validProposal,
        title: "a".repeat(201),
      });
      expect(result.success).toBe(false);
    });

    it("accepts title at exactly 200 characters", () => {
      const result = ProposalSubmissionSchema.safeParse({
        ...validProposal,
        title: "a".repeat(200),
      });
      expect(result.success).toBe(true);
    });
  });

  describe("description", () => {
    it("rejects description under 50 characters", () => {
      const result = ProposalSubmissionSchema.safeParse({
        ...validProposal,
        description: "a".repeat(49),
      });
      expect(result.success).toBe(false);
    });

    it("accepts description at exactly 50 characters", () => {
      const result = ProposalSubmissionSchema.safeParse({
        ...validProposal,
        description: "a".repeat(50),
      });
      expect(result.success).toBe(true);
    });

    it("rejects description over 5000 characters", () => {
      const result = ProposalSubmissionSchema.safeParse({
        ...validProposal,
        description: "a".repeat(5001),
      });
      expect(result.success).toBe(false);
    });
  });

  describe("problemStatement", () => {
    it("rejects problemStatement under 20 characters", () => {
      const result = ProposalSubmissionSchema.safeParse({
        ...validProposal,
        problemStatement: "a".repeat(19),
      });
      expect(result.success).toBe(false);
    });

    it("accepts problemStatement at exactly 20 characters", () => {
      const result = ProposalSubmissionSchema.safeParse({
        ...validProposal,
        problemStatement: "a".repeat(20),
      });
      expect(result.success).toBe(true);
    });

    it("rejects problemStatement over 3000 characters", () => {
      const result = ProposalSubmissionSchema.safeParse({
        ...validProposal,
        problemStatement: "a".repeat(3001),
      });
      expect(result.success).toBe(false);
    });
  });

  describe("proposedSolution", () => {
    it("rejects proposedSolution under 20 characters", () => {
      const result = ProposalSubmissionSchema.safeParse({
        ...validProposal,
        proposedSolution: "a".repeat(19),
      });
      expect(result.success).toBe(false);
    });

    it("rejects proposedSolution over 5000 characters", () => {
      const result = ProposalSubmissionSchema.safeParse({
        ...validProposal,
        proposedSolution: "a".repeat(5001),
      });
      expect(result.success).toBe(false);
    });
  });

  describe("teamMembers", () => {
    it("rejects empty team members array", () => {
      const result = ProposalSubmissionSchema.safeParse({
        ...validProposal,
        teamMembers: [],
      });
      expect(result.success).toBe(false);
    });

    it("accepts exactly 1 team member", () => {
      const result = ProposalSubmissionSchema.safeParse({
        ...validProposal,
        teamMembers: [{ name: "Alice", role: "Developer" }],
      });
      expect(result.success).toBe(true);
    });

    it("accepts exactly 20 team members", () => {
      const members = Array.from({ length: 20 }, (_, i) => ({
        name: `Member ${i}`,
        role: "Contributor",
      }));
      const result = ProposalSubmissionSchema.safeParse({
        ...validProposal,
        teamMembers: members,
      });
      expect(result.success).toBe(true);
    });

    it("rejects more than 20 team members", () => {
      const members = Array.from({ length: 21 }, (_, i) => ({
        name: `Member ${i}`,
        role: "Contributor",
      }));
      const result = ProposalSubmissionSchema.safeParse({
        ...validProposal,
        teamMembers: members,
      });
      expect(result.success).toBe(false);
    });

    it("rejects team member with empty name", () => {
      const result = ProposalSubmissionSchema.safeParse({
        ...validProposal,
        teamMembers: [{ name: "", role: "Developer" }],
      });
      expect(result.success).toBe(false);
    });

    it("rejects team member with empty role", () => {
      const result = ProposalSubmissionSchema.safeParse({
        ...validProposal,
        teamMembers: [{ name: "Alice", role: "" }],
      });
      expect(result.success).toBe(false);
    });

    it("rejects team member name over 100 chars", () => {
      const result = ProposalSubmissionSchema.safeParse({
        ...validProposal,
        teamMembers: [{ name: "a".repeat(101), role: "Dev" }],
      });
      expect(result.success).toBe(false);
    });

    it("rejects team member role over 100 chars", () => {
      const result = ProposalSubmissionSchema.safeParse({
        ...validProposal,
        teamMembers: [{ name: "Alice", role: "a".repeat(101) }],
      });
      expect(result.success).toBe(false);
    });
  });

  describe("budgetAmount", () => {
    it("rejects zero budget", () => {
      const result = ProposalSubmissionSchema.safeParse({
        ...validProposal,
        budgetAmount: 0,
      });
      expect(result.success).toBe(false);
    });

    it("rejects negative budget", () => {
      const result = ProposalSubmissionSchema.safeParse({
        ...validProposal,
        budgetAmount: -100,
      });
      expect(result.success).toBe(false);
    });

    it("accepts small positive budget", () => {
      const result = ProposalSubmissionSchema.safeParse({
        ...validProposal,
        budgetAmount: 0.01,
      });
      expect(result.success).toBe(true);
    });

    it("accepts budget at max (1,000,000)", () => {
      const result = ProposalSubmissionSchema.safeParse({
        ...validProposal,
        budgetAmount: 1_000_000,
      });
      expect(result.success).toBe(true);
    });

    it("rejects budget over 1,000,000", () => {
      const result = ProposalSubmissionSchema.safeParse({
        ...validProposal,
        budgetAmount: 1_000_001,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("budgetBreakdown", () => {
    it("rejects budgetBreakdown under 10 characters", () => {
      const result = ProposalSubmissionSchema.safeParse({
        ...validProposal,
        budgetBreakdown: "a".repeat(9),
      });
      expect(result.success).toBe(false);
    });

    it("rejects budgetBreakdown over 3000 characters", () => {
      const result = ProposalSubmissionSchema.safeParse({
        ...validProposal,
        budgetBreakdown: "a".repeat(3001),
      });
      expect(result.success).toBe(false);
    });
  });

  describe("timeline", () => {
    it("rejects timeline under 10 characters", () => {
      const result = ProposalSubmissionSchema.safeParse({
        ...validProposal,
        timeline: "a".repeat(9),
      });
      expect(result.success).toBe(false);
    });

    it("rejects timeline over 2000 characters", () => {
      const result = ProposalSubmissionSchema.safeParse({
        ...validProposal,
        timeline: "a".repeat(2001),
      });
      expect(result.success).toBe(false);
    });
  });

  describe("category", () => {
    it("accepts all valid categories", () => {
      for (const category of [
        "infrastructure",
        "research",
        "community",
        "education",
        "creative",
      ] as const) {
        const result = ProposalSubmissionSchema.safeParse({ ...validProposal, category });
        expect(result.success).toBe(true);
      }
    });

    it("rejects invalid category", () => {
      const result = ProposalSubmissionSchema.safeParse({
        ...validProposal,
        category: "other",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("residencyDuration", () => {
    it("accepts all valid residency durations", () => {
      for (const residencyDuration of ["3-weeks", "4-weeks", "5-weeks"] as const) {
        const result = ProposalSubmissionSchema.safeParse({
          ...validProposal,
          residencyDuration,
        });
        expect(result.success).toBe(true);
      }
    });

    it("rejects invalid residency duration", () => {
      const result = ProposalSubmissionSchema.safeParse({
        ...validProposal,
        residencyDuration: "2-weeks",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("demoDayDeliverable", () => {
    it("rejects demoDayDeliverable under 10 characters", () => {
      const result = ProposalSubmissionSchema.safeParse({
        ...validProposal,
        demoDayDeliverable: "a".repeat(9),
      });
      expect(result.success).toBe(false);
    });

    it("rejects demoDayDeliverable over 1000 characters", () => {
      const result = ProposalSubmissionSchema.safeParse({
        ...validProposal,
        demoDayDeliverable: "a".repeat(1001),
      });
      expect(result.success).toBe(false);
    });
  });

  describe("communityContribution", () => {
    it("rejects communityContribution under 10 characters", () => {
      const result = ProposalSubmissionSchema.safeParse({
        ...validProposal,
        communityContribution: "a".repeat(9),
      });
      expect(result.success).toBe(false);
    });

    it("rejects communityContribution over 1000 characters", () => {
      const result = ProposalSubmissionSchema.safeParse({
        ...validProposal,
        communityContribution: "a".repeat(1001),
      });
      expect(result.success).toBe(false);
    });
  });

  describe("priorIpeParticipation", () => {
    it("accepts true", () => {
      const result = ProposalSubmissionSchema.safeParse({
        ...validProposal,
        priorIpeParticipation: true,
      });
      expect(result.success).toBe(true);
    });

    it("accepts false", () => {
      const result = ProposalSubmissionSchema.safeParse({
        ...validProposal,
        priorIpeParticipation: false,
      });
      expect(result.success).toBe(true);
    });

    it("rejects non-boolean", () => {
      const result = ProposalSubmissionSchema.safeParse({
        ...validProposal,
        priorIpeParticipation: "yes",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("links", () => {
    it("accepts valid URL array", () => {
      const result = ProposalSubmissionSchema.safeParse({
        ...validProposal,
        links: ["https://github.com/example", "https://docs.example.com"],
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid URLs", () => {
      const result = ProposalSubmissionSchema.safeParse({
        ...validProposal,
        links: ["not-a-url"],
      });
      expect(result.success).toBe(false);
    });

    it("rejects more than 10 links", () => {
      const links = Array.from({ length: 11 }, (_, i) => `https://example.com/${i}`);
      const result = ProposalSubmissionSchema.safeParse({
        ...validProposal,
        links,
      });
      expect(result.success).toBe(false);
    });

    it("accepts exactly 10 links", () => {
      const links = Array.from({ length: 10 }, (_, i) => `https://example.com/${i}`);
      const result = ProposalSubmissionSchema.safeParse({
        ...validProposal,
        links,
      });
      expect(result.success).toBe(true);
    });

    it("accepts empty links array", () => {
      const result = ProposalSubmissionSchema.safeParse({
        ...validProposal,
        links: [],
      });
      expect(result.success).toBe(true);
    });

    it("defaults to empty array when links omitted", () => {
      const { links: _links, ...withoutLinks } = validProposal;
      const result = ProposalSubmissionSchema.safeParse(withoutLinks);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.links).toEqual([]);
      }
    });
  });
});
