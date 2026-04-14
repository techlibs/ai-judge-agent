---
phase: 01-foundation-scaffolding
plan: 01
subsystem: infra
tags: [anchor, foundry, solana, ethereum, solidity, rust, monorepo, bun]

# Dependency graph
requires: []
provides:
  - "Anchor project scaffold with grant-evaluator program (builds successfully)"
  - "Foundry project scaffold with GrantEvaluator contract and passing test"
  - "Monorepo root with bun workspaces, TypeScript config, and code style config"
  - "Directory structure for programs/, contracts/, packages/, tests/, models/"
affects: [02-proposal-submission, 03-scoring-models, 04-zkml-integration]

# Tech tracking
tech-stack:
  added: [anchor-lang 1.0.0, "@coral-xyz/anchor 0.32.1", "@solana/web3.js 1.98.4", solidity 0.8.28, forge-std, typescript 5.9.3, bun]
  patterns: [monorepo-workspace, anchor-program-scaffold, foundry-project-layout]

key-files:
  created:
    - Anchor.toml
    - Cargo.toml
    - package.json
    - programs/grant-evaluator/src/lib.rs
    - contracts/src/GrantEvaluator.sol
    - contracts/test/GrantEvaluator.t.sol
    - contracts/foundry.toml
  modified:
    - .gitignore

key-decisions:
  - "Used @coral-xyz/anchor 0.32.1 (npm latest) instead of 1.0.0 -- CLI is 1.0.0 but TS SDK not yet published at 1.0.0"
  - "Used @solana/web3.js 1.x (not 2.x) -- anchor 0.32.x requires web3.js 1.x as peer dependency"
  - "Added profile.release.overflow-checks = true to Cargo.toml -- required by Anchor 1.0.0"

patterns-established:
  - "Anchor program layout: programs/{name}/src/lib.rs with workspace Cargo.toml"
  - "Foundry project layout: contracts/{src,test,script,lib} with forge-std"
  - "Bun workspaces for TypeScript packages under packages/*"
  - ".gitignore blocks *.json except explicitly allowed config files"

requirements-completed: []

# Metrics
duration: 5min
completed: 2026-04-14
---

# Phase 1 Plan 1: Monorepo Scaffolding Summary

**Anchor 1.0.0 Solana program and Foundry 0.8.28 Ethereum contract scaffolded in bun monorepo with both builds passing and placeholder test green**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-14T03:03:24Z
- **Completed:** 2026-04-14T03:08:54Z
- **Tasks:** 3 (1 pre-completed by orchestrator, 2 executed)
- **Files modified:** 16

## Accomplishments
- Monorepo root with Anchor.toml, Cargo.toml, package.json (bun workspaces), and TypeScript config
- Anchor program `grant-evaluator` builds successfully with program ID CvjtrjA1yTdakHYxc77cfEsDHGiBDpKgQXhNXns9YVas
- Foundry project with GrantEvaluator.sol contract and test_Version passing
- Code style config (.editorconfig, .prettierrc, .solhint.json) and secure .gitignore

## Task Commits

Each task was committed atomically:

1. **Task 1: Install Solana, Anchor, and Rust Toolchain** - Completed by orchestrator (Rust 1.94.1, Solana CLI 3.1.13, Anchor CLI 1.0.0, Foundry 1.5.1)
2. **Task 2: Create Monorepo Root and Anchor Project Scaffold** - `5cf29f9` (feat)
3. **Task 3: Create Foundry Project Scaffold with Placeholder Contract and Test** - `a40d01b` (feat)

## Files Created/Modified
- `Anchor.toml` - Anchor workspace config with program ID and toolchain version
- `Cargo.toml` - Rust workspace root with anchor-lang 1.0.0 and overflow-checks
- `package.json` - Root monorepo with bun workspaces and dev dependencies
- `tsconfig.json` - TypeScript config for tests and packages
- `programs/grant-evaluator/Cargo.toml` - Anchor program package config
- `programs/grant-evaluator/Xargo.toml` - Cross-compilation config
- `programs/grant-evaluator/src/lib.rs` - Placeholder Anchor program with initialize instruction
- `contracts/foundry.toml` - Foundry config with solc 0.8.28
- `contracts/remappings.txt` - forge-std remapping
- `contracts/src/GrantEvaluator.sol` - Placeholder contract with version field
- `contracts/test/GrantEvaluator.t.sol` - test_Version assertion (passing)
- `contracts/script/.gitkeep` - Reserved for deployment scripts
- `packages/common/package.json` - Shared library package
- `packages/common/src/index.ts` - Shared constants/types entry point
- `tests/anchor/grant-evaluator.ts` - Placeholder Anchor test
- `models/.gitkeep` - Reserved for Phase 3+ ML models
- `.gitignore` - Secure ignore rules (keypairs, .env, build artifacts; bun.lock NOT ignored)
- `.editorconfig` - Editor formatting rules
- `.prettierrc` - Prettier config
- `.solhint.json` - Solidity linting rules

## Decisions Made
- Used `@coral-xyz/anchor` 0.32.1 instead of 1.0.0 because the TypeScript SDK has not published 1.0.0 to npm yet (only the CLI reached 1.0.0)
- Used `@solana/web3.js` 1.98.4 instead of 2.x because anchor 0.32.x requires web3.js 1.x as a peer dependency
- Added `[profile.release] overflow-checks = true` to root Cargo.toml as required by Anchor 1.0.0 (not in original plan)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added overflow-checks to Cargo.toml**
- **Found during:** Task 2 (Anchor build)
- **Issue:** Anchor 1.0.0 requires `overflow-checks = true` in release profile, build failed without it
- **Fix:** Added `[profile.release] overflow-checks = true` to root Cargo.toml
- **Files modified:** Cargo.toml
- **Verification:** `anchor build` succeeds
- **Committed in:** 5cf29f9 (Task 2 commit)

**2. [Rule 3 - Blocking] Anchor keys sync removed [registry] section**
- **Found during:** Task 2 (Anchor build)
- **Issue:** `anchor keys sync` rewrote Anchor.toml, removing the `[registry]` section and lowercasing cluster name
- **Fix:** Accepted anchor's canonical format (registry section not needed for local dev)
- **Files modified:** Anchor.toml
- **Verification:** `anchor build` succeeds with synced program ID
- **Committed in:** 5cf29f9 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both auto-fixes necessary for Anchor 1.0.0 compatibility. No scope creep.

## Issues Encountered
- `forge install --no-commit` flag does not exist in current Foundry version; used `--no-git` alone which worked correctly

## User Setup Required
None - toolchain was pre-installed by orchestrator.

## Next Phase Readiness
- Both Anchor and Foundry projects build successfully, ready for feature development
- Program ID generated and synced across Anchor.toml and lib.rs
- Directory structure ready for proposal submission contracts (Phase 2)

## Self-Check: PASSED

All 21 files verified present. Both task commits (5cf29f9, a40d01b) found in git log.

---
*Phase: 01-foundation-scaffolding*
*Completed: 2026-04-14*
