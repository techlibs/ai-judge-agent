import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import {
  type JudgeVerdict,
  JudgeVerdictSchema,
  type JudgeRole,
  type Proposal,
  type Criterion,
} from "@ipe-city/common";
import { IPE_CITY_CONTEXT } from "../../prompts/ipe-city-context.js";
import { SCORING_RUBRIC, JUDGE_GUARDRAILS } from "../../prompts/rubrics.js";

export interface JudgeConfig {
  judgeId: string;
  role: JudgeRole;
  identity: string;
  focusAreas: string;
  specificGuidelines: string;
}

export async function evaluateAsJudge(
  config: JudgeConfig,
  proposal: Proposal,
  criteria: Criterion[],
): Promise<JudgeVerdict> {
  const criteriaList = criteria
    .map(
      (c) =>
        `- **${c.name}** (weight: ${c.weight / 100}%): ${c.description}\n  Guidelines: ${c.evaluationGuidelines}\n  Required evidence: ${c.evidenceRequirements.join(", ")}`,
    )
    .join("\n");

  const prompt = `
[IDENTITY]
${config.identity}

Your role: ${config.role}
Your focus: ${config.focusAreas}

[CONTEXT]
${IPE_CITY_CONTEXT}

[PROPOSAL]
Title: ${proposal.title}
Domain: ${proposal.domain}
Requested Amount: $${proposal.requestedAmount}
Submitter: ${proposal.submitter}

${proposal.content}

[CRITERIA TO EVALUATE]
${criteriaList}

[SCORING]
${SCORING_RUBRIC}

[SPECIFIC GUIDELINES]
${config.specificGuidelines}

[GUARDRAILS]
${JUDGE_GUARDRAILS}

Evaluate this proposal thoroughly. For each criterion, provide:
1. A tier (S/A/B/C/F) — assign this FIRST
2. A numeric score within that tier's range
3. Detailed reasoning (minimum 100 characters)
4. At least 1 evidence citation from the proposal
5. Evidence sufficiency assessment
6. Any limitations in your evaluation

Then provide an overall tier, score, summary, and confidence level.
`.trim();

  const result = await generateObject({
    model: anthropic("claude-sonnet-4-20250514"),
    schema: JudgeVerdictSchema,
    prompt,
    mode: "json",
  });

  return {
    ...result.object,
    judgeId: config.judgeId,
    judgeRole: config.role,
    proposalId: proposal.proposalId,
    evaluatedAt: Math.floor(Date.now() / 1000),
  };
}
