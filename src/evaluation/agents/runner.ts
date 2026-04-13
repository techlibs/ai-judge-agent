import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { DimensionScoreSchema, type SanitizedProposal, type DimensionScore, type ScoringDimension, SCORING_DIMENSIONS } from "../schemas";
import { DIMENSION_CONFIGS, MODEL_ID, PROMPT_VERSION } from "./prompts";

export const maxDuration = 60;

const AGENT_TIMEOUT_MS = 90_000;
const MAX_CONCURRENT_EVALUATIONS = 10;

let activeEvaluationCount = 0;

class EvaluationTimeoutError extends Error {
  constructor(dimension: string) {
    super(`Evaluation timed out for dimension: ${dimension}`);
    this.name = "EvaluationTimeoutError";
  }
}

class ConcurrentEvaluationLimitError extends Error {
  constructor() {
    super(
      `Maximum concurrent evaluations (${MAX_CONCURRENT_EVALUATIONS}) reached`
    );
    this.name = "ConcurrentEvaluationLimitError";
  }
}

async function evaluateDimension(
  proposal: SanitizedProposal,
  dimension: ScoringDimension
): Promise<DimensionScore> {
  const config = DIMENSION_CONFIGS[dimension];
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AGENT_TIMEOUT_MS);

  try {
    const result = await generateObject({
      model: anthropic(MODEL_ID),
      schema: DimensionScoreSchema,
      system: config.systemPrompt,
      prompt: `Evaluate the following grant proposal on the "${config.dimension}" dimension.

PROPOSAL DATA:
${JSON.stringify(proposal, null, 2)}

Produce a structured evaluation with:
- dimension: "${config.dimension}"
- score: 0-10
- inputDataConsidered: which fields you examined
- rubricApplied: which criteria from [${config.rubricCriteria.join(", ")}] you used
- reasoningChain: your full reasoning (min 50 chars)`,
      abortSignal: controller.signal,
    });

    return result.object;
  } catch (error) {
    if (controller.signal.aborted) {
      throw new EvaluationTimeoutError(dimension);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

interface EvaluationResult {
  readonly scores: ReadonlyArray<DimensionScore>;
  readonly modelId: string;
  readonly promptVersion: string;
}

async function runAllDimensions(
  proposal: SanitizedProposal
): Promise<EvaluationResult> {
  if (activeEvaluationCount >= MAX_CONCURRENT_EVALUATIONS) {
    throw new ConcurrentEvaluationLimitError();
  }

  activeEvaluationCount++;

  try {
    const dimensionPromises = SCORING_DIMENSIONS.map((dimension) =>
      evaluateDimension(proposal, dimension)
    );

    const scores = await Promise.all(dimensionPromises);

    return {
      scores,
      modelId: MODEL_ID,
      promptVersion: PROMPT_VERSION,
    };
  } finally {
    activeEvaluationCount--;
  }
}

export {
  runAllDimensions,
  evaluateDimension,
  EvaluationTimeoutError,
  ConcurrentEvaluationLimitError,
};

export type { EvaluationResult };
