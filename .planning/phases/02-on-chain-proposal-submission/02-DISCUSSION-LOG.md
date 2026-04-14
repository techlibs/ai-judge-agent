# Phase 2: On-Chain Proposal Submission - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-14
**Phase:** 02-on-chain-proposal-submission
**Areas discussed:** Proposal data model, Content storage strategy, Evaluation trigger mechanism, Access control & lifecycle
**Mode:** --auto (all decisions auto-selected from recommended defaults)

---

## Proposal Data Model

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal on-chain + IPFS | Store only ID, submitter, content hash, status, timestamps on-chain; full content on IPFS | ✓ |
| Full on-chain storage | Store all proposal data in contract storage | |
| Event-only storage | Store nothing in contract state, everything in events | |

**User's choice:** [auto] Minimal on-chain + IPFS (recommended default — gas-efficient, content-addressable)
**Notes:** Aligns with PROP-02 requirement for IPFS/Arweave content storage with on-chain hash anchoring.

---

## Content Storage Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| IPFS primary + TextStorage events | IPFS for retrieval, TextStorage event logs for on-chain verifiability | ✓ |
| IPFS only | IPFS storage with CID on-chain, no event backup | |
| Arweave | Permanent storage on Arweave instead of IPFS | |

**User's choice:** [auto] IPFS primary + TextStorage events (recommended default — dual verification path)
**Notes:** TextStorage.sol already built in Phase 1. Reuse it for backup/indexing.

---

## Evaluation Trigger Mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| Events + off-chain listener | Emit ProposalSubmitted event, off-chain indexer triggers evaluation | ✓ |
| On-chain callback | Contract calls evaluation inline during submission | |
| Manual trigger | Separate transaction to request evaluation after submission | |

**User's choice:** [auto] Events + off-chain listener (recommended default — async pattern from CLAUDE.md architecture notes)
**Notes:** Follows documented pattern: "proposal submitted on-chain → event triggers off-chain EZKL proof generation → proof + score submitted on-chain"

---

## Access Control & Lifecycle

| Option | Description | Selected |
|--------|-------------|----------|
| Open + immutable + linear status | Any wallet submits, no edits after submission, Submitted→UnderReview→Evaluated | ✓ |
| Gated + editable | Require stake/fee, allow edits before evaluation | |
| Open + withdrawable | Any wallet, can withdraw before evaluation starts | |

**User's choice:** [auto] Open + immutable + linear status (recommended default — immutability ensures trustless verification integrity)
**Notes:** Only evaluator agent can transition status. Submitters read-only after submission.

---

## Claude's Discretion

- Contract event structure and naming conventions
- Solana account sizing and rent calculations
- Error handling patterns for both chains
- Test structure within each chain's framework

## Deferred Ideas

None — discussion stayed within phase scope
