import { z } from "zod";

const proposalContentSchema = z.object({
  title: z.string(),
  description: z.string(),
  teamInfo: z.string(),
  budget: z.number(),
  externalLinks: z.array(z.string()),
  submittedAt: z.string(),
});

const evaluationDimensionSchema = z.object({
  dimension: z.string(),
  output: z.object({
    score: z.number(),
    justification: z.string(),
    recommendation: z.string(),
    keyFindings: z.array(z.string()),
  }),
});

const evaluationDataSchema = z.object({
  dimensions: z.array(evaluationDimensionSchema),
  aggregate: z.object({
    weightedScore: z.number(),
    completedDimensions: z.number(),
  }),
});

const proposalApiResponseSchema = z.object({
  tokenId: z.string(),
  owner: z.string(),
  ipfsCID: z.string(),
  status: z.string(),
  feedbackCount: z.number(),
  averageScore: z.number(),
  content: proposalContentSchema,
});

export type ProposalApiResponse = z.infer<typeof proposalApiResponseSchema>;
export type EvaluationData = z.infer<typeof evaluationDataSchema>;

export function parseProposalResponse(data: unknown): ProposalApiResponse | null {
  const result = proposalApiResponseSchema.safeParse(data);
  return result.success ? result.data : null;
}

export function parseEvaluationData(data: unknown): EvaluationData | null {
  const result = evaluationDataSchema.safeParse(data);
  return result.success ? result.data : null;
}

export function buildProposalContext(
  proposal: ProposalApiResponse,
  evaluation: EvaluationData | null,
): string {
  const sections: string[] = [];

  sections.push(`## Proposal: ${proposal.content.title}`);
  sections.push(`Token ID: ${proposal.tokenId}`);
  sections.push(`Status: ${proposal.status}`);
  sections.push(`Budget: $${proposal.content.budget.toLocaleString()}`);
  sections.push(`\n### Description\n${proposal.content.description}`);
  sections.push(`\n### Team Information\n${proposal.content.teamInfo}`);

  if (proposal.content.externalLinks.length > 0) {
    sections.push(
      `\n### External Links\n${proposal.content.externalLinks.join("\n")}`,
    );
  }

  if (evaluation) {
    sections.push(`\n## Evaluation Results`);
    sections.push(
      `Overall Weighted Score: ${evaluation.aggregate.weightedScore}/100`,
    );
    sections.push(
      `Dimensions Evaluated: ${evaluation.aggregate.completedDimensions}/4`,
    );

    for (const dim of evaluation.dimensions) {
      sections.push(`\n### ${dim.dimension} — Score: ${dim.output.score}/100`);
      sections.push(`Recommendation: ${dim.output.recommendation}`);
      sections.push(`Justification: ${dim.output.justification}`);
      sections.push(
        `Key Findings:\n${dim.output.keyFindings.map((f, i) => `${i + 1}. ${f}`).join("\n")}`,
      );
    }
  } else {
    sections.push(
      `\n## Evaluation Results\nNo evaluation has been completed yet for this proposal.`,
    );
  }

  return sections.join("\n");
}
