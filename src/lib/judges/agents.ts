import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";
import type { InputProcessor, ProcessInputArgs, ProcessInputResult } from "@mastra/core/processors";
import { getJudgePrompt } from "./prompts";
import { JUDGE_DIMENSIONS, type JudgeDimension } from "@/lib/constants";

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

const injectionGuard: InputProcessor = {
  id: "injection-guard",
  name: "Injection Guard",
  description: "Logs potential prompt injection attempts in proposal input messages",
  processInput({ messages }: ProcessInputArgs): ProcessInputResult {
    for (const message of messages) {
      if (message.role !== "user") continue;
      const text = Array.isArray(message.content)
        ? message.content
            .filter((part): part is { type: "text"; text: string } => "type" in part && part.type === "text")
            .map((part) => part.text)
            .join(" ")
        : typeof message.content === "string"
          ? message.content
          : "";

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

export const judgeAgents: Record<JudgeDimension, Agent> = Object.fromEntries(
  JUDGE_DIMENSIONS.map((dim) => [
    dim,
    new Agent({
      id: `judge-${dim}`,
      name: `Judge ${dim}`,
      model: openai("gpt-5.4"),
      instructions: getJudgePrompt(dim),
      inputProcessors: [injectionGuard],
    }),
  ])
) as Record<JudgeDimension, Agent>;
