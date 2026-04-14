# Phase 1: Foundation & Scaffolding - Research

**Researched:** 2026-04-13
**Domain:** Monorepo scaffolding, Solana (Anchor), Ethereum (Foundry), CI pipeline
**Confidence:** HIGH

## Summary

Phase 1 establishes the project monorepo with working Anchor (Solana) and Foundry (Ethereum) projects, local development environments for both chains, and a CI pipeline. This is a greenfield scaffolding phase with no user-facing requirements -- it produces the foundation for all subsequent phases.

The critical discovery is that the development machine is missing Rust, Solana CLI, and Anchor CLI entirely. Foundry (forge 1.5.1, anvil 1.5.1) is already installed. The plan must include toolchain installation as a prerequisite step. Additionally, the monorepo must accommodate a future Python/ML workspace (Phase 3+) so the directory structure should reserve space for it without implementing it now.

**Primary recommendation:** Use a flat monorepo with top-level directories for each workspace (`programs/` for Anchor, `contracts/` for Foundry, `packages/` for shared TypeScript), install Solana/Anchor toolchain via the official one-command installer, and set up GitHub Actions CI with the `metadaoproject/setup-anchor` and `foundry-rs/foundry-toolchain` actions.

## Standard Stack

### Core

| Library/Tool | Version | Purpose | Why Standard |
|-------------|---------|---------|--------------|
| Anchor CLI | 1.0.0 | Solana program framework | Stable 1.0.0 released April 2, 2026. Industry standard for Solana programs. [VERIFIED: github.com/solana-foundation/anchor/releases] |
| Solana CLI (Agave) | 2.1+ (latest 3.0.10+) | Solana toolchain and local validator | Required by Anchor 1.0.0. Official Solana CLI. [VERIFIED: solana.com/docs/intro/installation] |
| Foundry (forge/anvil/cast) | 1.5.1 | Ethereum dev/test/deploy | Already installed on dev machine. Industry standard for Solidity. [VERIFIED: local `forge --version`] |
| Rust | 1.85+ (latest 1.91.1) | Required for Anchor program compilation | Installed automatically by Solana installer. [VERIFIED: solana.com/docs/intro/installation] |
| Node.js | 23.10.0 | TypeScript tests, client SDKs, tooling | Already installed. [VERIFIED: local `node --version`] |
| Bun | 1.3.1 | Package manager/runner (per CLAUDE.md convention) | Already installed. Project convention per CLAUDE.md. [VERIFIED: local `bun --version`] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @coral-xyz/anchor | 0.32.1 (npm latest) | Anchor TypeScript client | Integration tests for Solana programs. [VERIFIED: npm registry] |
| @solana/web3.js | 1.98.4 (npm latest) | Solana RPC client | Low-level Solana interactions. [VERIFIED: npm registry] |
| solhint | 6.2.1 | Solidity linter | CI linting for Ethereum contracts. [VERIFIED: npm registry] |
| prettier | latest | Code formatter | Non-Solidity file formatting in CI. [ASSUMED] |

### Alternatives Considered

| Recommended | Alternative | Tradeoff |
|------------|-----------|----------|
| Bun (package manager) | Yarn/npm | CLAUDE.md specifies Bun preference. Yarn is Anchor's default but Bun works fine for dependency management. |
| GitHub Actions | Other CI | GitHub Actions is industry standard, has dedicated Anchor and Foundry actions. No reason to use anything else. |
| Flat monorepo | Turborepo/Nx | Overkill for 2-3 workspaces. Anchor and Foundry each have their own build systems. A simple monorepo with shell scripts or Makefile suffices. |

### Installation

```bash
# Solana + Anchor + Rust (one command -- installs everything)
curl --proto '=https' --tlsv1.2 -sSfL https://solana-install.solana.workers.dev | bash

# Verify
rustc --version && solana --version && anchor --version

# Switch to Anchor 1.0.0 (installer may default to 0.32.1)
avm install 1.0.0
avm use 1.0.0

# Foundry already installed (forge 1.5.1, anvil 1.5.1)
# To update if needed:
# foundryup

# Node.js dependencies (in monorepo root)
bun install
```

## Architecture Patterns

### Recommended Project Structure

