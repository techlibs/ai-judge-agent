# Phase 2: On-Chain Proposal Submission - Research

**Researched:** 2026-04-14
**Domain:** Smart contract development (Solidity + Anchor/Rust), IPFS content addressing
**Confidence:** HIGH

## Summary

Phase 2 implements on-chain proposal submission on both Ethereum (Solidity/Foundry) and Solana (Anchor). The Ethereum side already has a `ProposalRegistry.sol` contract in `contracts/src/core/` with basic submission logic, but it needs modification to align with the CONTEXT.md decisions -- specifically switching from full on-chain text storage to IPFS CID-based content anchoring with minimal on-chain storage. The Solana side is a bare placeholder (`programs/grant-evaluator/src/lib.rs`) requiring full implementation.

The existing contract ecosystem is well-structured: `GrantRouter.sol` already orchestrates `ProposalRegistry`, `JudgeRegistry`, `CriteriaRegistry`, `EvaluationStore`, and `ConsensusEngine`. The proposal submission changes must preserve compatibility with `GrantRouter.startEvaluation()` and `GrantRouter.finalizeEvaluation()` which already reference `ProposalRegistry.proposalExists()` and `ProposalRegistry.setStatus()`.

**Primary recommendation:** Refactor `ProposalRegistry.sol` to accept an IPFS CID instead of full text content, add repo URL and demo URL fields as hashes, add domain enum, and retain TextStorage for optional on-chain text backup. Build the equivalent Anchor program from scratch following the same data model. Both contracts must emit events compatible with the off-chain evaluation pipeline.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Minimal on-chain storage -- only store proposalId, submitter address, content hash (IPFS CID), status enum, and timestamps in contract storage. Full proposal text, repo URL, demo URL, and metadata are stored on IPFS.
- **D-02:** The ProposalSchema in packages/common already defines the canonical fields (title, summary, content, domain, requestedAmount, status). Smart contracts should align with this schema -- on-chain structs mirror the fields that need on-chain queryability (status, submitter, timestamps, content hash).
- **D-03:** Primary storage on IPFS -- proposal content is uploaded to IPFS before submission, and the CID is passed to the smart contract. The contract stores only the content hash for verification.
- **D-04:** TextStorage.sol library (already built) is used for emitting proposal text as chunked events for on-chain indexability and backup. This provides a second verification path -- events can reconstruct the full text.
- **D-05:** IPFS pinning is the submitter's responsibility initially. The contract does not manage pinning services. Future phases may add incentivized pinning.
- **D-06:** Async evaluation pattern -- submitting a proposal emits a ProposalSubmitted event on-chain. An off-chain indexer/listener monitors these events and triggers the AI evaluation pipeline.
- **D-07:** The smart contracts do NOT attempt to invoke evaluation inline -- evaluation is always a separate transaction initiated by the evaluator agent after off-chain processing completes.
- **D-08:** Open submission -- any wallet address can submit a proposal. No staking, bonding, or fee required at this phase.
- **D-09:** Immutable proposals -- once submitted, proposals cannot be edited or withdrawn.
- **D-10:** Linear status progression: Submitted -> UnderReview -> Evaluated. Only the evaluator agent (authorized address) can transition status. Submitters can only read status.

