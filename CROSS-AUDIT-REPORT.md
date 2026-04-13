# Cross-Audit Comparative Report

**Date:** 2026-04-13
**Auditor:** Claude Opus 4.6 (automated)
**Scope:** Comparative analysis of three independent implementations of the IPE City agent-reviewer, each built with a different spec-driven development framework.

| Worktree | SDD Framework | Findings (C/H/M/L) | TS Source LoC | Solidity Contracts | Solidity LoC (src+test) |
|----------|---------------|--------------------|--------------|--------------------|------------------------|
| `full-vision-roadmap` | GSD | 3C, 4H, 5M, 5L | 5,160 | 2 | 512 |
| `speckit` | Spec Kit | 1C, 4H, 8M, 6L | 5,400 | 6 | 2,793 |
| `superpower` | Superpowers | 2C, 5H, 6M, 7L | 3,320 | 3 | 1,239 |

---

## 1. Executive Summary

**GSD (full-vision-roadmap)** delivers the cleanest TypeScript codebase with the fewest `as Type` violations (3, all in one file), strong Zod validation at every boundary, and a well-structured SSE-based evaluation streaming architecture. Its contracts are minimal (2) but well-tested. Its most critical flaw is a score unit mismatch between TypeScript and Solidity that would break all on-chain publishing at runtime -- a functional correctness bug, not just a security issue. It has no database, no auth, and no real rate limiting.

**Spec Kit (speckit)** is the most ambitious implementation: 6 contracts, Drizzle ORM with 8 database tables and proper indexes, NextAuth (though non-functional), Upstash rate limiting, The Graph integration, webhook API with HMAC signatures, a PII sanitization pipeline, monitoring agents, and dispute/milestone management. It is the most production-ready in terms of feature coverage. However, its webhook signature verification is bypassable, its auth layer is broken (zero providers), and the scope introduces more attack surface with more half-wired features.

**Superpowers (superpower)** takes a middle path: 3 contracts, Drizzle ORM database, Upstash rate limiting (not configured), and uses Mastra/Anthropic SDK (the only one using Claude as specified in the project constraints). Its architecture separates per-dimension evaluation into individual streaming API routes, which is the most sophisticated evaluation UX pattern. However, it has the most `as JudgeDimension` cast violations (8+), unused sanitization functions, and three smart contract access control gaps. Its on-chain publishing is the most detailed -- registering identity and publishing per-dimension feedback in separate transactions.

**Overall Verdict:** Spec Kit built the most, GSD built the cleanest, and Superpowers designed the best evaluation UX. None is production-ready. All three share the same critical credential leak, and all three lack real authentication on write endpoints. The ideal implementation takes GSD's code discipline, Spec Kit's feature scope, and Superpowers' evaluation streaming architecture.

---

## 2. Security Posture Comparison

### Findings by Severity

| Severity | GSD | Spec Kit | Superpowers |
|----------|-----|----------|-------------|
| Critical | 3 | 1 | 2 |
| High | 4 | 4 | 5 |
| Medium | 5 | 8 | 6 |
| Low | 5 | 6 | 7 |
| **Total** | **17** | **19** | **20** |

### Common Findings (present in 2+ worktrees)

These are architectural/systemic issues inherent to the shared project constraints, not framework-specific failures:

| Finding | GSD | Spec Kit | Superpowers | Notes |
|---------|-----|----------|-------------|-------|
| Real secrets in `.env.local` on disk | C1 | C-01 | C-01 | All three share the **same** OpenAI key, Pinata JWT, and deployer private key (`0x05f472...`). This is the same key across all worktrees. |
| No auth on write API endpoints | C3 | H-02 | H-04 | All allow unauthenticated triggers of expensive LLM evaluations |
| Rate limiting ineffective/disabled | H1 | H-03 | C-02 | GSD: in-memory (useless in serverless). Spec Kit: silently returns `success: true` when unconfigured. Superpowers: crashes because Upstash creds are missing. |
| CSP allows `unsafe-inline` | H3 | M-08 | M-04 | All three include `'unsafe-inline'` in script-src; Spec Kit and Superpowers also add `'unsafe-eval'` |
| Single deployer key for all roles | M4 | L-01 | -- | GSD and Spec Kit both use the same key for registration and evaluation |
| Integer division truncation in Solidity | L2 | L-03 | M-06 | All implementations have score averaging precision loss |
| Unbounded event/loop scans | H4 | L-02, L-03 | M-05 | GSD scans from block 0, Spec Kit/Superpowers have unbounded `getSummary()` loops |

