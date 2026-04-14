import { createFaithfulnessScorer } from "@mastra/evals/scorers/prebuilt";
import { createHallucinationScorer } from "@mastra/evals/scorers/prebuilt";
import { createPromptAlignmentScorerLLM } from "@mastra/evals/scorers/prebuilt";
import { anthropic } from "@ai-sdk/anthropic";
import type { MastraDBMessage } from "@mastra/core/agent";
import type { CoreSystemMessage } from "@mastra/core/llm";

const SCORER_MODEL = anthropic("claude-haiku-4-5-20251001");

const QUALITY_THRESHOLDS = {
  FAITHFULNESS_MIN: 0.7,
  HALLUCINATION_MAX: 0.3,
  PROMPT_ALIGNMENT_MIN: 0.7,
} as const;

const faithfulnessScorer = createFaithfulnessScorer({ model: SCORER_MODEL });
const hallucinationScorer = createHallucinationScorer({ model: SCORER_MODEL });
const promptAlignmentScorer = createPromptAlignmentScorerLLM({ model: SCORER_MODEL });

function textToInputMessages(text: string): {
  inputMessages: MastraDBMessage[];
  rememberedMessages: MastraDBMessage[];
  systemMessages: CoreSystemMessage[];
  taggedSystemMessages: Record<string, CoreSystemMessage[]>;
} {
  const msg: MastraDBMessage = {
    id: crypto.randomUUID(),
    role: "user",
    createdAt: new Date(),
    content: {
      format: 2,
      parts: [{ type: "text", text }],
    },
  };
  return {
    inputMessages: [msg],
    rememberedMessages: [],
    systemMessages: [],
    taggedSystemMessages: {},
  };
}

function textToOutputMessages(text: string): MastraDBMessage[] {
  return [
    {
      id: crypto.randomUUID(),
      role: "assistant",
      createdAt: new Date(),
      content: {
        format: 2,
        parts: [{ type: "text", text }],
      },
    },
  ];
}

export interface QualityScores {
  faithfulness: number;
  hallucination: number;
  promptAlignment: number;
  qualityFlag: boolean;
}

export async function runQualityScorers(params: {
  proposalContext: string;
  justification: string;
  promptText: string;
}): Promise<QualityScores> {
  const inputForContext = textToInputMessages(params.proposalContext);
  const inputForPrompt = textToInputMessages(params.promptText);
  const outputMessages = textToOutputMessages(params.justification);

  const [faithResult, hallucResult, alignResult] = await Promise.all([
    faithfulnessScorer.run({
      input: inputForContext,
      output: outputMessages,
    }),
    hallucinationScorer.run({
      input: inputForContext,
      output: outputMessages,
    }),
    promptAlignmentScorer.run({
      input: inputForPrompt,
      output: outputMessages,
    }),
  ]);

  const faithfulness = faithResult.score;
  const hallucination = hallucResult.score;
  const promptAlignment = alignResult.score;

  const qualityFlag =
    faithfulness < QUALITY_THRESHOLDS.FAITHFULNESS_MIN ||
    hallucination > QUALITY_THRESHOLDS.HALLUCINATION_MAX ||
    promptAlignment < QUALITY_THRESHOLDS.PROMPT_ALIGNMENT_MIN;

  return { faithfulness, hallucination, promptAlignment, qualityFlag };
}
