import { describe, it, expect, vi } from "vitest";

vi.mock("@mastra/core/mastra", () => {
  const MastraMock = vi.fn();
  return { Mastra: MastraMock };
});

vi.mock("@mastra/core/logger", () => ({
  ConsoleLogger: vi.fn(),
  LogLevel: {
    INFO: "INFO",
    WARN: "WARN",
    DEBUG: "DEBUG",
    ERROR: "ERROR",
  },
}));

vi.mock("@/lib/judges/agents", () => ({
  judgeAgents: {
    tech: { name: "tech-judge" },
    impact: { name: "impact-judge" },
    cost: { name: "cost-judge" },
    team: { name: "team-judge" },
  },
}));

import { Mastra } from "@mastra/core/mastra";
import { ConsoleLogger } from "@mastra/core/logger";

describe("mastra instance", () => {
  it("creates a Mastra instance with four judge agents", async () => {
    // Import after mocks are set up
    await import("./index");

    expect(Mastra).toHaveBeenCalledOnce();

    const constructorArgs = vi.mocked(Mastra).mock.calls[0]?.[0] as {
      agents: Record<string, unknown>;
      logger: unknown;
    };

    expect(constructorArgs.agents).toEqual({
      "judge-tech": { name: "tech-judge" },
      "judge-impact": { name: "impact-judge" },
      "judge-cost": { name: "cost-judge" },
      "judge-team": { name: "team-judge" },
    });
  });

  it("configures ConsoleLogger with agent-reviewer name", () => {
    expect(ConsoleLogger).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "agent-reviewer",
      })
    );
  });

  it("exports a defined mastra instance", async () => {
    const mod = await import("./index");
    expect(mod).toHaveProperty("mastra");
  });
});
