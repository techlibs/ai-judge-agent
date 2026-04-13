import type { z } from "zod";
import type {
  colosseumResearchResponseSchema,
  similarProjectSchema,
  gapClassificationSchema,
  marketValidationReportSchema,
} from "./schemas";

export type ColosseumResearchResponse = z.infer<
  typeof colosseumResearchResponseSchema
>;

export type SimilarProject = z.infer<typeof similarProjectSchema>;

export type GapClassification = z.infer<typeof gapClassificationSchema>;

export type MarketValidationReport = z.infer<
  typeof marketValidationReportSchema
>;

export type ResearchFailureReason =
  | "missing_config"
  | "api_timeout"
  | "api_error"
  | "invalid_response"
  | "rate_limited";

export type ResearchResult =
  | { status: "success"; data: ColosseumResearchResponse }
  | { status: "skipped"; reason: ResearchFailureReason; message: string };
