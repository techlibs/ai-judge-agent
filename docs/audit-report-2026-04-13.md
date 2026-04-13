# Security Audit Report -- 2026-04-13

**Project:** agent-reviewer (IPE City Grants AI Judge)
**Branch:** full-vision-roadmap
**Auditor:** Claude Opus 4.6 (automated)
**Scope:** `src/`, `contracts/src/`, config files

---

## Executive Summary

4 audit skills were executed against the codebase:

1. **Secrets Scanner** -- No hardcoded secrets found
2. **OWASP Security Check** -- 7 findings (0 Critical, 3 High, 3 Medium, 1 Low)
3. **Next.js Security Audit** -- 4 findings (1 High, 2 Medium, 1 Info)
4. **Dependency Auditor** -- `bun audit` reports 0 known CVEs; no typosquatting detected

**Total unique findings: 10** (after deduplication across skills)

---

## Findings

### HIGH-01: API Key Exposed via NEXT_PUBLIC_ Prefix

| Field | Value |
|-------|-------|
| **Severity** | HIGH |
| **Category** | Sensitive Data Exposure / NEXT_PUBLIC_ Footgun |
| **File** | `src/lib/evaluation/use-evaluation.ts:125` |
| **OWASP** | A01:2021 Broken Access Control |

**Description:** The client-side hook `useEvaluation` reads `process.env.NEXT_PUBLIC_API_KEY` to attach as the `x-api-key` header. Any variable prefixed with `NEXT_PUBLIC_` is bundled into the client JavaScript and visible to all users via view-source or browser devtools. This completely negates the API key protection on the `/api/evaluate` endpoint.

**Impact:** Anyone can extract the API key from the browser bundle and call the evaluate endpoint directly, bypassing intended access controls and consuming LLM credits (Anthropic API costs).

**Recommended fix:** Remove the `NEXT_PUBLIC_` prefix. Instead, call the evaluate endpoint from a Server Action or an intermediate API route that attaches the key server-side. Alternatively, if the evaluate endpoint is meant to be called from the browser, implement a different auth mechanism (e.g., session-based, CSRF token, or rate limiting per session).

```typescript
// Current (VULNERABLE)
const apiKey = process.env.NEXT_PUBLIC_API_KEY;

// Fix option A: Server Action wrapper
// Fix option B: Use server-only env var (API_KEY) in an API-to-API call
```

---

### HIGH-02: No Authentication on Read API Routes

| Field | Value |
|-------|-------|
| **Severity** | HIGH |
| **Category** | Broken Access Control |
| **File** | `src/app/api/proposals/route.ts`, `src/app/api/proposals/[tokenId]/route.ts`, `src/app/api/reputation/[tokenId]/route.ts` |
| **OWASP** | A01:2021 Broken Access Control |

**Description:** All three GET endpoints have zero authentication. While the data is publicly readable on-chain, the API routes perform IPFS fetches and chain reads that consume server resources. Without authentication or rate limiting on read routes, the server is vulnerable to resource exhaustion.

**Impact:** An attacker can enumerate all proposals, scrape all IPFS content, and drive up RPC/IPFS gateway costs through automated crawling.

**Recommended fix:** Add rate limiting to GET routes (similar to the POST `/api/proposals/submit` route which already has IP-based rate limiting). At minimum, apply per-IP request throttling.

---

### HIGH-03: No Authentication on Proposal Submission

| Field | Value |
|-------|-------|
| **Severity** | HIGH |
| **Category** | Broken Access Control |
| **File** | `src/app/api/proposals/submit/route.ts:34` |
| **OWASP** | A01:2021 Broken Access Control |

**Description:** The proposal submission endpoint has IP-based rate limiting (5 requests/hour) but no authentication whatsoever. Any anonymous user can submit proposals, which triggers on-chain transactions paid by the server wallet (`DEPLOYER_PRIVATE_KEY`).

**Impact:** An attacker can drain the deployer wallet's ETH by submitting proposals up to the rate limit from multiple IPs (easily bypassed with proxies/VPNs). Each submission costs gas on Base Sepolia.

**Recommended fix:** Add authentication before allowing on-chain writes. Options include: CAPTCHA, wallet signature verification, or session-based auth. The rate limiter is a good start but insufficient as the sole protection for a gas-spending endpoint.

---

### MEDIUM-04: In-Memory Rate Limiting Not Effective in Serverless

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Category** | Security Misconfiguration |
| **File** | `src/app/api/proposals/submit/route.ts:17-31`, `src/app/api/evaluate/route.ts:18-19` |
| **OWASP** | A05:2021 Security Misconfiguration |

