import { z } from "zod";
import { proposalContentSchema } from "./schemas";

export const pinataResponseSchema = z.object({
  IpfsHash: z.string(),
  PinSize: z.number(),
  Timestamp: z.string(),
});

export type PinataResponse = z.infer<typeof pinataResponseSchema>;

export type ProposalContent = z.infer<typeof proposalContentSchema>;