```
ipe-city-evaluator/
├── .github/
│   └── workflows/
│       └── ci.yml                 # CI pipeline
├── programs/                      # Solana programs (Anchor workspace)
│   └── grant-evaluator/
│       ├── Cargo.toml
│       └── src/
│           └── lib.rs             # Placeholder program
├── contracts/                     # Ethereum contracts (Foundry project)
│   ├── src/
│   │   └── GrantEvaluator.sol     # Placeholder contract
│   ├── test/
│   │   └── GrantEvaluator.t.sol   # Placeholder test
│   ├── script/
│   ├── foundry.toml
│   └── remappings.txt
├── packages/                      # Shared TypeScript packages
│   └── common/                    # Shared types, constants
│       ├── package.json
│       └── src/
├── tests/                         # Integration tests (TypeScript)
│   └── anchor/
│       └── grant-evaluator.ts     # Anchor integration tests
├── models/                        # Reserved for Phase 3+ (Python/ML)
│   └── .gitkeep
├── Anchor.toml                    # Anchor workspace config
├── Cargo.toml                     # Rust workspace (Anchor programs)
├── package.json                   # Root package.json (bun workspace)
├── bun.lock
├── .solhint.json                  # Solhint config
├── .prettierrc                    # Prettier config
├── .editorconfig
├── Makefile                       # Build/test/dev commands
└── README.md
```

### Pattern 1: Anchor Workspace in Monorepo

**What:** Anchor uses its own workspace concept via `Anchor.toml` which points to programs in `programs/`. The Rust workspace (`Cargo.toml` at root) mirrors this. [CITED: anchor-lang.com/docs/quickstart/local]

**When to use:** Always -- this is how Anchor works.

**Example:**

```toml
# Anchor.toml
[toolchain]
anchor_version = "1.0.0"

[features]
resolution = true
skip-lint = false

[programs.localnet]
grant_evaluator = "keypair-path-here"

[registry]
url = "https://api.apr.dev"

[provider]
cluster = "Localnet"
wallet = "~/.config/solana/id.json"

[scripts]
test = "bun test"
```

```toml
# Cargo.toml (root workspace)
[workspace]
members = ["programs/*"]
resolver = "2"

[workspace.dependencies]
anchor-lang = "1.0.0"
```

### Pattern 2: Foundry Subdirectory

**What:** Foundry project lives in `contracts/` with its own `foundry.toml`. Foundry is self-contained and does not interfere with the Anchor workspace. [CITED: book.getfoundry.sh/projects/project-layout]

**When to use:** Always -- keeps Ethereum contracts isolated from Solana programs.

**Example:**

```toml
# contracts/foundry.toml
[profile.default]
src = "src"
out = "out"
libs = ["lib"]
solc = "0.8.28"

[profile.default.fmt]
line_length = 120
tab_width = 4

[profile.ci]
fuzz = { runs = 1000 }
```

### Pattern 3: Makefile as Monorepo Orchestrator

**What:** A root `Makefile` provides unified commands across both chain environments. [ASSUMED]

**When to use:** Always -- developers need one place to run build/test/lint across the entire project.

**Example:**

```makefile
.PHONY: build test lint dev-solana dev-ethereum

build:
	anchor build
	cd contracts && forge build

test:
	anchor test
	cd contracts && forge test

lint:
	cd contracts && forge fmt --check
	cd contracts && bun solhint 'src/**/*.sol'
	cargo clippy --workspace -- -D warnings

dev-solana:
	solana-test-validator

dev-ethereum:
	anvil
```

### Anti-Patterns to Avoid

- **Nested git repos:** Do NOT use `forge init` with `--no-git` inside the monorepo root and then have a separate git repo for contracts. One repo, one `.git`. Use `forge init contracts --no-git --no-commit`. [ASSUMED]
- **Anchor init at root:** Do NOT run `anchor init` at the project root since it will try to create its own git repo and npm project. Instead, manually create the Anchor workspace structure. [CITED: github.com/project-serum/anchor/issues/1633]
- **Mixing package managers:** Stick with Bun for all JS/TS dependencies. Don't let Anchor's default Yarn setup coexist with Bun.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Solana program framework | Custom PDAs, serialization | Anchor 1.0.0 | Account validation, IDL generation, security checks built in |
| Ethereum dev environment | Custom build scripts | Foundry | Compilation, testing, local chain, deployment all included |
| CI Solana setup | Shell scripts to install Solana/Anchor | `metadaoproject/setup-anchor@v3.3` | Handles caching, version pinning, cross-platform |
| CI Foundry setup | Shell scripts to install Foundry | `foundry-rs/foundry-toolchain@v1` | Official action, handles caching and versioning |
| Solidity linting | Custom rules | solhint + forge fmt | Industry standard, configurable rules |
| Rust linting | Custom checks | cargo clippy | Comprehensive Rust linter, catches common mistakes |

