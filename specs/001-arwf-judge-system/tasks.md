# Tasks: ARWF Judge System

**Input**: Design documents from `/specs/001-arwf-judge-system/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ (webhook-api.md, scoring-schema.md, ipfs-schemas.md, onchain-events.md)

**Tests**: Not included (not explicitly requested in feature specification). Add test phases per story if TDD is desired.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- All paths relative to repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization with Next.js App Router, Bun, TypeScript strict mode, and Foundry for smart contracts

- [X] T001 Create project structure per plan.md: src/app/, src/ipfs/, src/chain/, src/graph/, src/cache/, src/evaluation/, src/monitoring/, src/reputation/, src/lib/, contracts/src/, contracts/test/, contracts/subgraph/
- [X] T002 Initialize Next.js project with Bun, install core dependencies: next, react, react-dom, typescript, zod, drizzle-orm, @libsql/client, ai, @ai-sdk/anthropic, @ai-sdk/openai, viem, next-auth, pinata, tailwindcss, @graphprotocol/client
- [X] T003 [P] Configure TypeScript strict mode in tsconfig.json (no any, no type escapes)
- [X] T004 [P] Configure Tailwind CSS and initialize shadcn/ui in src/app/
- [X] T005 [P] Configure ESLint and Prettier for the project
- [X] T006 [P] Create .env.example with all required variables: ANTHROPIC_API_KEY, PINATA_JWT, PINATA_GATEWAY, TURSO_DATABASE_URL, TURSO_AUTH_TOKEN, AUTH_SECRET, WEBHOOK_API_KEY_HASH, NEXT_PUBLIC_CHAIN_ID, NEXT_PUBLIC_GRAPH_URL
- [X] T006a [P] Configure security headers in next.config.ts (CSP, X-Frame-Options: DENY, HSTS with max-age 31536000, X-Content-Type-Options: nosniff, Referrer-Policy, Permissions-Policy)
- [X] T007 [P] Initialize Foundry project in contracts/ with forge init, install OpenZeppelin contracts dependency

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST complete before ANY user story

**CRITICAL**: No user story work can begin until this phase is complete

- [X] T008 Define shared IPFS Zod schemas in src/ipfs/schemas.ts: ProposalContentSchema, EvaluationContentSchema, MonitoringReportSchema, DisputeEvidenceSchema, AgentRegistrationSchema, AgentFeedbackSchema
- [X] T009 [P] Define scoring Zod schemas in src/evaluation/schemas.ts: DimensionScoreSchema, SanitizedProposalSchema, DIMENSION_WEIGHTS constant, MonitoringScoreSchema
- [X] T010 [P] Implement IPFS Pinata client in src/ipfs/client.ts (Pinata SDK initialization from env)
- [X] T011 [P] Implement IPFS pin function in src/ipfs/pin.ts (validate with Zod, serialize to canonical JSON, pin to Pinata, return CID)
- [X] T012 [P] Configure viem chain client in src/chain/contracts.ts (Base L2 public client, contract addresses from env, ABI imports). Use DEPLOYMENT_BLOCK env var as fromBlock in all getLogs/getContractEvents calls to avoid scanning from genesis.
- [X] T013 [P] Configure Graph client in src/graph/client.ts (GraphQL client pointed at NEXT_PUBLIC_GRAPH_URL)
- [X] T014 Define all SQLite cache tables with Drizzle in src/cache/schema.ts: proposals, dimension_scores, fund_releases, agents, agent_feedback, disputes, funding_round_stats, platform_integrations, evaluation_jobs
- [X] T015 Implement Turso/LibSQL client in src/cache/client.ts (createClient from env vars)
- [X] T016 [P] Implement Auth.js v5 configuration in src/lib/auth.ts (OAuth2 providers, session config, middleware matcher for /dashboard/operator/*)
- [X] T017 [P] Implement per-platform API key validation utility in src/lib/api-key.ts (hash provided key with SHA-256, lookup in platform_integrations table, use crypto.timingSafeEqual for comparison). Implement HMAC-SHA256 webhook signature verification (verify X-Signature-256 header against per-platform webhookSecret).
- [X] T017a [P] Implement HTML sanitization utility for IPFS-sourced content in src/lib/sanitize-html.ts. Use isomorphic-dompurify with allowlist of safe tags. Export sanitizeDisplayText (strip ALL HTML) and sanitizeRichText (allow safe subset).
- [X] T017b [P] Add Origin header validation to mutating API routes (validate against NEXT_PUBLIC_APP_URL, exempt webhook endpoints which use API key auth).
- [X] T018 Create Next.js root layout in src/app/layout.tsx (HTML head, Tailwind, font, auth session provider)
- [X] T018a [P] Implement rate limiting middleware with @upstash/ratelimit in src/lib/rate-limit.ts (proposalSubmitLimiter: 5/hour/IP, evaluationTriggerLimiter: 10/hour/IP, globalEvaluationLimiter: 10/min global)
- [X] T018b [P] Add request ID generation middleware (use x-request-id header or crypto.randomUUID(), pass through to all downstream operations and log entries)

**Checkpoint**: Foundation ready - user story implementation can begin

---

## Phase 3: User Story 1 - Submit and Evaluate a Grant Proposal (Priority: P1) MVP

**Goal**: Accept proposals via webhook, run 4 Judge Agents (Technical Feasibility 25%, Impact Potential 30%, Cost Efficiency 20%, Team Capability 25%), produce weighted final score with structured justifications, pin to IPFS, record on-chain

**Independent Test**: POST a sample proposal to /api/webhooks/proposals and verify: 4 dimension scores + justifications produced, weighted final score calculated, content pinned to IPFS with CID, score submitted on-chain via EvaluationRegistry

### Smart Contracts for US1

- [ ] T019 [P] [US1] Implement EvaluationRegistry Solidity contract in contracts/src/EvaluationRegistry.sol (inherit AccessControl + Pausable, define SCORER_ROLE, apply onlyRole(SCORER_ROLE) whenNotPaused to submitScore(), proposalId, finalScore, adjustedScore, CIDs, EvaluationSubmitted event per onchain-events.md). Use custom errors instead of require strings. Monitor contract size with `forge build --sizes`.
- [ ] T020 [P] [US1] Implement IdentityRegistry Solidity contract (ERC-8004) in contracts/src/IdentityRegistry.sol (inherit ERC-721 + AccessControl + Pausable, define REGISTRAR_ROLE, apply onlyRole(REGISTRAR_ROLE) whenNotPaused to register(), MAX_SUPPLY=1000 cap, soulbound _update override blocking transfers, string length checks on agentURI max 256 bytes / metadataKey max 64 / metadataValue max 1024). Exclude agentWallet functionality (deferred to v2). Use custom errors. Monitor contract size with `forge build --sizes`.
- [ ] T021 [P] [US1] Write Foundry tests for EvaluationRegistry in contracts/test/EvaluationRegistry.t.sol (include access control tests: unauthorized submitScore reverts, paused state blocks writes)
- [ ] T022 [P] [US1] Write Foundry tests for IdentityRegistry in contracts/test/IdentityRegistry.t.sol (include access control tests, MAX_SUPPLY enforcement, soulbound transfer rejection, string length limit enforcement). Exclude agentWallet tests.

### Subgraph for US1

- [ ] T023 [US1] Define Graph subgraph schema for Evaluation and Agent entities in contracts/subgraph/schema.graphql
- [ ] T024 [US1] Configure subgraph manifest in contracts/subgraph/subgraph.yaml (EvaluationRegistry + IdentityRegistry data sources)
- [ ] T025 [US1] Implement subgraph event mappings for EvaluationSubmitted, Registered, URIUpdated, MetadataSet in contracts/subgraph/src/mappings.ts

### Application Logic for US1

- [ ] T026 [P] [US1] Implement PII sanitization in src/evaluation/sanitization.ts (hash team members, obfuscate emails, redact URLs per FR-006 and scoring-schema.md). After sanitization, scan output for residual PII patterns (email regex, phone, CPF, IP address). Reject if PII detected — do not pin to IPFS.
- [ ] T027 [P] [US1] Implement EvaluationRegistry chain interaction in src/chain/evaluation-registry.ts (submitScore: pin evaluation to IPFS, write finalScore + CIDs on-chain)
- [ ] T028 [P] [US1] Implement IdentityRegistry chain interaction in src/chain/identity-registry.ts (register agent, setAgentURI, getMetadata, setMetadata)
- [ ] T029 [US1] Create Judge Agent dimension configs and system prompts in src/evaluation/agents/ (one config per dimension: technical_feasibility, impact_potential, cost_efficiency, team_capability with rubric criteria). Include anti-injection system prompt text in SHARED_PREAMBLE (treat proposal as DATA not INSTRUCTIONS, ignore override attempts, flag manipulation in risks array).
- [ ] T030 [US1] Implement Judge Agent evaluation runner using Vercel AI SDK generateObject in src/evaluation/agents/runner.ts (call each agent with SanitizedProposalSchema input, validate output with DimensionScoreSchema). Add `export const maxDuration = 60` for Vercel Fluid Compute. Add AbortController with 90s hard timeout. Add concurrent evaluation limit check (max 10 active via Upstash Redis counter).
- [ ] T031 [US1] Implement weighted score calculation in src/evaluation/scoring.ts (S = 0.25*Tech + 0.30*Impact + 0.20*Cost + 0.25*Team, reputation multiplier: min(1 + reputationIndex/10000, 1.05))
- [ ] T031a [US1] Implement score anomaly detection in src/evaluation/anomaly.ts (flag ALL_SCORES_SUSPICIOUSLY_HIGH if all >=95, ALL_SCORES_SUSPICIOUSLY_LOW if all <=5, EXTREME_SCORE_DIVERGENCE if max-min >50 points). Store flags in evaluation record. Display warning badge on dashboard.
- [ ] T032 [US1] Implement evaluation orchestrator in src/evaluation/orchestrate.ts (sanitize PII, run 4 agents, compute weighted score, run anomaly detection, pin evaluation to IPFS, submit to chain, update evaluation_jobs). Add idempotency checks: before IPFS upload check if aggregateScores already has entry; before chain submission check if proposal status is already "published".
- [ ] T033 [US1] Implement proposal webhook route handler in src/app/api/webhooks/proposals/route.ts (validate API key, verify HMAC signature, check body size <=256KB, parse body with Zod including max length constraints, apply rate limit, sanitize PII, pin proposal to IPFS, create evaluation job, trigger evaluation per webhook-api.md). Add idempotency check: before creating evaluation record, check if one already exists for this (proposalId, dimension) pair.
- [ ] T033a [US1] Implement POST /api/evaluate/[id]/finalize endpoint (separate from GET status). Triggers IPFS upload + on-chain submission. Returns 409 if already finalized.
- [ ] T034 [US1] Implement evaluation job cache operations in src/cache/queries.ts (createEvaluationJob, updateEvaluationJobStatus, getEvaluationJob with retry tracking per FR-016)

**Checkpoint**: Submit a proposal via webhook, receive 4 dimension scores with justifications, weighted final score, IPFS CIDs, and on-chain confirmation

---

## Phase 4: User Story 2 - View Proposals and Scores on Dashboard (Priority: P1)

**Goal**: Public dashboard at /grants showing proposals with scores, justifications, fund status, reputation badges. Operator dashboard with auth. Data served from SQLite cache rebuilt from Graph + IPFS.

**Independent Test**: Navigate to /grants, see proposal listing with scores sorted by recent. Click a proposal, see full detail with 4 dimension scores, justifications, and verification links (IPFS + chain explorer)

### Cache and Data Layer for US2

- [ ] T035 [P] [US2] Implement Graph queries for evaluations, agents, and fund releases in src/graph/queries.ts
- [ ] T036 [P] [US2] Implement cache sync from Graph + IPFS in src/cache/sync.ts (query Graph for events, fetch IPFS CIDs, denormalize into SQLite tables, recompute derived fields)
- [ ] T037 [US2] Implement dashboard query functions in src/cache/queries.ts (listProposals with pagination/filtering/search, getProposalById with dimensions, getFundingRoundStats)

### API Routes for US2

- [ ] T038 [US2] Implement GET /api/proposals route in src/app/api/proposals/route.ts (pagination, fundingRoundId filter, status filter, full-text search, sort per webhook-api.md)
- [ ] T039 [US2] Implement GET /api/proposals/:id route in src/app/api/proposals/[id]/route.ts (full detail with evaluation dimensions, fund release, reputation, verification URLs per webhook-api.md)
- [ ] T040 [US2] Implement POST /api/sync route in src/app/api/sync/route.ts (operator-authenticated, triggers incremental cache rebuild)
- [ ] T041 [US2] Implement GET /api/rounds/:id/stats route in src/app/api/rounds/[id]/stats/route.ts (aggregate funding round statistics from cache)

### UI Pages for US2

- [ ] T042 [US2] Implement public grants listing page in src/app/grants/page.tsx (proposal cards with summary scores, category badges, pagination, funding round filter, search). Sanitize all IPFS-sourced text with sanitizeDisplayText() before rendering.
- [ ] T043 [US2] Implement proposal detail page in src/app/grants/[id]/page.tsx (final score, 4 dimension scores with expandable justifications, fund release status, reputation badge, IPFS/chain verification links). Sanitize all IPFS-sourced text (descriptions, reasoningChain) with sanitizeDisplayText() before rendering.
- [ ] T043a [US2] Add ChainErrorBoundary component in src/components/error-boundary.tsx and IPFS fetch timeouts (10s AbortController). Wrap chain/IPFS-dependent components with error boundaries.
- [ ] T044 [US2] Implement operator dashboard layout and sync controls in src/app/dashboard/operator/page.tsx (auth-protected, cache sync trigger, evaluation job status)

**Checkpoint**: Browse proposals at /grants, view full evaluation detail, verify data matches IPFS content via verification links

---

## Phase 5: User Story 3 - On-Chain Fund Release Based on Scores (Priority: P2)

**Goal**: Submit scores to MilestoneManager on-chain, release funds proportionally (score/1000), forward unreleased funds to MatchingPool, distribute bonuses to top performers (score >= 9.0)

**Independent Test**: After a proposal scores above threshold, verify MilestoneManager releases correct fund percentage on-chain, unreleased funds appear in MatchingPool, and cache reflects the release

- [ ] T045 [P] [US3] Implement MilestoneManager Solidity contract in contracts/src/MilestoneManager.sol (inherit AccessControl + Pausable + ReentrancyGuard, define RELEASE_MANAGER_ROLE, apply onlyRole(RELEASE_MANAGER_ROLE) whenNotPaused nonReentrant to releaseMilestone(), projectId, milestones, releasePercentage = score/10, FundReleased event, FundsForwarded event, BonusDistributed event per data-model.md). Include withdrawUnreleasedFunds and emergencyWithdraw functions (onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant, callable when paused). Use gas cap of 10000 on .call{value:} invocations. Use custom errors instead of require strings. Monitor contract size with `forge build --sizes`.
- [ ] T046 [P] [US3] Write Foundry tests for MilestoneManager in contracts/test/MilestoneManager.t.sol (include access control tests, ReentrancyGuard tests with reentrancy attack contract, fund recovery function tests, gas cap verification, paused state tests)
- [ ] T047 [US3] Add Graph subgraph entities and mappings for FundRelease, FundsForwarded, BonusDistributed in contracts/subgraph/
- [ ] T048 [US3] Implement MilestoneManager chain interaction in src/chain/milestone-manager.ts (submitScore triggers fund release, forward to MatchingPool, bonus distribution)
- [ ] T049 [US3] Integrate fund release into evaluation orchestrator in src/evaluation/orchestrate.ts (after chain score submission, trigger MilestoneManager)
- [ ] T050 [US3] Add fund release data to cache sync in src/cache/sync.ts (process FundReleased events, populate fund_releases table)
- [ ] T051 [US3] Add fund release section to proposal detail page in src/app/grants/[id]/page.tsx (release percentage, amount, tx hash, status)

**Checkpoint**: Score submission triggers proportional fund release on-chain, visible on dashboard with tx confirmation

---

## Phase 6: User Story 4 - Monitor Agent Continuous Tracking (Priority: P2)

**Goal**: Periodic Monitor Agent checks project progress (GitHub, on-chain, social), produces updated scores with risk flags, triggers fund release adjustments

**Independent Test**: Trigger a monitoring cycle for a funded project, verify updated score with GitHub/on-chain/social metrics and risk flags are produced and visible on dashboard

- [ ] T052 [P] [US4] Create Monitor Agent config and system prompt in src/monitoring/agent-config.ts (metrics collection strategy, risk flag criteria)
- [ ] T053 [P] [US4] Implement GitHub metrics collector in src/monitoring/github.ts (commit frequency, issue velocity, releases via GitHub API)
- [ ] T054 [P] [US4] Implement on-chain metrics collector in src/monitoring/onchain.ts (transaction count, fund utilization via viem)
- [ ] T055 [P] [US4] Implement social metrics collector in src/monitoring/social.ts (announcements, community engagement)
- [ ] T056 [US4] Implement Monitor Agent runner using Vercel AI SDK generateObject in src/monitoring/runner.ts (collect metrics, generate MonitoringScoreSchema output, produce risk flags)
- [ ] T057 [US4] Implement monitoring orchestrator in src/monitoring/orchestrate.ts (run Monitor Agent, pin MonitoringReport to IPFS, submit updated score to chain, trigger fund release recalculation)
- [ ] T058 [US4] Implement monitoring cron API route in src/app/api/cron/monitoring/route.ts (scheduled trigger for monitoring cycles per project). Validate CRON_SECRET via Authorization bearer header — return 401 if invalid.
- [ ] T059 [US4] Add monitoring data and risk flags display to proposal detail page in src/app/grants/[id]/page.tsx

**Checkpoint**: Monitoring cycle runs on schedule, produces updated score with metrics and risk flags, visible on dashboard

---

## Phase 7: User Story 5 - Dispute Resolution (Priority: P3)

**Goal**: Applicants initiate disputes within time window, register on-chain with staked collateral, validators vote, verdict updates score and fund release

**Independent Test**: Submit a dispute for an evaluated proposal, cast validator votes, verify verdict updates score on-chain and in cache

- [ ] T060 [P] [US5] Implement DisputeRegistry Solidity contract in contracts/src/DisputeRegistry.sol (disputeId, staking, voting, time window, DisputeOpened/DisputeVoteCast/DisputeResolved events per data-model.md)
- [ ] T061 [P] [US5] Write Foundry tests for DisputeRegistry in contracts/test/DisputeRegistry.t.sol
- [ ] T062 [US5] Add Graph subgraph entities and mappings for Dispute, DisputeVote in contracts/subgraph/
- [ ] T063 [US5] Implement DisputeRegistry chain interaction in src/chain/dispute-registry.ts (openDispute, castVote, resolveDispute, getDisputeStatus)
- [ ] T064 [US5] Implement dispute webhook handler in src/app/api/webhooks/disputes/route.ts (validate API key, parse body, register dispute on-chain per webhook-api.md)
- [ ] T065 [US5] Add dispute data to cache sync in src/cache/sync.ts (process DisputeOpened, DisputeVoteCast, DisputeResolved events)
- [ ] T066 [US5] Implement score override logic on dispute overturn (archive old score, insert new score, recalculate fund releases)
- [ ] T067 [US5] Add dispute status and voting UI to proposal detail page in src/app/grants/[id]/page.tsx

**Checkpoint**: Dispute lifecycle works end-to-end: open, vote, resolve (uphold/overturn), score updates reflected everywhere

---

## Phase 8: User Story 6 - Reputation Persistence and Portability (Priority: P3)

**Goal**: Write reputation feedback to on-chain ReputationRegistry after evaluation cycles, validate judge capabilities via ValidationRegistry, apply reputation multiplier on future evaluations

**Independent Test**: Complete an evaluation cycle, verify reputation feedback written on-chain for judge agents, confirm multiplier applies correctly on a subsequent proposal evaluation

- [ ] T068 [P] [US6] Implement ReputationRegistry Solidity contract (ERC-8004) in contracts/src/ReputationRegistry.sol (inherit AccessControl + Pausable, define EVALUATOR_ROLE, apply onlyRole(EVALUATOR_ROLE) whenNotPaused to giveFeedback() and appendResponse(), receive identityRegistry address via constructor parameter NOT initialize(), cross-contract validation via ownerOf(agentId), enforce valueDecimals=2 for v1, tag1/tag2 max 64 bytes, MAX_FEEDBACK_PER_AGENT=10000, add exists flag to Feedback struct, paginate readAllFeedback with limit max 100, cap getSummary clientAddresses at 50, use basis point scaling for averages, giveFeedback, revokeFeedback, appendResponse, getSummary, anti-Sybil rules per data-model.md). Use custom errors. Monitor contract size with `forge build --sizes`.
- [ ] T069 [P] [US6] Implement ValidationRegistry Solidity contract (ERC-8004) in contracts/src/ValidationRegistry.sol (receive identityRegistry address via constructor parameter NOT initialize(), validationRequest, validationResponse, getSummary per data-model.md)
- [ ] T070 [P] [US6] Write Foundry tests for ReputationRegistry in contracts/test/ReputationRegistry.t.sol
- [ ] T071 [P] [US6] Write Foundry tests for ValidationRegistry in contracts/test/ValidationRegistry.t.sol
- [ ] T072 [US6] Add Graph subgraph entities and mappings for AgentFeedback, FeedbackResponse, Validation in contracts/subgraph/
- [ ] T073 [US6] Implement ReputationRegistry chain interaction in src/chain/reputation-registry.ts (giveFeedback, revokeFeedback, getSummary)
- [ ] T074 [US6] Implement ValidationRegistry chain interaction in src/chain/validation-registry.ts (validationRequest, validationResponse, getSummary)
- [ ] T075 [US6] Implement reputation feedback writer in src/reputation/feedback.ts (post feedback after evaluation, link to agent's ERC-8004 identity, tag with dimension + round)
- [ ] T076 [US6] Implement reputation multiplier lookup in src/reputation/multiplier.ts (read from ReputationRegistry getSummary, calculate min(1 + index/10000, 1.05))
- [ ] T077 [US6] Integrate reputation multiplier into evaluation scoring in src/evaluation/scoring.ts (lookup prior reputation before computing adjustedScore)
- [ ] T078 [US6] Add reputation and agent feedback data to cache sync in src/cache/sync.ts (process NewFeedback, FeedbackRevoked, ValidationResponse events)
- [ ] T079 [US6] Add reputation badges and agent feedback display to dashboard in src/app/grants/[id]/page.tsx

**Checkpoint**: Reputation feedback written on-chain after evaluation, multiplier applied on subsequent evaluations, badges visible on dashboard

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T080 [P] Pin ERC-8004 agent registration JSON documents to IPFS for all 5 agents (4 Judge + 1 Monitor) per ipfs-schemas.md AgentRegistrationSchema
- [ ] T081 [P] Implement cache:rebuild and cache:sync CLI scripts referenced in quickstart.md
- [ ] T082 [P] Implement cache:migrate script for Drizzle schema push to Turso
- [ ] T083 Security audit: verify PII never reaches IPFS or chain (sanitization review across all write paths)
- [ ] T084 Performance optimization: ensure dashboard loads within 2-3 seconds (SC-005), add SQLite indexes per data-model.md
- [ ] T085 Run quickstart.md validation end-to-end
- [ ] T083a [P] Implement structured security event logging in src/lib/security-log.ts (log rate_limited, auth_failed, score_anomaly, pii_detected, injection_attempt events as JSON with timestamp and level: "SECURITY")
- [ ] T085a [P] Add GET /api/health endpoint checking db, IPFS, and chain connectivity. Return { healthy: boolean, checks: { db, ipfs, chain } } with 200 or 503.
- [ ] T086 [P] Add error handling for failed evaluations (FR-016: retry up to 3 times) and failed chain transactions (FR-017: exponential backoff with parameters: initial 1s, multiplier 2x, max 30s, 5 attempts)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Foundational - MVP, start first
- **US2 (Phase 4)**: Depends on Foundational; benefits from US1 data but can start in parallel with mock data
- **US3 (Phase 5)**: Depends on US1 (needs evaluation scores on-chain)
- **US4 (Phase 6)**: Depends on US1 and US3 (needs funded projects)
- **US5 (Phase 7)**: Depends on US1 (needs evaluated proposals)
- **US6 (Phase 8)**: Depends on US1 (needs evaluation cycles for feedback)
- **Polish (Phase 9)**: Depends on all desired user stories being complete

### User Story Dependencies

```
Phase 1 (Setup) → Phase 2 (Foundational)
                        ↓
              ┌─────────┼──────────┐
              ↓         ↓          ↓
         US1 (P1)   US2 (P1)   (can start with mock data)
              ↓         
         ┌────┼────┐
         ↓    ↓    ↓
      US3   US5   US6  (P2/P3 - all depend on US1)
         ↓
        US4  (P2 - depends on US1 + US3)
