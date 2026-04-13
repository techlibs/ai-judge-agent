# Superpower Worktree - Security & Quality Audit Report

**Audited:** 2026-04-13
**Worktree:** `.worktrees/superpower/`
**Branch:** Superpowers execution
**SDD Framework:** Superpowers

---

## Stack Summary

| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | Bun (lockfile present) + npm (package-lock.json) | - |
| Framework | Next.js (App Router) | 16.2.3 |
| Language | TypeScript (strict) | 5.x |
| UI | React 19.2.4, Tailwind CSS 4, shadcn/ui (via @base-ui/react), Lucide icons | - |
| AI | @mastra/core 1.24.1+, @mastra/evals 1.2.1+, @ai-sdk/anthropic, Vercel AI SDK (ai) | - |
| LLM Model | claude-sonnet-4-20250514 (hardcoded) | - |
| Validation | Zod 4.3.6+ | - |
| Database | Drizzle ORM + @libsql/client (Turso/SQLite) | 0.45.2+ |
| IPFS | Pinata SDK (pinata) | 2.5.5+ |
| Web3 | viem 2.47.14+ (Base Sepolia testnet) | - |
| Smart Contracts | Solidity 0.8.24+, Foundry, OpenZeppelin 5.x | 3 contracts |
| Rate Limiting | @upstash/ratelimit + @upstash/redis | 2.0.8+ / 1.37.0+ |
| Sanitization | isomorphic-dompurify 3.8.0+ | - |
| Testing | Playwright (E2E + BDD), Foundry (Solidity unit tests) | - |
| Deployment | Vercel (target) | - |

---

## Findings

### CRITICAL

#### C-01: Real API Keys and Private Key in `.env.local` on Disk

**Severity:** CRITICAL
**File:** `.env.local:2,9,14`

The `.env.local` file on disk contains:
- **OpenAI API key** (line 2): `sk-svcacct-hEHYBw4Q...` (real service account key)
- **Pinata JWT** (line 9): Full JWT with user email `carlos@shippit.app` embedded
- **Deployer private key** (line 14): `0x05f472eab96c5f2c2a65b59ea55ae7b5c25ec03fb0c9682d7df820324b02f3b3`

While `.env.local` IS properly gitignored and NOT tracked in git, these are real credentials on disk. The deployer private key controls funds on Base Sepolia. If this worktree directory is ever shared, archived, or the `.gitignore` is modified, these secrets are exposed.

**Recommendation:**
1. Rotate the OpenAI API key immediately
2. Rotate the Pinata JWT
3. Rotate the deployer private key and transfer any testnet funds to the new address
4. Consider using a secrets manager or `.env.local.example` pattern with vault references

---

#### C-02: Upstash Redis Not Configured - Rate Limiting Silently Fails

**Severity:** CRITICAL
**File:** `src/lib/rate-limit.ts:4`, `.env.local` (missing `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`)

The `.env.example` (lines 20-22) defines `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`, but `.env.local` does NOT contain these variables. `Redis.fromEnv()` at `rate-limit.ts:4` will fail at runtime, meaning:

- `proposalSubmitLimiter` (5/hour) - not functional
- `evaluationTriggerLimiter` (10/hour) - not functional
- `globalEvaluationLimiter` (10/min) - not functional

Without working rate limiting, any of the 6 API endpoints can be called without throttling. The evaluate endpoints trigger LLM API calls costing real money.

**Recommendation:** Either configure Upstash credentials or implement a fallback in-memory rate limiter for development.

---

### HIGH

#### H-01: IdentityRegistry `setAgentWallet` Signature Verification is a No-Op

**Severity:** HIGH
**File:** `contracts/src/IdentityRegistry.sol:113-120`

```solidity
function setAgentWallet(
    uint256 agentId,
    address newWallet,
    uint256 deadline,
    bytes calldata signature
) external {
    _requireOwnerOrApproved(agentId);
    require(block.timestamp <= deadline, "Signature expired");
    _agentWallets[agentId] = newWallet;
}
```

The `signature` parameter is accepted but **never verified**. The function only checks `_requireOwnerOrApproved` and deadline, but the EIP-712 signature is completely ignored. Any owner can set any wallet address without proving the new wallet's consent. The comment on line 117 says "EIP-712 signature verification simplified for v1" but this is not simplified -- it is absent.

**Recommendation:** Either implement EIP-712 verification or remove the `signature` and `deadline` parameters to avoid false security assumptions.

---

#### H-02: ReputationRegistry `initialize` Has No Access Control

**Severity:** HIGH
**File:** `contracts/src/ReputationRegistry.sol:71-75`

