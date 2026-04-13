import { type Hex, keccak256, toHex } from "viem";
import { prepareGiveFeedback } from "@/chain/reputation-registry";
import { pinJsonToIpfs } from "@/ipfs/pin";
import { AgentFeedbackSchema } from "@/ipfs/schemas";

const VALUE_DECIMALS = 2;

interface PostFeedbackParams {
  readonly agentId: bigint;
  readonly clientAddress: string;
  readonly proposalId: string;
  readonly evaluationContentCid: string;
  readonly dimension: string;
  readonly fundingRoundId: string;
  readonly score: number;
}

interface PostFeedbackResult {
  readonly feedbackCid: string;
  readonly encodedTransaction: Hex;
}

export async function postEvaluationFeedback(
  params: PostFeedbackParams
): Promise<PostFeedbackResult> {
  const scaledValue = Math.round(params.score * 10 ** VALUE_DECIMALS);

  const feedbackContent = {
    agentRegistry: process.env.NEXT_PUBLIC_IDENTITY_REGISTRY_ADDRESS ?? "",
    agentId: Number(params.agentId),
    clientAddress: params.clientAddress,
    createdAt: new Date().toISOString(),
    value: scaledValue,
    valueDecimals: VALUE_DECIMALS,
    tag1: params.dimension,
    tag2: params.fundingRoundId,
    endpoint: "/api/webhooks/proposals",
    proposalId: params.proposalId,
    evaluationContentCid: params.evaluationContentCid,
    feedbackReason: `Evaluation score for ${params.dimension}: ${params.score}/10`,
  };

  const feedbackCid = await pinJsonToIpfs(
    AgentFeedbackSchema,
    feedbackContent
  );

  const feedbackHash = keccak256(toHex(feedbackCid));

  const encodedTransaction = prepareGiveFeedback(
    params.agentId,
    BigInt(scaledValue),
    params.dimension,
    params.fundingRoundId,
    feedbackCid,
    feedbackHash
  );

  return {
    feedbackCid,
    encodedTransaction,
  };
}
