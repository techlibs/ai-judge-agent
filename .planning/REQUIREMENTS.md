# Requirements: Agent Reviewer

**Defined:** 2026-04-12
**Core Value:** Every grant proposal gets a fair, transparent, reproducible evaluation — with scores, justifications, and on-chain proof.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Proposals

- [ ] **PROP-01**: User can submit a proposal with structured fields (title, description, team info, budget, external links)
- [ ] **PROP-02**: User can view a list of all proposals with status and aggregate scores
- [ ] **PROP-03**: Proposal status transitions through: submitted → evaluating → evaluated
- [ ] **PROP-04**: User can view full proposal details on a dedicated page

### Storage (On-Chain + IPFS)

- [ ] **STORE-01**: Proposal content stored on IPFS with content hash recorded on-chain
- [ ] **STORE-02**: Evaluation results (per-judge + aggregate) stored on IPFS with content hashes on-chain
- [ ] **STORE-03**: On-chain contract stores scores and IPFS content hashes as the canonical source of truth
- [ ] **STORE-04**: Any off-chain read cache (if used) must be fully rebuildable from on-chain events and IPFS content

### AI Evaluation

- [ ] **EVAL-01**: 4 independent Judge Agents evaluate each proposal (Tech 25%, Impact 30%, Cost 20%, Team 25%)
- [ ] **EVAL-02**: Each agent produces structured output: score (0-100), justification, recommendation (strong_approve/approve/needs_revision/reject), key findings (max 3)
- [ ] **EVAL-03**: Weighted aggregate score (S0) computed from 4 dimension scores
- [ ] **EVAL-04**: IPE City values (pro-technology, pro-freedom, pro-human-progress) embedded as evaluation context in each agent prompt
- [ ] **EVAL-05**: Structured scoring rubric with calibrated bands per dimension (0-20, 21-40, 41-60, 61-80, 81-100)
- [ ] **EVAL-06**: Evaluation audit trail stored on IPFS (prompt sent, model used, raw response, parsed score, timestamp)
- [ ] **EVAL-07**: Real-time evaluation progress visible to users (via SSE or polling from Next.js API routes)
- [ ] **EVAL-08**: Before/after prompt comparison showing naive vs structured evaluation output

### On-Chain / Reputation

- [ ] **CHAIN-01**: ERC-8004 IdentityRegistry smart contract deployed to testnet (Sepolia or Base Sepolia)
- [ ] **CHAIN-02**: ERC-8004 ReputationRegistry smart contract deployed to testnet
- [ ] **CHAIN-03**: Project identity registered on-chain when first proposal is submitted
- [ ] **CHAIN-04**: Evaluation hash published to ReputationRegistry after aggregate score computed
- [ ] **CHAIN-05**: Reputation history per project queryable from on-chain events (indexed via The Graph or read cache)

### UI / Dashboard

- [ ] **UI-01**: Evaluation results page showing per-dimension breakdown (score, justification, recommendation, key findings)
- [ ] **UI-02**: Score visualization showing dimensional breakdown (radar chart or bar chart)
- [ ] **UI-03**: Progressive "live judging" experience showing agents completing in real-time
- [ ] **UI-04**: Public access — no authentication required for any page
- [ ] **UI-05**: Responsive design (mobile-friendly via Tailwind)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Monitoring

- **MON-01**: Monitor Agents track ongoing project performance (GitHub activity, on-chain transactions)
- **MON-02**: Milestone-based score updates trigger fund release ratios
- **MON-03**: Automated alerts when project activity drops below threshold

### Payments

- **PAY-01**: x402 payment flow for fund disbursement
- **PAY-02**: Milestone-gated fund release based on monitor agent scores

### Governance

- **GOV-01**: Dispute resolution system for contested evaluations
- **GOV-02**: ERC-8004 ValidationAdapter for challenge/appeal flow
- **GOV-03**: Reputation multiplier system adjusting scores based on project history

### Auth

- **AUTH-01**: User authentication for proposal submitters
- **AUTH-02**: Role-based access (submitter, reviewer, admin)

### Security

