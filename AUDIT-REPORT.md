# Audit Report: ralph-unified

**Date:** 2026-04-14
**Worktree:** /Users/libardo/carlos/projects/ipe-city/agent-reviewer/.worktrees/ralph-unified/
**Branch:** ralph-unified
**Last commit:** 90a6881 — ci: use positive filter for superpower tests to avoid mock.module crashes

---

## Executive Summary

The ralph-unified worktree is the most complete and production-ready implementation among the worktrees reviewed. It has a clean build, zero TypeScript errors, zero lint errors, 570 passing tests, 93.66% statement coverage, and a well-layered security architecture (API key auth, origin validation, rate limiting, prompt injection guards, DOMPurify sanitization). The primary gaps are: (1) the on-chain write path only prepares calldata — no `walletClient`/`sendTransaction` is wired, so evaluations never actually land on-chain; (2) the `evaluation/sanitization.ts` module (sanitizeProposalText) is fully tested but never imported by the live evaluation workflow; (3) the CSP includes `unsafe-inline` and `unsafe-eval` for scripts, which significantly weakens XSS protection; and (4) the in-memory rate limiter will not enforce limits in multi-instance/serverless environments.

---

## Scorecard

| Dimension | Score | Evidence |
|-----------|-------|----------|
| Build Health | 10/10 | `bun run build` passes, `tsc --noEmit` passes, lint clean |
| Test Coverage | 9/10 | 570 tests, 93.66% statements, 85%+ branches — thresholds enforced in vitest.config.ts |
| Feature Completeness | 7/10 | 4 judge agents, scoring, streaming SSE, IPFS pinning present; on-chain write not wired |
| AI Pipeline Quality | 9/10 | All 4 dimensions, correct weights, @mastra/evals (faithfulness/hallucination/prompt-alignment), injection guard in agents |
| Web3 Integration | 6/10 | Full read path via viem, ABI-encoded calldata prep, but no walletClient/sendTransaction present |
| Security | 7/10 | API key auth, origin validation, timing-safe compare, DOMPurify — weakened by unsafe CSP, in-memory rate limiter, IP spoofability |
| Architecture | 9/10 | Clean App Router usage, server-only sensitive code, proper RSC vs client split, SSE streaming route |
| Code Quality | 9/10 | Zero `any`/`as Type`/`!` violations, Zod at every boundary, named constants throughout; one orphaned module |
| UI Assessment | 7/10 | Working submit form + client validation, proposal list page (static placeholder), detail page (placeholder), operator dashboard (placeholder) |
| Pinata Integration | 8/10 | Schema-validated JSON pin, canonical key sort, gateway fetch with timeout, Zod parse on fetch — no CID re-verification after pin |

---

## Detailed Findings

### CRITICAL

None.

---

### HIGH

#### H-1: On-Chain Write Path Not Wired — Evaluations Never Land On-Chain

**Location:** `src/chain/evaluation-registry.ts` (lines 77–97), `src/chain/reputation-registry.ts` (lines 101–113)

**Category:** architecture / feature-completeness

**Finding:** `prepareSubmitScore` and `prepareGiveFeedback` encode ABI calldata but return a `Hex` string. No `walletClient` is created anywhere in the codebase. There is no `sendRawTransaction`, `writeContract`, or equivalent call in any non-test file. The evaluation workflow (`src/lib/evaluation/workflow.ts`) completes without pinning to IPFS or submitting anything on-chain. The `/grants/[id]` detail page says "Awaiting on-chain confirmation" — it is permanently stuck there.

**Fix:** Add a `walletClient` using `viem`'s `createWalletClient` + `privateKeyToAccount` (from `DEPLOYER_PRIVATE_KEY` env var, server-side only). Wire `prepareSubmitScore` output into a `walletClient.sendRawTransaction` call within the evaluate API route, after pinning to IPFS.

---

#### H-2: In-Memory Rate Limiter Is Ineffective in Multi-Instance / Serverless Deployments

**Location:** `src/lib/rate-limit.ts` (lines 13–47)

**Category:** security / rate-limiting

**Finding:** Rate limits are stored in a module-level `Map`. In Next.js on Vercel (or any serverless/multi-instance deployment), each cold start gets a fresh map, and different instances share no state. A client can trivially exceed the 10/hour limit by hitting different function instances.

