import { pinJsonToIpfs } from "@/ipfs/pin";
import { AgentRegistrationSchema } from "@/ipfs/schemas";
import type { AgentRegistration } from "@/ipfs/schemas";

const IDENTITY_REGISTRY_ADDRESS =
  process.env.NEXT_PUBLIC_IDENTITY_REGISTRY_ADDRESS ?? "";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://ipe.city";

const AGENT_DEFINITIONS: ReadonlyArray<{
  readonly name: string;
  readonly description: string;
  readonly service: string;
  readonly agentId: number;
}> = [
  {
    name: "ARWF Technical Feasibility Judge",
    description:
      "Evaluates grant proposals on technical feasibility: architecture soundness, technology choices, implementation timeline realism, and technical risk assessment. Weight: 25%.",
    service: "technical-feasibility-evaluation",
    agentId: 0,
  },
  {
    name: "ARWF Impact Potential Judge",
    description:
      "Evaluates grant proposals on impact potential: problem significance, target audience reach, measurable outcomes, and ecosystem contribution. Weight: 30%.",
    service: "impact-potential-evaluation",
    agentId: 1,
  },
  {
    name: "ARWF Cost Efficiency Judge",
    description:
      "Evaluates grant proposals on cost efficiency: budget reasonableness, resource allocation, cost-benefit ratio, and financial planning. Weight: 20%.",
    service: "cost-efficiency-evaluation",
    agentId: 2,
  },
  {
    name: "ARWF Team Capability Judge",
    description:
      "Evaluates grant proposals on team capability: relevant experience, skill coverage, track record, and team composition. Weight: 25%.",
    service: "team-capability-evaluation",
    agentId: 3,
  },
  {
    name: "ARWF Monitor Agent",
    description:
      "Continuously monitors funded projects by tracking GitHub activity, on-chain transactions, and social engagement. Produces risk flags and updated scores for fund release adjustments.",
    service: "project-monitoring",
    agentId: 4,
  },
];

interface RegistrationResult {
  readonly name: string;
  readonly cid: string;
  readonly agentId: number;
}

export async function pinAllAgentRegistrations(): Promise<
  ReadonlyArray<RegistrationResult>
> {
  const results: RegistrationResult[] = [];

  for (const agent of AGENT_DEFINITIONS) {
    const registration: AgentRegistration = {
      type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
      name: agent.name,
      description: agent.description,
      image: `${APP_URL}/agents/${agent.service}.png`,
      services: [
        {
          name: agent.service,
          endpoint: `${APP_URL}/api/webhooks/proposals`,
          version: "1.0.0",
        },
      ],
      x402Support: false,
      active: true,
      registrations: [
        {
          agentId: agent.agentId,
          agentRegistry: IDENTITY_REGISTRY_ADDRESS,
        },
      ],
    };

    const cid = await pinJsonToIpfs(AgentRegistrationSchema, registration);

    results.push({
      name: agent.name,
      cid,
      agentId: agent.agentId,
    });
  }

  return results;
}
