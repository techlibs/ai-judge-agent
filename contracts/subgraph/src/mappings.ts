import { Bytes, BigInt } from "@graphprotocol/graph-ts";
import {
  EvaluationSubmitted as EvaluationSubmittedEvent,
} from "../../generated/EvaluationRegistry/EvaluationRegistry";
import {
  Registered as RegisteredEvent,
  URIUpdated as URIUpdatedEvent,
  MetadataSet as MetadataSetEvent,
} from "../../generated/IdentityRegistry/IdentityRegistry";
import {
  FundReleased as FundReleasedEvent,
  FundsForwarded as FundsForwardedEvent,
  BonusDistributed as BonusDistributedEvent,
} from "../../generated/MilestoneManager/MilestoneManager";
import {
  DisputeOpened as DisputeOpenedEvent,
  DisputeVoteCast as DisputeVoteCastEvent,
  DisputeResolved as DisputeResolvedEvent,
} from "../../generated/DisputeRegistry/DisputeRegistry";
import { Evaluation, Agent, AgentMetadata, FundRelease, Dispute, DisputeVote } from "../../generated/schema";

export function handleEvaluationSubmitted(
  event: EvaluationSubmittedEvent
): void {
  const id = event.params.proposalId;
  let evaluation = new Evaluation(id);

  evaluation.fundingRoundId = event.params.fundingRoundId;
  evaluation.finalScore = event.params.finalScore;
  evaluation.adjustedScore = event.params.adjustedScore;
  evaluation.proposalContentCid = event.params.proposalContentCid;
  evaluation.evaluationContentCid = event.params.evaluationContentCid;
  evaluation.timestamp = event.block.timestamp;

  evaluation.save();
}

export function handleRegistered(event: RegisteredEvent): void {
  const agentIdBytes = Bytes.fromByteArray(
    Bytes.fromBigInt(event.params.agentId)
  );
  let agent = new Agent(agentIdBytes);

  agent.owner = event.params.owner;
  agent.agentURI = event.params.agentURI;
  agent.registeredAt = event.block.timestamp;

  agent.save();
}

export function handleURIUpdated(event: URIUpdatedEvent): void {
  const agentIdBytes = Bytes.fromByteArray(
    Bytes.fromBigInt(event.params.agentId)
  );
  let agent = Agent.load(agentIdBytes);
  if (agent == null) {
    return;
  }

  agent.agentURI = event.params.newURI;
  agent.save();
}

export function handleMetadataSet(event: MetadataSetEvent): void {
  const agentIdBytes = Bytes.fromByteArray(
    Bytes.fromBigInt(event.params.agentId)
  );
  const metadataId = agentIdBytes.concat(
    Bytes.fromUTF8(event.params.metadataKey)
  );

  let metadata = AgentMetadata.load(metadataId);
  if (metadata == null) {
    metadata = new AgentMetadata(metadataId);
    metadata.agent = agentIdBytes;
    metadata.metadataKey = event.params.metadataKey;
  }

  metadata.metadataValue = event.params.metadataValue;
  metadata.updatedAt = event.block.timestamp;

  metadata.save();
}

export function handleFundReleased(event: FundReleasedEvent): void {
  const id = event.params.projectId.concat(
    Bytes.fromI32(event.params.milestoneIndex)
  );
  let release = new FundRelease(id);

  release.projectId = event.params.projectId;
  release.milestoneIndex = event.params.milestoneIndex;
  release.amount = event.params.amount;
  release.releasePercentage = event.params.releasePercentage;
  release.timestamp = event.block.timestamp;

  let evaluation = Evaluation.load(event.params.projectId);
  if (evaluation != null) {
    release.evaluation = evaluation.id;
  }

  release.save();
}

export function handleFundsForwarded(event: FundsForwardedEvent): void {
  // Logged for indexing — no separate entity needed
}

export function handleBonusDistributed(event: BonusDistributedEvent): void {
  // Logged for indexing — no separate entity needed
}

export function handleDisputeOpened(event: DisputeOpenedEvent): void {
  const id = Bytes.fromI32(event.params.disputeId.toI32());
  let dispute = new Dispute(id);

  let evaluation = Evaluation.load(event.params.proposalId);
  if (evaluation != null) {
    dispute.proposal = evaluation.id;
  }

  dispute.initiator = event.params.initiator;
  dispute.stakeAmount = event.params.stakeAmount;
  dispute.evidenceCid = event.params.evidenceCid;
  dispute.status = 0; // Open
  dispute.deadline = BigInt.fromI64(event.params.deadline);

  dispute.save();
}

export function handleDisputeVoteCast(event: DisputeVoteCastEvent): void {
  const disputeId = Bytes.fromI32(event.params.disputeId.toI32());
  const voteId = disputeId.concat(event.params.validator);

  let vote = new DisputeVote(voteId);
  vote.dispute = disputeId;
  vote.validator = event.params.validator;
  vote.stakeAmount = event.params.stakeAmount;
  vote.voteUphold = event.params.voteUphold;
  vote.timestamp = event.block.timestamp;

  vote.save();
}

export function handleDisputeResolved(event: DisputeResolvedEvent): void {
  const id = Bytes.fromI32(event.params.disputeId.toI32());
  let dispute = Dispute.load(id);
  if (dispute == null) {
    return;
  }

  dispute.status = event.params.status;
  if (event.params.status == 2) {
    // Overturned
    dispute.newScore = event.params.newScore;
  }

  dispute.save();
}