### Unique Findings

**GSD only:**
- **C2: Score unit mismatch** -- TypeScript sends `score * 100` (basis points) but Solidity contract has `MAX_SCORE = 100`. This is a show-stopping functional bug unique to GSD. Neither other worktree has this mismatch.
- Naive evaluation prompt (unstructured `generateText` alongside structured judges) -- an interesting comparison mechanism absent from the other two.

**Spec Kit only:**
- **H-01: Webhook signature bypass** -- signature verification only runs when both header AND secret are present. Omitting the header skips verification entirely. This is the most subtle security bug across all three.
- **M-01: NextAuth with zero providers** -- auth exists structurally but is non-functional.
- **M-02: Server-to-server SSRF via operator dashboard** -- fetch-to-self pattern with configurable URL.
- **M-07: SQL LIKE special chars not escaped** -- only relevant because Spec Kit is the only one with SQL queries.
- **L-05: DisputeRegistry locks staked funds** -- accepts ETH but has no distribution mechanism.

**Superpowers only:**
- **H-01: `setAgentWallet` signature is a no-op** -- accepts an EIP-712 signature parameter but never verifies it. Security theater.
- **H-02: `initialize` has no access control** -- front-running vulnerability during deployment.
- **H-03: `appendResponse` open to anyone** -- spam vector for off-chain indexers.
- **M-02: DOMPurify imported but never used** -- dead dependency.
- **L-04: IPFS verification returns `true` on failure** -- verification is unreliable.

### Security Winner: **GSD**

Despite having the most critical findings (3 vs 1 for Spec Kit), GSD's security posture is the strongest because:
1. Its smaller attack surface (no database, no webhooks, no auth layer) means fewer things can go wrong.
2. Its code quality discipline (near-zero `as Type` in application code) reduces runtime type confusion.
3. C2 (score mismatch) is a functional bug that would be caught by the first integration test -- it is not exploitable by an attacker.
4. Spec Kit's H-01 (webhook signature bypass) is a more dangerous real-world vulnerability because it could be exploited by an attacker who compromises an API key.

---

## 3. Architecture Quality

### GSD (full-vision-roadmap)

**Structure:** `src/lib/` cleanly separates `chain/`, `evaluation/`, `ipfs/`, `schemas/`, `constants/`. Components are domain-organized (`evaluation/`, `proposals/`, `reputation/`). The orchestrator (`src/lib/evaluation/orchestrator.ts`) uses a typed discriminated union (`EvaluationProgressEvent`) for SSE streaming -- 8 event types, each with a distinct `type` field. This is textbook TypeScript pattern design.

**File:** `src/lib/evaluation/orchestrator.ts:11-33` -- the `EvaluationProgressEvent` union type is the cleanest type definition across all three worktrees.

**Weakness:** No database layer means no persistence, no idempotency checks, and no caching. Everything depends on IPFS and on-chain reads, which are slow and expensive.

### Spec Kit (speckit)

**Structure:** Source lives outside the standard Next.js `src/app/` + `src/lib/` pattern. Domain modules are top-level: `src/evaluation/`, `src/chain/`, `src/cache/`, `src/graph/`, `src/ipfs/`, `src/monitoring/`, `src/reputation/`. The `src/lib/` directory holds cross-cutting concerns (auth, rate-limit, api-key, security-log). This is the most modular architecture.

**File:** `src/cache/schema.ts` defines 8 tables with proper indexes (`src/cache/schema.ts:25-30`). This is the only worktree with database indexes.

