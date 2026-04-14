import { describe, it, expect } from "vitest";
import {
  ProposalContentSchema,
  EvaluationContentSchema,
  AgentRegistrationSchema,
  MonitoringReportSchema,
} from "./schemas";

describe("ipfs/schemas", () => {
  describe("ProposalContentSchema", () => {
    const validProposal = {
      version: 1,
      externalId: "prop-001",
      platformSource: "github",
      title: "My Proposal",
      description: "A grant proposal",
      budgetAmount: 50000,
      budgetCurrency: "USD",
      budgetBreakdown: [
        { category: "development", amount: 30000, description: "Dev work" },
        { category: "design", amount: 20000, description: "Design work" },
      ],
      technicalDescription: "We will build a thing",
      teamProfileHash: "QmTeamHash",
      teamSize: 3,
      category: "infrastructure",
      submittedAt: "2024-01-01T00:00:00Z",
    };

    it("accepts valid proposal data", () => {
      expect(() => ProposalContentSchema.parse(validProposal)).not.toThrow();
    });

    it("rejects wrong version", () => {
      expect(() =>
        ProposalContentSchema.parse({ ...validProposal, version: 2 })
      ).toThrow();
    });

    it("rejects missing required fields", () => {
      const { title: _title, ...noTitle } = validProposal;
      expect(() => ProposalContentSchema.parse(noTitle)).toThrow();
    });

    it("rejects non-number budgetAmount", () => {
      expect(() =>
        ProposalContentSchema.parse({
          ...validProposal,
          budgetAmount: "fifty thousand",
        })
      ).toThrow();
    });
  });

  describe("EvaluationContentSchema", () => {
    const makeDimension = (dim: string) => ({
      dimension: dim,
      weight: 0.25,
      score: 7.5,
      inputDataConsidered: ["title", "description"],
      rubricApplied: { criteria: ["clarity", "feasibility"] },
      reasoningChain:
        "This proposal demonstrates strong technical approach with clear milestones and deliverables outlined.",
      modelId: "gpt-4o",
      promptVersion: "v1.0.0",
    });

    const validEvaluation = {
      version: 1,
      proposalId: "prop-001",
      dimensions: [
        makeDimension("technical_feasibility"),
        makeDimension("impact_potential"),
        makeDimension("cost_efficiency"),
        makeDimension("team_capability"),
      ],
      finalScore: 7.5,
      reputationMultiplier: 1.02,
      adjustedScore: 7.65,
      evaluatedAt: "2024-01-01T00:00:00Z",
    };

    it("accepts valid evaluation data", () => {
      expect(() =>
        EvaluationContentSchema.parse(validEvaluation)
      ).not.toThrow();
    });

    it("rejects score out of range", () => {
      expect(() =>
        EvaluationContentSchema.parse({
          ...validEvaluation,
          finalScore: 11,
        })
      ).toThrow();
    });

    it("rejects dimensions array with wrong length", () => {
      expect(() =>
        EvaluationContentSchema.parse({
          ...validEvaluation,
          dimensions: [makeDimension("technical_feasibility")],
        })
      ).toThrow();
    });

    it("rejects invalid dimension name", () => {
      const dims = [...validEvaluation.dimensions];
      dims[0] = { ...makeDimension("technical_feasibility"), dimension: "invalid_dimension" };
      expect(() =>
        EvaluationContentSchema.parse({ ...validEvaluation, dimensions: dims })
      ).toThrow();
    });

    it("rejects reasoning chain shorter than 50 characters", () => {
      const dims = [...validEvaluation.dimensions];
      dims[0] = { ...makeDimension("technical_feasibility"), reasoningChain: "Too short" };
      expect(() =>
        EvaluationContentSchema.parse({ ...validEvaluation, dimensions: dims })
      ).toThrow();
    });

    it("rejects reputationMultiplier above 1.05", () => {
      expect(() =>
        EvaluationContentSchema.parse({
          ...validEvaluation,
          reputationMultiplier: 1.1,
        })
      ).toThrow();
    });

    it("rejects reputationMultiplier below 1", () => {
      expect(() =>
        EvaluationContentSchema.parse({
          ...validEvaluation,
          reputationMultiplier: 0.9,
        })
      ).toThrow();
    });
  });

  describe("AgentRegistrationSchema", () => {
    const validRegistration = {
      type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
      name: "Judge Agent",
      description: "Evaluates proposals",
      image: "https://example.com/avatar.png",
      services: [
        { name: "evaluate", endpoint: "https://api.example.com/evaluate" },
      ],
      x402Support: false,
      active: true,
      registrations: [
        { agentId: 1, agentRegistry: "0x1234" },
      ],
    };

    it("accepts valid registration data", () => {
      expect(() =>
        AgentRegistrationSchema.parse(validRegistration)
      ).not.toThrow();
    });

    it("rejects wrong type literal", () => {
      expect(() =>
        AgentRegistrationSchema.parse({
          ...validRegistration,
          type: "wrong-type",
        })
      ).toThrow();
    });

    it("rejects invalid image URL", () => {
      expect(() =>
        AgentRegistrationSchema.parse({
          ...validRegistration,
          image: "not-a-url",
        })
      ).toThrow();
    });

    it("accepts optional supportedTrust field", () => {
      expect(() =>
        AgentRegistrationSchema.parse({
          ...validRegistration,
          supportedTrust: ["erc-8004"],
        })
      ).not.toThrow();
    });

    it("accepts optional version in services", () => {
      expect(() =>
        AgentRegistrationSchema.parse({
          ...validRegistration,
          services: [
            {
              name: "evaluate",
              endpoint: "https://api.example.com",
              version: "1.0.0",
            },
          ],
        })
      ).not.toThrow();
    });
  });

  describe("MonitoringReportSchema", () => {
    const validReport = {
      version: 1,
      projectId: "proj-001",
      score: 7.5,
      justification:
        "Project shows strong GitHub activity with regular commits and issue resolution. Fund utilization is healthy.",
      githubMetrics: {
        commitFrequency: 5.2,
        issueVelocity: 3.1,
        releases: 2,
      },
      onChainMetrics: {
        transactionCount: 15,
        fundUtilization: 0.45,
      },
      socialMetrics: {
        announcements: 3,
        communityEngagement: 7,
      },
      riskFlags: [],
      monitoredAt: "2024-01-15T12:00:00Z",
    };

    it("accepts valid monitoring report", () => {
      expect(() =>
        MonitoringReportSchema.parse(validReport)
      ).not.toThrow();
    });

    it("rejects score above 10", () => {
      expect(() =>
        MonitoringReportSchema.parse({ ...validReport, score: 11 })
      ).toThrow();
    });

    it("rejects score below 0", () => {
      expect(() =>
        MonitoringReportSchema.parse({ ...validReport, score: -1 })
      ).toThrow();
    });

    it("rejects justification shorter than 50 characters", () => {
      expect(() =>
        MonitoringReportSchema.parse({
          ...validReport,
          justification: "Too short",
        })
      ).toThrow();
    });

    it("rejects fundUtilization above 1", () => {
      expect(() =>
        MonitoringReportSchema.parse({
          ...validReport,
          onChainMetrics: {
            ...validReport.onChainMetrics,
            fundUtilization: 1.5,
          },
        })
      ).toThrow();
    });

    it("rejects fundUtilization below 0", () => {
      expect(() =>
        MonitoringReportSchema.parse({
          ...validReport,
          onChainMetrics: {
            ...validReport.onChainMetrics,
            fundUtilization: -0.1,
          },
        })
      ).toThrow();
    });

    it("accepts valid risk flags", () => {
      expect(() =>
        MonitoringReportSchema.parse({
          ...validReport,
          riskFlags: [
            {
              type: "inactivity",
              severity: "high",
              description: "No commits in 3 weeks",
            },
          ],
        })
      ).not.toThrow();
    });

    it("rejects invalid risk flag type", () => {
      expect(() =>
        MonitoringReportSchema.parse({
          ...validReport,
          riskFlags: [
            {
              type: "invalid_type",
              severity: "low",
              description: "Something",
            },
          ],
        })
      ).toThrow();
    });

    it("rejects invalid risk flag severity", () => {
      expect(() =>
        MonitoringReportSchema.parse({
          ...validReport,
          riskFlags: [
            {
              type: "inactivity",
              severity: "critical",
              description: "Something",
            },
          ],
        })
      ).toThrow();
    });
  });
});
