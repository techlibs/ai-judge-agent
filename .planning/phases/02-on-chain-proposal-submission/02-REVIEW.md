---
phase: 02-on-chain-proposal-submission
reviewed: 2026-04-14T12:00:00Z
depth: standard
files_reviewed: 9
files_reviewed_list:
  - contracts/src/core/ProposalRegistry.sol
  - contracts/src/periphery/TextStorage.sol
  - contracts/test/fuzz/ProposalRegistry.fuzz.t.sol
  - contracts/test/integration/ProposalLifecycle.t.sol
  - contracts/test/unit/ProposalRegistry.t.sol
  - programs/grant-evaluator/src/lib.rs
  - tests/anchor/grant-evaluator.test.ts
  - Anchor.toml
  - contracts/remappings.txt
findings:
  critical: 4
  warning: 4
  info: 2
  total: 10
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-04-14T12:00:00Z
**Depth:** standard
**Files Reviewed:** 9
**Status:** issues_found

## Summary

Reviewed the on-chain proposal submission contracts (Solidity + Solana/Anchor), supporting libraries, and test suites. The Solidity contracts (ProposalRegistry, TextStorage) are well-structured with clean state management and proper error handling. The Solana Anchor program is comprehensive with a commit-reveal evaluation scheme, consensus resolution, and proper PDA usage.

However, there are several critical issues: the Anchor TypeScript tests are written against a different program interface than what exists in `lib.rs`, the program ID in `lib.rs` does not match `Anchor.toml`, multiple Solana instructions lack authorization checks allowing anyone to commit/reveal/score on behalf of judges, and `backupProposalText` in the Solidity contract has no access control.

## Critical Issues

### CR-01: Program ID mismatch between lib.rs and Anchor.toml

**File:** `programs/grant-evaluator/src/lib.rs:4`
**Issue:** `declare_id!("2RC6cF4pmnANHAPkpoR2RcPm79Zgq8G9Sz9JKotGMvS6")` does not match `Anchor.toml` which declares `grant_evaluator = "HF8HvTN2eEvSZ7LG1jmN5HvVWco8ufzHnZtkQnqDC8SG"`. This will cause deployment and testing failures -- the program will reject transactions sent to the wrong program ID.
**Fix:** Synchronize the IDs. After building with `anchor build`, copy the generated keypair's public key into both files:
```toml
# Anchor.toml
[programs.localnet]
grant_evaluator = "<matching-program-id>"
```
```rust
// lib.rs
declare_id!("<matching-program-id>");
```

### CR-02: Anchor tests use a completely different program interface than lib.rs

**File:** `tests/anchor/grant-evaluator.test.ts:77-95`
**Issue:** The TypeScript tests call methods and use account structures that do not exist in the current Rust program. Examples:
- Test calls `initializeConfig(evaluator.publicKey)` but Rust expects `initialize_config(consensus_threshold_bps: u16, required_judge_count: u8)`
- Test derives proposal PDA with seeds `[b"proposal", submitter.publicKey, titleHash]` but Rust uses `[b"proposal", proposal_id.as_ref()]`
- Test calls `updateStatus(...)` but Rust has `set_proposal_status(...)`
- Test expects `proposal.contentCid`, `proposal.repoUrlHash`, `proposal.demoUrlHash`, `proposal.domain` fields but the Rust `ProposalAccount` only has `proposal_id`, `submitter`, `submitted_at`, `status`, `content_hash`, `bump`

These tests will fail at runtime against the current program. They appear to have been written against an earlier or different version of the program.
**Fix:** Rewrite the test file to match the actual program interface. The `submitProposal` Rust instruction takes `(proposal_id: [u8; 32], content: Vec<u8>)`, not `(titleHash, contentCid, repoUrlHash, demoUrlHash, domain)`.

### CR-03: Missing authorization on commit_evaluation, reveal_evaluation, and store_criterion_score

**File:** `programs/grant-evaluator/src/lib.rs:369-452`
**Issue:** Three critical instructions lack authorization checks:
- `commit_evaluation` (line 369): Any signer who knows a `judge_id` can commit an evaluation hash on behalf of that judge. The `payer` signer is not verified against `judge.authority`.
- `reveal_evaluation` (line 392): Same issue -- anyone can reveal an evaluation for any judge. There is no check that the revealer is the judge's authority.
- `store_criterion_score` (line 434): No authorization whatsoever -- no admin check, no judge authority check. Anyone can store arbitrary criterion scores for any proposal/judge pair.

This breaks the integrity of the evaluation system. A malicious actor could commit and reveal fake evaluations for any registered judge.
**Fix:** Add authority checks to each instruction's account struct:
```rust
// In CommitEvaluation
#[account(
    constraint = judge.authority == payer.key() @ GrantEvaluatorError::Unauthorized,
    constraint = judge.active @ GrantEvaluatorError::JudgeNotActive,
)]
pub judge: Account<'info, JudgeAccount>,

// In RevealEvaluation -- add judge account and verify authority
pub judge: Account<'info, JudgeAccount>,
// with constraint: judge.authority == payer.key()

// In StoreCriterionScore -- add judge account with authority check
// or require admin signature
```