## Common Pitfalls

### Pitfall 1: Anchor/Solana Version Mismatch

**What goes wrong:** Anchor 1.0.0 requires Solana CLI 2.1+. The one-command installer may install Solana CLI 3.x which should be compatible, but older Anchor versions won't work with newer Solana CLI. [VERIFIED: anchor-lang.com/docs/installation]
**Why it happens:** Multiple version managers (avm for Anchor, solana-install for CLI) can drift.
**How to avoid:** Pin versions in `Anchor.toml` and CI workflow. Verify compatibility after installation.
**Warning signs:** `anchor build` fails with cryptic BPF/SBF toolchain errors.

### Pitfall 2: macOS ARM64 Solana Build Issues

**What goes wrong:** Solana CLI has historically had issues with native ARM64 (Apple Silicon) builds. The official installer may use Rosetta or require source compilation. [VERIFIED: search results on ARM64 installation]
**Why it happens:** Solana binaries were originally x86-only.
**How to avoid:** Use the official one-command installer which handles this. If it fails, build from source via `cargo install solana-cli`. Test that `solana-test-validator` starts successfully.
**Warning signs:** 404 errors during download, SIGILL crashes when running Solana tools.

### Pitfall 3: Forge Init Conflicts in Monorepo

**What goes wrong:** Running `forge init` in a subdirectory creates a new git repo, `.gitignore`, and `README.md` that conflict with the monorepo root. [ASSUMED]
**Why it happens:** `forge init` assumes it's creating a standalone project.
**How to avoid:** Use `forge init contracts --no-git --no-commit` or manually create the Foundry project structure.
**Warning signs:** Nested `.git` directories, duplicate `.gitignore` files.

### Pitfall 4: CI Runner Solana Validator Timeout

**What goes wrong:** `anchor test` spins up `solana-test-validator` which can timeout on CI runners due to slow startup. [ASSUMED]
**Why it happens:** GitHub Actions runners are shared VMs with variable I/O performance.
**How to avoid:** For Phase 1, use placeholder tests that don't need the validator. In later phases, use LiteSVM for fast in-process testing instead of `solana-test-validator`.
**Warning signs:** CI tests hang indefinitely or timeout after 10+ minutes.

### Pitfall 5: Bun vs Yarn Conflict with Anchor

**What goes wrong:** Anchor defaults to Yarn for package management. Using Bun alongside may cause lockfile conflicts or dependency resolution issues. [ASSUMED]
**Why it happens:** `anchor init` generates a `package.json` with Yarn-specific scripts.
**How to avoid:** Manually set up `package.json` with Bun. Remove any `yarn.lock` files. Ensure `Anchor.toml` test scripts use `bun test` not `yarn test`.
**Warning signs:** Duplicate lockfiles (`yarn.lock` + `bun.lock`), dependency not found errors.

## Code Examples

### Placeholder Solana Program (Anchor)

```rust
// programs/grant-evaluator/src/lib.rs
// Source: Anchor 1.0.0 program structure (anchor-lang.com/docs/basics/program-structure)
use anchor_lang::prelude::*;

declare_id!("11111111111111111111111111111111");

#[program]
pub mod grant_evaluator {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Grant Evaluator initialized");
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
```

### Placeholder Ethereum Contract (Foundry)

```solidity
// contracts/src/GrantEvaluator.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title GrantEvaluator
/// @notice Placeholder for IPE City grant evaluation contract
contract GrantEvaluator {
    uint256 public version;

    constructor() {
        version = 1;
    }
}
```

### Placeholder Foundry Test

```solidity
// contracts/test/GrantEvaluator.t.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {GrantEvaluator} from "../src/GrantEvaluator.sol";

contract GrantEvaluatorTest is Test {
    GrantEvaluator public evaluator;

    function setUp() public {
        evaluator = new GrantEvaluator();
    }

    function test_Version() public view {
        assertEq(evaluator.version(), 1);
    }
}
```

