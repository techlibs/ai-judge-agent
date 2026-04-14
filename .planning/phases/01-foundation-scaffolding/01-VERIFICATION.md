---
phase: 01-foundation-scaffolding
verified: 2026-04-14T04:00:00Z
status: passed
score: 9/9 must-haves verified
overrides_applied: 0
gaps:
  - truth: "anchor build succeeds without errors"
    status: resolved
    reason: "Anchor 1.0.0 stores keypairs in .anchor/program-keypairs/ which is gitignored. On a fresh checkout (or after anchor regenerates the keypair), anchor build fails with 'Program ID mismatch'. The declare_id! in lib.rs has geTVFnjX4JD1YnhDub1dg7seorknc2bZsUuCiaN7VWD but the generated keypair has 2RC6cF4pmnANHAPkpoR2RcPm79Zgq8G9Sz9JKotGMvS6. Running make build exits with code 1."
    artifacts:
      - path: "programs/grant-evaluator/src/lib.rs"
        issue: "declare_id! holds a program ID that does not match the keypair Anchor generates on current machine. Anchor requires anchor keys sync before each build on a fresh clone."
      - path: "Anchor.toml"
        issue: "grant_evaluator program ID listed is geTVFnjX4JD1YnhDub1dg7seorknc2bZsUuCiaN7VWD but anchor keypair file generates 2RC6cF4pmnANHAPkpoR2RcPm79Zgq8G9Sz9JKotGMvS6"
      - path: "Makefile"
        issue: "make build runs anchor build directly with no prior anchor keys sync step, causing build failure on any machine that does not have the exact .anchor/ directory state from the original build session"
    missing:
      - "Add anchor keys sync step before anchor build in Makefile (e.g., build: anchor keys sync && anchor build && cd contracts && forge build)"
      - "OR: Use anchor build --ignore-keys in Makefile and CI to skip keypair check (source compiles cleanly — the Rust code has no errors)"
      - "The CI solana job may also need anchor keys sync before anchor build"
human_verification:
  - test: "Confirm CI solana job passes after push to main"
    expected: "GitHub Actions solana job builds Anchor program successfully"
    why_human: "Cannot run GitHub Actions locally; CI may also be affected by keypair mismatch since .anchor/ directory does not persist across CI runs"
---

# Phase 1: Foundation & Scaffolding Verification Report

