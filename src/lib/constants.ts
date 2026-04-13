export const JUDGE_DIMENSIONS = ["tech", "impact", "cost", "team"] as const;
export type JudgeDimension = (typeof JUDGE_DIMENSIONS)[number];

export const DIMENSION_WEIGHTS: Record<JudgeDimension, number> = {
  tech: 0.25,
  impact: 0.30,
  cost: 0.20,
  team: 0.25,
} as const;

export const DIMENSION_LABELS: Record<JudgeDimension, string> = {
  tech: "Technical Feasibility",
  impact: "Impact Potential",
  cost: "Cost Efficiency",
  team: "Team Capability",
} as const;

export const PROPOSAL_CATEGORIES = [
  "infrastructure",
  "research",
  "community",
  "education",
  "creative",
] as const;
export type ProposalCategory = (typeof PROPOSAL_CATEGORIES)[number];

export const RESIDENCY_DURATIONS = ["3-weeks", "4-weeks", "5-weeks"] as const;
export type ResidencyDuration = (typeof RESIDENCY_DURATIONS)[number];

export const SCORING_BANDS = {
  exceptional: { min: 8000, label: "Exceptional" },
  strong: { min: 6500, label: "Strong" },
  adequate: { min: 5000, label: "Adequate" },
  weak: { min: 3000, label: "Weak" },
  insufficient: { min: 0, label: "Insufficient" },
} as const;

export const RECOMMENDATION_OPTIONS = [
  "strong_fund",
  "fund",
  "conditional",
  "reject",
] as const;
export type Recommendation = (typeof RECOMMENDATION_OPTIONS)[number];
