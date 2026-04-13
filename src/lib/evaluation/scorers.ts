import { createFaithfulnessScorer } from "@mastra/evals/scorers/prebuilt";
import { createHallucinationScorer } from "@mastra/evals/scorers/prebuilt";
import { createPromptAlignmentScorerLLM } from "@mastra/evals/scorers/prebuilt";
import { openai } from "@ai-sdk/openai";

const SCORER_MODEL = openai("gpt-5.4");

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
    faithfulnessScorer.score({
      input: params.proposalContext,
      output: params.justification,
    }),
    hallucinationScorer.score({
      input: params.proposalContext,
      output: params.justification,
    }),
    promptAlignmentScorer.score({
      input: params.promptText,
      output: params.justification,
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