**File:** `src/evaluation/orchestrate.ts` is the most complete orchestration -- sanitization, duplicate check, evaluation, reputation lookup, anomaly detection, IPFS pinning, chain data preparation, and error handling with job status tracking. 204 lines, well-structured.

**Weakness:** The `src/app/dashboard/operator/` pattern with fetch-to-self (`src/app/dashboard/operator/page.tsx:52-60`) is an anti-pattern. The monitoring module (`src/monitoring/`) is scaffolded but appears to be a cron-driven agent -- an ambitious feature that adds complexity without being wired to the core flow.

### Superpowers (superpower)

**Structure:** Standard Next.js pattern with `src/lib/` for business logic and `src/app/api/` for routes. The evaluation architecture is unique: the trigger endpoint (`POST /api/evaluate/[id]`) returns per-dimension stream URLs, and each dimension has its own API route (`/api/evaluate/[id]/[dimension]/route.ts`) that runs the LLM call with streaming. The frontend can display all four judges evaluating simultaneously -- this is the best UX.

**File:** `src/app/api/evaluate/[id]/route.ts:53-62` returns a `streams` object pointing to 4 separate per-dimension endpoints. This enables parallel streaming UI.

**File:** `src/lib/evaluation/publish-chain.ts` is the most detailed on-chain publishing: register identity, 4x per-dimension `giveFeedback`, aggregate feedback. 161 lines with proper receipt verification.

**Weakness:** At 3,320 TS LoC (vs 5,160 and 5,400), this is the smallest implementation. Several features are incomplete (DOMPurify imported but unused, rate limiting configured but Upstash credentials missing).

### Architecture Winner: **Spec Kit**

Spec Kit has the most complete and well-organized architecture. Its domain module separation (evaluation, chain, cache, graph, ipfs, monitoring, reputation) is the most maintainable. GSD is a close second for code discipline, and Superpowers has the best evaluation-specific architecture.

---

## 4. Smart Contract Completeness

### Contract Inventory

| Contract | GSD | Spec Kit | Superpowers | Purpose |
|----------|-----|----------|-------------|---------|
| IdentityRegistry | Yes (106 LoC) | Yes (209 LoC) | Yes (193 LoC) | ERC-721 soulbound tokens for project registration |
| ReputationRegistry | Yes (135 LoC) | Yes (260 LoC) | Yes (308 LoC) | Feedback storage for evaluations |
| EvaluationRegistry | -- | Yes (108 LoC) | -- | Dedicated evaluation score storage |
| ValidationRegistry | -- | Yes (189 LoC) | -- | Cross-agent validation requests |
| MilestoneManager | -- | Yes (198 LoC) | Yes (154 LoC) | Fund release tied to evaluation scores |
| DisputeRegistry | -- | Yes (213 LoC) | -- | Challenge evaluation results |

**GSD:** 2 contracts, 241 LoC source, 271 LoC tests. Minimal but functional for v1. The CLAUDE.md explicitly says "Skip ValidationRegistry for v1" -- this is a deliberate scope choice.

**Spec Kit:** 6 contracts, 1,176 LoC source, 1,617 LoC tests. Full ERC-8004 implementation including dispute resolution and milestone management. The most complete contract suite by far.

**Superpowers:** 3 contracts, 655 LoC source, 584 LoC tests. Middle ground -- adds MilestoneManager beyond GSD's core two but skips validation and disputes.

### Test Coverage Quality

**GSD:** 14 tests per contract (28 total). Tests cover roles, events, soulbound behavior, pause, supply cap, URI length. Solid and focused.

**Spec Kit:** 6 test files totaling 1,617 lines. Most thorough -- DisputeRegistry tests at 339 lines cover dispute lifecycle, voting, resolution. Each contract test covers happy path, access control reverts, and edge cases.

**Superpowers:** 3 test files totaling 584 lines. Good coverage of IdentityRegistry (soulbound, max supply, batch operations) and ReputationRegistry (self-feedback prevention, average calculation). MilestoneManager tests cover the release flow.

### ERC-8004 Compliance