### Claude's Discretion
- Contract event structure and naming conventions
- Solana account sizing and rent calculations
- Error handling patterns for both chains
- Test structure within each chain's framework

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PROP-01 | Proposer can submit a grant proposal on-chain containing text description, code repository URL, and demo URL | Refactored ProposalRegistry.sol accepts IPFS CID containing all fields; Anchor program with submit_proposal instruction |
| PROP-02 | Proposal content is stored on IPFS/Arweave with content hash anchored on-chain | IPFS CID stored on-chain in both contracts; TextStorage.sol provides backup event emission |
| PROP-03 | Proposals can be submitted on both Solana (Anchor program) and Ethereum (Solidity contract) | ProposalRegistry.sol refactored + new Anchor program with matching data model |
| PROP-04 | Evaluation triggers automatically when a proposal is submitted on-chain | ProposalSubmitted event on both chains; off-chain indexer pattern per D-06 |
| PROP-05 | Proposer receives a unique proposal ID and can track evaluation status on-chain | Deterministic ID via keccak256/sha256; status query functions on both chains |
</phase_requirements>

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Foundry (forge) | 1.5.1 | Ethereum contract development and testing | Already installed, all existing tests use it [VERIFIED: `forge --version`] |
| Anchor | 1.0.0 | Solana program framework (Rust) | Already configured in Anchor.toml [VERIFIED: `anchor --version`] |
| Solidity | 0.8.28 | Ethereum smart contracts | Configured in foundry.toml, all existing contracts use it [VERIFIED: foundry.toml] |
| OpenZeppelin Contracts | installed | Access control (Ownable), ERC standards | Already in remappings.txt, used by JudgeRegistry, ConsensusEngine, etc. [VERIFIED: remappings.txt] |
| solana-cli | 3.1.13 | Solana cluster management | Already installed [VERIFIED: `solana --version`] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| TextStorage.sol | N/A (internal) | Chunked text emission in events | For optional on-chain text backup of proposal content per D-04 |
| anchor-lang | workspace | Anchor program dependencies | For Solana program account validation, serialization, error handling |
| forge-std | installed | Foundry test utilities (Test, console, Vm) | All Solidity tests use it [VERIFIED: existing tests] |

### Not needed for this phase
| Library | Reason |
|---------|--------|
| IPFS client libraries | IPFS upload happens client-side before submission; contracts only receive the CID |
| Wormhole SDK | Cross-chain sync is Phase 6, not Phase 2 |
| EZKL | zkML proof verification is Phase 5 |

## Architecture Patterns

### Existing Contract Structure (preserve this)
```
contracts/
├── src/
│   ├── GrantEvaluator.sol        # Top-level placeholder (expand or deprecate)
│   ├── core/
│   │   ├── ProposalRegistry.sol  # MODIFY: refactor for IPFS CID model
│   │   ├── GrantRouter.sol       # Uses ProposalRegistry -- keep compatible
│   │   ├── JudgeRegistry.sol     # No changes needed
│   │   ├── CriteriaRegistry.sol  # No changes needed
│   │   ├── EvaluationStore.sol   # No changes needed
│   │   └── ConsensusEngine.sol   # No changes needed
│   └── periphery/
│       └── TextStorage.sol       # Reuse for optional text backup
├── test/
│   ├── GrantEvaluator.t.sol      # UPDATE: add proposal submission tests
│   ├── unit/
│   │   ├── JudgeRegistry.t.sol   # Existing, no changes
│   │   ├── TextStorage.t.sol     # Existing, no changes
│   │   └── ProposalRegistry.t.sol # NEW: comprehensive unit tests
│   ├── integration/              # NEW: cross-contract tests
│   └── fuzz/                     # NEW: fuzz tests for proposal submission
└── foundry.toml

programs/
└── grant-evaluator/
    └── src/
        └── lib.rs                # EXPAND: full proposal submission program
```

### Pattern 1: Refactored ProposalRegistry.sol (Ethereum)

**What:** Modify the existing ProposalRegistry to accept IPFS CID instead of full text content. Add domain enum, repo URL hash, demo URL hash. Keep TextStorage for optional backup.

**Current signature:**
```solidity
// Source: contracts/src/core/ProposalRegistry.sol (existing)
function submitProposal(
    string calldata title,
    bytes calldata content  // Full text -- expensive, wrong per D-01
) external returns (bytes32 proposalId)
```

**Target signature:**
```solidity
// Aligned with D-01, D-02, D-03
function submitProposal(
    string calldata title,
    bytes32 contentCid,        // IPFS CID (bytes32 for CIDv0/keccak hash)
    bytes32 repoUrlHash,       // keccak256 of repo URL string
    bytes32 demoUrlHash,       // keccak256 of demo URL string
    ProposalDomain domain      // Enum matching packages/common
) external returns (bytes32 proposalId)
```

