import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import {
  type Proposal,
  type Criterion,
  type ProposalClassification,
  type CriteriaSelectionReasoning,
  ProposalClassificationSchema,
  CriteriaSelectionReasoningSchema,
} from "@ipe-city/common";
import { CORE_CRITERIA, ADAPTIVE_CRITERIA } from "./registry.js";
import { IPE_CITY_CONTEXT } from "../prompts/ipe-city-context.js";

/**
 * Classify a proposal's domain and select adaptive criteria.
 */
export async function classifyAndSelectCriteria(
  proposal: Proposal,
): Promise<{
  classification: ProposalClassification;
  criteriaSelection: CriteriaSelectionReasoning;
  selectedCriteria: Criterion[];
}> {
  // Step 1: Classify the proposal
  const classification = await generateObject({
    model: anthropic("claude-sonnet-4-20250514"),
    schema: ProposalClassificationSchema,
    prompt: `
${IPE_CITY_CONTEXT}

Classify this grant proposal:

Title: ${proposal.title}
Summary: ${proposal.summary}
Content: ${proposal.content}

Determine:
1. Primary domain (DeFi, Governance, Education, Health, Infrastructure, Other)
2. Optional secondary domain
3. Confidence in classification (0-1)
4. Reasoning for classification
5. Which adaptive criteria should be applied (select 2-4 from the available pool)
6. Which adaptive judges should be spawned (max 2)

Available adaptive criteria by domain:
- DeFi: Liquidity Risk, Regulatory Exposure
- Governance: Sybil Resistance, Power Decentralization
- Education: Pedagogy Methodology, Accessibility
- Health: Data Ethics, Health Equity
- Infrastructure: Reliability SLA, Interoperability
`.trim(),
    mode: "json",
  });

  // Step 2: Select criteria based on classification
  const adaptiveCriteria = ADAPTIVE_CRITERIA.filter((c) =>
    classification.object.suggestedAdaptiveCriteria.some(
      (suggested) => c.criterionId === suggested || c.name === suggested,
    ),
  ).slice(0, 4);

  // Compute adaptive weight (2500 total, split evenly)
  const adaptiveWeightEach =
    adaptiveCriteria.length > 0 ? Math.floor(2500 / adaptiveCriteria.length) : 0;
  const weightedAdaptive = adaptiveCriteria.map((c) => ({
    ...c,
    weight: adaptiveWeightEach,
  }));

  const selectedCriteria = [...CORE_CRITERIA, ...weightedAdaptive];

  // Step 3: Generate selection reasoning
  const criteriaSelection = await generateObject({
    model: anthropic("claude-sonnet-4-20250514"),
    schema: CriteriaSelectionReasoningSchema,
    prompt: `
Given this proposal classification:
- Primary domain: ${classification.object.primaryDomain}
- Secondary domain: ${classification.object.secondaryDomain ?? "none"}
- Reasoning: ${classification.object.reasoning}

And the selected criteria:
${selectedCriteria.map((c) => `- ${c.name} (${c.criterionId}): ${c.description}`).join("\n")}

Explain why each criterion was selected for this specific proposal.
Total weight must sum to 10000.
`.trim(),
    mode: "json",
  });

  return {
    classification: classification.object,
    criteriaSelection: criteriaSelection.object,
    selectedCriteria,
  };
}
