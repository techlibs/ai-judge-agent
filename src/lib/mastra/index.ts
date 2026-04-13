import { Mastra } from "@mastra/core/mastra";
import { ConsoleLogger, LogLevel } from "@mastra/core/logger";
import { judgeAgents } from "@/lib/judges/agents";

const logLevel =
  process.env.NODE_ENV === "production" ? LogLevel.WARN : LogLevel.INFO;

export const mastra = new Mastra({
  agents: {
    "judge-tech": judgeAgents.tech,
    "judge-impact": judgeAgents.impact,
    "judge-cost": judgeAgents.cost,
    "judge-team": judgeAgents.team,
  },
  logger: new ConsoleLogger({ name: "agent-reviewer", level: logLevel }),
});