**Key design note on IPFS CID encoding:** IPFS CIDv0 hashes are 34 bytes (multihash prefix + 32-byte SHA-256). A `bytes32` field can store the raw 32-byte hash portion. Alternatively, store as `bytes` for full CID flexibility at slightly higher gas cost. Recommend `bytes32` for gas efficiency since we control the hashing algorithm. [ASSUMED]

### Pattern 2: Anchor Proposal Program (Solana)

**What:** Build the Solana equivalent of ProposalRegistry with Anchor account structures.

**Key Solana patterns:**
```rust
// Source: Anchor 1.0.0 patterns [ASSUMED based on Anchor docs]
#[account]
pub struct Proposal {
    pub submitter: Pubkey,          // 32 bytes
    pub content_cid: [u8; 32],     // IPFS content hash
    pub repo_url_hash: [u8; 32],   // Hash of repo URL
    pub demo_url_hash: [u8; 32],   // Hash of demo URL
    pub domain: ProposalDomain,     // 1 byte (enum)
    pub status: ProposalStatus,     // 1 byte (enum)
    pub submitted_at: i64,          // 8 bytes (Unix timestamp)
    pub bump: u8,                   // 1 byte (PDA bump)
}
// Total: 32 + 32 + 32 + 32 + 1 + 1 + 8 + 1 = 139 bytes
// With discriminator (8 bytes): 147 bytes
// Rent: ~0.00114 SOL (at 6.96 lamports/byte/epoch)
```

**PDA derivation for proposal accounts:**
```rust
// Deterministic proposal address
seeds = [b"proposal", submitter.key().as_ref(), title_hash.as_ref()]
```

### Pattern 3: Event Design for Off-Chain Indexing

**What:** Events must carry enough information for the off-chain evaluation pipeline to trigger without additional RPC calls.

**Ethereum:**
```solidity
event ProposalSubmitted(
    bytes32 indexed proposalId,
    address indexed submitter,
    bytes32 contentCid,
    ProposalDomain domain,
    uint48 submittedAt
);
```

**Solana (Anchor event):**
```rust
#[event]
pub struct ProposalSubmitted {
    pub proposal_id: Pubkey,       // PDA address
    pub submitter: Pubkey,
    pub content_cid: [u8; 32],
    pub domain: ProposalDomain,
    pub submitted_at: i64,
}
```

### Pattern 4: GrantRouter Compatibility

**Critical:** `GrantRouter.sol` already calls `proposalRegistry.proposalExists()` and `proposalRegistry.setStatus()`. The refactored `ProposalRegistry` MUST preserve these interfaces:
```solidity
// These function signatures MUST NOT change:
function proposalExists(bytes32 proposalId) external view returns (bool);
function setStatus(bytes32 proposalId, ProposalStatus newStatus) external onlyOwner;
```

