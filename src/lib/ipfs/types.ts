import { z } from "zod";

export const pinataResponseSchema = z.object({
  IpfsHash: z.string(),
  PinSize: z.number(),
  Timestamp: z.string(),
});

export type PinataResponse = z.infer<typeof pinataResponseSchema>;

export interface ProposalContent {
  title: string;
  description: string;
  teamInfo: string;
  budget: number;
  externalLinks: string[];
  submittedAt: string;
}
