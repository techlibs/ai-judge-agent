# Contract: On-Chain Event Schemas

**Feature**: 001-arwf-judge-system
**Type**: Solidity events emitted by smart contracts on Base L2
**Indexed by**: The Graph subgraph

## Access Control Events (All Contracts)

All contracts inheriting OpenZeppelin `AccessControl` emit these events:

```solidity
event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender);
event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender);
```

**Used by cache/subgraph to**: Track role assignments for audit purposes.

---

## EvaluationRegistry Events

### EvaluationSubmitted

Emitted when a proposal evaluation is finalized and recorded on-chain.

```solidity
event EvaluationSubmitted(
    bytes32 indexed proposalId,
    bytes32 indexed fundingRoundId,
    uint16 finalScore,          // 0-1000 (divide by 100 for 0-10.00)
    uint16 adjustedScore,       // finalScore * reputationMultiplier / 10000
    string proposalContentCid,  // IPFS CID of proposal content
    string evaluationContentCid // IPFS CID of evaluation justifications
);
```

**Note**: `proposalId` and `fundingRoundId` are `indexed` for efficient subgraph filtering.

**Subgraph entity**: `Evaluation`
**Used by cache to**: Create/update `proposals` and `dimension_scores` rows

## MilestoneManager Events

### FundReleased

Emitted when funds are released based on a score meeting the threshold.

```solidity
event FundReleased(
    bytes32 indexed projectId,
    uint8 milestoneIndex,
    uint256 amount,             // Wei
    uint16 releasePercentage    // 0-1000 (divide by 10 for 0-100.0%)
);
```

**Subgraph entity**: `FundRelease`
**Used by cache to**: Create `fund_releases` row, update proposal `status` to "funded"

### UnreleasedFundsWithdrawn

Emitted when admin withdraws unreleased funds from a completed milestone.

```solidity
event UnreleasedFundsWithdrawn(
    bytes32 indexed projectId,
    uint8 milestoneIndex,
    uint256 amount,
    address indexed recipient
);
```

### EmergencyWithdrawal

Emitted when admin performs emergency withdrawal of full contract balance.

```solidity
event EmergencyWithdrawal(
    address indexed recipient,
    uint256 amount
);
```

### FundsForwarded

Emitted when unreleased funds are forwarded to the MatchingPool.

```solidity
event FundsForwarded(
    bytes32 indexed projectId,
    uint256 amount,
    address matchingPool
);
```

### BonusDistributed

Emitted when the MatchingPool distributes bonuses to top performers.

```solidity
event BonusDistributed(
    bytes32 indexed projectId,
    uint256 amount,
    uint16 score                // Qualifying score (>= 900 = 9.0)
);
```

## IdentityRegistry Events (ERC-8004)

### Registered

Emitted when a new Judge Agent or Monitor Agent identity is registered.

```solidity
event Registered(
    uint256 indexed agentId,
    string agentURI,            // IPFS CID of agent registration JSON
    address indexed owner
);
```

**Subgraph entity**: `Agent`
**Used by cache to**: Create `agents` row, fetch agent registration JSON from IPFS to populate `name`, `description`

### URIUpdated

Emitted when an agent's registration URI changes (e.g., prompt version update).

```solidity
event URIUpdated(
    uint256 indexed agentId,
    string newURI,
    address indexed updatedBy
);
```

**Used by cache to**: Re-fetch agent registration JSON and update `agents` row

### MetadataSet

Emitted when on-chain metadata is set (e.g., `scoringDimension`, `promptVersion`).

```solidity
event MetadataSet(
    uint256 indexed agentId,
    string indexed indexedMetadataKey,
    string metadataKey,
    bytes metadataValue
);
```

**Used by cache to**: Update `agents.scoringDimension` or `agents.promptVersion`

## ReputationRegistry Events (ERC-8004)

### NewFeedback

Emitted when a community member or platform operator rates a judge agent's evaluation quality.

```solidity
event NewFeedback(
    uint256 indexed agentId,
    address indexed clientAddress,
    uint64 feedbackIndex,
    int128 value,
    uint8 valueDecimals,
    string indexed indexedTag1,  // scoring dimension
    string tag1,                // scoring dimension (full)
    string tag2,                // funding round
    string endpoint,
    string feedbackURI,         // IPFS CID of feedback details
    bytes32 feedbackHash        // KECCAK-256 of feedback content
);
```

**Subgraph entity**: `AgentFeedback`
**Used by cache to**: Create `agent_feedback` row, update `agents.feedbackCount` and `agents.feedbackSummaryValue`

**Note**: `endpoint`, `feedbackURI`, `feedbackHash` are emitted in the event only — not stored on-chain in contract state.

### FeedbackRevoked

```solidity
event FeedbackRevoked(
    uint256 indexed agentId,
    address indexed clientAddress,
    uint64 indexed feedbackIndex
);
```

**Used by cache to**: Set `agent_feedback.isRevoked = 1`, recompute `agents.feedbackSummaryValue`

### ResponseAppended

Emitted when an agent owner responds to feedback.

```solidity
event ResponseAppended(
    uint256 indexed agentId,
    address indexed clientAddress,
    uint64 feedbackIndex,
    address indexed responder,
    string responseURI,
    bytes32 responseHash
);
```