```

### Within Each User Story

- Smart contracts before chain interaction code
- Subgraph before cache sync
- Zod schemas before code that uses them
- Backend (API routes) before frontend (UI pages)
- Core logic before integration points
- Models/schemas before services
- Services before route handlers

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel
- US1 smart contracts (T019, T020, T021, T022) can all run in parallel
- US1 application logic (T026, T027, T028) can run in parallel
- US2 cache/data layer (T035, T036) can run in parallel
- US2 API routes can run sequentially after data layer
- US2 UI pages can run after API routes
- US3 contract + tests (T045, T046) can run in parallel
- US4 metric collectors (T053, T054, T055) can run in parallel
- US5 contract + tests (T060, T061) can run in parallel
- US6 contracts + tests (T068, T069, T070, T071) can run in parallel
- US1 and US2 can proceed in parallel after Foundational (US2 uses mock data initially)

---

## Parallel Example: User Story 1 (Smart Contracts)

```bash
# Launch all US1 contracts in parallel:
Task: "Implement EvaluationRegistry Solidity contract in contracts/src/EvaluationRegistry.sol"
Task: "Implement IdentityRegistry Solidity contract in contracts/src/IdentityRegistry.sol"
Task: "Write Foundry tests for EvaluationRegistry in contracts/test/EvaluationRegistry.t.sol"
Task: "Write Foundry tests for IdentityRegistry in contracts/test/IdentityRegistry.t.sol"

