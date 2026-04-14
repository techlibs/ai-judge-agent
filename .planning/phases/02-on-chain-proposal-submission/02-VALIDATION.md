---
phase: 02
slug: on-chain-proposal-submission
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-14
---

# Phase 02 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Foundry (forge test) + Anchor (anchor test) |
| **Config file** | `contracts/foundry.toml`, `programs/grant-evaluator/Anchor.toml` |
| **Quick run command** | `cd contracts && forge test --match-contract ProposalRegistry` |
| **Full suite command** | `make test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd contracts && forge test --match-contract ProposalRegistry`
- **After every plan wave:** Run `make test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | PROP-01 | — | Proposal fields stored correctly | unit | `forge test --match-test testSubmitProposal` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 1 | PROP-02 | — | IPFS CID stored and verified | unit | `forge test --match-test testContentHash` | ❌ W0 | ⬜ pending |
| 02-01-03 | 01 | 1 | PROP-04 | — | Event emitted on submission | unit | `forge test --match-test testProposalSubmittedEvent` | ❌ W0 | ⬜ pending |
| 02-01-04 | 01 | 1 | PROP-05 | — | Proposal ID queryable | unit | `forge test --match-test testGetProposal` | ❌ W0 | ⬜ pending |
| 02-02-01 | 02 | 1 | PROP-03 | — | Anchor program submits proposal | integration | `anchor test` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `contracts/test/ProposalRegistry.t.sol` — test stubs for PROP-01 through PROP-05
- [ ] Anchor test files for Solana proposal submission

*Existing Foundry test infrastructure covers framework setup.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| IPFS upload & retrieval | PROP-02 | Requires live IPFS node | Upload test content to IPFS, verify CID matches on-chain hash |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
