import {
  type Proposal,
  type EvaluationReport,
  type JudgeVerdict,
  type Tier,
  type Criterion,
  isScoreInTier,
  TIER_RANGES,
} from "@ipe-city/common";
import { classifyAndSelectCriteria } from "../criteria/selector.js";
import { CORE_CRITERIA } from "../criteria/registry.js";
import { evaluateSecurity } from "./judges/security-judge.js";
import { evaluateImpact } from "./judges/impact-judge.js";
import { evaluateAlignment } from "./judges/alignment-judge.js";
import { identifyDisagreements, runDeliberation } from "./presiding-judge.js";

/**
 * Determine the tier for a given score.
 */
function scoreToTier(score: number): Tier {
  if (score >= 9) return "S";
  if (score >= 7) return "A";
  if (score >= 5) return "B";
  if (score >= 3) return "C";
  return "F";
}

/**
 * Determine recommendation based on final score and security veto.
 */
function determineRecommendation(
  finalScore: number,
  securityVeto: boolean,
): "Fund" | "Fund with conditions" | "Revise and resubmit" | "Reject" {
  if (securityVeto) return "Revise and resubmit";
  if (finalScore >= 8) return "Fund";
  if (finalScore >= 6) return "Fund with conditions";
  if (finalScore >= 4) return "Revise and resubmit";
  return "Reject";
}

/**
 * Main evaluation pipeline orchestrator.
 *
 * Phase 1: Classify proposal and select criteria
 * Phase 2: Run judges in parallel
 * Phase 3: Deliberation (if disagreements)
 * Phase 4: Synthesize final report
 */
export async function evaluateProposal(
  proposal: Proposal,
): Promise<EvaluationReport> {
  // --- Phase 1: Classification ---
  const { classification, criteriaSelection, selectedCriteria } =
    await classifyAndSelectCriteria(proposal);

  const securityCriteria = selectedCriteria.filter(
    (c) => c.category === "Security" || c.isCore,
  );
  const impactCriteria = selectedCriteria.filter(
    (c) => c.category === "Impact" || c.isCore,
  );
  const alignmentCriteria = selectedCriteria.filter(
    (c) => c.category === "Alignment" || c.isCore,
  );

  // --- Phase 2: Parallel Independent Evaluation ---
  const [securityVerdict, impactVerdict, alignmentVerdict] = await Promise.all([
    evaluateSecurity(proposal, securityCriteria),
    evaluateImpact(proposal, impactCriteria),
    evaluateAlignment(proposal, alignmentCriteria),
  ]);

  const verdicts: JudgeVerdict[] = [securityVerdict, impactVerdict, alignmentVerdict];

  // --- Phase 3: Deliberation ---
  const deliberation = await runDeliberation(proposal.proposalId, verdicts);

  // --- Phase 4: Synthesis ---
  const securityVeto = securityVerdict.overallScore < 4;

  // Weighted score: Security 25%, Impact 30%, Alignment 20%, Adaptive 25%
  // For now without adaptive judges, redistribute: Security 30%, Impact 35%, Alignment 35%
  const weights = { security: 0.30, impact: 0.35, alignment: 0.35 };
  const finalScore = Number(
    (
      securityVerdict.overallScore * weights.security +
      impactVerdict.overallScore * weights.impact +
      alignmentVerdict.overallScore * weights.alignment
    ).toFixed(1),
  );

  const finalTier = scoreToTier(finalScore);

  const totalDimensions = verdicts.reduce((sum, v) => sum + v.dimensions.length, 0);

  const consensusStatus =
    deliberation === null
      ? "Agreed"
      : deliberation.dissentCount > 0
        ? "Disagreed"
        : "Reconciled";

  const executiveSummary = [
    `Evaluation of "${proposal.title}" by ${verdicts.length} judges.`,
    `Security: ${securityVerdict.overallTier} (${securityVerdict.overallScore}/10)`,
    `Impact: ${impactVerdict.overallTier} (${impactVerdict.overallScore}/10)`,
    `Alignment: ${alignmentVerdict.overallTier} (${alignmentVerdict.overallScore}/10)`,
    `Final: ${finalTier} (${finalScore}/10)`,
    securityVeto ? "SECURITY VETO: Flagged for human review due to security score below 4." : "",
    deliberation
      ? `Deliberation: ${deliberation.totalDisagreements} disagreements, ${deliberation.resolvedCount} resolved, ${deliberation.dissentCount} dissents recorded.`
      : "No disagreements — judges reached consensus.",
    `Recommendation: ${determineRecommendation(finalScore, securityVeto)}`,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    proposalId: proposal.proposalId,
    classification,
    criteriaSelection,
    verdicts,
    deliberation: deliberation ?? undefined,
    finalScore,
    finalTier,
    consensusStatus,
    recommendation: determineRecommendation(finalScore, securityVeto),
    executiveSummary,
    securityVeto,
    evaluatedAt: Math.floor(Date.now() / 1000),
    totalJudges: verdicts.length,
    totalDimensions,
  };
}
