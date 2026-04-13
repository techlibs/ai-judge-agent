# Audit Skills Toolkit

Curated Claude Code skills for auditing the agent-reviewer project across all layers: Solidity smart contracts, Next.js web app, TypeScript code quality, dependency supply chain, and secrets management.

**Stack context:** Next.js 15 (App Router) + TypeScript strict + Solidity 0.8.24+ (Foundry) + viem + IPFS (Pinata) + Mastra (`@mastra/core`, `@mastra/evals`) + Vercel AI SDK + Vercel

**Last updated:** 2026-04-12

---

## Quick Install

Install all Tier 1 skills (the essential audit toolkit):

```bash
npx skills add 0xlayerghost/solidity-agent-kit@solidity-audit -g -y
npx skills add mariano-aguero/solidity-security-audit-skill@solidity-security-audit -g -y
npx skills add igorwarzocha/opencode-workflows@security-nextjs -g -y
npx skills add useai-pro/openclaw-skills-security@dependency-auditor -g -y
npx skills add patricio0312rev/skills@secrets-scanner -g -y
npx skills add sergiodxa/agent-skills@owasp-security-check -g -y
npx skills add prompt-security/clawsec@openclaw-audit-watchdog -g -y
```

Install Tier 2 (highly valuable additions):

```bash
npx skills add trailofbits/skills@token-integration-analyzer -g -y
npx skills add jpkovas/code-audit-readonly@code-audit-readonly -g -y
npx skills add wshobson/agents@solidity-security -g -y
npx skills add harperaa/secure-claude-skills@dependency-supply-chain-security -g -y
npx skills add oimiragieo/agent-studio@static-analysis -g -y
```

Install Tier 3 (development and quality support):

```bash
npx skills add pseudoyu/agent-skills@solidity-gas-optimization -g -y
npx skills add tenequm/claude-plugins@foundry-solidity -g -y
npx skills add 0xlayerghost/solidity-agent-kit@solidity-testing -g -y
npx skills add miles990/claude-software-skills@code-quality -g -y
npx skills add daffy0208/ai-dev-standards@security-engineer -g -y
npx skills add alinaqi/claude-bootstrap@security -g -y
```

---

## Tier 1 -- Must-Have

These skills directly audit the core layers of our stack.

### 1. Solidity Audit (0xlayerghost)

| | |
|---|---|
| **Skill** | `solidity-audit` |
| **Repo** | `0xlayerghost/solidity-agent-kit` |
| **Installs** | ~77 |
| **Browse** | https://skills.sh/0xlayerghost/solidity-agent-kit/solidity-audit |

**What it audits:** 18 vulnerability categories -- reentrancy, access control, flash loans, oracle manipulation, MEV, numerical precision, proxy upgrades, cross-chain bridges, UI injection, key compromise. References academic research (EVMbench) and includes Code4rena audit checklists with real incident case studies (2021-2026). Integrates Slither MCP for automated static analysis.

**Why we need it:** Expert-level Solidity audit with real-world case studies and Slither integration. The most comprehensive contract auditor found -- covers our ERC-8004 registries against the exact vulnerability classes that have caused billions in losses.

```
npx skills add 0xlayerghost/solidity-agent-kit@solidity-audit -g -y
```

---

### 2. Solidity Security Audit (mariano-aguero)

| | |
|---|---|
| **Skill** | `solidity-security-audit` |
| **Repo** | `mariano-aguero/solidity-security-audit-skill` |
| **Installs** | ~35 |
| **Browse** | https://skills.sh/mariano-aguero/solidity-security-audit-skill/solidity-security-audit |

**What it audits:** 50+ vulnerability types using a 5-phase methodology -- reentrancy, access control, oracle manipulation, flash loan attacks, integer overflow, front-running, storage collisions, delegatecall risks, and DeFi-specific patterns. Covers L2/cross-chain concerns.

**Why we need it:** Complementary 5-phase methodology that adds structured audit process on top of skill #1. Two perspectives on contract security catch more than one.

