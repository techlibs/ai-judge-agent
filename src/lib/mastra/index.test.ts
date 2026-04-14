import { describe, expect, it } from "bun:test";
import { mastra } from "./index";

describe("mastra instance", () => {
  it("exports a mastra instance", () => {
    expect(mastra).toBeDefined();
  });

  it("has the proposalAssistant agent registered", () => {
    const agent = mastra.getAgent("proposalAssistant");
    expect(agent).toBeDefined();
    expect(agent.name).toBe("Proposal Assistant");
  });
});