### GitHub Actions CI Workflow

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  solana:
    name: Solana (Anchor)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: metadaoproject/setup-anchor@v3.3
        with:
          anchor-version: '1.0.0'
          solana-cli-version: '2.1.0'
          node-version: '23'
      - run: anchor build
      - run: cargo clippy --workspace -- -D warnings

  ethereum:
    name: Ethereum (Foundry)
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./contracts
    steps:
      - uses: actions/checkout@v4
        with:
          submodules: recursive
      - uses: foundry-rs/foundry-toolchain@v1
      - run: forge build --sizes
      - run: forge fmt --check
      - run: forge test -vvv

  lint:
    name: Lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install
      - run: cd contracts && bun solhint 'src/**/*.sol'
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Anchor 0.30.x | Anchor 1.0.0 | April 2, 2026 | Stable API, improved account validation [VERIFIED: github releases] |
| Bankrun (solana-bankrun) | LiteSVM | March 2025 | Faster testing, actively maintained [VERIFIED: CLAUDE.md tech stack] |
| Hardhat | Foundry | 2023-2025 | 5-10x faster, Solidity-native tests [VERIFIED: CLAUDE.md tech stack] |
| solana-cli 1.x | solana-cli 2.x/3.x (Agave) | 2024-2025 | Agave is the new validator client, CLI follows [VERIFIED: solana.com/docs] |
| Yarn (Anchor default) | Bun (project convention) | Project decision | Faster installs, CLAUDE.md convention [VERIFIED: CLAUDE.md] |

**Deprecated/outdated:**
- **Bankrun:** Deprecated March 2025. Use LiteSVM. [VERIFIED: CLAUDE.md tech stack]
- **Hardhat/Truffle:** Do not use. Foundry is the standard. [VERIFIED: CLAUDE.md tech stack]
- **solana-cli v1:** Superseded by Agave (v2+). [VERIFIED: solana.com/docs]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Makefile is sufficient for monorepo orchestration (vs Turborepo/Nx) | Architecture Patterns | Low -- can always add a build tool later |
| A2 | Bun works seamlessly as Anchor's package manager replacement for Yarn | Common Pitfalls | Medium -- may need to keep Yarn for Anchor-specific operations |
| A3 | `forge init --no-git --no-commit` prevents git conflicts in monorepo | Common Pitfalls | Low -- worst case, manually create Foundry structure |
| A4 | CI placeholder tests can run without solana-test-validator | Common Pitfalls | Low -- Foundry tests definitely work, Anchor build-only is fine for Phase 1 |
| A5 | metadaoproject/setup-anchor@v3.3 supports Anchor 1.0.0 | Code Examples (CI) | Medium -- action default is 0.31.1; may need to verify 1.0.0 support or install via avm manually |
| A6 | Prettier is needed for non-Solidity formatting | Standard Stack | Low -- optional, can skip |

## Open Questions

1. **Anchor 1.0.0 + setup-anchor CI action compatibility**
   - What we know: The `metadaoproject/setup-anchor` action defaults to Anchor 0.31.1. Anchor 1.0.0 was just released April 2, 2026.
   - What's unclear: Whether the action's `anchor-version: '1.0.0'` parameter works, or if manual AVM installation is needed in CI.
   - Recommendation: Test the action with `anchor-version: '1.0.0'`. If it fails, fall back to manual `avm install 1.0.0` in the CI workflow.

2. **Solana CLI version for Anchor 1.0.0**
   - What we know: CLAUDE.md says "Anchor 1.0.0 requires Solana CLI 2.1+". The official installer now installs 3.0.10+.
   - What's unclear: Exact minimum version required. Whether Solana CLI 3.x is fully compatible.
   - Recommendation: Use whatever the Solana installer provides (3.x). Pin a specific version in CI for reproducibility.

3. **@coral-xyz/anchor npm package version for Anchor 1.0.0**
   - What we know: npm shows 0.32.1 as latest. Anchor CLI 1.0.0 was just released.
   - What's unclear: Whether a corresponding 1.0.0 npm client package exists or if 0.32.1 is compatible.
   - Recommendation: Use 0.32.1 for now. Phase 1 only needs placeholder tests. Update when 1.0.0 client is published.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Rust/Cargo | Anchor programs | **NO** | -- | Install via Solana one-command installer |
| Solana CLI | Local validator, program deploy | **NO** | -- | Install via Solana one-command installer |
| Anchor CLI | Program framework | **NO** | -- | Install via Solana one-command installer + avm |
| Foundry (forge) | Ethereum contracts | YES | 1.5.1 | -- |
| Foundry (anvil) | Local Ethereum chain | YES | 1.5.1 | -- |
| Node.js | TypeScript tests, tooling | YES | 23.10.0 | -- |
| Bun | Package manager | YES | 1.3.1 | -- |
| Python 3 | Future ML work (Phase 3+) | YES | 3.10.12 | -- |
| uv | Python package manager | YES | 0.10.4 | -- |
| GitHub CLI (gh) | PR/issue management | YES | 2.78.0 | -- |
| Docker | Containerization (later phases) | YES | 24.0.6 | -- |