All three implement the IdentityRegistry as a soulbound ERC-721 (transfers blocked between non-zero addresses). All use OpenZeppelin AccessControl for role-based permissions. All use custom errors for gas efficiency. Spec Kit is the most complete ERC-8004 implementation with all six contract types.

### Notable Contract Issues

- **GSD C2:** Score mismatch makes `giveFeedback` revert for any realistic score. This is the most severe contract integration bug.
- **Spec Kit L-05:** DisputeRegistry accepts ETH stakes but never returns them. Funds are permanently locked.
- **Spec Kit L-04:** MilestoneManager uses 10,000 gas cap that would fail for multisig recipients.
- **Superpowers H-01:** `setAgentWallet` signature parameter is ignored -- false security guarantee.
- **Superpowers H-02:** `initialize()` has no access control -- front-running risk.
- **Superpowers H-03:** `appendResponse` has no authorization -- spam vector.

### Contract Winner: **Spec Kit**

Six contracts with 1,617 lines of tests. The scope is ambitious and the test coverage is the most thorough. The locked-funds bug in DisputeRegistry is concerning but less severe than GSD's broken score integration or Superpowers' access control gaps.

---

## 5. Stack Choices

| Decision | GSD | Spec Kit | Superpowers | Best Choice |
|----------|-----|----------|-------------|-------------|
| **Database** | None (pure on-chain + IPFS) | Drizzle + @libsql/client (SQLite/Turso) with 8 tables and indexes | Drizzle + @libsql/client (SQLite/Turso) with 3 tables | **Spec Kit.** A read cache is essential for performance. Reading proposals from IPFS on every page load (GSD) is too slow. Spec Kit's 8 tables with indexes are properly normalized. |
| **Auth** | None | NextAuth 5 beta (zero providers) | None | **Spec Kit**, despite being non-functional. The auth plumbing is in place -- adding a provider is trivial. The other two would need auth added from scratch. |
| **AI Framework** | Vercel AI SDK + @ai-sdk/openai | Vercel AI SDK + @ai-sdk/openai | Mastra + @ai-sdk/anthropic (Claude) | **Superpowers.** The project spec calls for Mastra + Anthropic. Superpowers is the only one that followed the spec. GSD and Spec Kit both use OpenAI instead of Anthropic, contradicting the CLAUDE.md constraint. |
| **Rate Limiting** | In-memory Map (useless in serverless) | @upstash/ratelimit (proper, but silently bypassed when unconfigured) | @upstash/ratelimit (proper, but crashes when unconfigured) | **Spec Kit.** The Upstash integration is correct and would work when configured. Superpowers crashes, GSD's in-memory approach is fundamentally wrong for serverless. |
| **IPFS** | Direct Pinata REST API with Zod-validated responses | Pinata SDK with schema validation | Pinata SDK with upload-then-verify pattern | **Superpowers.** The verify-after-upload pattern (`src/lib/ipfs/client.ts:36-39`) is the strongest, despite the failure fallback being too permissive. |
| **GraphQL** | None | graphql-request + The Graph queries | None | **Spec Kit.** The Graph integration enables efficient on-chain data indexing. GSD's approach of scanning from block 0 is unsustainable. |
| **Sanitization** | None | Full PII redaction pipeline (email, phone, CPF, IP, URL) with post-assertion | PII detection on submission (regex-based) + DOMPurify (unused) | **Spec Kit.** The `src/evaluation/sanitization.ts` is a complete pipeline: redact, then assert. Superpowers detects PII but does not integrate DOMPurify despite installing it. |
| **Prompt Injection Defense** | Anti-injection preamble in system prompts | Anti-injection preamble + PII sanitization before prompts reach LLM | Anti-injection preamble + anti-rationalization red flags + score anomaly detection | **Superpowers.** The anti-rationalization red flags (`src/lib/judges/prompts.ts:22-28`) and score anomaly detection (`src/lib/evaluation/orchestrator.ts:49-63`) are defense layers the others lack. |

---

## 6. Code Quality

### TypeScript Strictness