```solidity
function initialize(address identityRegistry_) external {
    if (_initialized) revert AlreadyInitialized();
    _identityRegistry = identityRegistry_;
    _initialized = true;
}
```

The `initialize` function has no access control -- ANY address can call it. In the deploy script (`contracts/script/Deploy.s.sol:23-24`), the deployer calls `initialize` immediately after deployment, which is correct. However, if there is any delay between deployment and initialization (e.g., multisig deployment), a front-runner could call `initialize` with a malicious IdentityRegistry address, hijacking the contract.

**Recommendation:** Add `Ownable` and restrict `initialize` to the owner, or use a constructor-based initialization pattern.

---

#### H-03: ReputationRegistry `appendResponse` Has No Authorization Check

**Severity:** HIGH
**File:** `contracts/src/ReputationRegistry.sol:150-165`

```solidity
function appendResponse(
    uint256 agentId,
    address clientAddress,
    uint64 feedbackIndex,
    string calldata responseURI,
    bytes32 responseHash
) external {
    emit ResponseAppended(agentId, clientAddress, feedbackIndex, msg.sender, responseURI, responseHash);
}
```

Anyone can call `appendResponse` for any agent/feedback combination. There is no check that:
- The feedback exists
- `msg.sender` is the agent owner or the original feedback submitter
- The `feedbackIndex` is valid

This allows spam events to be emitted that could pollute off-chain indexers.

**Recommendation:** Add authorization (require `msg.sender` is agent owner or approved) and validate the feedback exists.

---

#### H-04: No Authentication on Evaluate/Finalize Endpoints

**Severity:** HIGH
**Files:** `src/app/api/evaluate/[id]/route.ts`, `src/app/api/evaluate/[id]/finalize/route.ts`, `src/app/api/evaluate/[id]/[dimension]/retry/route.ts`

The evaluate trigger (`POST /api/evaluate/[id]`) has origin checking (line 28-31) but this is trivially bypassable -- any HTTP client can set the `Origin` header to match. The finalize endpoint (`POST /api/evaluate/[id]/finalize`) and retry endpoint (`POST /api/evaluate/[id]/[dimension]/retry`) have NO origin check and NO rate limiting at all.

The retry endpoint at `src/app/api/evaluate/[id]/[dimension]/retry/route.ts` deletes the failed evaluation and returns a new stream URL, allowing the caller to trigger a fresh LLM evaluation. With no rate limiting, this can be used to exhaust AI API credits.

**Recommendation:**
1. Add authentication (API key, session, or wallet signature)
2. Add rate limiting to finalize and retry endpoints
3. Replace origin check with a proper CSRF token

---

#### H-05: Proposal Content Flows Unsanitized into LLM Prompts

**Severity:** HIGH
**File:** `src/lib/judges/prompts.ts:89-139`

The `buildProposalContext` function at line 89 takes raw proposal data and interpolates it directly into the prompt string using template literals. While the judge prompts include anti-injection instructions (lines 16-20, "ANTI-INJECTION INSTRUCTIONS (F-010)"), this is a defense-in-depth measure that relies entirely on the LLM honoring the instruction.

A sophisticated prompt injection in `proposal.description`, `proposal.proposedSolution`, or any other text field could:
- Instruct the model to ignore scoring rubrics
- Output a perfect score regardless of content
- Extract system prompt content via the structured output

The anti-injection prompt is well-written but is not a reliable security boundary.

**Recommendation:**
1. Add input sanitization that strips common injection patterns (e.g., "ignore previous instructions", "system:", "assistant:") before building the prompt
2. Implement post-hoc score validation (flag scores that are suspiciously high across all dimensions)
3. Consider running evaluations twice with different prompt orderings and flagging divergent scores

**Note:** The score anomaly detection in `orchestrator.ts:49-63` is good defense-in-depth, but it only flags anomalies via logging -- it does not block or re-evaluate.

---

### MEDIUM

#### M-01: `as JudgeDimension` Type Casts Bypass Validation

**Severity:** MEDIUM
**Files:**
- `src/app/api/evaluate/[id]/[dimension]/route.ts:68,71`
- `src/app/api/evaluate/[id]/[dimension]/retry/route.ts:13,22`
- `src/app/api/evaluate/[id]/verify/page.tsx:75`
- `src/lib/evaluation/orchestrator.ts:66,109`
- `src/lib/judges/weights.ts:15`

Multiple files use `as JudgeDimension` type casts. While most are guarded by a runtime `JUDGE_DIMENSIONS.includes()` check beforehand (e.g., `route.ts:68`), some are not:
- `orchestrator.ts:66` casts `scores` without per-key validation
- `orchestrator.ts:109` casts `e.dimension` from database without validation
- `weights.ts:15` casts `dimension` in a loop

