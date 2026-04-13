import { z } from "zod";
import { FIELD_LIMITS } from "@/lib/constants/proposal";

export const proposalSchema = z.object({
  title: z
    .string()
    .min(
      FIELD_LIMITS.TITLE_MIN,
      `Title must be at least ${FIELD_LIMITS.TITLE_MIN} characters`
    )
    .max(
      FIELD_LIMITS.TITLE_MAX,
      `Title must be at most ${FIELD_LIMITS.TITLE_MAX} characters`
    ),
  description: z
    .string()
    .min(
      FIELD_LIMITS.DESCRIPTION_MIN,
      `Description must be at least ${FIELD_LIMITS.DESCRIPTION_MIN} characters`
    )
    .max(
      FIELD_LIMITS.DESCRIPTION_MAX,
      `Description must be at most ${FIELD_LIMITS.DESCRIPTION_MAX} characters`
    ),
  teamInfo: z
    .string()
    .min(
      FIELD_LIMITS.TEAM_INFO_MIN,
      `Team info must be at least ${FIELD_LIMITS.TEAM_INFO_MIN} characters`
    )
    .max(
      FIELD_LIMITS.TEAM_INFO_MAX,
      `Team info must be at most ${FIELD_LIMITS.TEAM_INFO_MAX} characters`
    ),
  budget: z
    .number()
    .positive("Budget must be positive")
    .max(
      FIELD_LIMITS.BUDGET_MAX,
      `Budget must be at most $${FIELD_LIMITS.BUDGET_MAX.toLocaleString()}`
    ),
  externalLinks: z
    .array(z.string().url("Must be a valid URL"))
    .max(
      FIELD_LIMITS.EXTERNAL_LINKS_MAX,
      `Maximum ${FIELD_LIMITS.EXTERNAL_LINKS_MAX} links allowed`
    ),
});

export type ProposalInput = z.infer<typeof proposalSchema>;

export const submitErrorResponseSchema = z.object({
  error: z.string(),
});

export const submitSuccessResponseSchema = z.object({
  tokenId: z.string(),
  ipfsCID: z.string(),
  txHash: z.string(),
});