```
npx skills add mariano-aguero/solidity-security-audit-skill@solidity-security-audit -g -y
```

---

### 3. OpenClaw Audit Watchdog (Prompt Security)

| | |
|---|---|
| **Skill** | `openclaw-audit-watchdog` |
| **Repo** | `prompt-security/clawsec` |
| **Installs** | ~473 |
| **Browse** | https://skills.sh/prompt-security/clawsec/openclaw-audit-watchdog |

**What it audits:** Automated security audits with severity classification (critical/warning/info). Integrates with Socket, Snyk, and Gen Agent Trust Hub for third-party validation. Features defense-in-depth activation, four-tier config resolution, suppression allowlisting, and enterprise delivery channels (Telegram, Slack, email).

**Why we need it:** Production-grade, enterprise-ready audit orchestrator. While other skills audit specific domains, this one provides the scheduling and severity triage layer that ties audits together. High adoption (473 installs) signals real-world validation.

```
npx skills add prompt-security/clawsec@openclaw-audit-watchdog -g -y
```

---

### 4. Security-NextJS

| | |
|---|---|
| **Skill** | `security-nextjs` |
| **Repo** | `igorwarzocha/opencode-workflows` |
| **Installs** | ~130 |
| **Browse** | https://skills.sh/igorwarzocha/opencode-workflows/security-nextjs |

**What it audits:** Next.js-specific vulnerabilities -- `NEXT_PUBLIC_` secret exposure, unauthenticated Server Actions, middleware auth gaps, IDOR in API routes, `dangerouslySetInnerHTML` usage, missing security headers (CSP, HSTS, X-Frame-Options).

**Why we need it:** Our Next.js App Router handles the write pipeline (IPFS pin, chain tx via API routes). An unauthenticated Server Action or missing auth middleware could allow unauthorized proposal submissions or evaluation triggers.

```
npx skills add igorwarzocha/opencode-workflows@security-nextjs -g -y
```

---

### 5. Dependency Auditor

| | |
|---|---|
| **Skill** | `dependency-auditor` |
| **Repo** | `useai-pro/openclaw-skills-security` |
| **Installs** | ~200 |
| **Browse** | https://skills.sh/useai-pro/openclaw-skills-security/dependency-auditor |

**What it audits:** npm package legitimacy, known CVEs, suspicious indicators, dependency tree depth, license compatibility. Checks for vulnerable transitive dependencies.

**Why we need it:** We depend on `@mastra/core`, `@mastra/evals`, `ai`, `@ai-sdk/anthropic`, `viem`, `@pinata/sdk`, `zod`, and the full Next.js/React stack. A compromised dependency in Mastra, AI SDK, or viem could exfiltrate private keys or API tokens.

```
npx skills add useai-pro/openclaw-skills-security@dependency-auditor -g -y
```

---

### 6. Secrets Scanner

| | |
|---|---|
| **Skill** | `secrets-scanner` |
| **Repo** | `patricio0312rev/skills` |
| **Installs** | ~64 |
| **Browse** | https://skills.sh/patricio0312rev/skills/secrets-scanner |

**What it audits:** Hardcoded AWS keys, GitHub tokens, Slack webhooks, private keys, API keys, JWT tokens, database connection strings. Scans source files before they reach version control.

**Why we need it:** This project handles Anthropic API keys, IPFS pinning keys, and blockchain private keys for contract deployment. A single leaked key in a commit could drain testnet funds or rack up LLM charges.

```
npx skills add patricio0312rev/skills@secrets-scanner -g -y
```

---

### 7. OWASP Security Check

| | |
|---|---|
| **Skill** | `owasp-security-check` |
| **Repo** | `sergiodxa/agent-skills` |
| **Installs** | ~556 |
| **Browse** | https://skills.sh/sergiodxa/agent-skills/owasp-security-check |