**Description:** Both the rate limiter (`rateLimitStore = new Map<>()`) and concurrent evaluation tracker (`activeEvaluations = new Set<>()`) use in-memory storage. On Vercel, each serverless invocation gets a fresh instance -- these data structures reset on every cold start and are not shared across instances.

**Impact:** Rate limiting and concurrency controls are effectively non-functional in production on Vercel. The `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` env vars are defined in `.env.local` but not used anywhere in the codebase.

**Recommended fix:** Implement rate limiting using the Upstash Redis credentials already configured in `.env.local`. The `@upstash/ratelimit` package provides a drop-in solution for serverless rate limiting.

---

### MEDIUM-05: CSP Allows unsafe-inline and unsafe-eval

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Category** | Security Headers |
| **File** | `next.config.ts:15` |
| **OWASP** | A05:2021 Security Misconfiguration |

**Description:** The Content-Security-Policy header includes `'unsafe-inline'` and `'unsafe-eval'` in the `script-src` directive. This significantly weakens XSS protection, as it allows inline scripts and `eval()` to execute.

**Impact:** If an XSS vector exists (e.g., through IPFS content rendering), the CSP will not block it. The `unsafe-eval` directive is particularly dangerous as it allows arbitrary code execution via `eval()`.

**Recommended fix:** Use nonce-based CSP for inline scripts (`'nonce-{random}'`) instead of `'unsafe-inline'`. Remove `'unsafe-eval'` unless absolutely required by a dependency (e.g., some charting libraries). Next.js 16 supports nonce-based CSP via the `generateNonce` pattern.

```
script-src 'self' 'nonce-{random}';
```

---

### MEDIUM-06: No Middleware for Route Protection

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Category** | Missing Security Layer |
| **File** | `src/middleware.ts` (MISSING) |
| **OWASP** | A01:2021 Broken Access Control |

**Description:** There is no `middleware.ts` file in the project. Middleware is the standard Next.js mechanism for enforcing auth, rate limiting, and request validation before handlers execute. Each API route implements its own (inconsistent) security checks.

**Impact:** Security enforcement is fragmented -- the evaluate route has API key auth, the submit route has rate limiting, and the read routes have neither. A centralized middleware would ensure consistent security policies.

**Recommended fix:** Create `src/middleware.ts` with a matcher for `/api/:path*` that applies rate limiting and authentication consistently across all routes.

---

### MEDIUM-07: IP Spoofing via X-Forwarded-For

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Category** | Broken Access Control |
| **File** | `src/app/api/proposals/submit/route.ts:35-36` |
| **OWASP** | A01:2021 Broken Access Control |

**Description:** The rate limiter extracts the client IP from the `x-forwarded-for` header: `forwardedFor?.split(",")[0]?.trim() ?? "unknown"`. This header can be spoofed by clients unless the reverse proxy (Vercel) strips and rewrites it. While Vercel does set this correctly, the fallback to `"unknown"` means all requests without the header share a single rate limit bucket.

**Impact:** An attacker could potentially bypass rate limiting by manipulating headers or by reaching the server without the Vercel proxy. The `"unknown"` fallback also means multiple legitimate users behind the same missing header share a rate limit.

**Recommended fix:** Use Vercel's `x-real-ip` header (more reliable single IP), and never fall back to a shared bucket. If the IP cannot be determined, reject the request.

```typescript
const ip = request.headers.get("x-real-ip");
if (!ip) {
  return NextResponse.json({ error: "Cannot determine client IP" }, { status: 400 });
}
```

---

### LOW-08: Deployer Private Key as Server-Side Secret

| Field | Value |
|-------|-------|
| **Severity** | LOW |
| **Category** | Secrets Management |
| **File** | `src/lib/env.ts:8`, `src/lib/chain/client.ts:19-31` |

**Description:** The `DEPLOYER_PRIVATE_KEY` is used server-side to sign on-chain transactions. While it is correctly kept server-only (no `NEXT_PUBLIC_` prefix), the same key is used for both proposal registration and evaluation score publishing. A compromised server would expose the private key and all associated on-chain assets.

**Impact:** Low risk in testnet context, but the pattern should not carry over to mainnet. A single compromised key controls all registrations and evaluations.

**Recommended fix:** For production, use separate keys for different operations and consider using a hardware wallet or KMS-backed signer. Document that the key should be rotated before mainnet deployment.

---

### INFO-01: Validation Error Details Returned to Client

| Field | Value |
|-------|-------|
| **Severity** | Info |
| **File** | `src/app/api/evaluate/route.ts:41`, `src/app/api/proposals/submit/route.ts:51-55` |

