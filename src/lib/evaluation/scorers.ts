// Mastra scorer types expect agent-internal message structures (MastraDBMessage)
// but prebuilt scorers accept plain strings at runtime. We use a JS wrapper
// (run-scorer.js) to bypass the strict generic types.

import { createFaithfulnessScorer } from "@mastra/evals/scorers/prebuilt";
import { createHallucinationScorer } from "@mastra/evals/scorers/prebuilt";
import { createPromptAlignmentScorerLLM } from "@mastra/evals/scorers/prebuilt";
import { openai } from "@ai-sdk/openai";
import { runScorer } from "./run-scorer.js";

const SCORER_MODEL = openai("gpt-4o");

const QUALITY_THRESHOLDS = {
  FAITHFULNESS_MIN: 0.7,
  HALLUCINATION_MAX: 0.3,
  PROMPT_ALIGNMENT_MIN: 0.7,
} as const;

const faithfulnessScorer = createFaithfulnessScorer({ model: SCORER_MODEL });
const hallucinationScorer = createHallucinationScorer({ model: SCORER_MODEL });
const promptAlignmentScorer = createPromptAlignmentScorerLLM({ model: SCORER_MODEL });

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
  const [faithResult, hallucResult, alignResult] = await Promise.all([
    runScorer(faithfulnessScorer, params.proposalContext, params.justification),
    runScorer(hallucinationScorer, params.proposalContext, params.justification),
    runScorer(promptAlignmentScorer, params.promptText, params.justification),
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
