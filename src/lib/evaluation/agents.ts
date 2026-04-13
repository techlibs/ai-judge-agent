import { generateObject, generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import {
  evaluationOutputSchema,
  type EvaluationDimension,
  type DimensionEvaluation,
} from "./schemas";
import { buildSystemPrompt, NAIVE_PROMPT } from "./prompts";
import { MODEL_CONFIG, DIMENSIONS } from "./constants";

export async function evaluateDimension(
  dimension: EvaluationDimension,
  proposalText: string,
  marketContext?: string,
): Promise<DimensionEvaluation> {
  const systemPrompt = buildSystemPrompt(dimension, marketContext);

  const result = await generateObject({
    model: openai(MODEL_CONFIG.model),
    system: systemPrompt,
    prompt: proposalText,
    schema: evaluationOutputSchema,
    temperature: MODEL_CONFIG.temperature,
    maxOutputTokens: MODEL_CONFIG.maxTokens,
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
    DIMENSIONS.map((dim) => evaluateDimension(dim.key, proposalText)),
  );
  return results;
}

export async function evaluateNaive(
  proposalText: string,
): Promise<string> {
  const result = await generateText({
    model: openai(MODEL_CONFIG.model),
    prompt: `${NAIVE_PROMPT}\n\n${proposalText}`,
    temperature: MODEL_CONFIG.temperature,
    maxOutputTokens: MODEL_CONFIG.maxTokens,
  });
  return result.text;
}
