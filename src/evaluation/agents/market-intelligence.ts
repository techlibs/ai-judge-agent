import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { MarketContextSchema, type MarketContext } from "@/lib/colosseum/schemas";
import type { ColosseumResponse } from "@/lib/colosseum/schemas";
import {
  queryColosseumWithRetry,
  buildResearchQuery,
  type ColosseumResearchResult,
} from "@/lib/colosseum/client";
import type { SanitizedProposal } from "../schemas";
import { MODEL_ID } from "./prompts";

const RESEARCH_TIMEOUT_MS = 30_000;

const MARKET_INTELLIGENCE_SYSTEM_PROMPT = `You are a market intelligence researcher for IPE City grant evaluations.

Your role is to analyze competitive intelligence data from Colosseum Copilot and produce a structured market context report that will inform judge agents.

You receive raw research data (similar projects, gap classifications, market signals) and synthesize it into actionable context for each evaluation dimension.

RULES:
- Be precise. Cite specific projects and data points.
- Never speculate beyond the evidence provided.
- Classify each similar project's relevance as: direct_competitor, adjacent, or inspiration.
- Produce a clear gap classification rationale.
- Keep keyInsights concise and actionable (max 5 items).
- If data is sparse, reflect that honestly in your synthesis.`;

interface MarketResearchSuccess {
  readonly status: "success";
  readonly marketContext: MarketContext;
  readonly rawResponse: ColosseumResponse;
  readonly injectionAttemptsDetected: number;
}

interface MarketResearchFailure {
  readonly status: "failure";
  readonly reason: string;
}

type MarketResearchOutcome = MarketResearchSuccess | MarketResearchFailure;

async function synthesizeMarketContext(
  colosseumResult: ColosseumResearchResult,
  proposal: SanitizedProposal
): Promise<MarketContext> {
  const result = await generateObject({
    model: openai(MODEL_ID),
    schema: MarketContextSchema,
    system: MARKET_INTELLIGENCE_SYSTEM_PROMPT,
    prompt: `Analyze the following competitive intelligence data for the grant proposal "${proposal.title}" in the "${proposal.category}" category.

RAW RESEARCH DATA:
${JSON.stringify(colosseumResult.data, null, 2)}

PROPOSAL SUMMARY:
Title: ${proposal.title}
Category: ${proposal.category}
Description: ${proposal.description.slice(0, 500)}

Produce a structured market context report. For each similar project, classify its relevance to this specific proposal (direct_competitor, adjacent, or inspiration). Limit keyInsights to the 5 most important findings.`,
  });

  return result.object;
}

export async function performMarketResearch(
  proposal: SanitizedProposal
): Promise<MarketResearchOutcome> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), RESEARCH_TIMEOUT_MS);

  try {
    const query = buildResearchQuery(
      proposal.title,
      proposal.description,
      proposal.category
    );

    const colosseumResult = await queryColosseumWithRetry(query);

    const marketContext = await synthesizeMarketContext(
      colosseumResult,
      proposal
    );

    return {
      status: "success",
      marketContext,
      rawResponse: colosseumResult.data,
      injectionAttemptsDetected: colosseumResult.injectionAttemptsDetected,
    };
  } catch (error) {
    const reason =
      error instanceof Error ? error.message : "Unknown research error";
    return {
      status: "failure",
      reason,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

export type { MarketResearchOutcome, MarketResearchSuccess, MarketResearchFailure };