**Missing dependencies with no fallback:**
- Rust, Solana CLI, Anchor CLI: All installed together via `curl --proto '=https' --tlsv1.2 -sSfL https://solana-install.solana.workers.dev | bash`. This MUST be the first task in the plan.

**Missing dependencies with fallback:**
- None -- all missing tools are installed by the same command.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Solana test framework | Anchor test (TypeScript via Bun) + cargo test (Rust) |
| Ethereum test framework | Foundry (forge test) |
| Config files | `Anchor.toml`, `contracts/foundry.toml` |
| Quick run (Solana) | `anchor build && cargo clippy --workspace -- -D warnings` |
| Quick run (Ethereum) | `cd contracts && forge test` |
| Full suite | `make build && make test && make lint` |

### Phase Requirements to Test Map

Phase 1 has no user-facing requirements. Success criteria are infrastructure-level:

| Criteria | Behavior | Test Type | Automated Command | File Exists? |
|----------|----------|-----------|-------------------|-------------|
| SC-1 | Monorepo builds (Anchor + Foundry) | build | `anchor build && cd contracts && forge build` | Wave 0 |
| SC-2 | Local dev environments run | smoke | `solana-test-validator --help && anvil --version` | Wave 0 |
| SC-3 | CI runs lint/build/test | CI | Push to branch, check GitHub Actions | Wave 0 |

### Sampling Rate
- **Per task commit:** `anchor build && cd contracts && forge build`
- **Per wave merge:** Full build + lint + placeholder tests
- **Phase gate:** CI pipeline green on main branch

### Wave 0 Gaps
- [ ] `contracts/test/GrantEvaluator.t.sol` -- placeholder Foundry test
- [ ] `programs/grant-evaluator/src/lib.rs` -- placeholder Anchor program (builds = passes)
- [ ] `.github/workflows/ci.yml` -- CI workflow
- [ ] `Makefile` -- unified build/test/lint commands

## Security Domain

Phase 1 is infrastructure scaffolding with no user-facing functionality, no data handling, and no network exposure. Security concerns are minimal.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | N/A -- no auth in scaffolding |
| V3 Session Management | No | N/A |
| V4 Access Control | No | N/A |
| V5 Input Validation | No | N/A -- no user input |
| V6 Cryptography | No | N/A -- no crypto ops yet |

### Known Threat Patterns for Scaffolding Phase

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Secret leakage in CI | Information Disclosure | `.gitignore` for keys, GitHub secrets for CI, never commit Solana keypairs |
| Dependency supply chain | Tampering | Pin exact versions in CI, use lockfiles, verify checksums |

## Sources

### Primary (HIGH confidence)
- [Anchor 1.0.0 release](https://github.com/solana-foundation/anchor/releases) -- version confirmation, release date April 2, 2026
- [Solana installation docs](https://solana.com/docs/intro/installation) -- one-command installer, current versions
- [Anchor installation docs](https://www.anchor-lang.com/docs/installation) -- AVM, version management
- [Foundry Book: forge init](https://book.getfoundry.sh/reference/forge/forge-init) -- project structure
- [Foundry Book: project layout](https://book.getfoundry.sh/projects/project-layout) -- directory conventions
- Local environment verification -- `forge --version`, `node --version`, `bun --version`, etc.

### Secondary (MEDIUM confidence)
- [metadaoproject/setup-anchor](https://github.com/marketplace/actions/setup-anchor) -- CI action, default versions
- [foundry-rs/foundry-toolchain](https://github.com/foundry-rs/foundry-toolchain) -- CI action for Foundry
- [PaulRBerg/foundry-template](https://github.com/PaulRBerg/foundry-template) -- CI workflow patterns, project structure

### Tertiary (LOW confidence)
- [ARM64 Solana installation issues](https://billimarie.medium.com/installing-solana-cli-on-arm64-3bf889771e14) -- historical context, may be resolved

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all tools verified via official sources and local environment
- Architecture: HIGH -- follows standard Anchor/Foundry conventions, no novel patterns
- Pitfalls: MEDIUM -- some are based on common knowledge rather than direct experience with Anchor 1.0.0

**Research date:** 2026-04-13
**Valid until:** 2026-05-13 (stable tooling, 30-day window)
