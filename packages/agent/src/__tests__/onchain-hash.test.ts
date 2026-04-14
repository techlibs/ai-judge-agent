import { describe, expect, test } from "bun:test";
import {
  computeProposalId,
  computeCriterionId,
  generateSalt,
  computeCommitHash,
} from "../onchain/hash.js";

describe("computeProposalId", () => {
  test("produces deterministic output", () => {
    const id1 = computeProposalId("0x1234567890abcdef1234567890abcdef12345678", "Test Proposal", 1000000n);
    const id2 = computeProposalId("0x1234567890abcdef1234567890abcdef12345678", "Test Proposal", 1000000n);
    expect(id1).toBe(id2);
  });

  test("different inputs produce different IDs", () => {
    const id1 = computeProposalId("0x1234567890abcdef1234567890abcdef12345678", "Proposal A", 1000000n);
    const id2 = computeProposalId("0x1234567890abcdef1234567890abcdef12345678", "Proposal B", 1000000n);
    expect(id1).not.toBe(id2);
  });

  test("returns 0x-prefixed 66-char hex string", () => {
    const id = computeProposalId("0x1234567890abcdef1234567890abcdef12345678", "Test", 1n);
    expect(id).toMatch(/^0x[0-9a-f]{64}$/);
  });
});

describe("computeCriterionId", () => {
  test("produces deterministic output", () => {
    const id1 = computeCriterionId("Security");
    const id2 = computeCriterionId("Security");
    expect(id1).toBe(id2);
  });

  test("different names produce different IDs", () => {
    const id1 = computeCriterionId("Security");
    const id2 = computeCriterionId("Impact");
    expect(id1).not.toBe(id2);
  });
});

describe("generateSalt", () => {
  test("returns 0x-prefixed 66-char hex string", () => {
    const salt = generateSalt();
    expect(salt).toMatch(/^0x[0-9a-f]{64}$/);
  });

  test("generates unique salts", () => {
    const salts = new Set(Array.from({ length: 10 }, () => generateSalt()));
    expect(salts.size).toBe(10);
  });
});

describe("computeCommitHash", () => {
  test("produces deterministic output", () => {
    const params = {
      judgeId: 1n,
      proposalId: "0x" + "ab".repeat(32) as `0x${string}`,
      criterionIds: [computeCriterionId("Security")],
      scores: [7.5],
      overallScore: 7.5,
      reasoning: "Test reasoning",
      salt: "0x" + "cd".repeat(32) as `0x${string}`,
    };

    const hash1 = computeCommitHash(params);
    const hash2 = computeCommitHash(params);
    expect(hash1).toBe(hash2);
  });

  test("different salt produces different hash", () => {
    const baseParams = {
      judgeId: 1n,
      proposalId: "0x" + "ab".repeat(32) as `0x${string}`,
      criterionIds: [computeCriterionId("Security")],
      scores: [7.5],
      overallScore: 7.5,
      reasoning: "Test reasoning",
    };

    const hash1 = computeCommitHash({ ...baseParams, salt: "0x" + "01".repeat(32) as `0x${string}` });
    const hash2 = computeCommitHash({ ...baseParams, salt: "0x" + "02".repeat(32) as `0x${string}` });
    expect(hash1).not.toBe(hash2);
  });
});
