import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import type {
  InputProcessor,
  ProcessInputArgs,
  ProcessInputResult,
} from "@mastra/core/processors";
import {
  PROPOSAL_CATEGORIES,
  RESIDENCY_DURATIONS,
} from "@/lib/constants";

// ─── Injection Guard (matches judge agent pattern) ──────────────────

const INJECTION_PATTERNS = [
  /SYSTEM:/i,
  /INSTRUCTION:/i,
  /IGNORE\s+(ALL\s+)?PREVIOUS/i,
  /OVERRIDE/i,
  /\[INST\]/i,
  /<\/s>/,
  /YOU\s+ARE\s+NOW/i,
  /FORGET\s+(YOUR|ALL)/i,
];

export function detectInjectionPatterns(text: string): string[] {
  return INJECTION_PATTERNS
    .filter((pattern) => pattern.test(text))
    .map((pattern) => pattern.source);
}

const injectionGuard: InputProcessor = {
  id: "proposal-assistant-injection-guard",
  name: "Proposal Assistant Injection Guard",
  description:
    "Logs potential prompt injection attempts in proposal assistant messages",
  processInput({ messages }: ProcessInputArgs): ProcessInputResult {
    for (const message of messages) {
      if (message.role !== "user") continue;
      const text = Array.isArray(message.content)
        ? message.content
            .filter(
              (part): part is { type: "text"; text: string } =>
                "type" in part && part.type === "text",
            )
            .map((part) => part.text)
            .join(" ")
        : typeof message.content === "string"
          ? message.content
          : "";

      const detected = detectInjectionPatterns(text);
      if (detected.length > 0) {
        console.log(
          JSON.stringify({
            type: "injection_attempt",
            source: "proposal-assistant-input-processor",
            patterns: detected,
            timestamp: new Date().toISOString(),
            level: "SECURITY",
          }),
        );
      }
    }
    return messages;
  },
};

// ─── Proposal Data Schema ───────────────────────────────────────────

const TeamMemberSchema = z.object({
  name: z.string().min(1),
  role: z.string().min(1),
});

export const ProposalDataSchema = z.object({
  title: z.string().min(5),
  description: z.string().min(50),
  problemStatement: z.string().min(20),
  proposedSolution: z.string().min(20),
  teamMembers: z.array(TeamMemberSchema).min(1),
  budgetAmount: z.number().min(100).max(1000000),
  budgetBreakdown: z.string().min(20),
  timeline: z.string().min(10),
  category: z.enum(PROPOSAL_CATEGORIES),
  residencyDuration: z.enum(RESIDENCY_DURATIONS),
  demoDayDeliverable: z.string().min(10),
  communityContribution: z.string().min(10),
  priorIpeParticipation: z.boolean(),
  links: z.array(z.string().url()).optional(),
});

export type ProposalData = z.infer<typeof ProposalDataSchema>;

export const PartialProposalSchema = ProposalDataSchema.partial();
export type PartialProposal = z.infer<typeof PartialProposalSchema>;

// ─── Validation Tool Schema ─────────────────────────────────────────

const ValidateProposalInputSchema = z.object({
  proposal: z.record(z.string(), z.unknown()),
});

const SubmitProposalInputSchema = z.object({
  proposal: z.record(z.string(), z.unknown()),
});

// ─── System Prompt ──────────────────────────────────────────────────

const PROPOSAL_ASSISTANT_PROMPT = `You are the IPE City Grant Proposal Assistant — a friendly, expert guide that helps Architects (grant applicants) craft compelling proposals for IPE Village.

YOUR ROLE:
- Guide users through creating a grant proposal step by step
- Ask about each section conversationally, not like a form
- Validate inputs and provide helpful feedback
- When all required fields are collected, use the submitProposal tool

PROPOSAL FIELDS TO COLLECT:
1. **Title** — A concise project name (min 5 chars)
2. **Description** — What the project does (min 50 chars)
3. **Problem Statement** — The problem being solved (min 20 chars)
4. **Proposed Solution** — How you plan to solve it (min 20 chars)
5. **Team Members** — At least one member with name and role
6. **Budget Amount** — In USDC, between 100 and 1,000,000
7. **Budget Breakdown** — How funds will be allocated (min 20 chars)
8. **Timeline** — Project timeline (min 10 chars)
9. **Category** — One of: ${PROPOSAL_CATEGORIES.join(", ")}
10. **Residency Duration** — One of: ${RESIDENCY_DURATIONS.join(", ")}
11. **Demo Day Deliverable** — What you will show on demo day (min 10 chars)
12. **Community Contribution** — How you will give back (min 10 chars)
13. **Prior IPE Participation** — First time or returning Architect
14. **Links** — Optional external links (GitHub, docs, etc.)

CONVERSATION FLOW:
- Start by asking about the project idea (title + description + problem)
- Then dig into the solution and team
- Then funding details
- Then IPE Village specifics
- Use the validateProposal tool periodically to check progress
- When complete, present a summary and ask for confirmation
- On confirmation, use the submitProposal tool

STYLE:
- Be encouraging but honest about weak areas
- Suggest improvements when descriptions are too brief
- Keep responses concise — 2-3 sentences per turn
- Use the user's language style (formal/informal) to match their tone

IMPORTANT:
- Never fabricate proposal content — only use what the user provides
- If the user wants to skip the chat, suggest the classic form at the same page
- The proposal will be evaluated by 4 AI judges across Technical Feasibility, Impact Potential, Cost Efficiency, and Team Capability`;

// ─── Agent Definition ───────────────────────────────────────────────

export const proposalAssistantAgent = new Agent({
  id: "proposal-assistant",
  name: "Proposal Assistant",
  model: openai("gpt-4o"),
  instructions: PROPOSAL_ASSISTANT_PROMPT,
  inputProcessors: [injectionGuard],
  tools: {
    validateProposal: {
      description:
        "Validates a partial proposal and returns which fields are complete and which are missing or invalid",
      inputSchema: ValidateProposalInputSchema,
      execute: async (input: z.infer<typeof ValidateProposalInputSchema>) => {
        const result = ProposalDataSchema.safeParse(input.proposal);
        if (result.success) {
          return {
            valid: true,
            complete: true,
            missingFields: [],
            proposal: result.data,
          };
        }
        const missingFields = result.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        }));
        return {
          valid: false,
          complete: false,
          missingFields,
        };
      },
    },
    submitProposal: {
      description:
        "Submits a complete, validated proposal. Only call this when the user has confirmed they want to submit.",
      inputSchema: SubmitProposalInputSchema,
      execute: async (input: z.infer<typeof SubmitProposalInputSchema>) => {
        const result = ProposalDataSchema.safeParse(input.proposal);
        if (!result.success) {
          return {
            submitted: false,
            errors: result.error.issues.map((issue) => ({
              field: issue.path.join("."),
              message: issue.message,
            })),
          };
        }
        return {
          submitted: true,
          proposal: result.data,
        };
      },
    },
  },
});
