# Audit Report: full-vision-roadmap Worktree

**Audited**: 2026-04-13
**Worktree path**: `.worktrees/full-vision-roadmap/`
**Branch**: GSD execution
**Framework**: GSD (Get Shit Done)

---

## Stack Summary

| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | Bun | 1.3+ |
| Framework | Next.js (App Router) | 16.2.3 |
| Language | TypeScript (strict) | 5.x |
| UI | React | 19.2.4 |
| Styling | Tailwind CSS 4, shadcn/ui | latest |
| AI | Vercel AI SDK (`ai`, `@ai-sdk/openai`) | ^6.0.158 / ^3.0.52 |
| Web3 | viem | ^2.47.14 |
| Validation | Zod | ^4.3.6 |
| Contracts | Solidity 0.8.24+ (Foundry) | 2 contracts |
| Testing | Playwright BDD, Foundry tests | E2E + contract unit |
| Database | None (on-chain + IPFS) | -- |
| Auth | None | -- |

---

## Findings

### CRITICAL

#### C1. `.env.local` contains real secrets on disk

- **File**: `.env.local:2,5,11`
- **Issue**: The file contains a real OpenAI API key (`sk-svcacct-...`), a Pinata JWT token, and a deployer private key (`0x05f472...`). While `.env.local` is in `.gitignore` and is **not** git-tracked, it exists on disk in the worktree. If this worktree were pushed, zipped, or shared, secrets would leak.
- **Impact**: Credential exposure, unauthorized API usage, fund theft from the deployer wallet.
- **Recommendation**: Rotate all three secrets immediately. Use a vault or secrets manager. Add `.env.local` to `.gitignore` (already done, but verify no accidental commits in history).

#### C2. Score unit mismatch between TypeScript and Solidity contract

- **File**: `src/lib/evaluation/storage.ts:93` and `contracts/src/ReputationRegistry.sol:61`
- **Issue**: The TypeScript code converts scores to "basis points" via `BigInt(Math.round(score * 100))`, sending values like 7500 for a score of 75. However, `ReputationRegistry.sol` validates `if (score > MAX_SCORE) revert InvalidScore(score)` where `MAX_SCORE = 100`. Any score above 1 (i.e., virtually all valid scores) would revert on-chain.
- **Impact**: All on-chain reputation publishing is broken. Evaluations would complete but fail at the `publishScoreOnChain` step.
- **Recommendation**: Either remove the `* 100` multiplication in `storage.ts:93` or increase `MAX_SCORE` in the contract to `10000` and adjust all consumers accordingly.

#### C3. No authentication on API routes

- **File**: `src/app/api/evaluate/route.ts`, `src/app/api/proposals/submit/route.ts`
- **Issue**: The `/api/evaluate` and `/api/proposals/submit` endpoints perform server-side wallet transactions (spending gas, writing to IPFS) with zero authentication. Any anonymous user can trigger evaluations or submit proposals, spending the deployer's ETH and API credits.
- **Impact**: Financial drain on deployer wallet, IPFS storage abuse, potential chain spam.
- **Recommendation**: Add authentication (API key, session token, or wallet signature verification) before allowing write operations.

---

### HIGH

#### H1. In-memory rate limiting is ineffective in serverless

- **File**: `src/middleware.ts:14`
- **Issue**: Rate limiting uses an in-memory `Map` (`requestLog`). On Vercel, each serverless invocation gets a fresh memory space, meaning the rate limit state is never shared across invocations.
- **Impact**: Rate limiting provides zero protection in production. The `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` env vars exist but are empty; the Redis-based limiter was never wired up.
- **Recommendation**: Implement Upstash Redis-backed rate limiting or use Vercel's built-in rate limiting.

#### H2. `as Record<string, unknown>` type casts in evaluation page

- **File**: `src/app/proposals/[id]/evaluation/page.tsx:44-48`
- **Issue**: Three `as Record<string, unknown>` casts are used to access the API response. This bypasses the project's strict "no `as Type`" convention and can mask runtime type errors.
- **Impact**: Code quality violation, potential runtime errors if API shape changes.
- **Recommendation**: Parse the response with a Zod schema (like the proposal detail page does) instead of casting.

#### H3. CSP allows `unsafe-inline` for scripts in production

- **File**: `next.config.ts:7`
- **Issue**: The production CSP includes `script-src 'self' 'unsafe-inline'`. This weakens XSS protection because inline scripts can execute.
- **Impact**: Reduces the effectiveness of CSP as an XSS mitigation. An attacker who achieves HTML injection could execute inline scripts.
- **Recommendation**: Use nonces or hashes for inline scripts instead of `'unsafe-inline'`.

