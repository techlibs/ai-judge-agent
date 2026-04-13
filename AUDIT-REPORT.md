# Security Audit Report: Speckit Worktree

**Worktree:** `.worktrees/speckit/`
**Date:** 2026-04-13
**Auditor:** Claude Opus 4.6 (automated)
**Scope:** Full-stack security audit -- Next.js API routes, Solidity contracts, auth, database, IPFS, GraphQL, rate limiting, secrets

---

## Executive Summary

The speckit worktree implements the most complete stack of the three worktrees: 6 Solidity contracts, 8 API routes, Drizzle ORM, NextAuth, Upstash rate limiting, GraphQL (The Graph), IPFS (Pinata), and AI evaluation agents. The code demonstrates strong security awareness (Zod validation at boundaries, HMAC webhook signatures, constant-time comparison, PII redaction, anti-prompt-injection instructions, CSP headers). However, several findings require attention, including leaked secrets on disk, webhook signature bypass logic, missing authentication on public API routes, and Solidity gas concerns.

**Findings by Severity:**
- CRITICAL: 1
- HIGH: 4
- MEDIUM: 8
- LOW: 6
- INFORMATIONAL: 5

---

## CRITICAL

### C-01: Live API Keys and Private Key on Disk in .env.local

**File:** `.env.local:2,5,20`
**Description:** The `.env.local` file contains a live OpenAI API key (`sk-svcacct-...`), a Pinata JWT with embedded credentials, a deployer private key (`0x05f472...`), and an AUTH_SECRET. While `.env.local` is correctly listed in `.gitignore` and is NOT tracked by git, these are real production credentials sitting on the filesystem. The deployer private key controls all 6 deployed contracts on Base Sepolia (it holds DEFAULT_ADMIN_ROLE on every contract). If this worktree is shared, backed up, or the `.gitignore` is ever modified, all credentials are exposed.

**Impact:** Full compromise of all deployed contracts, OpenAI billing, IPFS account.

**Remediation:**
1. Rotate the OpenAI API key immediately at platform.openai.com
2. Rotate the Pinata JWT at app.pinata.cloud
3. Generate a new deployer wallet and transfer admin roles on all 6 contracts
4. Rotate the AUTH_SECRET
5. Use a secrets manager (Vercel env vars, 1Password CLI, or `dotenv-vault`) instead of a plain file

---

## HIGH

### H-01: Webhook Signature Verification is Optional -- Bypass by Omitting Header

**File:** `src/app/api/webhooks/proposals/route.ts:96-109`
**File:** `src/app/api/webhooks/disputes/route.ts:66-79`

**Description:** Both webhook routes only verify the `X-Signature-256` header if it is present AND the platform has a `webhookSecret`. If an attacker has a valid API key but omits the signature header, the request is accepted without signature verification:

```typescript
const signature = request.headers.get("X-Signature-256");
if (signature && keyValidation.webhookSecret) {
  // only verified when BOTH are present
}
```

An attacker with a stolen or leaked API key can forge arbitrary webhook payloads without knowing the webhook secret.

**Impact:** Arbitrary proposal submissions and dispute creation if an API key is compromised.

**Remediation:** Make signature verification mandatory when `keyValidation.webhookSecret` is set. Reject requests that lack a signature when the platform has a configured secret:

```typescript
if (keyValidation.webhookSecret) {
  if (!signature) {
    return NextResponse.json({ error: "MISSING_SIGNATURE" }, { status: 401 });
  }
  const valid = await verifyWebhookSignature(rawBody, signature, keyValidation.webhookSecret);
  if (!valid) {
    return NextResponse.json({ error: "INVALID_SIGNATURE" }, { status: 401 });
  }
}
```

### H-02: Finalize Evaluation Endpoint Has No Authentication

**File:** `src/app/api/evaluate/[id]/finalize/route.ts:6-50`

**Description:** The POST `/api/evaluate/[id]/finalize` endpoint has no authentication whatsoever -- no API key check, no session check, no origin validation. Anyone who knows a proposal ID can call this endpoint.

Currently the endpoint appears to be a read-only stub (it returns existing data rather than triggering state changes), but the route name and HTTP method (POST) suggest it was intended to finalize evaluations. If finalization logic is added later without authentication, it becomes a critical vulnerability.