### Anti-Patterns to Avoid
- **Storing full text on-chain in contract storage:** Violates D-01. Use IPFS CID + TextStorage events only.
- **Making submitProposal onlyOwner:** Violates D-08 (open submission). Anyone can submit.
- **Allowing proposal mutation:** Violates D-09 (immutability). No edit/delete functions.
- **Inline evaluation triggers:** Violates D-07. Events only, no cross-contract callback to evaluation.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Access control | Custom role system | OpenZeppelin Ownable (already used) | Battle-tested, already in the codebase |
| Status transitions | Manual if/else chains | `_isValidTransition()` pattern (already in ProposalRegistry) | Already implemented, extend it |
| Text storage in events | Custom chunking | TextStorage.sol library (already built) | Already tested with 10 passing tests |
| Solana account validation | Manual checks | Anchor account constraints (#[account(...)]) | Anchor's core value proposition |
| PDA derivation | Manual seed hashing | Anchor's `seeds` and `bump` constraints | Less error-prone, handles bump caching |

## Common Pitfalls

### Pitfall 1: Breaking GrantRouter Interface
**What goes wrong:** Refactoring ProposalRegistry changes function signatures that GrantRouter depends on.
**Why it happens:** GrantRouter.sol imports and calls ProposalRegistry directly.
**How to avoid:** Keep `proposalExists()`, `setStatus()`, `proposals()` mapping, and `ProposalStatus` enum exactly as they are. Add new fields to the struct, don't rename existing ones.
**Warning signs:** GrantRouter tests fail after ProposalRegistry changes.

### Pitfall 2: Solana Account Size Miscalculation
**What goes wrong:** Account allocated too small, transactions fail at runtime with "account data too small" error.
**Why it happens:** Forgetting the 8-byte Anchor discriminator, or miscounting string/vector sizes.
**How to avoid:** Use `INIT_SPACE` derive macro or explicit `space` calculation. Include 8-byte discriminator. Add buffer for future fields.
**Warning signs:** Deserialization panics in tests.

### Pitfall 3: Proposal ID Collision
**What goes wrong:** Two proposals get the same ID if submitted by the same address with the same title in the same block.
**Why it happens:** Current ProposalRegistry uses `keccak256(msg.sender, title, block.timestamp)` -- block.timestamp has 12-second granularity on Ethereum.
**How to avoid:** Include a nonce or use a counter. For Solana PDA, use a hash of title as seed which naturally prevents same-title duplicates per submitter.
**Warning signs:** `ProposalAlreadyExists` reverts in edge cases.

### Pitfall 4: IPFS CID Format Mismatch
**What goes wrong:** Client passes CIDv1 (variable length) but contract expects bytes32.
**Why it happens:** IPFS CIDs come in multiple formats (CIDv0: 46 chars base58, CIDv1: variable length multibase).
**How to avoid:** Define a clear convention: contract accepts the raw 32-byte content hash (SHA-256 digest), not the full CID. Client strips the multihash prefix before submission.
**Warning signs:** Content verification fails when reconstructing CID from on-chain hash.

### Pitfall 5: Missing Solana Event Emission
**What goes wrong:** Off-chain indexer cannot detect new proposals on Solana.
**Why it happens:** Anchor events require `emit!()` macro and proper CPI event authority setup.
**How to avoid:** Use `emit!(ProposalSubmitted { ... })` in the instruction handler. Test that events appear in transaction logs.
**Warning signs:** Indexer works on Ethereum but not Solana.

### Pitfall 6: Ownable vs Open Submission Confusion
**What goes wrong:** submitProposal is accidentally restricted to owner.
**Why it happens:** Existing contracts (JudgeRegistry, EvaluationStore, etc.) all use onlyOwner. Copy-paste adds it to submitProposal too.
**How to avoid:** D-08 explicitly says open submission. submitProposal must NOT have onlyOwner. Only setStatus needs onlyOwner (D-10).
**Warning signs:** Non-owner wallet cannot submit.

## Code Examples

### ProposalRegistry.sol Refactored Struct
```solidity
// Based on existing ProposalRegistry.sol structure + CONTEXT.md decisions
enum ProposalDomain { DeFi, Governance, Education, Health, Infrastructure, Other }

struct Proposal {
    address submitter;
    uint48 submittedAt;
    ProposalStatus status;
    bytes32 contentCid;       // IPFS content hash (32-byte SHA-256 digest)
    bytes32 repoUrlHash;      // keccak256 of repo URL
    bytes32 demoUrlHash;      // keccak256 of demo URL
    ProposalDomain domain;
}
```

### Anchor Submit Proposal Instruction
```rust
// Standard Anchor pattern for account creation with PDA
#[derive(Accounts)]
#[instruction(title_hash: [u8; 32])]
pub struct SubmitProposal<'info> {
    #[account(
        init,
        payer = submitter,
        space = 8 + Proposal::INIT_SPACE,
        seeds = [b"proposal", submitter.key().as_ref(), title_hash.as_ref()],
        bump
    )]
    pub proposal: Account<'info, Proposal>,
    #[account(mut)]
    pub submitter: Signer<'info>,
    pub system_program: Program<'info, System>,
}
```

### Foundry Test Pattern (matching existing style)
```solidity
// Based on existing JudgeRegistry.t.sol and TextStorage.t.sol patterns
contract ProposalRegistryTest is Test {
    ProposalRegistry registry;
    address owner = makeAddr("owner");
    address proposer = makeAddr("proposer");

    function setUp() public {
        vm.prank(owner);
        registry = new ProposalRegistry();
    }

    function test_submitProposal_success() public {
        vm.prank(proposer);
        bytes32 proposalId = registry.submitProposal(
            "Test Proposal",
            bytes32(uint256(1)),  // contentCid
            keccak256("https://github.com/test"),
            keccak256("https://demo.test.com"),
            ProposalRegistry.ProposalDomain.DeFi
        );
        assertTrue(registry.proposalExists(proposalId));
    }
}
```

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework (Ethereum) | Foundry forge 1.5.1 |
| Framework (Solana) | Anchor test (LiteSVM recommended per CLAUDE.md) |
| Config file (Ethereum) | `contracts/foundry.toml` |
| Config file (Solana) | `Anchor.toml` |
| Quick run command (Ethereum) | `cd contracts && forge test --match-contract ProposalRegistry` |
| Quick run command (Solana) | `anchor test` |
| Full suite command | `cd contracts && forge test && anchor test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PROP-01 | Submit proposal with text, repo URL, demo URL | unit | `cd contracts && forge test --match-test test_submitProposal` | No -- Wave 0 |
| PROP-02 | Content hash (IPFS CID) stored on-chain | unit | `cd contracts && forge test --match-test test_contentCid` | No -- Wave 0 |
| PROP-03 | Submit on both Solana and Ethereum | unit + integration | `cd contracts && forge test && anchor test` | No -- Wave 0 |
| PROP-04 | ProposalSubmitted event emitted | unit | `cd contracts && forge test --match-test test_emitsEvent` | No -- Wave 0 |
| PROP-05 | Proposal ID returned, status queryable | unit | `cd contracts && forge test --match-test test_proposalStatus` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `cd contracts && forge test --match-contract ProposalRegistry`
- **Per wave merge:** `cd contracts && forge test && anchor test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `contracts/test/unit/ProposalRegistry.t.sol` -- covers PROP-01 through PROP-05 (Ethereum side)
- [ ] `tests/grant-evaluator.test.ts` or equivalent Anchor test file -- covers PROP-01 through PROP-05 (Solana side)
- [ ] `contracts/test/fuzz/ProposalRegistry.fuzz.t.sol` -- fuzz testing for proposal submission edge cases

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | N/A -- open submission (D-08) |
| V3 Session Management | No | N/A -- stateless transactions |
| V4 Access Control | Yes | OpenZeppelin Ownable for status transitions; open for submission |
| V5 Input Validation | Yes | Solidity: require checks on CID != 0, title length. Anchor: account constraints |
| V6 Cryptography | No | Using keccak256/SHA-256 natively, not hand-rolled |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Proposal spam (DoS) | Denial of Service | D-08 allows open submission now; rate limiting deferred. Monitor gas costs. |
| Front-running proposal ID | Information Disclosure | ID derivation uses msg.sender + title + timestamp; consider commit-reveal if needed |
| Content hash manipulation | Tampering | IPFS CID is content-addressed -- hash IS the content. Immutability (D-09) prevents swaps. |
| Status transition bypass | Elevation of Privilege | onlyOwner on setStatus (D-10); _isValidTransition enforces linear progression |
| Malicious IPFS content | Tampering | Out of scope for contracts -- content validation happens in evaluation pipeline |

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Foundry (forge) | Ethereum contract dev/test | Yes | 1.5.1 | -- |
| Anchor CLI | Solana program dev/test | Yes | 1.0.0 | -- |
| Solana CLI | Local validator, keypairs | Yes | 3.1.13 | -- |
| OpenZeppelin Contracts | Access control | Yes | installed (remappings.txt) | -- |
| forge-std | Test utilities | Yes | installed (lib/) | -- |

**Missing dependencies with no fallback:** None -- all tools available.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Bankrun (Solana testing) | LiteSVM | March 2025 | Must use LiteSVM for Solana tests per CLAUDE.md |
| Anchor 0.x | Anchor 1.0.0 | April 2026 | Stable API, use 1.0.0 patterns (already configured) |
| `anchor_lang::solana_program` | `solana_program` direct | Anchor 1.0.0 | Re-exports may differ, check imports |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | IPFS CIDv0 can be represented as bytes32 (32-byte SHA-256 digest) | Architecture Patterns | Contract interface would need bytes instead of bytes32 -- minor gas increase |
| A2 | Anchor 1.0.0 supports `INIT_SPACE` derive macro for automatic space calculation | Code Examples | Would need manual space calculation instead |
| A3 | Anchor 1.0.0 `emit!()` macro works for event emission with standard CPI | Pitfalls | May need different event emission pattern |
| A4 | Solana rent for 147-byte account is approximately 0.00114 SOL | Architecture Patterns | Rent calculation may differ slightly; not critical |

## Open Questions

1. **IPFS CID encoding convention**
   - What we know: IPFS CIDv0 uses 34-byte multihash (2-byte prefix + 32-byte SHA-256). CIDv1 is variable length.
   - What's unclear: Should contracts store raw 32-byte hash or full CID? Should we standardize on CIDv0 or CIDv1?
   - Recommendation: Use `bytes32` for the raw 32-byte hash. Client-side SDK handles CID encoding/decoding. This is the most gas-efficient and the hash is what matters for verification.

2. **Proposal counter vs deterministic ID on Solana**
   - What we know: Ethereum uses keccak256(submitter, title, timestamp). Solana PDAs use seeds.
   - What's unclear: Should Solana use PDA address as proposal ID, or compute a separate ID matching the Ethereum scheme?
   - Recommendation: Use PDA address as the Solana proposal ID. Cross-chain ID mapping is a Phase 6 concern (Wormhole). For now, each chain has its own ID scheme.

3. **TextStorage.sol usage with IPFS model**
   - What we know: D-04 says TextStorage is used for "on-chain indexability and backup." D-01 says minimal on-chain storage with IPFS.
   - What's unclear: Should submitProposal still accept the full text and emit it via TextStorage, or is TextStorage only used when the proposer explicitly opts for on-chain backup?
   - Recommendation: Make TextStorage backup optional. Primary submission only requires CID. A separate function `backupProposalText(proposalId, content)` can emit via TextStorage for proposers who want on-chain backup. This keeps the primary path gas-efficient.

## Sources

### Primary (HIGH confidence)
- `contracts/src/core/ProposalRegistry.sol` -- existing contract implementation, function signatures, struct layout
- `contracts/src/core/GrantRouter.sol` -- integration points, interface requirements
- `contracts/src/periphery/TextStorage.sol` -- chunked text emission library
- `packages/common/src/proposal.ts` -- canonical ProposalSchema, ProposalStatus, ProposalDomain
- `contracts/foundry.toml` -- Solidity version (0.8.28), test configuration
- `Anchor.toml` -- Anchor 1.0.0, program ID, cluster config
- `contracts/test/unit/JudgeRegistry.t.sol` -- established test patterns for Foundry
- `contracts/test/unit/TextStorage.t.sol` -- established test patterns for internal libraries

### Secondary (MEDIUM confidence)
- CLAUDE.md technology stack documentation -- library versions, architecture patterns
- `forge --version`, `anchor --version`, `solana --version` -- verified tool availability

### Tertiary (LOW confidence)
- None -- all claims verified against codebase or tools

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all tools verified installed and working (34 tests pass)
- Architecture: HIGH -- existing codebase provides clear patterns and integration points
- Pitfalls: HIGH -- derived from actual code analysis (GrantRouter dependencies, existing patterns)
- Solana implementation: MEDIUM -- Anchor program is placeholder, patterns based on Anchor 1.0.0 conventions [ASSUMED]

**Research date:** 2026-04-14
**Valid until:** 2026-05-14 (stable -- contract patterns don't change fast)
