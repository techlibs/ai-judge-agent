import { describe, it, expect } from "bun:test";
import { judgeAgents } from "@/lib/judges/agents";
import { JUDGE_DIMENSIONS } from "@/lib/constants";

describe("judgeAgents", () => {
  it("has one agent per dimension", () => {
    for (const dim of JUDGE_DIMENSIONS) {
      expect(judgeAgents[dim]).toBeDefined();
      expect(judgeAgents[dim].id).toBe(`judge-${dim}`);
    }
  });

  it("returns the same instance on repeated access", () => {
    const first = judgeAgents.tech;
    const second = judgeAgents.tech;
    expect(first).toBe(second);
  });
});
