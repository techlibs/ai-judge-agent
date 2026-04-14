import { describe, it, expect } from "vitest";
import { mastra } from "../index";

describe("Mastra instance", () => {
  it("is defined", () => {
    expect(mastra).toBeDefined();
  });

  it("has the proposal-assistant agent registered", () => {
    const agent = mastra.getAgent("proposal-assistant");
    expect(agent).toBeDefined();
    expect(agent.name).toBe("proposal-assistant");
  });
});
