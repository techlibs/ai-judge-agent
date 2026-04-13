# Tier 1 Audit Report

**Project:** agent-reviewer (superpower branch)
**Date:** 2026-04-13
**Auditor:** Claude Opus 4.6 (1M context) via 7 Tier 1 audit skills
**Scope:** Full codebase -- Solidity contracts (`contracts/src/`), Next.js application (`src/`), dependencies, secrets, configuration

---

## Skill Execution Summary

| # | Skill | Status | Findings |
|---|-------|--------|----------|
| 1 | `solidity-audit` | Ran | 4 warnings, 2 info |
| 2 | `solidity-security-audit` | Ran | 1 high, 3 medium, 2 low |
| 3 | `openclaw-audit-watchdog` | Ran (openclaw CLI) | 1 critical, 3 warn, 1 info |
| 4 | `security-nextjs` | Ran | 1 high, 2 medium, 1 low |
| 5 | `dependency-auditor` | Ran (manual -- no lockfile for npm audit) | 1 warning |
| 6 | `secrets-scanner` | Ran | 0 critical, 1 info |
| 7 | `owasp-security-check` | Ran | 1 medium, 1 low |

**Totals:** 1 Critical, 2 High, 6 Medium, 4 Low, 3 Info

---

## Top 3 Most Important Findings

### 1. [HIGH] Signature Not Verified in `setAgentWallet` (Solidity)

**File:** `contracts/src/IdentityRegistry.sol` lines 110-120
**Category:** Signature Issues / Access Control

The `setAgentWallet` function accepts `deadline` and `signature` parameters but never actually verifies the signature. The comment says "EIP-712 signature verification simplified for v1" but the signature bytes are completely unused. This means the `signature` parameter is decorative -- any caller who is owner or approved can set any wallet address without proving the new wallet holder consented.

```solidity
function setAgentWallet(
    uint256 agentId,
    address newWallet,
    uint256 deadline,
    bytes calldata signature  // UNUSED -- never verified
) external {
    _requireOwnerOrApproved(agentId);
    require(block.timestamp <= deadline, "Signature expired");
    _agentWallets[agentId] = newWallet;  // Set without signature check
}
```

**Impact:** An approved operator could redirect an agent's wallet to an attacker-controlled address. The `deadline` check provides no security without the corresponding signature verification.

**Recommendation:** Either implement EIP-712 signature verification (verify the new wallet holder signed the delegation) or remove the `signature` and `deadline` parameters entirely and document that wallet assignment is owner-only. Do not ship dead security parameters that imply protection that does not exist.

---

### 2. [HIGH] Unrestricted `initialize()` on ReputationRegistry (Solidity)

**File:** `contracts/src/ReputationRegistry.sol` lines 71-75
**Category:** Access Control / Initialization

The `initialize()` function has no access control beyond a single-use flag. Anyone can call it first and set the `_identityRegistry` address to an attacker-controlled contract before the deployer does.

```solidity
function initialize(address identityRegistry_) external {
    if (_initialized) revert AlreadyInitialized();
    _identityRegistry = identityRegistry_;
    _initialized = true;
}
```

**Impact:** In a front-running scenario on a public mempool, an attacker could call `initialize()` with a malicious identity registry before the legitimate deploy script transaction executes. This would make all agent validation check against the attacker's contract, allowing the attacker to bypass self-feedback restrictions and fabricate agent ownership.

**Recommendation:** Either (a) use a constructor parameter instead of an initializer pattern (since this is not a proxy), (b) add an `onlyOwner` modifier, or (c) deploy + initialize atomically in the same transaction (the deploy script currently does this, but it is not guaranteed on all deployment paths).

---

### 3. [MEDIUM] CSP Allows `unsafe-inline` and `unsafe-eval` for Scripts

**File:** `next.config.ts` line 12
**Category:** Security Misconfiguration / XSS Defense

The Content-Security-Policy allows `'unsafe-inline'` and `'unsafe-eval'` for `script-src`:

```
script-src 'self' 'unsafe-inline' 'unsafe-eval'
```

**Impact:** This largely defeats the purpose of CSP for XSS prevention. If an attacker finds any injection point (reflected or stored), inline scripts and `eval()` are permitted by policy. While Next.js requires some CSP relaxation for hydration, `unsafe-eval` is not necessary for production and `unsafe-inline` can be replaced with nonce-based CSP.

**Recommendation:** Use Next.js nonce-based CSP (`experimental.allowedRelyingParties` or a custom nonce middleware). At minimum, remove `'unsafe-eval'` which is not required for Next.js production builds.

---

## Detailed Findings

### Solidity Contracts (Skills 1 + 2)

#### [HIGH] S-01: Unverified Signature in `setAgentWallet`
See Top Finding #1 above.

#### [HIGH] S-02: Unrestricted `initialize()` on ReputationRegistry
See Top Finding #2 above.

