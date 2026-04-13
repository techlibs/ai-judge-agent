export const DIMENSIONS = [
  { key: "technical" as const, label: "Technical Feasibility", weight: 0.25 },
  { key: "impact" as const, label: "Impact Potential", weight: 0.3 },
  { key: "cost" as const, label: "Cost Efficiency", weight: 0.2 },
  { key: "team" as const, label: "Team Capability", weight: 0.25 },
] as const; // const assertion

type DimensionKey = (typeof DIMENSIONS)[number]["key"];

export const DIMENSION_WEIGHTS: Record<DimensionKey, number> = {
  technical: 0.25,
  impact: 0.3,
  cost: 0.2,
  team: 0.25,
};

export const SCORE_BANDS = {
  exceptional: { min: 81, max: 100, label: "Exceptional" },
  strong: { min: 61, max: 80, label: "Strong" },
  adequate: { min: 41, max: 60, label: "Adequate" },
  weak: { min: 21, max: 40, label: "Weak" },
  insufficient: { min: 0, max: 20, label: "Insufficient" },
} as const; // const assertion

export const IPE_CITY_VALUES = `IPE City core values that should inform your evaluation:
1. Pro-technological innovation: Favor proposals that advance technology and push boundaries
2. Pro-freedom: Favor proposals that increase individual autonomy, decentralization, and open systems
3. Pro-human progress: Favor proposals that measurably improve human capability and quality of life`;

export const MODEL_CONFIG = {
  model: "gpt-4o" as const,
  temperature: 0.3,
  maxTokens: 1500,
} as const;

export function getScoreBand(score: number): string {
  for (const band of Object.values(SCORE_BANDS)) {
    if (score >= band.min && score <= band.max) return band.label;
  }
  return SCORE_BANDS.insufficient.label;
}