**Fix:** Replace in-memory store with a distributed store. Upstash Redis with `@upstash/ratelimit` is the natural fit given the stack.

---

### MEDIUM

#### M-1: CSP Allows `unsafe-inline` and `unsafe-eval` for Scripts

**Location:** `next.config.ts` (lines 26–28)

**Category:** security / nextjs

**Finding:** The Content Security Policy header includes `script-src 'self' 'unsafe-inline' 'unsafe-eval'`. This completely negates XSS protection for script execution.

**Fix:** Remove `'unsafe-inline'` and `'unsafe-eval'`. Use nonce-based CSP. At minimum, remove `unsafe-eval` since Next.js does not require it in production builds.

---

#### M-2: `sanitizeProposalText` Module Is Implemented and Tested But Never Called in the Live Workflow

**Location:** `src/evaluation/sanitization.ts` (entire file), `src/lib/evaluation/workflow.ts`

**Category:** security / ai-llm

**Finding:** `src/evaluation/sanitization.ts` exports `sanitizeProposalText` — 96 lines of code, 32 passing tests. However, it is imported nowhere outside its own test file. The live evaluation workflow calls `buildProposalContext(proposal)` without running `sanitizeProposalText` first.

**Fix:** Call `sanitizeProposalText` on all text fields of the proposal before passing to `buildProposalContext`.

---

#### M-3: Rate Limiter Is Bypassable via IP Header Spoofing

**Location:** `src/app/api/evaluate/route.ts:30`, `src/app/api/evaluate/stream/route.ts:34`, `src/app/grants/submit/actions.ts:65`

**Category:** security / rate-limiting

**Finding:** All three rate-limited endpoints trust `x-forwarded-for` directly from the incoming request headers. An attacker can set an arbitrary `X-Forwarded-For` header and rotate IPs to bypass per-IP rate limiting.

**Fix:** Use the rightmost IP in the comma-separated list, not the first. Alternatively, use `request.ip` when available on the platform.

---

#### M-4: IPFS CID Not Re-verified After Pinning

**Location:** `src/ipfs/pin.ts` (lines 4–18)

**Category:** ipfs

**Finding:** `pinJsonToIpfs` pins JSON and returns `result.cid`. It does not re-fetch from the gateway to confirm the CID resolves and the content matches.

**Fix:** After pinning, call `fetchJsonFromIpfs(cid, schema)` to verify the CID resolves to the expected content before recording it on-chain.

---

#### M-5: `validation-registry.ts` Has Reduced Branch Coverage (82.65%)

**Location:** `src/chain/validation-registry.ts` (lines 99–116)

**Category:** code quality / test coverage

**Finding:** Coverage report shows `validation-registry.ts` at 82.65% statements and 66.66% functions — the lowest of any non-UI file.

**Fix:** Add tests for the uncovered async paths.

---

### LOW

#### L-1: API Auth Silently Bypassed When `API_SECRET_KEY` Is Not Set

**Location:** `src/lib/api-auth.ts` (lines 7–9)

**Category:** auth

**Finding:** `requireApiKey` returns `null` (no auth required) when `API_SECRET_KEY` is not configured. A misconfigured production deployment has no API key protection — no warning, no logging.

**Fix:** Log a `SECURITY` warning when `API_SECRET_KEY` is absent. In production, consider throwing an error at startup.

---

#### L-2: `NEXT_PUBLIC_*` Contract Address Vars Expose Blockchain Addresses to Clients

**Location:** `src/chain/contracts.ts` (lines 47–67)

**Category:** nextjs

**Finding:** All six contract addresses use `NEXT_PUBLIC_` prefix but are only read server-side. Rename to private env vars.

---

#### L-3: `as JudgeDimension` Cast in Scoring Function

**Location:** `src/lib/judges/scoring.ts` (line 8)

**Category:** code quality

**Finding:** `const score = scores[dimension as JudgeDimension]` uses a type assertion. Technically safe but violates project policy.

---

#### L-4: Two Parallel Schema/Scoring Modules with Overlapping Purpose

