import { Mastra } from "@mastra/core";
import { proposalAssistant } from "@/lib/agents/proposal-assistant";

export const mastra = new Mastra({
  agents: {
    proposalAssistant,
  },
});
