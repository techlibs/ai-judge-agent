// @ts-nocheck
// Thin JS wrapper to bypass Mastra's overly strict scorer types.
// Prebuilt scorers accept plain strings at runtime despite typed for agent messages.

/** @param {import("@mastra/core/evals").MastraScorer} scorer */
/** @param {string} input */
/** @param {string} output */
export async function runScorer(scorer, input, output) {
  const result = await scorer.run({ input, output });
  return { score: result.score ?? 0 };
}
