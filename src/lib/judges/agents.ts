import { Agent } from "@mastra/core/agent";
import type { MastraDBMessage } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";
import { getJudgePrompt } from "./prompts";
import type { JudgeDimension } from "@/lib/constants";

const INJECTION_PATTERNS = [
  /SYSTEM:/i,
  /INSTRUCTION:/i,
  /IGNORE\s+(ALL\s+)?PREVIOUS/i,
  /OVERRIDE/i,
  /\[INST\]/i,
  /<\/s>/,
  /YOU\s+ARE\s+NOW/i,
  /FORGET\s+(YOUR|ALL)/i,
];

export function detectInjectionPatterns(text: string): string[] {
  return INJECTION_PATTERNS
    .filter((pattern) => pattern.test(text))
    .map((pattern) => pattern.source);
}

function extractTextFromDBMessage(message: MastraDBMessage): string {
  if (message.content.format !== 2) return "";
  return message.content.parts
    .filter((part): part is { type: "text"; text: string } =>
      part.type === "text" && "text" in part
    )
    .map((part) => part.text)
    .join(" ");
}

const injectionGuard = {
  id: "injection-guard" as const,
  name: "Injection Guard",
  description: "Logs potential prompt injection attempts in proposal input messages",
  processInput({ messages }: { messages: MastraDBMessage[] }): MastraDBMessage[] {
    for (const message of messages) {
      if (message.role !== "user") continue;
      const text = extractTextFromDBMessage(message);
      const detected = detectInjectionPatterns(text);
      if (detected.length > 0) {
        console.log(
          JSON.stringify({
            type: "injection_attempt",
            source: "agent-input-processor",
            patterns: detected,
            timestamp: new Date().toISOString(),
            level: "SECURITY",
          })
        );
      }
    }
    return messages;
  },
};

function createJudgeAgent(dim: JudgeDimension): Agent {
  return new Agent({
    id: `judge-${dim}`,
    name: `Judge ${dim}`,
    model: openai("gpt-4o"),
    instructions: getJudgePrompt(dim),
    inputProcessors: [injectionGuard],
  });
}

export const judgeAgents: Record<JudgeDimension, Agent> = {
  tech: createJudgeAgent("tech"),
  impact: createJudgeAgent("impact"),
  cost: createJudgeAgent("cost"),
  team: createJudgeAgent("team"),
};
