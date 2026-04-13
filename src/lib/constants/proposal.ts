// const assertion - not a type cast
export const PROPOSAL_STATUS = {
  SUBMITTED: "submitted",
  EVALUATING: "evaluating",
  EVALUATED: "evaluated",
} as const;

export type ProposalStatus =
  (typeof PROPOSAL_STATUS)[keyof typeof PROPOSAL_STATUS];

export const STATUS_LABELS: Record<ProposalStatus, string> = {
  submitted: "Submitted",
  evaluating: "Evaluating",
  evaluated: "Evaluated",
};

export const FIELD_LIMITS = {
  TITLE_MIN: 5,
  TITLE_MAX: 200,
  DESCRIPTION_MIN: 50,
  DESCRIPTION_MAX: 5000,
  TEAM_INFO_MIN: 10,
  TEAM_INFO_MAX: 2000,
  BUDGET_MAX: 1_000_000,
  EXTERNAL_LINKS_MAX: 5,
} as const;

export const SCORING_WEIGHTS = {
  TECHNICAL_FEASIBILITY: 0.25,
  IMPACT_POTENTIAL: 0.3,
  COST_EFFICIENCY: 0.2,
  TEAM_CAPABILITY: 0.25,
} as const;

export const DESCRIPTION_TRUNCATE_LENGTH = 120;