**Impact:** Currently low (stub), but the pattern is dangerous for future development.

**Remediation:** Add authentication -- either `auth()` session check or API key validation.

### H-03: Rate Limiting Silently Disabled When Upstash Not Configured

**File:** `src/lib/rate-limit.ts:35-37`

**Description:** When `UPSTASH_REDIS_REST_URL` is not set, the rate limiter returns `{ success: true }` unconditionally:

```typescript
if (!process.env.UPSTASH_REDIS_REST_URL) {
  return { success: true, retryAfter: 0 };
}
```

In production, if the Upstash environment variable is accidentally removed or misconfigured, all rate limiting is silently disabled, exposing the system to DoS and abuse.

**Impact:** Complete bypass of rate limiting in production if env var is missing.

**Remediation:** In production (`NODE_ENV === 'production'`), throw an error or deny all requests if Upstash is not configured. Only allow the bypass in development.

### H-04: Cron Secret is Empty in .env.local -- Cron Route Returns 500

**File:** `.env.local:38` and `src/app/api/cron/monitoring/route.ts:12-15`

**Description:** `CRON_SECRET` is empty in `.env.local`. The cron route returns a 500 error ("CRON_SECRET not configured") when called, which is correct behavior. However, the error message reveals server configuration details. More importantly, if a deployment accidentally sets `CRON_SECRET=""` (empty string), the `Bearer ` comparison at line 19-20 would match any request with `Authorization: Bearer ` (with trailing space).

**Impact:** Potential authentication bypass if CRON_SECRET is set to an empty string.

**Remediation:** Add explicit validation: `if (!cronSecret || cronSecret.length < 16)`.

---

## MEDIUM

### M-01: NextAuth Configured with Zero Providers -- Auth is Inoperative

**File:** `src/lib/auth.ts:5`