### CR-04: No access control on backupProposalText

**File:** `contracts/src/core/ProposalRegistry.sol:121-124`
**Issue:** `backupProposalText` can be called by anyone for any proposal. A malicious actor could emit misleading `TextChunk` events associated with a proposal they do not own, potentially confusing off-chain indexers that reconstruct proposal text from events.
**Fix:** Restrict to the proposal submitter:
```solidity
function backupProposalText(bytes32 proposalId, bytes calldata content) external {
    Proposal storage proposal = proposals[proposalId];
    if (proposal.submittedAt == 0) revert ProposalNotFound(proposalId);
    if (proposal.submitter != msg.sender) revert Unauthorized();
    TextStorage.emitText(proposalId, bytes32(0), content);
}
```

## Warnings

### WR-01: No transferOwnership function in ProposalRegistry

**File:** `contracts/src/core/ProposalRegistry.sol:42-48`
**Issue:** The `owner` variable is set in the constructor and can never be changed. The integration test (line 50) resorts to `vm.store` to hack the owner slot, which is fragile and depends on storage layout. In production, if ownership needs to transfer to a GrantRouter or multisig, it would require redeployment.
**Fix:** Add a `transferOwnership` function or use OpenZeppelin's `Ownable`:
```solidity
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract ProposalRegistry is Ownable {
    constructor() Ownable(msg.sender) {}
    // Replace onlyOwner modifier usage -- already provided by Ownable
}
```

### WR-02: ToggleJudge has no PDA seed constraint on the judge account

**File:** `programs/grant-evaluator/src/lib.rs:582-594`
**Issue:** The `ToggleJudge` account struct does not validate the `judge` account's PDA seeds. While Anchor checks the account discriminator (preventing arbitrary data injection), any valid `JudgeAccount` can be passed regardless of which judge the caller intends to toggle. This could lead to toggling the wrong judge if the client passes incorrect accounts.
**Fix:** Add seeds constraint:
```rust
#[derive(Accounts)]
pub struct ToggleJudge<'info> {
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, ConfigAccount>,

    #[account(
        mut,
        seeds = [b"judge", judge.authority.as_ref()],
        bump = judge.bump,
    )]
    pub judge: Account<'info, JudgeAccount>,

    pub admin: Signer<'info>,
}
```

### WR-03: No content size limit on submit_proposal in Solana program

**File:** `programs/grant-evaluator/src/lib.rs:324-341`
**Issue:** `submit_proposal` accepts `content: Vec<u8>` with no size limit. While Solana transaction size limits (1232 bytes) naturally cap single-transaction payloads, this should be explicitly validated to prevent unexpected behavior or future issues if invoked via CPI with larger buffers.
**Fix:** Add an explicit size check:
```rust
pub const MAX_CONTENT_LEN: usize = 1024; // or appropriate limit

pub fn submit_proposal(
    ctx: Context<SubmitProposal>,
    proposal_id: [u8; 32],
    content: Vec<u8>,
) -> Result<()> {
    require!(content.len() <= MAX_CONTENT_LEN, GrantEvaluatorError::ContentTooLarge);
    // ...
}
```

### WR-04: Integration test uses vm.store to set owner -- fragile storage layout dependency

**File:** `contracts/test/integration/ProposalLifecycle.t.sol:50`
**Issue:** `vm.store(address(proposalRegistry), bytes32(0), ...)` assumes `owner` is at storage slot 0. If the contract adds state variables before `owner`, or if the compiler reorders slots, this will silently write to the wrong slot, causing hard-to-debug test failures.
**Fix:** This is a direct consequence of WR-01 (no `transferOwnership`). If `transferOwnership` is added per WR-01, replace the `vm.store` hack:
```solidity
proposalRegistry.transferOwnership(address(router));
```

## Info

### IN-01: Unused import in ProposalRegistry unit test

**File:** `contracts/test/unit/ProposalRegistry.t.sol:6`
**Issue:** `TextStorage` is imported but only used indirectly in `test_backupProposalText_emitsViaTextStorage` to reference the event. The import is technically needed for the event check, so this is a minor style note -- consider whether the event assertion justifies the import coupling.
**Fix:** No action required. The import is needed for `TextStorage.TextChunk` event matching.

### IN-02: Test 13 (noEditOrDeleteFunctions) is a no-op assertion

**File:** `contracts/test/unit/ProposalRegistry.t.sol:263-278`
**Issue:** This test claims to verify that edit/delete functions don't exist by checking bytecode length and asserting `assertTrue(true)`. The actual assertion (`assertTrue(true)`) always passes and provides no real verification. The comment states "this test's primary assertion is at compile time" which is correct -- if those functions existed, they would need tests. But the runtime assertions add no value.
**Fix:** Either remove the test (compile-time absence is sufficient) or add meaningful bytecode selector scanning if runtime verification is desired.

---

_Reviewed: 2026-04-14T12:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
