import { z } from "zod";

export const proposalContentSchema = z.object({
  title: z.string(),
  description: z.string(),
  teamInfo: z.string(),
  budget: z.number(),
  externalLinks: z.array(z.string()),
  submittedAt: z.string(),
});

export type ProposalContentParsed = z.infer<typeof proposalContentSchema>;
