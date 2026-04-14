---
phase: 02
slug: on-chain-proposal-submission
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-14
---

# Phase 02 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Foundry (forge test) + Anchor (anchor test) |
| **Config file** | `contracts/foundry.toml`, `Anchor.toml` |
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
| 02-01-01 | 01 | 1 | PROP-01 | — | Proposal fields stored correctly | unit | `forge test --match-test testSubmitProposal` | W0 | ⬜ pending |
| 02-01-02 | 01 | 1 | PROP-02 | — | IPFS CID stored and verified | unit | `forge test --match-test testContentHash` | W0 | ⬜ pending |
| 02-01-03 | 01 | 1 | PROP-04 | — | Event emitted on submission | unit | `forge test --match-test testProposalSubmittedEvent` | W0 | ⬜ pending |
| 02-01-04 | 01 | 1 | PROP-05 | — | Proposal ID queryable | unit | `forge test --match-test testGetProposal` | W0 | ⬜ pending |
| 02-02-01 | 02 | 1 | PROP-03 | — | Anchor program submits proposal | integration | `anchor test` | W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `contracts/test/unit/ProposalRegistry.t.sol` — unit test stubs for PROP-01 through PROP-05 (created by Plan 01 TDD RED phase)
- [ ] `contracts/test/fuzz/ProposalRegistry.fuzz.t.sol` — fuzz test stubs (created by Plan 03 Task 1)
- [ ] `tests/anchor/grant-evaluator.ts` — Anchor integration test stubs for Solana proposal submission (created by Plan 02)

*Existing Foundry test infrastructure covers framework setup.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| IPFS upload & retrieval | PROP-02 | Requires live IPFS node | Upload test content to IPFS, verify CID matches on-chain hash |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