| Metric | GSD | Spec Kit | Superpowers |
|--------|-----|----------|-------------|
| `as Type` violations (app code) | 3 (one file: `evaluation/page.tsx:44-48`) | 4 (`scoring.ts:24`, `orchestrate.ts:127,160`, `pin.ts:12`) | 8+ (orchestrator, weights, routes, verify page) |
| `any` usage | 0 | 0 | 0 |
| `@ts-ignore`/`@ts-expect-error` | 0 | 0 | 0 |
| Non-null assertions (`!`) | 0 | 0 | 0 |
| Strict mode enabled | Yes | Yes | Yes |

All three maintain zero `any` and zero `@ts-ignore` -- commendable. The differentiator is `as Type` usage. GSD has the fewest violations in application code (3, all in one file). Superpowers has the most, spread across multiple files and many not guarded by runtime checks.

### Zod Validation Coverage

**GSD:** Excellent. All API routes validate with Zod. IPFS responses parsed through schemas. SSE events use discriminated unions. The `src/lib/ipfs/schemas.ts` and `src/lib/evaluation/schemas.ts` are single sources of truth.

**Spec Kit:** Excellent. Webhook payloads validated by `ProposalWebhookSchema` (`src/app/api/webhooks/proposals/route.ts:14-41`). IPFS content validated. Database queries use typed schemas. The `safeParse` pattern is used consistently.

**Superpowers:** Good. `ProposalInputSchema` is comprehensive (`src/types/index.ts:9-24`). API routes validate dimension parameters. However, the `as JudgeDimension` casts bypass validation in several places where Zod parsing should be used instead.

### Naming Conventions

All three follow semantic naming. None uses `Helper` or `Util` suffixes (the `utils.ts` files contain only `cn()` for Tailwind class merging, which is a framework convention). Spec Kit's domain module names (`evaluation/`, `reputation/`, `monitoring/`) are the most descriptive.

### Code Quality Winner: **GSD**

Fewest type violations, most consistent Zod validation, cleanest type design (the discriminated union for SSE events). Spec Kit is second -- its violations are fewer than Superpowers and its overall code organization is stronger.

---

## 7. Test Coverage

### Test Inventory

| Test Type | GSD | Spec Kit | Superpowers |
|-----------|-----|----------|-------------|
| Solidity unit tests | 2 files, 271 lines | 6 files, 1,617 lines | 3 files, 584 lines |
| TypeScript unit tests | 4 files (agents, orchestrator, 2 components) | 0 | 1 file (schema validation only) |
| E2E (Playwright) | 6 spec files + 6 BDD features | 18 spec files (API + UI + pages) | 1 spec file + 8 BDD features |
| BDD features (.feature) | 6 features (Gherkin) | 0 | 8 features (Gherkin) |

### Analysis

**GSD** has the best balance: TypeScript unit tests for core business logic (agents, orchestrator) AND component tests (score-radar-chart, score-summary-card), plus comprehensive E2E coverage with BDD features. This is the only worktree with unit tests for the evaluation pipeline.

**Spec Kit** has the broadest E2E coverage: 18 Playwright specs covering API routes (health, webhooks, cron, sync, proposals) AND UI pages (grants list, proposal detail, operator dashboard, navigation, security headers, screenshots). The API-level E2E tests are uniquely valuable -- no other worktree tests API routes via Playwright.

**Superpowers** has the weakest TypeScript test coverage: one unit test file that only validates Zod schema parsing. No unit tests for the orchestrator, judges, weights, or chain publishing. It has BDD features but only one compiled spec file.

### Test Quality

**GSD's orchestrator test** (`src/lib/evaluation/orchestrator.test.ts`) tests the core `computeAggregateScore` function and the orchestration flow with mocked AI responses. This catches bugs like the C2 score mismatch if extended to include chain integration.

**Spec Kit's API E2E tests** (`e2e/api/webhooks-proposals.spec.ts`) test real HTTP flows including authentication, rate limiting, and error responses. These are the most realistic tests.

**Superpowers' schema test** (`src/__tests__/api/proposals.test.ts`) only tests Zod parsing with 3 cases. Insufficient for catching logic regressions.

