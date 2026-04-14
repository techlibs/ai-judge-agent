import { Agent } from "@mastra/core/agent";
import { createTool } from "@mastra/core/tools";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { proposalSchema } from "@/lib/schemas/proposal";
import { FIELD_LIMITS } from "@/lib/constants/proposal";
import { extractGithubRepo } from "@/lib/agents/tools/extract-github";
import { extractVideoContext } from "@/lib/agents/tools/extract-video";

export const PROPOSAL_ASSISTANT_SYSTEM_PROMPT = `You are a friendly Proposal Assistant for IPE City Grants. Your job is to guide users through creating a grant proposal via natural conversation.

You need to collect the following information:
1. **Title** (${FIELD_LIMITS.TITLE_MIN}-${FIELD_LIMITS.TITLE_MAX} characters): A clear, descriptive project title
2. **Description** (${FIELD_LIMITS.DESCRIPTION_MIN}-${FIELD_LIMITS.DESCRIPTION_MAX} characters): Project goals, expected outcomes, and approach
3. **Team Information** (${FIELD_LIMITS.TEAM_INFO_MIN}-${FIELD_LIMITS.TEAM_INFO_MAX} characters): Who is on the team and their relevant experience
4. **Budget** (up to $${FIELD_LIMITS.BUDGET_MAX.toLocaleString()} USD): How much funding is requested
5. **External Links** (up to ${FIELD_LIMITS.EXTERNAL_LINKS_MAX} URLs, optional): GitHub repos, websites, documents

Guidelines:
- Start by greeting the user and asking about their project idea
- Ask about one or two fields at a time, not all at once
- Provide friendly guidance if inputs seem too short or vague
- When you have enough information for all required fields, use the validate_proposal tool to check the data
- If validation passes, let the user know their proposal is ready and use the submit_proposal tool
- If validation fails, explain what needs to be fixed conversationally
- Be encouraging and helpful, not bureaucratic
- You can help users refine their descriptions and team info
- External links are optional — do not pressure users to provide them

GitHub URL handling:
- Whenever the user shares a GitHub URL (e.g. https://github.com/owner/repo), immediately call the extractGithubRepo tool with that URL
- After extracting data, use the README content to draft a Description — summarize the project goals, approach, and technical details from the README
- Use the repo description and topics to help suggest a concise Title
- If the repo has contributor information or organization context, use that to draft Team Info
- Always tell the user what you extracted and ask them to confirm or adjust the drafted fields
- Add the GitHub URL to External Links automatically

VIDEO CONTEXT:
- Whenever the user shares a YouTube, Loom, or Vimeo URL, immediately call the extractVideoContext tool with that URL
- For YouTube videos with a transcript: summarize the transcript to draft a Description — focus on the project goals, approach, and technical details
- For all video platforms: use the title and author to help suggest a concise project Title
- If the video description (Vimeo) contains team or project info, use it to draft Team Info
- Always tell the user what you extracted from the video and ask them to confirm or adjust
- Add the video URL to External Links automatically`;

const partialProposalSchema = z.object({
  title: z.string().optional().describe("The proposal title"),
  description: z.string().optional().describe("The proposal description"),
  teamInfo: z.string().optional().describe("Team information"),
  budget: z.number().optional().describe("Budget in USD"),
  externalLinks: z.array(z.string()).optional().describe("External URLs"),
});

const validateProposalTool = createTool({
  id: "validate_proposal",
  description:
    "Validate partial or complete proposal data against the schema. Use this to check if the user has provided enough information for a valid proposal.",
  inputSchema: partialProposalSchema,
  outputSchema: z.object({
    valid: z.boolean(),
    errors: z.array(z.string()),
    missingFields: z.array(z.string()),
  }),
  execute: async (input) => {
    const missingFields: string[] = [];
    if (!input.title) missingFields.push("title");
    if (!input.description) missingFields.push("description");
    if (!input.teamInfo) missingFields.push("teamInfo");
    if (input.budget === undefined || input.budget === null)
      missingFields.push("budget");

    if (missingFields.length > 0) {
      return {
        valid: false,
        errors: missingFields.map(
          (field) => `Missing required field: ${field}`
        ),
        missingFields,
      };
    }

    const result = proposalSchema.safeParse({
      title: input.title,
      description: input.description,
      teamInfo: input.teamInfo,
      budget: input.budget,
      externalLinks: input.externalLinks ?? [],
    });

    if (result.success) {
      return { valid: true, errors: [], missingFields: [] };
    }

    const errors = result.error.issues.map(
      (issue) => `${issue.path.join(".")}: ${issue.message}`
    );
    return { valid: false, errors, missingFields: [] };
  },
});

const submitProposalTool = createTool({
  id: "submit_proposal",
  description:
    "Submit the finalized proposal. Only call this after validate_proposal returns valid: true.",
  inputSchema: z.object({
    title: z.string().describe("The proposal title"),
    description: z.string().describe("The proposal description"),
    teamInfo: z.string().describe("Team information"),
    budget: z.number().describe("Budget in USD"),
    externalLinks: z
      .array(z.string())
      .optional()
      .describe("External URLs"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    proposal: proposalSchema.optional(),
    error: z.string().optional(),
  }),
  execute: async (input) => {
    const data = {
      title: input.title,
      description: input.description,
      teamInfo: input.teamInfo,
      budget: input.budget,
      externalLinks: input.externalLinks ?? [],
    };

    const result = proposalSchema.safeParse(data);
    if (!result.success) {
      const errorMessages = result.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ");
      return { success: false, error: errorMessages };
    }

    return { success: true, proposal: result.data };
  },
});

export const proposalAssistant = new Agent({
  id: "proposal-assistant",
  name: "Proposal Assistant",
  instructions: PROPOSAL_ASSISTANT_SYSTEM_PROMPT,
  model: openai("gpt-4o"),
  tools: {
    validate_proposal: validateProposalTool,
    submit_proposal: submitProposalTool,
    extractGithubRepo,
    extractVideoContext,
  },
});

export const PROPOSAL_ASSISTANT_TOOLS = {
  validate_proposal: validateProposalTool,
  submit_proposal: submitProposalTool,
  extractGithubRepo,
  extractVideoContext,
};
