import { Mastra } from "@mastra/core";
import { proposalAssistant } from "@/evaluation/agents/proposal-assistant";

export const mastra = new Mastra({
  agents: {
    "proposal-assistant": proposalAssistant,
  },
});