### Test Winner: **GSD**

GSD is the only worktree with unit tests for business logic (evaluation pipeline), component tests, AND E2E tests. Spec Kit has broader E2E coverage but zero unit tests. Superpowers has the weakest test coverage overall.

---

## 8. Defense-in-Depth Features

| Feature | GSD | Spec Kit | Superpowers |
|---------|-----|----------|-------------|
| Rate limiting (attempted) | In-memory Map | Upstash Redis | Upstash Redis |
| Rate limiting (functional) | No | Partially (bypasses when unconfigured) | No (crashes without creds) |
| PII sanitization | None | Full pipeline (email, phone, CPF, IP, URL redaction + post-assertion) | Detection only (regex check on submission) |
| DOMPurify HTML sanitization | Not installed | Installed, exported, but never called | Installed, exported, but never called |
| Prompt injection defense | Anti-injection preamble in system prompts | Anti-injection preamble in evaluation + monitoring prompts | Anti-injection preamble + anti-rationalization + anomaly detection |
| CSP headers | Yes (`unsafe-inline`) | Yes (`unsafe-inline` + `unsafe-eval`) | Yes (`unsafe-inline` + `unsafe-eval`) |
| X-Frame-Options | Not verified | Configured in `next.config.ts` | Configured in `next.config.ts` |
| HSTS | Not verified | Configured | Configured |
| Webhook signature verification | N/A | HMAC-SHA256 with constant-time comparison (bypassable) | N/A |
| Request ID tracking | None | Per-request IDs via `x-request-id` header | None |
| Security logging | None | Typed security events with timestamps | Typed security events with timestamps |
| Body size limits | 50KB (checked after parsing -- too late) | 256KB (checked before + after parsing -- good) | 256KB (checked before parsing) |
| Concurrent evaluation limits | In-memory Set (per-instance) | In-memory counter (per-instance) | In-memory counter (per-instance) |
| Origin/CSRF protection | None | `validateOrigin` (bypassed when env not set) | Origin header check (trivially spoofable) |
| Error boundary | None | React ErrorBoundary component | React ErrorBoundary component |
| Idempotent finalization | Not applicable (no DB) | Duplicate check via evaluation jobs | Existing aggregate check before recomputing |
| Score anomaly detection | None | `detectAnomalies` function | Anomaly flags with security logging |

### Defense-in-Depth Winner: **Spec Kit**

Spec Kit attempted the most security features and wired up the most correctly: Upstash rate limiting (works when configured), PII sanitization (full pipeline with post-assertion), HMAC webhook signatures (despite the bypass bug), request ID tracking, body size limits with double-check, and typed security logging. The webhook signature bypass is a real vulnerability, but the overall security posture is the most comprehensive.

Superpowers is second -- its anomaly detection and anti-rationalization prompts are strong LLM-specific defenses that the others lack. GSD is third -- it focused on code quality over defense-in-depth features.

---

## 9. Best-of-Breed Recommendation

| Dimension | Winner | One-Sentence Justification |
|-----------|--------|---------------------------|
| **Security** | GSD | Smallest attack surface, zero `any`, fewest type escape violations, least number of half-wired security features that create false confidence. |
| **Architecture** | Spec Kit | Most modular domain separation with 8 database tables, indexes, GraphQL integration, and the most complete feature set. |
| **Contracts** | Spec Kit | Six contracts with 1,617 lines of tests covering the full ERC-8004 lifecycle including disputes and milestones. |
| **Stack** | Superpowers | Only implementation using Mastra + Anthropic as specified; best evaluation UX with per-dimension streaming; upload-then-verify IPFS pattern. |
| **Code Quality** | GSD | 3 `as Type` violations in application code (vs 4 for Spec Kit, 8+ for Superpowers); best discriminated union design; most consistent Zod usage. |
| **Tests** | GSD | Only worktree with unit tests for business logic AND component tests AND E2E; BDD features for full coverage. |
| **Defense-in-Depth** | Spec Kit | Most comprehensive security feature set: PII pipeline, HMAC webhooks, Upstash rate limiting, request IDs, security logging, double body-size checks. |

