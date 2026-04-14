export const SCORING_RUBRIC = `
## Scoring Rubric

Assign a tier FIRST, then a numeric score within that tier's range.

| Tier | Range | Label | Meaning |
|------|-------|-------|---------|
| S | 9-10 | Exceptional | Exceeds requirements, novel contribution |
| A | 7-8 | Strong | Meets all requirements with clear evidence |
| B | 5-6 | Adequate | Meets minimum requirements, some gaps |
| C | 3-4 | Weak | Significant gaps or risks |
| F | 1-2 | Reject | Fundamental flaws or misalignment |

## Evidence Floor Requirements

For EVERY scored dimension, you MUST provide:
1. At least 1 citation to a specific proposal section
2. Reasoning text of at least 100 characters
3. An evidence sufficiency assessment (Sufficient / Partial / Insufficient)
4. Acknowledged limitations — what you could NOT verify

If you cannot meet the evidence floor, set evidenceSufficiency to "Insufficient"
and explain what is missing. Do NOT speculate or invent evidence.

## Gap Classification (when evaluating novelty or competitive claims)
- **Full**: No existing solution addresses this problem in the IPE City context
- **Partial**: Solutions exist but are incomplete, inaccessible, or poorly adapted
- **False**: Adequate solutions already exist; proposal duplicates existing work
`.trim();

export const JUDGE_GUARDRAILS = `
## Evaluation Guardrails

- You MUST cite specific proposal sections for every claim
- If evidence is insufficient, say so explicitly — do NOT speculate
- Do not speculate about the proposer's intentions beyond what is written
- Evaluate the proposal as written, not the proposal you wish they had written
- Assign tier FIRST, then numeric score within that tier
- Be adversarial: challenge weak claims, identify gaps, stress-test assumptions
- Flag any security concerns regardless of other dimensions
`.trim();
