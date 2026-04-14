---
phase: 02-on-chain-proposal-submission
plan: 01
subsystem: contracts
tags: [solidity, foundry, ipfs, proposal-registry, textstorage, tdd]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: Foundry project scaffold, forge-std, solc 0.8.28 config
provides:
  - ProposalRegistry.sol with IPFS CID-based proposal submission
  - TextStorage.sol library for chunked event emission
  - ProposalDomain enum aligned with packages/common types
  - 14 unit tests covering all PROP requirements
affects: [02-on-chain-proposal-submission, scoring-contracts, cross-chain-sync]

# Tech tracking
tech-stack:
  added: []
  patterns: [onlyOwner access control, deterministic proposalId via keccak256, IPFS CID minimal storage, linear status transitions, TextStorage library for event-based backup]

key-files:
  created:
    - contracts/src/core/ProposalRegistry.sol
    - contracts/src/periphery/TextStorage.sol
    - contracts/test/unit/ProposalRegistry.t.sol
  modified: []

key-decisions:
  - "Implemented Ownable pattern inline instead of importing OpenZeppelin (no OZ dependency in project)"
  - "TextStorage created as internal library with event-only emission (no state writes)"
  - "Status transitions are strictly linear: Submitted->UnderReview->Evaluated->Disputed"

patterns-established:
  - "Custom errors over require strings for gas efficiency"
  - "Deterministic ID generation: keccak256(sender, title, timestamp)"
  - "Existence check via submittedAt != 0 sentinel"
  - "TDD with Foundry: makeAddr, vm.prank, vm.expectEmit, vm.expectRevert"

requirements-completed: [PROP-01, PROP-02, PROP-04, PROP-05]

# Metrics
duration: 2min
completed: 2026-04-14
---

# Phase 2 Plan 1: ProposalRegistry with IPFS CID Model Summary

**ProposalRegistry.sol with IPFS CID-based minimal storage, ProposalDomain enum, TextStorage backup, and 14 passing Foundry unit tests**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-14T04:18:29Z
- **Completed:** 2026-04-14T04:20:52Z
- **Tasks:** 1 (TDD: RED + GREEN)
- **Files created:** 3

## Accomplishments
- ProposalRegistry.sol accepts IPFS CID (bytes32) instead of full text, with ProposalDomain enum matching TypeScript types
- TextStorage.sol library created for optional chunked event emission backup
- All 14 unit tests pass covering submission, events, access control, status transitions, and backup
- Full test suite (15 tests) passes with zero regressions

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: Failing tests for ProposalRegistry** - `1c79442` (test)
2. **Task 1 GREEN: Implement ProposalRegistry IPFS CID model** - `db974ea` (feat)

_TDD task with RED/GREEN commits_

## Files Created/Modified
- `contracts/src/core/ProposalRegistry.sol` - Proposal submission contract with IPFS CID model, status transitions, backup
- `contracts/src/periphery/TextStorage.sol` - Gas-optimized chunked text event emission library
- `contracts/test/unit/ProposalRegistry.t.sol` - 14 unit tests covering all PROP requirements

## Decisions Made
- Implemented Ownable pattern inline (no OpenZeppelin dependency available in project)
- Created TextStorage as internal library emitting events only (zero storage writes)
- Status transitions strictly linear per D-10: Submitted -> UnderReview -> Evaluated -> Disputed

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created prerequisite files that plan assumed existed**
- **Found during:** Task 1 (pre-implementation)
- **Issue:** Plan assumed ProposalRegistry.sol, TextStorage.sol, and GrantRouter.sol already existed from phase 1. Only placeholder GrantEvaluator.sol existed.
- **Fix:** Created ProposalRegistry.sol from scratch (not refactored) and created TextStorage.sol library. GrantRouter.sol was not needed since no existing code references it yet.
- **Files created:** contracts/src/core/ProposalRegistry.sol, contracts/src/periphery/TextStorage.sol
- **Verification:** All 14 tests pass, full suite passes
- **Committed in:** 1c79442 (stub), db974ea (implementation)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** File creation instead of refactoring. All planned functionality delivered identically.

## Issues Encountered
None beyond the deviation noted above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- ProposalRegistry.sol ready for GrantRouter integration (proposalExists + setStatus interface preserved)
- TextStorage.sol available for any contract needing chunked event emission
- Solana-side proposal submission (02-02) can proceed independently

## Self-Check: PASSED

All files verified present. All commit hashes found in git log.

---
*Phase: 02-on-chain-proposal-submission*
*Completed: 2026-04-14*