**What it audits:** OWASP Top 10 categories -- authentication, data protection, input/output validation, security configuration, API vulnerabilities, injection attacks (XSS, CSRF, SQL injection).

**Why we need it:** Our API routes accept grant proposal data and evaluation parameters. Without proper input validation, an attacker could inject malicious content into proposals that gets stored on IPFS and evaluated by AI judges.

```
npx skills add sergiodxa/agent-skills@owasp-security-check -g -y
```

---

## Tier 2 -- Highly Valuable

Deeper coverage for token standards, full-repo audits, and supply chain hardening.

### 8. Token Integration Analyzer (Trail of Bits)

| | |
|---|---|
| **Skill** | `token-integration-analyzer` |
| **Repo** | `trailofbits/skills` |
| **Installs** | ~1,400 |
| **Browse** | https://skills.sh/trailofbits/skills/token-integration-analyzer |

**What it audits:** ERC token conformity, 24+ non-standard token behaviors, owner privileges, integration safety. From Trail of Bits -- one of the most respected smart contract security firms.

**Why we need it:** ERC-8004 extends ERC-721. This skill catches non-standard behaviors and integration issues that generic Solidity auditors miss. Trail of Bits authorship adds credibility.

```
npx skills add trailofbits/skills@token-integration-analyzer -g -y
```

---

### 9. Code Audit Readonly

| | |
|---|---|
| **Skill** | `code-audit-readonly` |
| **Repo** | `jpkovas/code-audit-readonly` |
| **Installs** | ~12 |
| **Browse** | https://skills.sh/jpkovas/code-audit-readonly/code-audit-readonly |

**What it audits:** Full repository sweep -- logic bugs, performance issues, code duplication, security (XSS, CSRF, crypto misuse), test coverage gaps, dependency vulnerabilities. Operates in read-only mode (no code modifications).

**Why we need it:** Non-destructive whole-repo audit that complements the domain-specific skills. Good for periodic health checks across the entire codebase.

```
npx skills add jpkovas/code-audit-readonly@code-audit-readonly -g -y
```

---

### 10. Solidity Security (wshobson)

| | |
|---|---|
| **Skill** | `solidity-security` |
| **Repo** | `wshobson/agents` |
| **Installs** | ~7,300 |
| **Browse** | https://skills.sh/wshobson/agents/solidity-security |

**What it provides:** Secure Solidity development patterns and reference material -- reentrancy guards, overflow protection, access control patterns, front-running mitigations. More educational/reference than audit-focused.