# Then launch parallel application logic:
Task: "Implement PII sanitization in src/evaluation/sanitization.ts"
Task: "Implement EvaluationRegistry chain interaction in src/chain/evaluation-registry.ts"
Task: "Implement IdentityRegistry chain interaction in src/chain/identity-registry.ts"
```

## Parallel Example: User Story 4 (Metric Collectors)

```bash
# Launch all metric collectors in parallel:
Task: "Implement GitHub metrics collector in src/monitoring/github.ts"
Task: "Implement on-chain metrics collector in src/monitoring/onchain.ts"
Task: "Implement social metrics collector in src/monitoring/social.ts"
```

---

## Implementation Strategy

### MVP First (US1 + US2)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (evaluation pipeline)
4. **STOP and VALIDATE**: Submit a test proposal, verify scores produced
5. Complete Phase 4: User Story 2 (dashboard)
6. **STOP and VALIDATE**: Browse proposals at /grants, verify full evaluation detail
7. Deploy MVP to Vercel

### Incremental Delivery

1. Setup + Foundational -> Foundation ready
2. US1 (evaluation) -> Test independently -> First value (MVP backend!)
3. US2 (dashboard) -> Test independently -> Deploy/Demo (MVP visible!)
4. US3 (fund release) -> Test independently -> Financial outcomes work
5. US4 (monitoring) -> Test independently -> Ongoing accountability
6. US5 (disputes) -> Test independently -> Fairness safety valve
7. US6 (reputation) -> Test independently -> Long-term value accumulation
8. Polish -> Production hardening

### Parallel Team Strategy

With multiple developers after Foundational:
- Developer A: US1 (Smart Contracts - Solidity/Foundry)
- Developer B: US1 (Application Logic - TypeScript/Next.js)
- Developer C: US2 (Dashboard UI - React/shadcn)
- After US1 completes: redistribute to US3-US6

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story
- Each user story is independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- On-chain data is source of truth; SQLite cache is always rebuildable
- All IPFS content must pass Zod validation before pinning
- PII must NEVER reach IPFS, chain, or LLM inputs