This violates the project's "zero tolerance for type escapes" rule in CLAUDE.md. Use type guards or Zod parsing instead.

---

#### M-02: DOMPurify Sanitization Functions Are Defined But Never Used

**Severity:** MEDIUM
**File:** `src/lib/sanitize-html.ts:1-17`

`sanitizeDisplayText` and `sanitizeRichText` are exported but never imported anywhere in the codebase. Proposal content is rendered directly in JSX via `{proposal.description}`, `{proposal.problemStatement}`, etc. in `src/app/grants/[id]/page.tsx:64-78`.

While React auto-escapes JSX interpolation (preventing XSS), the sanitization functions should be used before storing data or passing to LLM prompts. The `isomorphic-dompurify` dependency adds bundle weight with zero value.

**Recommendation:** Either integrate sanitization into the proposal submission pipeline (before DB insert and before LLM prompts) or remove the unused dependency.

---

#### M-03: MilestoneManager Residual Funds Are Locked

**Severity:** MEDIUM
**File:** `contracts/src/MilestoneManager.sol:128-137`

When `releaseMilestone` releases less than 100% of the milestone amount (because `releaseBps < 10000`), the unreleased portion remains locked in the contract forever. There is no mechanism to:
- Forfeit a milestone and return funds
- Withdraw unreleased funds after a deadline
- Update milestone status to `FORFEITED` or `PARTIAL`

The `receive() external payable {}` function at line 153 accepts ETH but there is no withdrawal function for the contract owner.

**Recommendation:** Add a `forfeitMilestone` or `withdrawUnreleased` function with appropriate access control and timelock.

---

#### M-04: CSP Allows `unsafe-inline` and `unsafe-eval`

**Severity:** MEDIUM
**File:** `next.config.ts:12`

```
script-src 'self' 'unsafe-inline' 'unsafe-eval'
```

The Content Security Policy allows `unsafe-inline` and `unsafe-eval` for scripts. While this may be necessary for Next.js development mode, it significantly weakens XSS protection in production. An attacker who achieves HTML injection can execute arbitrary inline scripts.

**Recommendation:** Use nonce-based CSP for production (`'nonce-{random}'`) and restrict `unsafe-eval` to development only.

---

#### M-05: `readAllFeedback` Unbounded Gas Consumption

**Severity:** MEDIUM
**File:** `contracts/src/ReputationRegistry.sol:182-243`

The `readAllFeedback` function iterates over all feedback for all provided client addresses with nested loops (lines 203-211 and 225-242). While this is a `view` function (no state changes), it can still cause out-of-gas errors when called from other contracts or through `eth_call` with gas limits, and can be used for DoS on indexer infrastructure.

**Recommendation:** Add pagination parameters (offset + limit) or document the expected usage bounds.

---

#### M-06: `getSummary` Integer Division Truncation

**Severity:** MEDIUM
**File:** `contracts/src/ReputationRegistry.sol:276`

```solidity
summaryValue = int128(total / int256(uint256(matchCount)));
```

Integer division truncates. For scores in basis points, this could lose up to `matchCount - 1` basis points of precision. With 4 judges (matchCount=4), the average could be off by up to 3 bps. While small, this introduces a systematic downward bias in aggregate scores.

**Recommendation:** Use `(total * 100) / matchCount` and adjust decimals, or document the expected precision loss.

---

### LOW

#### L-01: `local.db` File Exists in Worktree Root

**Severity:** LOW
**File:** `local.db` (36864 bytes)

A SQLite database file exists at the worktree root. It IS properly gitignored (`.gitignore` line 30: `local.db`). The file likely contains proposal data and evaluation results from development testing. No sensitive data expected (proposals are public, evaluations are public, no user credentials stored), but it could contain PII if test proposals included it.

---

#### L-02: Dual Lock Files (bun.lock + package-lock.json)

**Severity:** LOW
**Files:** `bun.lock`, `package-lock.json`

Both `bun.lock` (Bun) and `package-lock.json` (npm) exist. The CLAUDE.md specifies Bun as the package manager, but both lock files are present. This can lead to dependency version drift between environments.

**Recommendation:** Remove `package-lock.json` and add it to `.gitignore`, or standardize on one package manager.

---

#### L-03: No CSRF Protection Beyond Origin Header Check

**Severity:** LOW
**Files:** `src/app/api/proposals/route.ts:28-32`, `src/app/api/evaluate/[id]/route.ts:27-31`

The origin check (`if (!origin || origin !== allowedOrigin)`) is the only CSRF protection. This is bypassable by any non-browser HTTP client. While the risk is partially mitigated by rate limiting (when Upstash is configured -- see C-02), it provides no protection against automated submissions.

