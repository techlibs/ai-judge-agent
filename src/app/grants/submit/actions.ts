"use server";

import { headers } from "next/headers";
import { proposalFormSchema } from "./schema";
import type { ProposalFormErrors } from "./schema";
import { runEvaluationWorkflow } from "@/lib/evaluation/workflow";
import { checkProposalSubmitLimit } from "@/lib/rate-limit";

export interface ActionState {
  success: boolean;
  proposalId?: string;
  detailUrl?: string;
  errors?: ProposalFormErrors;
}

function parseJsonField(raw: FormDataEntryValue | null): unknown {
  if (typeof raw !== "string" || raw.length === 0) {
    return [];
  }
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return [];
  }
}

export async function submitProposal(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const rawData = {
    title: formData.get("title"),
    description: formData.get("description"),
    problemStatement: formData.get("problemStatement"),
    proposedSolution: formData.get("proposedSolution"),
    teamMembers: parseJsonField(formData.get("teamMembers")),
    budgetAmount: parseFloat(String(formData.get("budgetAmount") ?? "")),
    budgetBreakdown: formData.get("budgetBreakdown"),
    timeline: formData.get("timeline"),
    category: formData.get("category"),
    residencyDuration: formData.get("residencyDuration"),
    demoDayDeliverable: formData.get("demoDayDeliverable"),
    communityContribution: formData.get("communityContribution"),
    priorIpeParticipation: formData.get("priorIpeParticipation") === "true",
    links: parseJsonField(formData.get("links")),
  };

  const parsed = proposalFormSchema.safeParse(rawData);

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    const errors: ProposalFormErrors = {};

    for (const [key, value] of Object.entries(fieldErrors)) {
      if (value && value.length > 0) {
        const typedKey = key as keyof ProposalFormErrors;
        errors[typedKey] = value;
      }
    }

    return { success: false, errors };
  }

  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for") ?? "unknown";
  const rateLimitResult = checkProposalSubmitLimit(ip);

  if (!rateLimitResult.success) {
    return {
      success: false,
      errors: {
        server: [
          `Rate limit exceeded. Please try again in ${rateLimitResult.retryAfter} seconds.`,
        ],
      },
    };
  }

  try {
    const proposalId = crypto.randomUUID();

    const result = await runEvaluationWorkflow({
      id: proposalId,
      ...parsed.data,
    });

    return {
      success: true,
      proposalId: result.proposalId,
      detailUrl: `/grants/${result.proposalId}`,
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "An unexpected error occurred. Please try again.";

    return {
      success: false,
      errors: {
        server: [message],
      },
    };
  }
}