---

## 10. Ideal Hybrid Blueprint

### Contract Suite: **Spec Kit**

Take Spec Kit's 6-contract suite (`contracts/src/`) and 6 test files (`contracts/test/`). Fix:
- L-05: Implement stake distribution in `DisputeRegistry.resolveDispute()`
- L-04: Increase `MilestoneManager.TRANSFER_GAS_CAP` to 50,000
- L-02/L-03: Replace unbounded loops in `getSummary()` with running totals

### API Route Pattern: **Superpowers (evaluation) + Spec Kit (webhooks)**

Take Superpowers' per-dimension streaming evaluation pattern (`/api/evaluate/[id]/[dimension]/route.ts`) for the evaluation flow -- it enables the best UX. Take Spec Kit's webhook pattern (`/api/webhooks/proposals/route.ts`) for external integrations -- it has API key validation, rate limiting, body size checks, and Zod validation (fix the signature bypass). Add real authentication to all write endpoints.

### AI Integration: **Superpowers**

Take Superpowers' Mastra + @ai-sdk/anthropic integration with Claude as the primary model. Keep:
- The judge prompt architecture (`src/lib/judges/prompts.ts`) with anti-injection, anti-rationalization, and calibration anchors
- The score anomaly detection (`src/lib/evaluation/orchestrator.ts:49-63`)
- The per-dimension streaming with `generateObject` and Zod schemas

Replace the hardcoded model ID with a constant from `src/lib/constants.ts`.

### Database Approach: **Spec Kit**

Take Spec Kit's Drizzle + @libsql/client schema (`src/cache/schema.ts`) with its 8 tables and indexes. Rename from `src/cache/` to `src/db/` -- it is not just a cache, it is the application's read model. Keep:
- `proposals` table with status tracking
- `dimensionScores` with model ID and prompt version for audit trail
- `evaluationJobs` for idempotency and retry tracking
- `platformIntegrations` for API key management
- Database indexes on `fundingRoundId`, `status`, `chainTimestamp`, `category`

### Test Strategy: **GSD's unit tests + Spec Kit's API E2E**

Take GSD's approach of unit testing business logic (`orchestrator.test.ts`, `agents.test.ts`) and component tests. Add Spec Kit's API-level E2E tests (`e2e/api/webhooks-proposals.spec.ts`, `e2e/api/health.spec.ts`) for integration coverage. Keep GSD's BDD features for acceptance criteria documentation.

