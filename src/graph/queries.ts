import { gql } from "graphql-request";
import { getGraphClient } from "./client";

const EVALUATIONS_QUERY = gql`
  query GetEvaluations($first: Int!, $skip: Int!, $orderBy: String, $orderDirection: String) {
    evaluations(first: $first, skip: $skip, orderBy: $orderBy, orderDirection: $orderDirection) {
      id
      fundingRoundId
      finalScore
      adjustedScore
      proposalContentCid
      evaluationContentCid
      timestamp
      fundRelease {
        id
        projectId
        milestoneIndex
        amount
        releasePercentage
        timestamp
      }
    }
  }
`;

const EVALUATION_BY_ID_QUERY = gql`
  query GetEvaluation($id: Bytes!) {
    evaluation(id: $id) {
      id
      fundingRoundId
      finalScore
      adjustedScore
      proposalContentCid
      evaluationContentCid
      timestamp
      fundRelease {
        id
        projectId
        milestoneIndex
        amount
        releasePercentage
        timestamp
      }
      disputes {
        id
        initiator
        stakeAmount
        evidenceCid
        status
        newScore
        deadline
      }
    }
  }
`;

const AGENTS_QUERY = gql`
  query GetAgents($first: Int!, $skip: Int!) {
    agents(first: $first, skip: $skip) {
      id
      owner
      agentURI
      registeredAt
      metadata {
        metadataKey
        metadataValue
      }
      feedback {
        id
        value
        valueDecimals
        tag1
        tag2
        isRevoked
        timestamp
      }
    }
  }
`;

const FUND_RELEASES_QUERY = gql`
  query GetFundReleases($first: Int!, $skip: Int!) {
    fundReleases(first: $first, skip: $skip) {
      id
      projectId
      milestoneIndex
      amount
      releasePercentage
      evaluation {
        id
      }
      timestamp
    }
  }
`;

interface GraphEvaluation {
  readonly id: string;
  readonly fundingRoundId: string;
  readonly finalScore: number;
  readonly adjustedScore: number;
  readonly proposalContentCid: string;
  readonly evaluationContentCid: string;
  readonly timestamp: string;
  readonly fundRelease: GraphFundRelease | null;
}

interface GraphFundRelease {
  readonly id: string;
  readonly projectId: string;
  readonly milestoneIndex: number;
  readonly amount: string;
  readonly releasePercentage: number;
  readonly timestamp: string;
}

interface GraphAgent {
  readonly id: string;
  readonly owner: string;
  readonly agentURI: string;
  readonly registeredAt: string;
  readonly metadata: ReadonlyArray<{
    readonly metadataKey: string;
    readonly metadataValue: string;
  }>;
  readonly feedback: ReadonlyArray<{
    readonly id: string;
    readonly value: string;
    readonly valueDecimals: number;
    readonly tag1: string;
    readonly tag2: string;
    readonly isRevoked: boolean;
    readonly timestamp: string;
  }>;
}

export async function fetchEvaluations(
  first: number,
  skip: number
): Promise<ReadonlyArray<GraphEvaluation>> {
  const client = getGraphClient();
  const data = await client.request<{
    evaluations: ReadonlyArray<GraphEvaluation>;
  }>(EVALUATIONS_QUERY, {
    first,
    skip,
    orderBy: "timestamp",
    orderDirection: "desc",
  });
  return data.evaluations;
}

export async function fetchEvaluationById(
  id: string
): Promise<GraphEvaluation | null> {
  const client = getGraphClient();
  const data = await client.request<{
    evaluation: GraphEvaluation | null;
  }>(EVALUATION_BY_ID_QUERY, { id });
  return data.evaluation;
}

export async function fetchAgents(
  first: number,
  skip: number
): Promise<ReadonlyArray<GraphAgent>> {
  const client = getGraphClient();
  const data = await client.request<{
    agents: ReadonlyArray<GraphAgent>;
  }>(AGENTS_QUERY, { first, skip });
  return data.agents;
}

export async function fetchFundReleases(
  first: number,
  skip: number
): Promise<ReadonlyArray<GraphFundRelease>> {
  const client = getGraphClient();
  const data = await client.request<{
    fundReleases: ReadonlyArray<GraphFundRelease>;
  }>(FUND_RELEASES_QUERY, { first, skip });
  return data.fundReleases;
}

export type { GraphEvaluation, GraphFundRelease, GraphAgent };