**Why we need it:** Highest adoption of any Solidity security skill. Good as a pattern reference during contract development, complements the audit-focused skill (#1).

```
npx skills add wshobson/agents@solidity-security -g -y
```

---

### 11. Dependency Supply Chain Security

| | |
|---|---|
| **Skill** | `dependency-supply-chain-security` |
| **Repo** | `harperaa/secure-claude-skills` |
| **Installs** | ~111 |
| **Browse** | https://skills.sh/harperaa/secure-claude-skills/dependency-supply-chain-security |

**What it audits:** Typosquatting detection, maintainer verification, package integrity checks, suspicious version bumps, abandoned package identification.

**Why we need it:** Complements the dependency auditor (#5) with supply-chain-specific checks. Catches social engineering attacks on npm packages that CVE databases miss.

```
npx skills add harperaa/secure-claude-skills@dependency-supply-chain-security -g -y
```

---

### 12. Static Analysis (CodeQL + Semgrep)

| | |
|---|---|
| **Skill** | `static-analysis` |
| **Repo** | `oimiragieo/agent-studio` |
| **Installs** | ~44 |
| **Browse** | https://skills.sh/oimiragieo/agent-studio/static-analysis |

**What it audits:** CodeQL and Semgrep scanning for OWASP Top 10, hardcoded secrets, SQL/command injection, auth failures, code quality. 6-step methodology with SARIF output, false positive assessment, and GitHub Actions templates. Includes "Iron Laws" for CI/CD gate enforcement.

**Why we need it:** Brings professional SAST tooling (CodeQL, Semgrep) into the audit pipeline. Generates machine-readable SARIF output for CI integration. Complements the pattern-based skills with deep static analysis.

```
npx skills add oimiragieo/agent-studio@static-analysis -g -y
```

---

## Tier 3 -- Supporting and Development

Quality, testing, and optimization skills that improve code before it reaches audit.

### 13. Solidity Gas Optimization

| | |
|---|---|
| **Skill** | `solidity-gas-optimization` |
| **Repo** | `pseudoyu/agent-skills` |
| **Installs** | ~94 |
| **Browse** | https://skills.sh/pseudoyu/agent-skills/solidity-gas-optimization |

**What it covers:** 80+ gas optimization techniques -- storage layout, calldata vs memory, design patterns, cross-contract call efficiency, compiler optimization flags.

**Relevance:** Not a security audit, but gas-inefficient contracts can become economically unviable. Useful during contract development on Base Sepolia before mainnet deployment.

```
npx skills add pseudoyu/agent-skills@solidity-gas-optimization -g -y
```

---

### 14. Foundry-Solidity

| | |
|---|---|
| **Skill** | `foundry-solidity` |
| **Repo** | `tenequm/claude-plugins` |
| **Installs** | ~57 |
| **Browse** | https://skills.sh/tenequm/claude-plugins/foundry-solidity |

**What it covers:** Foundry 1.5+ development patterns -- unit tests, fuzz tests, invariant tests, fork tests, deployment scripting with `forge script`.

**Relevance:** Our contracts use Foundry. This skill ensures proper test scaffolding (especially fuzz and invariant tests) that catch edge cases before deployment.

```
npx skills add tenequm/claude-plugins@foundry-solidity -g -y
```

---

### 15. Solidity Testing

| | |
|---|---|
| **Skill** | `solidity-testing` |
| **Repo** | `0xlayerghost/solidity-agent-kit` |
| **Installs** | ~61 |
| **Browse** | https://skills.sh/0xlayerghost/solidity-agent-kit/solidity-testing |

**What it covers:** Testing standards -- happy path, permission checks, boundary conditions, event emissions, failure scenarios. Ensures test coverage across all contract functions.

**Relevance:** Complements Foundry skill with structured testing methodology. Ensures no contract function goes untested.

```
npx skills add 0xlayerghost/solidity-agent-kit@solidity-testing -g -y
```

---

### 16. Code Quality

| | |
|---|---|
| **Skill** | `code-quality` |
| **Repo** | `miles990/claude-software-skills` |
| **Installs** | ~278 |
| **Browse** | https://skills.sh/miles990/claude-software-skills/code-quality |

**What it covers:** Clean code enforcement -- detects `console.log`, TypeScript `any` usage, excessive function parameters, TODO references, relative import issues. SOLID principles.

**Relevance:** Our CLAUDE.md already bans `any` and `as Type`. This skill automates enforcement and catches additional code smells.

```
npx skills add miles990/claude-software-skills@code-quality -g -y
```

---

### 17. Security Engineer

| | |
|---|---|
| **Skill** | `security-engineer` |
| **Repo** | `daffy0208/ai-dev-standards` |
| **Installs** | ~117 |
| **Browse** | https://skills.sh/daffy0208/ai-dev-standards/security-engineer |

**What it covers:** General secure development framework -- authentication patterns, input validation, secure configuration, data protection, monitoring and logging.

**Relevance:** Broad security posture guidance. Good for ensuring overall security hygiene across the full-stack.

```
npx skills add daffy0208/ai-dev-standards@security-engineer -g -y
```

---

### 18. Security (Bootstrap)

| | |
|---|---|
| **Skill** | `security` |
| **Repo** | `alinaqi/claude-bootstrap` |
| **Installs** | ~196 |
| **Browse** | https://skills.sh/alinaqi/claude-bootstrap/security |

**What it covers:** Multi-area security testing -- secret detection, dependency auditing, input validation, environment management, security headers. Covers several areas in one skill.

**Relevance:** Overlaps with Tier 1 skills but provides a unified checklist. Good for quick passes.

```
npx skills add alinaqi/claude-bootstrap@security -g -y
```

---

## Coverage Matrix

How the toolkit maps to our project's audit surfaces:

| Audit Surface | Tier 1 | Tier 2 | Tier 3 |
|--------------|--------|--------|--------|
| **Solidity contracts** (ERC-8004, registries) | Solidity Audit, Solidity Security Audit | Token Integration Analyzer, Solidity Security | Gas Optimization, Foundry, Testing |
| **Next.js App Router** (API routes, Server Actions) | Security-NextJS, OWASP | Code Audit Readonly, Static Analysis | Security Engineer, Security Bootstrap |
| **npm dependencies** (@mastra/core, ai, viem, zod, pinata) | Dependency Auditor | Supply Chain Security | -- |
| **Secrets and credentials** (API keys, private keys) | Secrets Scanner | Static Analysis | Security Bootstrap |
| **TypeScript code quality** (strict mode, patterns) | -- | Static Analysis | Code Quality |
| **Full-repo sweep** | OWASP, OpenClaw Watchdog | Code Audit Readonly | Security Engineer |
| **CI/CD integration** | OpenClaw Watchdog | Static Analysis (SARIF) | -- |

### Coverage Gaps (Cross-Worktree)

The worktrees use stack components not covered by the skills above. These require manual audit checks or future skill additions:

| Gap | Present In | Risk | Mitigation |
|-----|-----------|------|------------|
| **Drizzle ORM / libsql** | speckit, superpower | SQL injection via raw queries, destructive migrations, local .db file exposure | Manual: check for raw SQL, verify `.db` in `.gitignore`, review migrations |
| **NextAuth v5-beta** | speckit | Session hijacking, CSRF bypass, callback URL open redirect, beta-version bugs | Manual: review auth config, callback validation, session strategy |
| **GraphQL (graphql-request)** | speckit | Introspection leak, query depth DoS, injection via variables | Manual: check introspection disabled in prod, query depth limits |
| **Mastra agents (@mastra/core, @mastra/evals)** | superpower | Prompt injection via user-controlled proposal content flowing to LLM, unvalidated structured output | Manual: trace user input → prompt path, verify Zod validation on LLM output |
| **Upstash Redis / rate limiting** | speckit, superpower | Rate limiter bypass via header spoofing, missing coverage on cost-generating endpoints | Manual: verify rate limits on `/api/evaluate/*`, check IP extraction |
| **The Graph (subgraph)** | speckit | Stale indexer data treated as authoritative, query manipulation | Manual: verify subgraph data is cross-checked against on-chain reads |
| **Local SQLite (.db files)** | superpower | Database file committed to repo or exposed via misconfigured static serving | Manual: check `.gitignore`, verify Next.js `public/` exclusion |

---

## Cross-Worktree Audit with Agent Teams

The project has 3 implementation worktrees built with different SDD frameworks. Running audits across all 3 in parallel requires [Claude Code Agent Teams](https://code.claude.com/docs/en/agent-teams).

### Prerequisites

1. Enable agent teams (one-time):

```json
// .claude/settings.local.json or ~/.claude/settings.json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

2. Install Tier 1 skills (see Quick Install above)

3. The `worktree-audit-runner` agent definition is at `.claude/agents/worktree-audit-runner.md`

### Agent Team Launch

Ask Claude to create a team with one auditor per worktree:

```text
Create an agent team to audit all 3 implementation worktrees in parallel.
Spawn 3 teammates using the worktree-audit-runner agent type:

- "gsd-auditor" with prompt: "Audit the worktree at .worktrees/full-vision-roadmap/. 
  Run the full audit checklist. Write AUDIT-REPORT.md at the worktree root."

- "speckit-auditor" with prompt: "Audit the worktree at .worktrees/speckit/. 
  Run the full audit checklist. Write AUDIT-REPORT.md at the worktree root."

- "superpower-auditor" with prompt: "Audit the worktree at .worktrees/superpower/. 
  Run the full audit checklist. Write AUDIT-REPORT.md at the worktree root."

After all 3 complete, synthesize a comparative CROSS-AUDIT-REPORT.md at the repo 
root that highlights: (1) findings unique to each worktree, (2) findings common 
across worktrees, (3) stack gaps — components present in one worktree but missing 
security coverage in another.
```

### Expected Output

Each teammate produces an `AUDIT-REPORT.md` in its worktree with standardized sections:
- Stack detection table
- Findings by severity (CRITICAL → INFO) with file:line locations
- Audit coverage checklist showing which audits ran and which were skipped

The lead then synthesizes `CROSS-AUDIT-REPORT.md` with:
- **Common findings**: issues shared across 2+ worktrees (likely architectural)
- **Unique findings**: issues specific to one framework's approach
- **Stack coverage comparison**: which worktree covers auth, DB, rate limiting, etc.
- **Recommendation**: which implementation has the strongest security posture

### Worktree Stack Summary

For reference, here is what each worktree contains:

| Component | full-vision-roadmap (GSD) | speckit (Spec Kit) | superpower (Superpowers) |
|-----------|--------------------------|-------------------|------------------------|
| Next.js | 16.2.3 | 15.3.1 | 16.2.3 |
| Contracts | 2 (Identity, Reputation) | 6 (+ Evaluation, Milestone, Validation, Dispute) | 3 (+ Milestone) |
| Database | None | Drizzle + libsql | Drizzle + libsql |
| Auth | None | NextAuth v5-beta | None |
| AI framework | Vercel AI SDK | Vercel AI SDK | Mastra + Evals |
| GraphQL | No | Yes (The Graph) | No |
| IPFS | No | Pinata | Pinata |
| Rate limiting | No | Upstash | Upstash |
| Test framework | Playwright BDD | Vitest + Playwright | Playwright |
| Package manager | Bun | npm | npm |

### Existing Design Auditors

The 3 pre-existing agent definitions in `.claude/agents/` are complementary — they audit the **design docs and specs**, not the running code:

| Agent | Focus | Use With |
|-------|-------|----------|
| `vision-design-auditor` | Architecture, trust boundaries, threat models | Reference architecture docs |
| `speckit-design-auditor` | API contracts, data flow, security headers | Spec Kit feature specs |
| `superpowers-design-auditor` | Solidity patterns, EVM security, gas | Contract design docs |

The `worktree-audit-runner` audits the **implemented code**. Run design auditors first (on docs), then code auditors (on worktrees) for full coverage.

---

## Suggested Audit Workflow

### Single-Worktree (daily development)

1. **Pre-commit:** Run `secrets-scanner` to catch leaked credentials
2. **Per-PR:** Run `security-nextjs` + `owasp-security-check` + `static-analysis` on changed files
3. **Per-milestone:** Run `solidity-audit` + `solidity-security-audit` + `token-integration-analyzer` on contract changes
4. **Periodic:** Run `dependency-auditor` + `dependency-supply-chain-security` weekly
5. **Before deployment:** Run `code-audit-readonly` + `openclaw-audit-watchdog` for a full-repo sweep
6. **During development:** Use `foundry-solidity` + `solidity-testing` + `solidity-gas-optimization` while writing contracts
7. **Continuous:** Configure `openclaw-audit-watchdog` for automated scheduled audits with severity alerts

### Cross-Worktree (framework comparison)

1. **Design audit:** Run the 3 design auditor agents against each worktree's planning docs
2. **Code audit:** Launch the agent team with `worktree-audit-runner` (see above)
3. **Comparative synthesis:** Lead produces `CROSS-AUDIT-REPORT.md`
4. **Gap remediation:** Address common findings first (architectural issues), then unique findings per worktree