#### [MEDIUM] S-03: Unsafe `int256` to `int128` Cast in `getSummary`

**File:** `contracts/src/ReputationRegistry.sol` line 276

```solidity
summaryValue = int128(total / int256(uint256(matchCount)));
```

If `total` exceeds `int128` range (unlikely but possible with many extreme feedback values), this cast silently truncates even on Solidity >=0.8. Use OpenZeppelin `SafeCast.toInt128()`.

#### [MEDIUM] S-04: Unbounded Loop in `readAllFeedback` and `getSummary`

**File:** `contracts/src/ReputationRegistry.sol` lines 203-243, 261-273

Both functions iterate over all client addresses and all feedback entries. With large datasets, these view functions could exceed the block gas limit even for `eth_call`, causing RPC timeouts. Consider pagination or off-chain indexing.

#### [MEDIUM] S-05: `releaseMilestone` ETH Transfer Without Reentrancy Guard

**File:** `contracts/src/MilestoneManager.sol` lines 107-140

The `releaseMilestone` function updates state (line 131-132) before sending ETH (line 136). While the CEI pattern is followed (status is set before the call), there is no `nonReentrant` guard. The recipient could be a contract that re-enters other functions on MilestoneManager. Since `status` is already `RELEASED`, same-milestone re-entry is blocked, but cross-function reentrancy is not explicitly protected.

**Recommendation:** Add OpenZeppelin `ReentrancyGuard` + `nonReentrant` modifier.

#### [MEDIUM] S-06: `appendResponse` Has No Access Control

**File:** `contracts/src/ReputationRegistry.sol` lines 150-165

Anyone can call `appendResponse` for any agent/client/feedbackIndex. It only emits an event, but unrestricted event emission can pollute indexer data and create confusion about which responses are legitimate.

**Recommendation:** Restrict to agent owner or the original feedback submitter.

#### [LOW] S-07: `_safeMint` Callback Opens Reentrancy Surface

**File:** `contracts/src/IdentityRegistry.sol` line 149

`_safeMint` calls `onERC721Received` on the recipient if it is a contract. The `Registered` event is emitted after minting (line 153), and metadata is set in the same transaction for the metadata overload. The token ID counter is incremented before the callback (line 148), which is correct, but the metadata loop (lines 49-58) stores state after mint. If the recipient re-enters `register`, it gets a new token -- this is by design (anyone can register), so the risk is low.

#### [LOW] S-08: Reserved Key Check Only Covers `agentWallet`

**File:** `contracts/src/IdentityRegistry.sol` lines 166-172

`_requireNotReservedKey` only checks for the literal string `"agentWallet"`. If ERC-8004 defines additional reserved keys in the future, they would need to be added manually. Consider a mapping-based approach for extensibility.

---

### Next.js Application (Skill 4)

#### [HIGH] N-01: API Routes `/api/evaluate/[id]/finalize` and `/api/evaluate/[id]/[dimension]/retry` Have No Authentication or Rate Limiting

**Files:**
- `src/app/api/evaluate/[id]/finalize/route.ts`
- `src/app/api/evaluate/[id]/[dimension]/retry/route.ts`

The finalize endpoint triggers on-chain transactions (spending gas/ETH). The retry endpoint deletes evaluation records and allows re-triggering evaluation (spending LLM API credits). Neither has rate limiting, origin checking, or authentication. An attacker could:
- Repeatedly call retry + dimension endpoint to drain LLM API credits
- Repeatedly call finalize to trigger on-chain gas spending

**Recommendation:** Apply the same rate limiting and origin checking pattern used in `proposals/route.ts` and `evaluate/[id]/route.ts`.

#### [MEDIUM] N-02: CSP Allows `unsafe-inline` and `unsafe-eval`
See Top Finding #3 above.

#### [MEDIUM] N-03: No `middleware.ts` for Route Protection

The application has no Next.js middleware. All route protection is done per-API-route, and some routes (finalize, retry) were missed. A middleware layer would provide defense-in-depth.

**Recommendation:** Add a `middleware.ts` that applies rate limiting or at minimum origin validation to all `/api/` routes.

#### [LOW] N-04: Missing HSTS `preload` Directive

**File:** `next.config.ts` line 22

The HSTS header has `includeSubDomains` but not `preload`. For production, add `preload` and submit to the HSTS preload list.

---

### OpenClaw Audit (Skill 3)

#### [CRITICAL] O-01: Installed Skill Contains Dangerous Code Patterns

**Source:** `openclaw security audit --deep`

The `openclaw-audit-watchdog` skill itself contains shell command execution (`child_process`) and environment variable harvesting combined with network access. This is expected behavior for a cron-based audit tool, but it should be reviewed before being trusted in production.

**Note:** This finding is about the audit tooling itself, not the application being audited.

#### [WARN] O-02: Reverse Proxy Headers Not Trusted

