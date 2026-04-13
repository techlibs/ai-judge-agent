import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";
import { CHAT_SYSTEM_PROMPT } from "./prompts";
import { chatTools } from "./tools";

export const chatAgent = new Agent({
  id: "grant-chat-assistant",
  name: "Grant Analysis Assistant",
  model: openai("gpt-4o"),
  instructions: CHAT_SYSTEM_PROMPT,
  tools: chatTools,
});