#### H4. Unbounded event log scan from genesis block

- **File**: `src/app/api/proposals/route.ts:31-43`
- **Issue**: `DEPLOYMENT_BLOCK` defaults to `BigInt(0)` when the env var is missing. The proposals list endpoint scans all events from block 0 to latest. As the chain grows, this becomes increasingly expensive (RPC rate limits, timeouts, cost).
- **Impact**: Performance degradation over time, potential RPC provider rate-limit hits.
- **Recommendation**: Require `DEPLOYMENT_BLOCK` to be set (fail-fast if missing) and consider indexing events with The Graph or a local cache.

---

### MEDIUM

#### M1. `dangerouslySetInnerHTML` in chart component

- **File**: `src/components/ui/chart.tsx:96`
- **Issue**: The vendored shadcn chart component uses `dangerouslySetInnerHTML` to inject CSS `<style>` tags. The input is derived from the chart config object (developer-controlled), not user input.
- **Impact**: Low XSS risk since the input is not user-controlled. Flagged for completeness.
- **Recommendation**: No action needed for vendored shadcn code, but annotate with a comment that this is safe because config is developer-provided.

#### M2. `as const` and `as string` casts in vendored chart.tsx

- **File**: `src/components/ui/chart.tsx:104,239,351,353,357,360-361`
- **Issue**: Multiple `as` casts exist in the vendored shadcn chart component. These violate the project's "no `as Type`" rule.
- **Impact**: Code quality convention violation. Acceptable since this is vendored upstream code.
- **Recommendation**: Already annotated with comment on line 1. No further action needed for vendored code.

#### M3. No CORS headers on API routes

- **File**: All API routes under `src/app/api/`
- **Issue**: No explicit CORS configuration. Next.js API routes default to same-origin, which is fine for the current architecture (frontend and API on same domain). However, if the API is ever consumed cross-origin, requests will be blocked.
- **Impact**: Low for current architecture. Could be a problem if external consumers need API access.
- **Recommendation**: Acceptable for now. Document the same-origin assumption.

#### M4. Deployer private key used as server wallet for all operations

- **File**: `src/lib/chain/client.ts:19-34`, `src/app/api/proposals/submit/route.ts:54`
- **Issue**: All proposals are registered under the deployer's address. The deploy script grants both `REGISTRAR_ROLE` and `EVALUATOR_ROLE` to the same deployer key. A single compromised key can both register projects and submit evaluations, destroying trust in the system.
- **Impact**: Single point of failure for the entire trust model. No separation of concerns between registration and evaluation roles.
- **Recommendation**: Use separate keys for registration and evaluation roles. Document this as a known v1 limitation.

#### M5. No request body size enforcement at transport level

- **File**: `src/app/api/proposals/submit/route.ts:15-19`
- **Issue**: Body size is checked *after* parsing the full JSON body (`await request.json()` on line 15, size check on line 16-18). A malicious client could send a very large JSON body that gets fully parsed before the size check rejects it.
- **Impact**: Memory exhaustion DoS potential. The 50KB limit check happens too late.
- **Recommendation**: Check `Content-Length` header before parsing, or use Next.js body size configuration.

---

### LOW

#### L1. `activeEvaluations` set is per-instance, not shared

- **File**: `src/app/api/evaluate/route.ts:18-19`
- **Issue**: The `activeEvaluations` `Set` and `MAX_CONCURRENT_EVALUATIONS` limit are per-serverless-instance. The same proposal could be evaluated concurrently across different instances. The TODO on line 16-17 acknowledges this.
- **Impact**: Duplicate evaluations and wasted API credits in multi-instance deployments.
- **Recommendation**: Implement Redis-based tracking as noted in the TODO.

#### L2. Integer division truncation in `getSummary`

- **File**: `contracts/src/ReputationRegistry.sol:102`
- **Issue**: `averageScore = _totalScore[tokenId] / feedbackCount` uses integer division. With scores 0-100, the average loses precision (e.g., scores of 33 and 34 give average 33, not 33.5).
- **Impact**: Minor score inaccuracy. Acceptable for a v1 prototype on testnet.
- **Recommendation**: Consider storing scores in basis points (0-10000) for better precision, or accept the truncation as a known limitation.

#### L3. No OPENAI_API_KEY validation in env schema

- **File**: `src/lib/env.ts:3-8`
- **Issue**: The `serverEnvSchema` does not include `OPENAI_API_KEY`. The AI evaluation agents (`src/lib/evaluation/agents.ts`) use `openai()` which reads `OPENAI_API_KEY` from the environment directly via the `@ai-sdk/openai` package, bypassing the Zod validation.
- **Impact**: Unclear error messages if the key is missing. The app would crash at evaluation time rather than at startup.
- **Recommendation**: Add `OPENAI_API_KEY: z.string().min(1)` to `serverEnvSchema` and validate at startup.

