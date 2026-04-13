import { Bytes, BigInt } from "@graphprotocol/graph-ts";
import {
  EvaluationSubmitted as EvaluationSubmittedEvent,
} from "../../generated/EvaluationRegistry/EvaluationRegistry";
import {
  Registered as RegisteredEvent,
  URIUpdated as URIUpdatedEvent,
  MetadataSet as MetadataSetEvent,
} from "../../generated/IdentityRegistry/IdentityRegistry";
import { Evaluation, Agent, AgentMetadata } from "../../generated/schema";

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
