import { describe, it, expect } from "bun:test";
import { mastra } from "@/lib/mastra";

describe("mastra singleton — proposal assistant", () => {
  it("has proposal-assistant agent registered", () => {
    const agent = mastra.getAgent("proposal-assistant");
    expect(agent).toBeDefined();
    expect(agent.id).toBe("proposal-assistant");
  });

  it("returns the same instance on repeated access", () => {
    const first = mastra.getAgent("proposal-assistant");
    const second = mastra.getAgent("proposal-assistant");
    expect(first).toBe(second);
  });

  it("has 9 agents total", () => {
    const expectedAgents = [
      "judge-tech",
      "judge-impact",
      "judge-cost",
      "judge-team",
      "grant-chat-assistant",
      "market-intelligence",
      "context-weaver",
      "reality-checker",
      "proposal-assistant",
    ];
    for (const id of expectedAgents) {
      expect(mastra.getAgent(id)).toBeDefined();
    }
  });
});