**Location:** `src/evaluation/schemas.ts` + `src/evaluation/scoring.ts` vs `src/lib/judges/schemas.ts` + `src/lib/judges/scoring.ts`

**Category:** architecture / code quality

**Finding:** Two separate schema+scoring trees exist. `src/evaluation/` uses snake_case dimension names (0–10 scale), `src/lib/judges/` uses short keys (0–10000 bps). The `src/evaluation/sanitization.ts` module (M-2) is part of the orphaned subtree.

**Fix:** Consolidate or document the intentional separation.

---

#### L-5: `validateOrigin` Has a Silent Bypass When `NEXT_PUBLIC_APP_URL` Is Absent

**Location:** `src/lib/validate-origin.ts` (lines 21–24)

**Category:** security

**Finding:** When `NEXT_PUBLIC_APP_URL` is not set, `validateOrigin` returns `null` for all mutating requests.

---

#### L-6: Dependency Vulnerabilities

**Location:** `package.json`

**Category:** dependency

**Finding:** `bun audit` reports two vulnerabilities:
- **Low**: `ai < 5.0.52` — filetype whitelist bypass (GHSA-rwvc-j5jr-mgvh)
- **Moderate**: `jsondiffpatch < 0.7.2` — XSS via HtmlFormatter (GHSA-33vc-wfww-vjfv)

**Fix:** Upgrade `ai` to `^5.0.52` or later (breaking change from v4).

---

## Feature Completeness

| Planned Feature | Status | Evidence |
|----------------|--------|----------|
| 4 Judge Agents (tech, impact, cost, team) | IMPLEMENTED | `src/lib/judges/agents.ts` — all 4 agents with correct weights |
| Correct dimension weights (25/30/20/25%) | IMPLEMENTED | `src/lib/constants.ts` + `computeAggregateScore` |
| @mastra/evals quality scoring | IMPLEMENTED | `src/lib/evaluation/scorers.ts` — faithfulness, hallucination, promptAlignment |
| Prompt injection protection in agents | IMPLEMENTED | `injectionGuard` input processor + anti-injection prompt |
| Zod schemas at all input/output boundaries | IMPLEMENTED | API routes, server actions, IPFS pin/fetch, agent output |
| IPFS content storage via Pinata | IMPLEMENTED | `src/ipfs/pin.ts` + `client.ts` |
| Streaming SSE evaluation progress | IMPLEMENTED | `src/app/api/evaluate/stream/route.ts` |
| API key authentication | IMPLEMENTED | `src/lib/api-auth.ts` with timing-safe compare |
| Rate limiting on evaluation endpoints | PARTIAL | In-memory only; does not work in multi-instance/serverless |
| Input sanitization before LLM | PARTIAL | Module exists and is tested but not wired into live workflow |
| On-chain score publishing | MISSING | ABI encoding only; no walletClient, no sendTransaction |
| Proposal listing from on-chain events | MISSING | `getEvaluationEvents` exists but not wired to UI |
| Security headers (CSP, HSTS, etc.) | PARTIAL | Headers present but CSP has unsafe-inline/unsafe-eval |

---

## Strengths

1. **Zero build errors** — clean TypeScript, clean lint, clean build across all three tools.
2. **Exceptional test coverage** — 570 tests, 93.66% statement coverage, thresholds enforced.
3. **Four judge agents with correct weights** — exactly as specified, with basis-point scoring (0–10000).
4. **@mastra/evals integration** — Faithfulness, hallucination detection, and prompt alignment scoring.
5. **Prompt injection defense in depth** — Two layers: anti-injection prompt + `injectionGuard` Mastra input processor.
6. **Security utilities are well-crafted** — Timing-safe API key comparison, HMAC webhook verification, DOMPurify.
7. **SSE streaming route** — Real-time evaluation progress with heartbeat keepalive and connection timeout.
8. **All security headers present** — HSTS, X-Frame-Options DENY, X-Content-Type-Options, Referrer-Policy, Permissions-Policy.
9. **Canonical IPFS JSON pinning** — Keys sorted before pinning ensures deterministic CIDs.
10. **No `any`, no `!` assertions, no `@ts-ignore`** — Zero TypeScript escape hatches.

---

*Generated by worktree-audit-runner agent (Claude Sonnet) — 2026-04-14*
