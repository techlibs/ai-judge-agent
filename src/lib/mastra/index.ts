import { Mastra } from "@mastra/core/mastra";
import { ConsoleLogger, LogLevel } from "@mastra/core/logger";
import { judgeAgents } from "@/lib/judges/agents";
import { chatAgent } from "@/lib/chat/agent";
import { marketIntelligenceAgent } from "@/lib/judges/market-intelligence";
import { contextWeaverAgent } from "@/lib/judges/context-weaver";
import { realityCheckerAgent } from "@/lib/judges/reality-checker";

const logLevel =
  process.env.NODE_ENV === "production" ? LogLevel.WARN : LogLevel.INFO;

export const mastra = new Mastra({
  agents: {
    "judge-tech": judgeAgents.tech,
    "judge-impact": judgeAgents.impact,
    "judge-cost": judgeAgents.cost,
    "judge-team": judgeAgents.team,
    "grant-chat-assistant": chatAgent,
    "market-intelligence": marketIntelligenceAgent,
    "context-weaver": contextWeaverAgent,
    "reality-checker": realityCheckerAgent,
  },
  logger: new ConsoleLogger({ name: "agent-reviewer", level: logLevel }),
});
