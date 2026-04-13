import { generateObject, generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import {
  evaluationOutputSchema,
  type EvaluationDimension,
  type DimensionEvaluation,
  DIMENSIONS,
} from "./schemas";
import { buildSystemPrompt, NAIVE_PROMPT } from "./prompts";
import { MODEL_CONFIG } from "./constants";

export async function evaluateDimension(
  dimension: EvaluationDimension,
  proposalText: string,
): Promise<DimensionEvaluation> {
  const systemPrompt = buildSystemPrompt(dimension);

  const result = await generateObject({
    model: anthropic(MODEL_CONFIG.model),
    system: systemPrompt,
    prompt: proposalText,
    schema: evaluationOutputSchema,
    temperature: MODEL_CONFIG.temperature,
    maxTokens: MODEL_CONFIG.maxTokens,
  });

  return {
    dimension,
    output: result.object,
    audit: {
      promptSent: systemPrompt,
      modelUsed: MODEL_CONFIG.model,
      rawResponse: JSON.stringify(result.object),
      evaluatedAt: Date.now(),
    },
  };
}

export async function evaluateAllDimensions(
  proposalText: string,
): Promise<DimensionEvaluation[]> {
  const results = await Promise.all(
    DIMENSIONS.map((dim) => evaluateDimension(dim, proposalText)),
  );
  return results;
}

export async function evaluateNaive(proposalText: string): Promise<string> {
  const result = await generateText({
    model: anthropic(MODEL_CONFIG.model),
    system: NAIVE_PROMPT,
    prompt: proposalText,
    temperature: MODEL_CONFIG.temperature,
    maxTokens: MODEL_CONFIG.maxTokens,
  });

  return result.text;
}
