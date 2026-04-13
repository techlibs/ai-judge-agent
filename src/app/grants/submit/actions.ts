"use server";

import { headers } from "next/headers";
import { proposalFormSchema } from "./schema";
import type { ProposalFormErrors } from "./schema";
import { getProposalSubmitLimiter, checkRateLimit } from "@/lib/rate-limit";
import { orchestrateEvaluation } from "@/evaluation/orchestrate";

export interface ActionState {
  success: boolean;
  proposalId?: string;
  detailUrl?: string;
  errors?: ProposalFormErrors;
}

function parseTeamMembers(raw: FormDataEntryValue | null): unknown {
  if (typeof raw !== "string" || raw.length === 0) {
    return [];
  }
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return [];
  }
}

function parseBudgetBreakdown(raw: FormDataEntryValue | null): unknown {
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
    category: formData.get("category"),
    budgetAmount: parseFloat(String(formData.get("budgetAmount") ?? "")),
    budgetCurrency: formData.get("budgetCurrency"),
    technicalDescription: formData.get("technicalDescription"),
    teamMembers: parseTeamMembers(formData.get("teamMembers")),
    budgetBreakdown: parseBudgetBreakdown(formData.get("budgetBreakdown")),
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

  const limiter = getProposalSubmitLimiter();
  const rateLimitResult = await checkRateLimit(limiter, ip);

  if (!rateLimitResult.success) {
    return {
      success: false,
      errors: {
        server: [`Rate limit exceeded. Please try again in ${rateLimitResult.retryAfter} seconds.`],
      },
    };
  }

  try {
    const externalId = crypto.randomUUID();
    const result = await orchestrateEvaluation({
      externalId,
      fundingRoundId: "open-submissions",
      title: parsed.data.title,
      description: parsed.data.description,
      budgetAmount: parsed.data.budgetAmount,
      budgetCurrency: parsed.data.budgetCurrency,
      budgetBreakdown: parsed.data.budgetBreakdown,
      technicalDescription: parsed.data.technicalDescription,
      teamMembers: parsed.data.teamMembers,
      category: parsed.data.category,
      submittedAt: new Date().toISOString(),
      platformSource: "web-form",
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