Gateway configuration does not trust proxy headers. If exposed behind a reverse proxy, IP-based rate limiting could be spoofed.

#### [WARN] O-03: Ineffective `denyCommands` Entries

Some denied command names do not match actual command names in the system.

---

### Secrets Scanner (Skill 6)

#### [INFO] SS-01: No Leaked Secrets Detected

Scanned for: AWS keys, GitHub tokens, Slack webhooks, private keys, database connection strings, generic API keys, JWT tokens. **All clear.**

`.env.local` contains placeholder values only (`sk-placeholder`, `0x0000...0001`). `.gitignore` correctly excludes `.env`, `.env.local`, and `.env.*.local`.

---

### Dependency Audit (Skill 5)

#### [WARN] D-01: Unable to Run Automated Vulnerability Scan

Neither `npm audit` nor `bun audit` could run due to missing/invalid lockfile. Manual review of `package.json` shows:
- 23 direct dependencies, all from well-known publishers
- No obvious typosquatting detected
- Zod v4.3.6 (latest major), Next.js 16.2.3, React 19.2.4 -- all recent
- `pinata` package is the official Pinata SDK
- `trustedDependencies` is configured (good practice)

**Recommendation:** Generate a valid lockfile (`bun install`) and run `bun audit` or `npm audit` to check for known CVEs in transitive dependencies.

---

### OWASP Security Check (Skill 7)

#### [MEDIUM] OW-01: No Authentication Layer

The application has no authentication system. All API endpoints are public (rate-limited but not authenticated). Anyone can submit proposals, trigger evaluations, and trigger on-chain publishing.

**Note:** This may be by design for a public grant evaluation system, but it means rate limiting is the only abuse prevention mechanism. The rate limiter uses IP-based identification via `x-forwarded-for`, which can be spoofed if the Vercel deployment does not strip/override this header.

#### [LOW] OW-02: Error Responses Could Be More Uniform

The finalize endpoint returns `{ status: "failed" }` with 500 on any error, which is good (no stack traces). However, the dimension evaluation route catches errors silently without logging them, making debugging harder.

---

## Summary Matrix

| ID | Severity | Category | Location | Status |
|----|----------|----------|----------|--------|
| S-01 | HIGH | Signature / Access Control | `IdentityRegistry.sol:110-120` | Open |
| S-02 | HIGH | Initialization / Access Control | `ReputationRegistry.sol:71-75` | Open |
| S-03 | MEDIUM | Numeric / Cast Safety | `ReputationRegistry.sol:276` | Open |
| S-04 | MEDIUM | DoS / Gas | `ReputationRegistry.sol:203-273` | Open |
| S-05 | MEDIUM | Reentrancy | `MilestoneManager.sol:107-140` | Open |
| S-06 | MEDIUM | Access Control | `ReputationRegistry.sol:150-165` | Open |
| S-07 | LOW | Reentrancy (mint callback) | `IdentityRegistry.sol:149` | Open |
| S-08 | LOW | Extensibility | `IdentityRegistry.sol:166-172` | Open |
| N-01 | HIGH | Missing Auth/Rate Limit | `finalize/route.ts`, `retry/route.ts` | Open |
| N-02 | MEDIUM | CSP | `next.config.ts:12` | Open |
| N-03 | MEDIUM | Missing Middleware | (no middleware.ts) | Open |
| N-04 | LOW | HSTS | `next.config.ts:22` | Open |
| O-01 | CRITICAL | Tooling Safety | openclaw-audit-watchdog skill | Review |
| D-01 | WARN | Dependency Audit | package.json (no lockfile) | Open |
| OW-01 | MEDIUM | No Authentication | All API routes | By Design? |
| SS-01 | INFO | Secrets | Codebase-wide | Pass |

---

## Methodology

Each skill was invoked via the Claude Code Skill tool, loading its checklist/ruleset. Findings were produced by:

1. **solidity-audit**: Manual checklist against 18 vulnerability categories from the EVMbench/Code4rena-informed checklist
2. **solidity-security-audit**: Full 5-phase audit methodology (Threat Model, Recon, Automated, Manual, Report) -- automated tools unavailable (no Slither MCP), so full manual review was conducted
3. **openclaw-audit-watchdog**: Ran `openclaw security audit --json` and `openclaw security audit --deep --json` via CLI
4. **security-nextjs**: Grep-based scan for `NEXT_PUBLIC_` exposure, Server Actions, API route auth, middleware, `dangerouslySetInnerHTML`, `next.config` headers
5. **dependency-auditor**: Manual review of `package.json` dependencies; automated audit blocked by missing lockfile
6. **secrets-scanner**: Regex-based scan for AWS keys, GitHub tokens, private keys, database URLs, Slack webhooks, generic API keys, JWT tokens
7. **owasp-security-check**: Systematic review across OWASP Top 10 categories (auth, data protection, input validation, config, API security)