---

#### L-04: `verifyUploadedContent` Returns `true` on Fetch Failure

**Severity:** LOW
**File:** `src/lib/ipfs/client.ts:74-77`

```typescript
} catch {
    // Verification fetch failed — content may not be available yet
    // Return true to avoid blocking on gateway propagation delay
    return true;
}
```

The IPFS content verification silently passes when the gateway is unreachable. This means an IPFS upload could succeed but store corrupted or different content, and the verification step would not catch it. The comment explains the rationale (gateway propagation delay), but the result is that verification is not reliable.

---

#### L-05: Hardcoded Model ID in Multiple Locations

**Severity:** LOW
**Files:**
- `src/app/api/evaluate/[id]/[dimension]/route.ts:32` (`claude-sonnet-4-20250514`)
- `src/app/api/evaluate/[id]/[dimension]/route.ts:104,122,128`

The model ID `claude-sonnet-4-20250514` is hardcoded in 4+ locations. Updating the model requires changes across multiple files.

**Recommendation:** Extract to a constant in `src/lib/constants.ts`.

---

#### L-06: `createMilestones` Allows Any Caller

**Severity:** LOW
**File:** `contracts/src/MilestoneManager.sol:71-103`

Any address can call `createMilestones` for any `identityId`, not just the identity owner. While `msg.value` must match the total amount (so the caller funds the milestones), this means a third party could create milestones for someone else's identity and fund them, which may not be the intended behavior.

---

#### L-07: No Unit Tests for TypeScript Business Logic

**Severity:** LOW
**File:** `src/__tests__/api/proposals.test.ts` (exists but appears to be schema validation tests only)

The only TypeScript test file validates Zod schemas. There are no unit tests for:
- `computeAggregateScore` (weights calculation)
- `buildProposalContext` (prompt construction)
- `checkAndFinalizeEvaluation` (orchestration logic)
- Rate limiting behavior
- IPFS upload/verification logic

E2E tests exist (Playwright) but are insufficient for catching logic regressions.

---

## Positive Observations

1. **Strong Zod validation at API boundaries** -- `ProposalInputSchema` is comprehensive with sensible min/max constraints (`src/types/index.ts:9-24`)
2. **Anti-prompt-injection defenses in judge prompts** -- The prompts include explicit anti-injection instructions and anti-rationalization red flags (`src/lib/judges/prompts.ts:16-28`)
3. **Score anomaly detection** -- The orchestrator flags suspiciously high/low scores and extreme divergence (`src/lib/evaluation/orchestrator.ts:49-63`)
4. **PII detection on proposal submission** -- Regex patterns check for emails, phone numbers, CPF numbers, and IP addresses before IPFS upload (`src/app/api/proposals/route.ts:48-58`)
5. **Prompt transparency metadata** -- Every evaluation uploaded to IPFS includes the full system prompt, user message, model, and methodology (`src/app/api/evaluate/[id]/[dimension]/route.ts:115-141`)
6. **Soulbound token implementation** -- IdentityRegistry correctly prevents transfers while allowing mint/burn (`contracts/src/IdentityRegistry.sol:128-140`)
7. **Comprehensive Solidity test coverage** -- All 3 contracts have meaningful test suites covering happy paths, access control, and edge cases
8. **Security headers configured** -- `next.config.ts` sets X-Frame-Options, CSP, HSTS, and other headers
9. **Self-feedback prevention** -- ReputationRegistry prevents identity owners from rating their own agents (`contracts/src/ReputationRegistry.sol:98-101`)
10. **IPFS content verification** -- Upload-then-verify pattern with retry logic (`src/lib/ipfs/client.ts:36-39`)
11. **Request body size limiting** -- 256KB max on proposal submissions (`src/app/api/proposals/route.ts:9`)
12. **Structured security logging** -- Typed security events with timestamps (`src/lib/security-log.ts`)
13. **Idempotent finalization** -- `checkAndFinalizeEvaluation` checks for existing aggregate before recomputing (`src/lib/evaluation/orchestrator.ts:33-37`)

---

## Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 2 |
| HIGH | 5 |
| MEDIUM | 6 |
| LOW | 7 |

The superpower worktree demonstrates strong architectural thinking with Zod validation, prompt transparency, anomaly detection, and comprehensive Solidity tests. The most urgent issues are the non-functional rate limiting (Upstash not configured) and the real API keys on disk. The smart contracts have three notable access control gaps (initialize, appendResponse, setAgentWallet signature). The unused DOMPurify integration suggests sanitization was planned but not wired into the pipeline.