Add what is missing from all three:
- Integration tests that verify the TypeScript-to-Solidity score pipeline end-to-end (would have caught GSD's C2)
- Contract fuzzing tests using Foundry's built-in fuzzer
- Load tests for the evaluation pipeline

### Security Patterns: **Spec Kit's features + GSD's discipline**

Take Spec Kit's defense-in-depth features but apply GSD's code quality standards:
- PII sanitization pipeline (`src/evaluation/sanitization.ts`) -- Spec Kit's is the most complete
- Upstash rate limiting -- Spec Kit's pattern, but fail-closed in production (deny when unconfigured, not silently pass)
- Webhook HMAC verification -- fix the bypass: require signature when secret is configured
- Request ID tracking and security logging
- Add real authentication (NextAuth with at least one provider, or wallet-based auth)
- CSP: remove `unsafe-eval`, use nonce-based for `unsafe-inline`

### What Is Missing from ALL Three

1. **Authentication.** No worktree has functional write endpoint authentication. This is the single biggest gap.
2. **Input sanitization before LLM prompts.** Spec Kit sanitizes PII but none strip prompt injection patterns from proposal text before it reaches the LLM. The anti-injection system prompt is defense-in-depth, not a boundary.
3. **End-to-end integration tests.** No worktree tests the full flow: submit proposal -> evaluate -> publish to IPFS -> write on-chain -> verify. GSD's C2 score mismatch would have been caught by such a test.
4. **Secrets management.** All three use `.env.local` files with real credentials. A production deployment needs Vercel environment variables, a secrets manager, or at minimum `dotenv-vault`.
5. **Monitoring and alerting.** Spec Kit has a monitoring module skeleton but none have health checks that verify external dependencies (IPFS gateway, RPC endpoint, AI API) at startup.
6. **Database migrations.** Both Spec Kit and Superpowers use Drizzle but neither has migration files committed. Schema changes would lose data.
7. **Contract upgrade strategy.** All contracts are non-upgradeable. For a testnet prototype this is acceptable, but production deployment needs proxy patterns or at least a documented migration path.

---

## 11. Scoring Matrix

| Dimension | GSD | Spec Kit | Superpowers | Notes |
|-----------|-----|----------|-------------|-------|
| **Security** | 7 | 6 | 5 | GSD: cleanest code but C2 is show-stopping. Spec Kit: most features but webhook bypass. Superpowers: most contract access control gaps. |
| **Architecture** | 6 | 8 | 7 | Spec Kit: most modular. Superpowers: best evaluation UX. GSD: clean but minimal. |
| **Contracts** | 5 | 8 | 6 | Spec Kit: 6 contracts, best tests. Superpowers: 3 with access control gaps. GSD: 2 minimal but correct (except C2). |
| **Stack** | 4 | 7 | 8 | Superpowers: follows Mastra/Anthropic spec. Spec Kit: most complete stack. GSD: no DB, no rate limiting. |
| **Code Quality** | 9 | 7 | 6 | GSD: near-zero violations, best types. Spec Kit: few violations. Superpowers: most as-casts. |
| **Tests** | 8 | 7 | 4 | GSD: unit + component + E2E. Spec Kit: broad E2E. Superpowers: schema validation only. |
| **Defense-in-Depth** | 4 | 8 | 6 | Spec Kit: most features. Superpowers: best LLM defenses. GSD: minimal. |
| **Overall** | **6.1** | **7.3** | **6.0** | Spec Kit built the most complete system. GSD wrote the cleanest code. Superpowers had the best design ideas. |

**Weighted formula:** Security (20%) + Architecture (15%) + Contracts (15%) + Stack (10%) + Code Quality (15%) + Tests (10%) + Defense-in-Depth (15%)

| | GSD | Spec Kit | Superpowers |
|--|-----|----------|-------------|
| Weighted | 6.25 | 7.25 | 5.95 |

---

## Appendix: Key File References

### GSD (full-vision-roadmap)
- Orchestrator: `src/lib/evaluation/orchestrator.ts` (128 LoC)
- Agents: `src/lib/evaluation/agents.ts` (57 LoC)
- Score bug: `src/lib/evaluation/storage.ts:93` (`BigInt(Math.round(score * 100))`)
- Contract: `contracts/src/ReputationRegistry.sol:61` (`MAX_SCORE = 100`)
- SSE types: `src/lib/evaluation/orchestrator.ts:11-33`
- Prompts: `src/lib/evaluation/prompts.ts`

### Spec Kit (speckit)
- Orchestrator: `src/evaluation/orchestrate.ts` (204 LoC)
- Agents: `src/evaluation/agents/runner.ts` (106 LoC)
- Sanitization: `src/evaluation/sanitization.ts` (121 LoC)
- Webhook: `src/app/api/webhooks/proposals/route.ts:96-109` (signature bypass)
- DB Schema: `src/cache/schema.ts` (133 LoC, 8 tables)
- Rate limiting: `src/lib/rate-limit.ts:35-37` (silent bypass)

### Superpowers (superpower)
- Orchestrator: `src/lib/evaluation/orchestrator.ts` (145 LoC)
- Chain publish: `src/lib/evaluation/publish-chain.ts` (161 LoC)
- Prompts: `src/lib/judges/prompts.ts` (anti-rationalization: lines 22-28)
- Per-dimension route: `src/app/api/evaluate/[id]/[dimension]/route.ts`
- DB Schema: `src/lib/db/schema.ts` (69 LoC, 3 tables)
- `as` violations: `src/lib/evaluation/orchestrator.ts:66,109`, `src/lib/judges/weights.ts:15`