**Subgraph entity**: `FeedbackResponse`

## ValidationRegistry Events (ERC-8004)

### ValidationRequest

Emitted when a validation of a judge agent's capabilities is requested.

```solidity
event ValidationRequest(
    address indexed validatorAddress,
    uint256 indexed agentId,
    string requestURI,
    bytes32 indexed requestHash
);
```

**Subgraph entity**: `Validation`

### ValidationResponse

Emitted when a validator responds to a capability validation request.

```solidity
event ValidationResponse(
    address indexed validatorAddress,
    uint256 indexed agentId,
    bytes32 indexed requestHash,
    uint8 response,             // 0-100 (0=failed, 100=passed)
    string responseURI,
    bytes32 responseHash,
    string tag                  // capability being validated (e.g., "technical_feasibility_scoring")
);
```

**Used by cache to**: Update `agents.validationScore`
**Note**: Can be called multiple times for the same `requestHash` (progressive validation).

## DisputeRegistry Events

### DisputeOpened

```solidity
event DisputeOpened(
    uint256 indexed disputeId,
    bytes32 indexed proposalId,
    address initiator,
    uint256 stakeAmount,
    string evidenceCid,
    uint256 deadline
);
```

**Subgraph entity**: `Dispute`
**Used by cache to**: Create `disputes` row, update proposal `status` to "disputed"

### DisputeVoteCast

```solidity
event DisputeVoteCast(
    uint256 indexed disputeId,
    address indexed validator,
    uint256 stakeAmount,
    bool voteUphold             // true = uphold, false = overturn
);
```

**Subgraph entity**: `DisputeVote`
**Used by cache to**: Update `disputes.voteCount`, `upholdVotes`, `overturnVotes`

### DisputeResolved

```solidity
event DisputeResolved(
    uint256 indexed disputeId,
    uint8 status,               // 2=upheld, 3=overturned, 4=expired
    uint16 newScore             // Only meaningful if overturned
);
```

**Used by cache to**: Update `disputes.status` and `disputes.resolvedAt`, potentially update proposal `finalScore` if overturned

## The Graph Subgraph Schema

```graphql
# --- EvaluationRegistry ---

type Evaluation @entity {
  id: Bytes!                    # proposalId
  fundingRoundId: Bytes!
  finalScore: Int!
  adjustedScore: Int!
  proposalContentCid: String!
  evaluationContentCid: String!
  timestamp: BigInt!
  fundRelease: FundRelease
  disputes: [Dispute!]! @derivedFrom(field: "proposal")
}

# --- MilestoneManager ---

type FundRelease @entity {
  id: Bytes!                    # projectId + milestoneIndex
  projectId: Bytes!
  milestoneIndex: Int!
  amount: BigInt!
  releasePercentage: Int!
  evaluation: Evaluation!
  timestamp: BigInt!
}

# --- IdentityRegistry (ERC-8004) ---

type Agent @entity {
  id: Bytes!                    # agentId (uint256 as bytes)
  owner: Bytes!
  agentURI: String!
  metadata: [AgentMetadata!]! @derivedFrom(field: "agent")
  feedback: [AgentFeedback!]! @derivedFrom(field: "agent")
  validations: [Validation!]! @derivedFrom(field: "agent")
  registeredAt: BigInt!
}

type AgentMetadata @entity {
  id: Bytes!                    # agentId + metadataKey hash
  agent: Agent!
  metadataKey: String!
  metadataValue: Bytes!
  updatedAt: BigInt!
}

# --- ReputationRegistry (ERC-8004) ---

type AgentFeedback @entity {
  id: Bytes!                    # tx hash + log index
  agent: Agent!
  clientAddress: Bytes!
  feedbackIndex: BigInt!
  value: BigInt!                # int128 as BigInt
  valueDecimals: Int!
  tag1: String!                 # scoring dimension
  tag2: String!                 # funding round
  feedbackURI: String!          # IPFS CID of detailed feedback
  feedbackHash: Bytes!
  isRevoked: Boolean!
  responses: [FeedbackResponse!]! @derivedFrom(field: "feedback")
  timestamp: BigInt!
}

type FeedbackResponse @entity {
  id: Bytes!                    # tx hash + log index
  feedback: AgentFeedback!
  responder: Bytes!
  responseURI: String!
  responseHash: Bytes!
  timestamp: BigInt!
}

# --- ValidationRegistry (ERC-8004) ---

type Validation @entity {
  id: Bytes!                    # requestHash
  agent: Agent!
  validatorAddress: Bytes!
  requestURI: String!
  response: Int                 # 0-100, nullable until responded
  responseURI: String
  responseHash: Bytes
  tag: String                   # capability validated
  lastUpdate: BigInt!
}

# --- DisputeRegistry ---

type Dispute @entity {
  id: Bytes!                    # disputeId
  proposal: Evaluation!
  initiator: Bytes!
  stakeAmount: BigInt!
  evidenceCid: String!
  status: Int!
  newScore: Int
  deadline: BigInt!
  votes: [DisputeVote!]! @derivedFrom(field: "dispute")
}

type DisputeVote @entity {
  id: Bytes!                    # tx hash + log index
  dispute: Dispute!
  validator: Bytes!
  stakeAmount: BigInt!
  voteUphold: Boolean!
  timestamp: BigInt!
}
```
