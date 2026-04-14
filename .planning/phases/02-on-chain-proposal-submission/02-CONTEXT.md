# Phase 2: On-Chain Proposal Submission - Context

**Gathered:** 2026-04-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver smart contracts on both Solana (Anchor) and Ethereum (Solidity) that allow proposers to submit grant proposals (text + code repo URL + demo URL), anchor content hashes on-chain, store full content on IPFS, and emit events that trigger the evaluation pipeline. Proposers get a unique proposal ID and can query evaluation status on-chain.

</domain>

<decisions>
## Implementation Decisions

### Proposal Data Model
- **D-01:** Minimal on-chain storage — only store proposalId, submitter address, content hash (IPFS CID), status enum, and timestamps in contract storage. Full proposal text, repo URL, demo URL, and metadata are stored on IPFS.
- **D-02:** The ProposalSchema in packages/common already defines the canonical fields (title, summary, content, domain, requestedAmount, status). Smart contracts should align with this schema — on-chain structs mirror the fields that need on-chain queryability (status, submitter, timestamps, content hash).

### Content Storage Strategy
- **D-03:** Primary storage on IPFS — proposal content is uploaded to IPFS before submission, and the CID is passed to the smart contract. The contract stores only the content hash for verification.
- **D-04:** TextStorage.sol library (already built) is used for emitting proposal text as chunked events for on-chain indexability and backup. This provides a second verification path — events can reconstruct the full text.
- **D-05:** IPFS pinning is the submitter's responsibility initially. The contract does not manage pinning services. Future phases may add incentivized pinning.

### Evaluation Trigger Mechanism
- **D-06:** Async evaluation pattern — submitting a proposal emits a ProposalSubmitted event on-chain. An off-chain indexer/listener monitors these events and triggers the AI evaluation pipeline. This follows the architecture note in CLAUDE.md: "proposal submitted on-chain → event triggers off-chain EZKL proof generation → proof + score submitted on-chain in a separate transaction."
- **D-07:** The smart contracts do NOT attempt to invoke evaluation inline — evaluation is always a separate transaction initiated by the evaluator agent after off-chain processing completes.

### Access Control & Lifecycle
- **D-08:** Open submission — any wallet address can submit a proposal. No staking, bonding, or fee required at this phase.
- **D-09:** Immutable proposals — once submitted, proposals cannot be edited or withdrawn. This ensures the content hash the evaluator scored matches what was submitted. Immutability is fundamental to trustless verification.
- **D-10:** Linear status progression: Submitted → UnderReview → Evaluated. Only the evaluator agent (authorized address) can transition status. Submitters can only read status.

### Claude's Discretion
- Contract event structure and naming conventions
- Solana account sizing and rent calculations
- Error handling patterns for both chains
- Test structure within each chain's framework

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Contracts
- `contracts/src/GrantEvaluator.sol` — Placeholder Solidity contract to be expanded with proposal submission logic
- `contracts/src/periphery/TextStorage.sol` — Gas-optimized chunked text emission library (reuse for proposal content events)
- `programs/grant-evaluator/src/lib.rs` — Placeholder Anchor program to be expanded with proposal submission instructions

### Shared Types
- `packages/common/src/proposal.ts` — ProposalSchema, ProposalStatus, ProposalDomain, ProposalClassification — canonical type definitions that smart contracts must align with
- `packages/common/src/scores.ts` — Scoring types (relevant for understanding eventual score storage)

### Project Specs
- `.planning/REQUIREMENTS.md` §Proposal Submission — PROP-01 through PROP-05 requirements
- `.planning/ROADMAP.md` §Phase 2 — Success criteria and dependencies

No external specs — requirements fully captured in decisions above and REQUIREMENTS.md.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `TextStorage.sol`: Chunked text emission with hash verification — directly usable for proposal content event logging
- `packages/common/src/proposal.ts`: ProposalSchema with all proposal fields, statuses, and domains — use as canonical reference for smart contract struct design

### Established Patterns
- Foundry project structure: `contracts/src/` for contracts, `contracts/test/` for tests, `contracts/script/` for deployment
- Anchor project structure: `programs/grant-evaluator/src/lib.rs` with standard Anchor patterns
- Solidity version: 0.8.28 (per foundry.toml and existing contracts)

### Integration Points
- GrantEvaluator.sol: Expand placeholder with proposal submission, storage, and status query functions
- grant_evaluator/lib.rs: Expand placeholder with submit_proposal instruction and account structures
- Both contracts must emit events compatible with off-chain indexer consumption

</code_context>

<specifics>
## Specific Ideas

- Proposal ID generation: deterministic via keccak256(submitter, title, timestamp) as defined in ProposalSchema
- The ProposalDomain enum (DeFi, Governance, Education, Health, Infrastructure, Other) should be mirrored in smart contracts
- ProposalStatus enum (Submitted, UnderReview, Evaluated, Disputed) should be mirrored in smart contracts
- The async evaluation pattern is explicitly documented in CLAUDE.md stack patterns — follow it exactly

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-on-chain-proposal-submission*
*Context gathered: 2026-04-14*