- [ ] **SEC-01**: All smart contract write functions must enforce role-based access control via OpenZeppelin AccessControl
- [ ] **SEC-02**: All cost-generating API endpoints must enforce per-IP and global rate limits via persistent Redis-backed rate limiting
- [ ] **SEC-03**: All user-submitted text fields must have server-side max length validation. Proposal text max 10KB. Request body max 256KB.
- [ ] **SEC-04**: ReputationRegistry and ValidationRegistry must receive IdentityRegistry address via constructor, not a separate initialize() function.
- [ ] **SEC-05**: setAgentWallet is removed for v1. Agent wallet management requires full EIP-712 verification and is deferred to v2.
- [ ] **SEC-06**: MilestoneManager must include a fund recovery mechanism for unreleased milestone funds, callable only by admin.
- [ ] **SEC-07**: All smart contract functions that transfer ETH must use OpenZeppelin ReentrancyGuard with nonReentrant modifier.
- [ ] **SEC-08**: Application must serve security headers: CSP, X-Frame-Options: DENY, X-Content-Type-Options: nosniff, HSTS with max-age 31536000.
- [ ] **SEC-09**: All IPFS-sourced content must be HTML-sanitized before rendering. No dangerouslySetInnerHTML with external content. URL schemes must be validated (reject javascript: URIs).
- [ ] **SEC-10**: AI judge system must include anti-prompt-injection defenses: hardened system prompts, score anomaly detection (flag all-high/all-low/extreme-divergence), and input preprocessing to strip injection patterns.
- [ ] **SEC-11**: GET endpoints must be read-only with no write side effects. Evaluation finalization must be triggered via POST. Evaluation pipeline must be idempotent.
- [ ] **SEC-12**: Streaming evaluation endpoints must set maxDuration=60, use AbortController with 90s timeout, and enforce a global cap of 10 concurrent evaluations.
- [ ] **SEC-13**: Webhook API keys must be per-platform, not global. Key validation must use constant-time comparison.
- [ ] **SEC-14**: Cron endpoints must validate Vercel CRON_SECRET via Authorization bearer header.
- [ ] **SEC-15**: Webhook endpoints must verify request body integrity via HMAC-SHA256 signature in X-Signature-256 header.
- [ ] **SEC-16**: All smart contracts must inherit OpenZeppelin Pausable with admin-controlled pause/unpause. Write functions must use whenNotPaused modifier. Fund recovery functions must remain callable when paused.
- [ ] **SEC-17**: IdentityRegistry must enforce a MAX_SUPPLY cap (1000 for v1) to prevent storage bloat attacks.
- [ ] **SEC-18**: ReputationRegistry view functions must be paginated or bounded to prevent out-of-gas DoS. readAllFeedback: max 100 per call. getSummary clientAddresses: max 50. Max feedback per agent: 10000.
- [ ] **SEC-19**: Mutating API routes must validate Origin header against allowed origins list.
- [ ] **SEC-20**: ReputationRegistry average calculations must use basis point scaling (10000x) to avoid integer division truncation.
- [ ] **SEC-21**: ReputationRegistry must normalize valueDecimals before aggregation, or enforce a fixed valueDecimals=2 for v1.
- [ ] **SEC-22**: ReputationRegistry feedback structs must use an explicit exists flag rather than checking against default values.
- [ ] **SEC-23**: Content must be scanned for residual PII patterns after sanitization and before IPFS pinning. Reject if PII detected.
- [ ] **SEC-25**: ETH transfers in MilestoneManager should use a gas cap of 10000 as defense-in-depth alongside nonReentrant.
- [ ] **SEC-26**: ReputationRegistry must verify agentId exists in IdentityRegistry before accepting feedback.
- [ ] **SEC-27**: IdentityRegistry tokens must be soulbound (non-transferable). Override _update to block transfers between non-zero addresses.
- [ ] **SEC-29**: Security-relevant events (rate limits, auth failures, score anomalies, PII detection) must be logged in structured JSON format.
- [ ] **SEC-30**: All API requests must be tagged with a unique request ID for end-to-end tracing.
- [ ] **SEC-31**: Score front-running risk documented. Commit-reveal pattern required before mainnet deployment (v2).
- [ ] **SEC-32**: IPFS client must use a provider interface to support multi-provider pinning in v2. Single provider (Pinata) accepted for v1.
- [ ] **SEC-36**: IPFS content must be validated with Zod schema on fetch, not cast with as Type.
- [ ] **SEC-37**: Chain transaction retries must use exponential backoff: initial 1s, multiplier 2x, max 30s, 5 attempts.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Token-gated voting / governance | AI-driven evaluation eliminates Sybil incentive; voting adds plutocratic bias |
| Sybil resistance / identity verification | No voting means no Sybil vector; re-evaluate if community input features added |
| AI grant writing assistance | Different product (applicant-side vs evaluator-side) |
| Multi-round grant management | Product unto itself; build single-evaluation pipeline first |
| Mobile app | Web-first with responsive design covers mobile needs |
| Full reputation multiplier | Needs historical data to be meaningful; store data structure now, algorithm later |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| PROP-01 | Phase 1 | Pending |
| PROP-02 | Phase 1 | Pending |
| PROP-03 | Phase 1 | Pending |
| PROP-04 | Phase 1 | Pending |
| STORE-01 | Phase 1 | Pending |
| STORE-02 | Phase 2 | Pending |
| STORE-03 | Phase 1 | Pending |
| STORE-04 | Phase 1 | Pending |
| EVAL-01 | Phase 2 | Pending |
| EVAL-02 | Phase 2 | Pending |
| EVAL-03 | Phase 2 | Pending |
| EVAL-04 | Phase 2 | Pending |
| EVAL-05 | Phase 2 | Pending |
| EVAL-06 | Phase 2 | Pending |
| EVAL-07 | Phase 2 | Pending |
| EVAL-08 | Phase 2 | Pending |
| CHAIN-01 | Phase 1 | Pending |
| CHAIN-02 | Phase 1 | Pending |
| CHAIN-03 | Phase 1 | Pending |
| CHAIN-04 | Phase 2 | Pending |
| CHAIN-05 | Phase 3 | Pending |
| UI-01 | Phase 2 | Pending |
| UI-02 | Phase 4 | Pending |
| UI-03 | Phase 2 | Pending |
| UI-04 | Phase 1 | Pending |
| UI-05 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 26 total
- Mapped to phases: 26
- Unmapped: 0

---
*Requirements defined: 2026-04-12*
*Last updated: 2026-04-12 after initial definition*
