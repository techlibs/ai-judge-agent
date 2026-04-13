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
import {
  NewFeedback as NewFeedbackEvent,
  FeedbackRevoked as FeedbackRevokedEvent,
  FeedbackResponseAppended as FeedbackResponseAppendedEvent,
} from "../../generated/ReputationRegistry/ReputationRegistry";
import {
  ValidationRequested as ValidationRequestedEvent,
  ValidationResponded as ValidationRespondedEvent,
} from "../../generated/ValidationRegistry/ValidationRegistry";
import {
  Evaluation, Agent, AgentMetadata, FundRelease,
  Dispute, DisputeVote,
  AgentFeedback, FeedbackResponse, Validation,
} from "../../generated/schema";

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

export function handleNewFeedback(event: NewFeedbackEvent): void {
  const agentIdBytes = Bytes.fromByteArray(
    Bytes.fromBigInt(event.params.agentId)
  );
  const feedbackId = agentIdBytes.concat(
    Bytes.fromBigInt(event.params.feedbackIndex)
  );

  let feedback = new AgentFeedback(feedbackId);
  feedback.agent = agentIdBytes;
  feedback.clientAddress = event.params.clientAddress;
  feedback.feedbackIndex = event.params.feedbackIndex;
  feedback.value = event.params.value;
  feedback.valueDecimals = 2;
  feedback.tag1 = event.params.tag1;
  feedback.tag2 = event.params.tag2;
  feedback.feedbackURI = event.params.feedbackURI;
  feedback.feedbackHash = event.params.feedbackHash;
  feedback.isRevoked = false;
  feedback.timestamp = event.block.timestamp;

  feedback.save();
}

export function handleFeedbackRevoked(event: FeedbackRevokedEvent): void {
  const agentIdBytes = Bytes.fromByteArray(
    Bytes.fromBigInt(event.params.agentId)
  );
  const feedbackId = agentIdBytes.concat(
    Bytes.fromBigInt(event.params.feedbackIndex)
  );

  let feedback = AgentFeedback.load(feedbackId);
  if (feedback == null) {
    return;
  }

  feedback.isRevoked = true;
  feedback.save();
}

export function handleFeedbackResponseAppended(
  event: FeedbackResponseAppendedEvent
): void {
  const agentIdBytes = Bytes.fromByteArray(
    Bytes.fromBigInt(event.params.agentId)
  );
  const feedbackId = agentIdBytes.concat(
    Bytes.fromBigInt(event.params.feedbackIndex)
  );
  const responseId = feedbackId.concat(event.params.responder);

  let response = new FeedbackResponse(responseId);
  response.feedback = feedbackId;
  response.responder = event.params.responder;
  response.responseURI = event.params.responseURI;
  response.responseHash = event.params.responseHash;
  response.timestamp = event.block.timestamp;

  response.save();
}

export function handleValidationRequested(
  event: ValidationRequestedEvent
): void {
  const id = Bytes.fromBigInt(event.params.requestId);

  let validation = new Validation(id);
  const agentIdBytes = Bytes.fromByteArray(
    Bytes.fromBigInt(event.params.agentId)
  );
  validation.agent = agentIdBytes;
  validation.validatorAddress = event.params.requester;
  validation.requestURI = event.params.requestURI;
  validation.lastUpdate = event.block.timestamp;

  validation.save();
}

export function handleValidationResponded(
  event: ValidationRespondedEvent
): void {
  const id = Bytes.fromBigInt(event.params.requestId);

  let validation = Validation.load(id);
  if (validation == null) {
    return;
  }

  validation.response = event.params.score;
  validation.responseURI = event.params.responseURI;
  validation.responseHash = event.params.responseHash;
  validation.tag = event.params.tag;
  validation.lastUpdate = event.block.timestamp;

  validation.save();
}