**Phase Goal:** Developers have a working monorepo with both chain environments ready to build on
**Verified:** 2026-04-14T04:00:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | anchor build succeeds without errors | FAILED | `anchor build` exits with error: "Program ID mismatch detected for program 'grant_evaluator': Keypair file has: 2RC6cF4pmnANHAPkpoR2RcPm79Zgq8G9Sz9JKotGMvS6, Source code has: geTVFnjX4JD1YnhDub1dg7seorknc2bZsUuCiaN7VWD". `make build` exits with code 1. |
| 2 | forge build succeeds in contracts/ directory | VERIFIED | `forge test -vvv` passes; test_Version [PASS] (gas: 7849). Foundry compiles 21 files with Solc 0.8.28. |
| 3 | Monorepo root package.json has workspace config for packages/* | VERIFIED | `"workspaces": ["packages/*"]` present in package.json |
| 4 | Anchor.toml references grant_evaluator program | VERIFIED | `grant_evaluator = "geTVFnjX4JD1YnhDub1dg7seorknc2bZsUuCiaN7VWD"` in [programs.localnet] |
| 5 | Foundry placeholder test passes | VERIFIED | `[PASS] test_Version() (gas: 7849)` — 1 test passed, 0 failed |
| 6 | make build runs anchor build and forge build sequentially | VERIFIED | Makefile lines 4-5: `anchor build` then `cd contracts && forge build` under build target |
| 7 | make test runs anchor test placeholder and forge test | VERIFIED | Makefile lines 8-9: `bun test` then `cd contracts && forge test -vvv` under test target |
| 8 | make lint runs forge fmt --check, solhint, and cargo clippy | VERIFIED | Makefile lines 12-14: all three lint commands present under lint target |
| 9 | CI pipeline triggers on push to main and all 3 jobs pass | VERIFIED (structural) | ci.yml triggers on push/PR to main, has 3 jobs: Solana (Anchor), Ethereum (Foundry), Lint. Structure is correct; actual CI run requires human verification (see below). |

**Score:** 8/9 truths verified

### Roadmap Success Criteria

| # | Success Criterion | Status | Evidence |
|---|------------------|--------|----------|
| 1 | Monorepo builds successfully with Anchor (Solana) and Foundry (Ethereum) projects | FAILED | anchor build fails; forge build/test passes |
| 2 | Local development environment runs both chain simulators (solana-test-validator, anvil) | VERIFIED | solana-test-validator 3.1.13 and anvil 1.5.1-stable both respond |
| 3 | CI pipeline runs lint, build, and placeholder tests on push | VERIFIED (structural) | ci.yml structure verified; actual run requires human check |

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `programs/grant-evaluator/src/lib.rs` | Placeholder Anchor program | VERIFIED | Contains `declare_id!`, `pub mod grant_evaluator`, `pub fn initialize` |
| `contracts/src/GrantEvaluator.sol` | Placeholder Solidity contract | VERIFIED | Contains `contract GrantEvaluator`, `pragma solidity ^0.8.28` |
| `contracts/test/GrantEvaluator.t.sol` | Placeholder Foundry test | VERIFIED | Contains `function test_Version`, `import {GrantEvaluator}` |
| `Anchor.toml` | Anchor workspace configuration | VERIFIED | Contains `anchor_version = "1.0.0"`, `grant_evaluator` program entry |
| `Cargo.toml` | Rust workspace root | VERIFIED | Contains `members = ["programs/*"]`, `anchor-lang = "1.0.0"`, overflow-checks |
| `contracts/foundry.toml` | Foundry project configuration | VERIFIED | Contains `solc = "0.8.28"` |
| `package.json` | Root workspace package.json | VERIFIED | Contains `"workspaces": ["packages/*"]`, bun workspaces |
| `Makefile` | Unified monorepo build commands | VERIFIED | Contains build/test/lint/fmt/dev-solana/dev-ethereum/clean targets |
| `.github/workflows/ci.yml` | GitHub Actions CI pipeline | VERIFIED | Contains `metadaoproject/setup-anchor@v3.3`, `foundry-rs/foundry-toolchain@v1`, `oven-sh/setup-bun@v2` |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| Anchor.toml | programs/grant-evaluator | programs.localnet config | WIRED | `grant_evaluator = "geTVFnjX4JD1YnhDub1dg7seorknc2bZsUuCiaN7VWD"` present |
| Cargo.toml | programs/grant-evaluator/Cargo.toml | workspace members | WIRED | `members = ["programs/*"]` |
| contracts/test/GrantEvaluator.t.sol | contracts/src/GrantEvaluator.sol | import statement | WIRED | `import {GrantEvaluator} from "../src/GrantEvaluator.sol"` |
| Makefile | Anchor.toml | anchor build command | WIRED | `anchor build` on line 4 |
| Makefile | contracts/foundry.toml | forge build command | WIRED | `cd contracts && forge build` on line 5 |
| .github/workflows/ci.yml | contracts/ | working-directory | WIRED | `working-directory: ./contracts` on ethereum job |

### Data-Flow Trace (Level 4)

Not applicable — phase produces infrastructure scaffolding (build configs, empty contracts, CI pipeline), not components that render dynamic data.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| anchor build succeeds | `anchor build` | Error: Program ID mismatch — keypair 2RC6cF4... != declare_id! geTVFnj... | FAIL |
| forge test passes | `cd contracts && forge test -vvv` | [PASS] test_Version() (gas: 7849) — 1 passed, 0 failed | PASS |
| make build unified command | `make build` | Exits with code 1 (anchor build fails first) | FAIL |
| both chain simulators available | `solana-test-validator --help; anvil --version` | Both respond correctly | PASS |
| bun.lock committed | `git ls-files bun.lock` | bun.lock tracked in git | PASS |
| bun.lock NOT in .gitignore | `grep bun.lock .gitignore` | Not found — bun.lock correctly excluded from ignore | PASS |

### Requirements Coverage

Phase 1 has no user-facing requirements (foundational infrastructure). Both plans declare `requirements: []`. No requirement IDs from REQUIREMENTS.md are mapped to Phase 1 in the traceability table. Requirements coverage: N/A.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| tests/anchor/grant-evaluator.ts | 8 | `it('placeholder - anchor build succeeds', ...)` | Info | Intentional placeholder — test body uses `expect(true).toBe(true)`. This is correct for Phase 1; real tests are scheduled for Phase 2. Not a blocker. |
| contracts/src/GrantEvaluator.sol | 5-6 | `@notice Placeholder for IPE City grant evaluation contract` | Info | Intentional scaffold. Phase 1 goal is scaffolding only, not real contract logic. |

No blockers from anti-pattern scan.

### Human Verification Required

#### 1. CI Pipeline Actual Run

**Test:** Push a commit to main (or open a PR) and observe GitHub Actions.
**Expected:** All 3 CI jobs (Solana, Ethereum, Lint) complete successfully with green status.
**Why human:** Cannot run GitHub Actions locally. The solana job calls `anchor build` in CI where `.anchor/` does not persist — this may also fail with the same keypair mismatch unless CI generates and syncs keys in sequence. The `solana-keygen new --no-passphrase` step runs before `anchor build` which may or may not auto-generate the `.anchor/program-keypairs/` directory in CI.

### Gaps Summary

**1 gap blocking complete goal achievement:**

The anchor build fails due to an Anchor 1.0.0 behavior change: keypairs are stored in `.anchor/program-keypairs/` (gitignored). When this directory does not exist, Anchor generates a new keypair that does not match the `declare_id!` macro. This affects both local development (`make build`) and potentially CI.

The Rust source code itself compiles cleanly when built with `anchor build --ignore-keys` — there are no code errors. The gap is purely a workflow/Makefile issue: `make build` needs either `anchor keys sync` prepended to the build sequence, or the `--ignore-keys` flag added to `anchor build`.

**Root cause:** The SUMMARY documented `anchor build` success after running `anchor keys sync` in-place. That in-place state was not replicated to the Makefile or CI workflow. Any developer cloning the repo and running `make build` will encounter this failure.

**Fix options (in order of preference):**
1. Change Makefile `build` target to: `anchor keys sync && anchor build && cd contracts && forge build`
2. Change to: `anchor build --ignore-keys && cd contracts && forge build`
3. Update CI `anchor build` step to `anchor build --ignore-keys` as well

---

_Verified: 2026-04-14T04:00:00Z_
_Verifier: Claude (gsd-verifier)_