#### L4. IP-based rate limiting trusts proxy headers

- **File**: `src/middleware.ts:16-21`
- **Issue**: `getClientIp` trusts `x-real-ip` and `x-forwarded-for` headers. Behind Vercel's proxy this is correct, but in other environments these headers can be spoofed to bypass rate limiting.
- **Impact**: Rate limiting bypass if deployed outside Vercel's trusted proxy chain.
- **Recommendation**: Document that rate limiting assumes a trusted reverse proxy.

#### L5. Missing `rel="noopener noreferrer"` audit

- **File**: `src/app/proposals/[id]/page.tsx:225-226`
- **Issue**: External links rendered from user-submitted proposals correctly include `target="_blank" rel="noopener noreferrer"`. This is good practice. However, the `href` value comes from user input and is only validated as a URL by Zod, not restricted to http/https schemes (the `isValidUrl` function on line 49-55 does this client-side but the API schema on `src/lib/schemas/proposal.ts:43` uses `z.string().url()` which accepts any scheme).
- **Impact**: Low. The `isValidUrl` client-side filter mitigates this for display. Server-side schema should also restrict to http/https.
- **Recommendation**: Add `.refine(url => url.startsWith('http'))` to the proposal schema's `externalLinks` validation.

---

## Solidity Contract Review

### IdentityRegistry.sol

**Strengths:**
- Soulbound token implementation correctly blocks transfers between non-zero addresses
- `MAX_SUPPLY` cap prevents unbounded minting
- `MAX_URI_LENGTH` prevents storage bloat
- Role-based access control (REGISTRAR_ROLE)
- Pausable for emergency stops
- Custom errors for gas efficiency
- Comprehensive test suite (14 tests covering roles, events, soulbound, pause, supply cap, URI length)

**Issues:**
- None critical. Well-structured contract.

### ReputationRegistry.sol

**Strengths:**
- Verifies project exists via `identityRegistry.ownerOf()` before accepting feedback
- Score validation (0-100 range)
- Content hash length limit (256 bytes)
- Role-based access (EVALUATOR_ROLE)
- Pausable
- Good test coverage (14 tests)

**Issues:**
- Integer division truncation in `getSummary` (L2 above)
- `_totalScore` can overflow for very large numbers of high-score feedbacks, though practically unlikely with uint256
- The `exists` field in the `Feedback` struct (line 20) is never read and wastes 1 storage slot per entry

---

## Code Quality Assessment

### TypeScript Strict Mode Compliance

- **`as Type` violations**: 3 instances in application code (`src/app/proposals/[id]/evaluation/page.tsx:44-48`). Additional `as const` assertions are acceptable. Vendored shadcn `chart.tsx` has multiple casts (annotated as vendored).
- **`any` usage**: None found in application code.
- **`@ts-ignore`/`@ts-expect-error`**: None found.
- **Non-null assertions (`!`)**: None found.
- **TypeScript strict mode**: Enabled in `tsconfig.json:8`.
- **Typecheck**: Passes cleanly (`tsc --noEmit` returns 0).

### Zod Validation at Boundaries

Well-implemented. All API routes validate input with Zod schemas. Client-side forms use the same schemas. IPFS responses are parsed through Zod schemas. SSE events are validated with discriminated unions.

### Architecture Quality

- Clear separation between chain interaction (`src/lib/chain/`), evaluation logic (`src/lib/evaluation/`), and IPFS storage (`src/lib/ipfs/`)
- Consistent use of typed discriminated unions for SSE event streaming
- Good prompt injection mitigation in AI prompts (`SHARED_PREAMBLE` in prompts.ts)
- Anti-injection instructions embedded in system prompts

---

## Dependency Audit

```
bun audit: No vulnerabilities found
```

All dependencies are at recent versions. No known CVEs.

---

## Summary

| Severity | Count |
|----------|-------|
| Critical | 3 |
| High | 4 |
| Medium | 5 |
| Low | 5 |

**Overall assessment**: The codebase shows strong engineering practices -- TypeScript strict mode, Zod validation at boundaries, well-tested Solidity contracts, proper CSP headers, and prompt injection mitigation. The critical findings are: (1) real secrets on disk in `.env.local`, (2) a score unit mismatch that breaks on-chain publishing, and (3) unauthenticated write endpoints that can drain the deployer wallet. The high findings center on rate limiting being ineffective in serverless and a few code quality violations. The architecture is sound for a prototype but needs authentication and real rate limiting before any production deployment.