**Description:** Zod validation error details (`parsed.error.issues`, `parsed.error.flatten().fieldErrors`) are returned in the API response. While useful for development, these can leak schema structure information to potential attackers.

**Impact:** Minimal -- the information is about input validation shapes, not internal logic. Acceptable for a public API but worth noting.

**Recommended fix:** In production, consider returning only field names with generic error messages rather than full Zod issue details.

---

### INFO-02: dangerouslySetInnerHTML in Chart Component

| Field | Value |
|-------|-------|
| **Severity** | Info |
| **File** | `src/components/ui/chart.tsx:96` |

**Description:** The shadcn/ui chart component uses `dangerouslySetInnerHTML` to inject CSS theme variables. This is a known pattern in the shadcn chart component and does not accept user input -- it only uses hardcoded theme configuration.

**Impact:** None -- the injected content is entirely developer-controlled (theme color values from the chart config). Not exploitable.

**Recommended fix:** No action needed. This is safe as-is.

---

## Smart Contract Notes

The Solidity contracts (`IdentityRegistry.sol`, `ReputationRegistry.sol`) were reviewed for common vulnerabilities. No critical issues were found. Positive security patterns include:

- AccessControl with role-based permissions (REGISTRAR_ROLE, EVALUATOR_ROLE)
- Pausable for emergency stops
- Soulbound token (non-transferable) correctly implemented via `_update` override
- Input validation (MAX_SUPPLY, MAX_SCORE, URI length limits)
- Custom errors instead of require strings (gas-efficient)
- Existence check for tokenId before feedback submission

**Minor observations:**
- `ReputationRegistry.getSummary()` uses integer division (`_totalScore / feedbackCount`) which truncates. This is handled correctly in the TypeScript layer by dividing by 100.
- No re-entrancy risk because no external calls with state changes after (checks-effects-interactions pattern is followed via try/catch on view function).

---

## Dependency Audit

| Check | Result |
|-------|--------|
| `bun audit` | 0 vulnerabilities |
| Typosquatting scan | No suspicious package names |
| Known CVEs | None detected |
| Install scripts | `sharp` and `unrs-resolver` in trustedDependencies (expected) |
| License concerns | All major deps are MIT/Apache-2.0 |

---

## Summary Table

| ID | Severity | Location | Issue |
|----|----------|----------|-------|
| HIGH-01 | HIGH | `src/lib/evaluation/use-evaluation.ts:125` | API key exposed via NEXT_PUBLIC_ prefix |
| HIGH-02 | HIGH | `src/app/api/proposals/route.ts` et al. | No auth or rate limiting on read API routes |
| HIGH-03 | HIGH | `src/app/api/proposals/submit/route.ts:34` | No auth on gas-spending submission endpoint |
| MEDIUM-04 | MEDIUM | `src/app/api/proposals/submit/route.ts:17` | In-memory rate limiting ineffective on serverless |
| MEDIUM-05 | MEDIUM | `next.config.ts:15` | CSP allows unsafe-inline and unsafe-eval |
| MEDIUM-06 | MEDIUM | `src/middleware.ts` (missing) | No middleware for centralized route protection |
| MEDIUM-07 | MEDIUM | `src/app/api/proposals/submit/route.ts:35` | IP spoofing via X-Forwarded-For |
| LOW-08 | LOW | `src/lib/chain/client.ts:19` | Single deployer key for all on-chain operations |
| INFO-01 | Info | `src/app/api/evaluate/route.ts:41` | Validation error details returned to client |
| INFO-02 | Info | `src/components/ui/chart.tsx:96` | dangerouslySetInnerHTML in chart (safe -- shadcn pattern) |

---

## Secrets Scanner Results

| Check | Result |
|-------|--------|
| AWS Access Keys | None found |
| Private Keys (PEM) | None found |
| GitHub Tokens | None found |
| Stripe/API Keys | None hardcoded |
| Database URLs | None found |
| JWT Tokens | None found |
| Slack Webhooks | None found |
| `.env.local` in git | Not tracked (correctly gitignored) |
| `.env.example` | Contains only empty placeholders (safe) |
| Hex private keys in source | None found |

---

## Recommended Priority Actions

1. **Immediate:** Remove `NEXT_PUBLIC_` prefix from API key usage (HIGH-01)
2. **Short-term:** Implement Upstash Redis-backed rate limiting for all routes (MEDIUM-04, HIGH-02)
3. **Short-term:** Add authentication to proposal submission endpoint (HIGH-03)
4. **Medium-term:** Create middleware.ts for centralized security (MEDIUM-06)
5. **Medium-term:** Tighten CSP policy -- remove unsafe-eval, use nonces (MEDIUM-05)