**Description:** `providers: []` means no one can actually sign in. The `auth()` function will always return `null`, which means:
- The operator dashboard at `/dashboard/operator` always redirects to sign-in (which also won't work)
- The `/api/sync` route is effectively permanently locked out
- The `SyncButton` server action on the operator page will silently fail

This is not a vulnerability per se (it fails closed), but it means the authenticated functionality is non-functional.

**Impact:** All auth-protected features are inaccessible.

**Remediation:** Add at least one provider (e.g., credentials provider for operator access, or GitHub OAuth).

### M-02: Operator Dashboard Sync Button Bypasses Auth via Server-to-Server Fetch

**File:** `src/app/dashboard/operator/page.tsx:52-60`

**Description:** The `SyncButton` server action calls `fetch()` to `/api/sync` from the server side. This server-to-server fetch does NOT carry the user's session cookie, so the sync route's `auth()` check will fail. The action checks `session` before making the call, but the sync endpoint itself will return 401.

Additionally, the fetch URL is constructed from `NEXT_PUBLIC_APP_URL` which in local dev is `http://localhost:3000` -- if this env var is wrong in production, the server action would make requests to the wrong server (SSRF vector).

**Impact:** Sync functionality is broken; potential SSRF if `NEXT_PUBLIC_APP_URL` is misconfigured.

**Remediation:** Call `syncCache()` directly in the server action instead of going through HTTP. Remove the fetch-to-self pattern.

### M-03: GraphQL Query Depth and Introspection Not Controlled

**File:** `src/graph/queries.ts` (all queries), `src/graph/client.ts`

**Description:** The GraphQL client connects to The Graph's subgraph endpoint. While the queries are hardcoded (not user-supplied), the `NEXT_PUBLIC_GRAPH_URL` is a public env var exposed to the client. An attacker could use this URL to run arbitrary queries against the subgraph, including introspection queries to map the entire schema.

The Graph subgraphs are inherently public and read-only, so this is low-risk for this specific setup, but the pattern of exposing the Graph URL as `NEXT_PUBLIC_` unnecessarily increases the attack surface.

**Impact:** Information disclosure of subgraph schema and data (mitigated by The Graph being public by design).

**Remediation:** Rename to `GRAPH_URL` (server-only). Route all Graph queries through server-side code.

### M-04: JSON.parse on Database Strings Without Try-Catch in Frontend

**File:** `src/app/grants/[id]/page.tsx:141-142,160`
**File:** `src/app/api/proposals/[id]/route.ts:42,44`

**Description:** `JSON.parse(dim.rubricApplied)` and `JSON.parse(dim.inputDataConsidered)` are called on database strings without try-catch. If the database contains malformed JSON (from a bug, migration, or corruption), these calls will throw unhandled exceptions, crashing the page or API route.

**Impact:** Denial of service for individual proposal detail pages if data is corrupted.

**Remediation:** Wrap in try-catch or use Zod `.safeParse()` for JSON fields retrieved from the database.

### M-05: Origin Validation Bypassed When NEXT_PUBLIC_APP_URL is Unset

**File:** `src/lib/validate-origin.ts:21-23`

**Description:** If `NEXT_PUBLIC_APP_URL` is not set, the origin validation returns `null` (pass), allowing any origin to make mutating requests:

```typescript
if (!appUrl) {
  return null;  // no validation performed
}
```

**Impact:** CSRF protection is silently disabled if the env var is missing.

**Remediation:** Deny requests when `appUrl` is not configured in production.

### M-06: Content-Length Header Can Be Spoofed for Body Size Check

**File:** `src/app/api/webhooks/proposals/route.ts:62-65`

**Description:** The first body size check uses the `Content-Length` header, which can be set to any value by the client. The code does correctly re-check `rawBody.length` after reading the body (line 89), so this is defense-in-depth. However, the initial check provides a false sense of security -- a malicious client could send `Content-Length: 100` with a 1MB body, and the server would buffer the full body in memory before the second check rejects it.

**Impact:** Memory exhaustion if many large-body requests bypass the Content-Length check simultaneously.

**Remediation:** Use `request.body` streaming with a size-limited reader instead of `request.text()`.

### M-07: Search Parameter Passed Directly to SQL LIKE Without Escaping Special Characters

**File:** `src/cache/queries.ts:133`

**Description:** The search term is wrapped in `%...%` for a LIKE query, but SQL LIKE special characters (`%`, `_`) in the user input are not escaped:

```typescript
const searchTerm = `%${params.search}%`;
```

This is not SQL injection (Drizzle ORM parameterizes the value), but it allows users to craft search patterns that match unintended results. For example, searching for `%` would match all records, and `_` would match any single character.

**Impact:** Unexpected search results; minor information disclosure.

**Remediation:** Escape `%` and `_` in the search input before wrapping: `params.search.replace(/%/g, '\\%').replace(/_/g, '\\_')`.

### M-08: CSP Allows 'unsafe-inline' and 'unsafe-eval' for Scripts

**File:** `next.config.ts:27`

**Description:** The Content-Security-Policy includes `script-src 'self' 'unsafe-inline' 'unsafe-eval'`. While this is common for Next.js apps (which inject inline scripts), `unsafe-eval` is rarely necessary and widens the XSS attack surface. An XSS vulnerability could use `eval()` to execute arbitrary code.

**Impact:** Weakened XSS protection.

**Remediation:** Remove `'unsafe-eval'`. If Next.js requires inline scripts, use nonce-based CSP instead of `'unsafe-inline'`.

---

## LOW

### L-01: Deployer Private Key Env Var Name Suggests Production Use

**File:** `.env.local:20`, `.env.example` (no deployer key listed)

**Description:** `DEPLOYER_PRIVATE_KEY` is in `.env.local` but NOT in `.env.example`, which means future developers might not know it's needed and could accidentally use the same key in production. The naming doesn't distinguish testnet from mainnet.

**Remediation:** Add `DEPLOYER_PRIVATE_KEY=` to `.env.example` with a comment: `# TESTNET ONLY -- never use a mainnet key here`.

### L-02: ValidationRegistry.getSummary() Has Unbounded Loop

**File:** `contracts/src/ValidationRegistry.sol:150-176`

**Description:** `getSummary()` iterates over ALL validation requests to compute a per-agent summary. As `_requestCount` grows, this view function will exceed block gas limits:

```solidity
for (uint256 i = 0; i < _requestCount; i++) {
    if (_requests[i].agentId == agentId) {
```

**Impact:** `getSummary()` becomes uncallable after sufficient requests are submitted. This is a view function so it does not affect state-changing operations.

**Remediation:** Maintain per-agent counters (`totalRequests`, `respondedRequests`, `scoreSum`) updated in `validationRequest()` and `validationResponse()`.

### L-03: ReputationRegistry.getSummary() Has Unbounded Loop

**File:** `contracts/src/ReputationRegistry.sol:222-247`

**Description:** Same pattern as L-02. `getSummary()` iterates over all feedback entries for an agent. With `MAX_FEEDBACK_PER_AGENT = 10000`, this could consume significant gas.

**Impact:** View function may become very expensive at scale.

**Remediation:** Track running totals in storage, updated on `giveFeedback()` and `revokeFeedback()`.

### L-04: MilestoneManager Uses Low Gas Cap for ETH Transfers

**File:** `contracts/src/MilestoneManager.sol:104,114,154,170`

**Description:** `TRANSFER_GAS_CAP = 10000` is used for all `.call{gas: 10000}` transfers. This is enough for a plain EOA transfer (2300 gas) but will fail for smart contract recipients (e.g., multisigs, Gnosis Safes) that need more gas for receive/fallback logic.

**Impact:** Fund releases to smart contract wallets (common for DAOs and multisigs) will revert.

**Remediation:** Increase `TRANSFER_GAS_CAP` to at least `50000`, or remove the gas cap and rely on reentrancy guards (already present).

### L-05: DisputeRegistry Does Not Return Staked Funds After Resolution

**File:** `contracts/src/DisputeRegistry.sol:81-120,122-159,162-191`

**Description:** Both `openDispute()` and `castVote()` accept ETH stakes (`msg.value`), but `resolveDispute()` does not distribute or return these funds. Staked ETH is permanently locked in the contract with no withdrawal mechanism.

**Impact:** All dispute and voting stakes are lost.

**Remediation:** Implement stake distribution in `resolveDispute()`: return stakes to winners, slash losers' stakes to a treasury or the opposing side.

### L-06: PII Regex Patterns Have False Positives for IP Addresses

**File:** `src/evaluation/sanitization.ts:8-9`

**Description:** The `IP_ADDRESS_PATTERN` (`\b(?:\d{1,3}\.){3}\d{1,3}\b`) matches any 4 dotted numbers, including version numbers (e.g., "1.2.3.4"), budget amounts, and other numeric patterns. The `containsResidualPii()` check could incorrectly flag legitimate proposal content.

**Impact:** False positive PII detection could reject valid proposals.

**Remediation:** Add validation that each octet is 0-255, or only flag in the `assertNoPii` check (currently it runs post-sanitization, so this is defense-in-depth).

---

## INFORMATIONAL

### I-01: .env.example Lists ANTHROPIC_API_KEY but Code Uses OPENAI_API_KEY

**File:** `.env.example:2` vs `.env.local:2`

**Description:** `.env.example` lists `ANTHROPIC_API_KEY` but the actual code uses `OPENAI_API_KEY` (via `@ai-sdk/openai`). The runner in `src/evaluation/agents/runner.ts:2` imports `openai` from `@ai-sdk/openai`. This is confusing for developers.

### I-02: WEBHOOK_API_KEY_HASH Env Var Is Unused

**File:** `.env.local:41`, `.env.example:16`

**Description:** `WEBHOOK_API_KEY_HASH` is defined in the env files but never referenced in code. API key validation is done via the `platformIntegrations` database table. This dead env var is confusing.

### I-03: Good Practice: Constant-Time HMAC Comparison

**File:** `src/lib/api-key.ts:70-78`

**Description:** The webhook signature verification uses a byte-by-byte XOR comparison to prevent timing attacks. This is correct and well-implemented.

### I-04: Good Practice: Anti-Prompt-Injection in AI Agent Prompts

**File:** `src/evaluation/agents/prompts.ts:3-9`, `src/monitoring/agent-config.ts:3-6`

**Description:** Both evaluation and monitoring prompts include explicit anti-injection instructions telling the LLM to treat proposal data as DATA, not INSTRUCTIONS. This is a strong defense against prompt injection via proposal content.

### I-05: Good Practice: PII Redaction Pipeline

**File:** `src/evaluation/sanitization.ts`

**Description:** The sanitization pipeline strips emails, phone numbers, CPFs (Brazilian tax IDs), IP addresses, and URLs from proposal content before it reaches the AI agents and IPFS. Post-sanitization assertion ensures no residual PII passes through.

---

## Stack Verification

| Component | Detected | Version | Notes |
|-----------|----------|---------|-------|
| Next.js | Yes | 15.3.1 | App Router |
| React | Yes | 19.1.0 | |
| TypeScript | Yes | 5.8.3 | Strict mode |
| Tailwind CSS | Yes | 4.1.4 | |
| Drizzle ORM | Yes | 0.43.1 | SQLite via @libsql/client |
| @libsql/client | Yes | 0.15.7 | Turso-compatible |
| next-auth | Yes | 5.0.0-beta.28 | Zero providers configured |
| ai (Vercel AI SDK) | Yes | 4.3.16 | |
| @ai-sdk/anthropic | Yes | 1.2.12 | Installed but not imported in code |
| @ai-sdk/openai | Yes | 1.3.22 | Actually used for evaluation |
| viem | Yes | 2.28.3 | |
| Pinata | Yes | 1.7.0 | IPFS client |
| @upstash/ratelimit | Yes | 2.0.5 | |
| @upstash/redis | Yes | 1.34.3 | |
| graphql-request | Yes | 7.1.2 | |
| isomorphic-dompurify | Yes | 2.22.0 | |
| Zod | Yes | 3.24.4 | |
| Vitest | Yes | 3.1.2 | |
| Playwright | Yes | 1.52.0 | |
| Foundry (Solidity) | Yes | 0.8.24+ | 6 contracts |

### Solidity Contracts

| Contract | File | LoC | Access Control | Pausable | Key Findings |
|----------|------|-----|----------------|----------|--------------|
| IdentityRegistry | `contracts/src/IdentityRegistry.sol` | 209 | REGISTRAR_ROLE | Yes | Soulbound (non-transferable) ERC-721. Clean. |
| EvaluationRegistry | `contracts/src/EvaluationRegistry.sol` | 108 | SCORER_ROLE | Yes | Clean. Input validation present. |
| ReputationRegistry | `contracts/src/ReputationRegistry.sol` | 260 | EVALUATOR_ROLE | Yes | L-03: unbounded loop in getSummary() |
| ValidationRegistry | `contracts/src/ValidationRegistry.sol` | 189 | VALIDATOR_ROLE | Yes | L-02: unbounded loop in getSummary() |
| MilestoneManager | `contracts/src/MilestoneManager.sol` | 198 | RELEASE_MANAGER_ROLE | Yes | L-04: low gas cap; ReentrancyGuard present |
| DisputeRegistry | `contracts/src/DisputeRegistry.sol` | 213 | VALIDATOR_ROLE + ADMIN | Yes | L-05: staked funds not returned |

### API Routes

| Route | Method | Auth | Rate Limited | Input Validation | Findings |
|-------|--------|------|-------------|-----------------|----------|
| `/api/proposals` | GET | None | No | Partial (parseInt) | Public read -- acceptable |
| `/api/proposals/[id]` | GET | None | No | Zod (id param) | Public read -- acceptable |
| `/api/evaluate/[id]/finalize` | POST | **None** | No | Minimal | **H-02**: no auth |
| `/api/webhooks/proposals` | POST | API Key | Yes | Zod schema | **H-01**: optional signature |
| `/api/webhooks/disputes` | POST | API Key | No | Zod schema | **H-01**: optional signature |
| `/api/sync` | POST | Session | No | None needed | M-01: auth broken |
| `/api/cron/monitoring` | GET | Bearer token | No | None needed | H-04: empty secret |
| `/api/rounds/[id]/stats` | GET | None | No | Minimal | Public read -- acceptable |
| `/api/health` | GET | None | No | None needed | Exposes error messages |

---

## Recommendations Priority

1. **Immediate:** Rotate all secrets in `.env.local` (C-01)
2. **Before deployment:** Fix webhook signature bypass (H-01)
3. **Before deployment:** Add auth to finalize endpoint (H-02)
4. **Before deployment:** Make rate limiting fail-closed in production (H-03)
5. **Before deployment:** Fix cron secret empty-string edge case (H-04)
6. **Short-term:** Add a NextAuth provider (M-01)
7. **Short-term:** Fix operator sync button pattern (M-02)
8. **Short-term:** Implement stake distribution in DisputeRegistry (L-05)
9. **Medium-term:** Add incremental counters to ValidationRegistry and ReputationRegistry (L-02, L-03)
10. **Medium-term:** Tighten CSP (M-08)
