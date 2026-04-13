import { describe, it, expect } from "bun:test";
import { mastra } from "@/lib/mastra";
import { JUDGE_DIMENSIONS } from "@/lib/constants";

describe("mastra singleton", () => {
  it("has all 4 judge agents registered", () => {
    for (const dim of JUDGE_DIMENSIONS) {
      const agent = mastra.getAgent(`judge-${dim}`);
      expect(agent).toBeDefined();
    }
  });

  it("returns the same instance on repeated access", () => {
    const first = mastra.getAgent("judge-tech");
    const second = mastra.getAgent("judge-tech");
    expect(first).toBe(second);
  });
});
