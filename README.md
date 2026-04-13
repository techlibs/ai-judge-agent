# AI Judge Agent

AI Judge system for evaluating grant proposals and surfacing community consensus fairly. Lives at **ipe.city/grants** — the first product in the IPE City ecosystem.

The system evaluates grant proposals using AI-powered Judge Agents that score across four dimensions: Technical Feasibility (25%), Impact Potential (30%), Cost Efficiency (20%), and Team Capability (25%). Scores and justifications are pinned to IPFS and recorded on-chain (Base L2), making every evaluation publicly verifiable.

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| [Bun](https://bun.sh) | 1.3+ | `curl -fsSL https://bun.sh/install \| bash` |
| [Foundry](https://getfoundry.sh) | 1.6+ | `curl -L https://foundry.paradigm.xyz \| bash && foundryup` |
| [Node.js](https://nodejs.org) | 20+ | Required by some dependencies |

## Quick Start

```bash
# 1. Clone and enter the project
git clone git@github.com:carloslibardo/agent-reviewer.git
cd agent-reviewer

# 2. Install dependencies
bun install

# 3. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your actual keys (see Environment Variables below)

# 4. Apply database migrations (creates tables in local.db)
bunx drizzle-kit migrate

# 5. Run the development server
bun run dev
# Open http://localhost:3000
```

## Environment Variables

Copy `.env.example` to `.env.local` and fill in your values:

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key for Claude (primary AI provider) |
| `OPENAI_API_KEY` | For failover | OpenAI API key (automatic failover when Anthropic unavailable) |
| `TURSO_DATABASE_URL` | Yes | Turso/libSQL database URL. Use `file:local.db` for local dev |
| `TURSO_AUTH_TOKEN` | For remote | Auth token for hosted Turso database |
| `PINATA_JWT` | Yes | Pinata JWT for IPFS pinning |
| `PINATA_GATEWAY_URL` | Yes | Pinata gateway (default: `https://gateway.pinata.cloud`) |
| `BASE_SEPOLIA_RPC_URL` | Yes | Base Sepolia RPC endpoint (default: `https://sepolia.base.org`) |
| `DEPLOYER_PRIVATE_KEY` | For deploy | Private key for contract deployment (testnet only) |
| `IDENTITY_REGISTRY_ADDRESS` | Yes | Deployed IdentityRegistry contract address |
| `REPUTATION_REGISTRY_ADDRESS` | Yes | Deployed ReputationRegistry contract address |
| `MILESTONE_MANAGER_ADDRESS` | Yes | Deployed MilestoneManager contract address |
| `UPSTASH_REDIS_REST_URL` | For rate limiting | Upstash Redis URL for API rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | For rate limiting | Upstash Redis auth token |

**Note:** Contract addresses are currently set to zero addresses (`0x000...000`). You must deploy contracts to Base Sepolia first (see Smart Contracts section below).

## Available Scripts

```bash
# Development
bun run dev              # Start Next.js dev server (http://localhost:3000)
bun run build            # Production build
bun run start            # Start production server
bun run lint             # Run ESLint

# Type checking
bunx tsc --noEmit        # TypeScript type check (no "typecheck" script defined)

# Testing (application — no "test" script in package.json, use bun directly)
bun test                 # Run unit tests (bun:test)
                         # Currently: 1 test file (src/__tests__/api/proposals.test.ts)

# Database
bunx drizzle-kit migrate # Apply migrations (required before first run)
bunx drizzle-kit push    # Push schema changes (dev convenience)
bunx drizzle-kit studio  # Browse data visually
```

## Smart Contracts

Contracts live in the `contracts/` directory and use Foundry.

### Contracts

| Contract | Purpose |
|----------|---------|
| `IdentityRegistry.sol` | ERC-8004 soulbound NFT identity for projects |
| `ReputationRegistry.sol` | Evaluation scores and feedback storage |
| `MilestoneManager.sol` | Payment milestone tracking |

### Contract Commands

```bash
cd contracts

# Install Solidity dependencies
forge install

# Compile contracts
forge build

# Run tests
forge test

# Run tests with verbosity (see traces)
forge test -vvv

# Run a specific test
forge test --match-test testRegisterProject -vvv

# Gas report
forge test --gas-report

# Deploy to local Anvil
anvil &                  # Start local testnet in background
forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast

# Deploy to Base Sepolia (requires DEPLOYER_PRIVATE_KEY and BASE_SEPOLIA_RPC_URL)
source ../.env.local
forge script script/Deploy.s.sol \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --broadcast \
  --verify
```

**Current deployment status:**
- Local Anvil: Deployed (chain ID 31337)
- Base Sepolia: **Not yet deployed** (contract addresses are zero in .env.local)
- Mainnet: Not planned for current milestone

After deploying to Base Sepolia, update `.env.local` with the deployed contract addresses from the broadcast output.

## Project Structure

```
agent-reviewer/
├── contracts/                        # Solidity smart contracts (Foundry)
│   ├── src/                          # Contract source files
│   │   ├── IdentityRegistry.sol
│   │   ├── ReputationRegistry.sol
│   │   └── MilestoneManager.sol
│   ├── test/                         # Foundry tests (*.t.sol)
│   ├── script/                       # Deployment scripts
│   └── foundry.toml                  # Foundry configuration
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── page.tsx                  # Landing page
│   │   ├── grants/                   # Grant pages
│   │   │   ├── page.tsx              # Grant listing
│   │   │   ├── submit/page.tsx       # Submit proposal form
│   │   │   └── [id]/
│   │   │       ├── page.tsx          # Proposal detail
│   │   │       ├── evaluate/page.tsx # Evaluation view
│   │   │       └── verify/page.tsx   # On-chain verification
│   │   └── api/
│   │       ├── proposals/route.ts    # POST: create proposal
│   │       └── evaluate/[id]/        # Evaluation pipeline API
│   │           ├── route.ts          # POST: start evaluation
│   │           ├── status/route.ts   # GET: evaluation status
│   │           ├── finalize/route.ts # POST: finalize evaluation
│   │           └── [dimension]/
│   │               ├── route.ts      # POST: evaluate single dimension
│   │               └── retry/route.ts# POST: retry failed dimension
│   ├── components/                   # React components
│   │   ├── ui/                       # shadcn/ui primitives
│   │   ├── proposal-form.tsx
│   │   ├── proposal-card.tsx
│   │   ├── evaluation-theater.tsx
│   │   ├── judge-card.tsx
│   │   ├── score-gauge.tsx
│   │   ├── verify-badge.tsx
│   │   └── error-boundary.tsx
│   ├── lib/
│   │   ├── chain/                    # Blockchain client (viem + Base Sepolia)
│   │   ├── db/                       # Database (drizzle + libSQL)
│   │   ├── evaluation/               # AI evaluation orchestrator
│   │   ├── ipfs/                     # IPFS client (Pinata)
│   │   ├── judges/                   # Judge agent prompts, schemas, weights
│   │   ├── rate-limit.ts             # Upstash rate limiting
│   │   ├── sanitize-html.ts          # Input sanitization
│   │   └── security-log.ts           # Security event logging
│   ├── types/                        # Shared TypeScript types
│   └── __tests__/                    # Unit tests (bun:test)
├── docs/                             # Reference documentation
│   ├── big-reference-architecture/   # Full ARWF vision (inspiration, not scope)
│   ├── audit-skills-toolkit.md       # Curated audit skills
│   └── DESIGN-AUDIT-REPORT.md        # Pre-implementation security review
├── .planning/                        # GSD planning artifacts
├── .env.example                      # Environment template
├── CLAUDE.md                         # AI assistant instructions
└── package.json
```

## Testing Status

### What exists

| Layer | Framework | Tests | Status |
|-------|-----------|-------|--------|
| Solidity contracts | Foundry (`forge test`) | 3 test files, 30+ test functions | Passing on local Anvil |
| API schema validation | bun:test | 1 test file, 3 tests | Passing |
| Component tests | None | 0 | Not started |
| Integration tests | None | 0 | Not started |
| E2E tests | None | 0 | Not started |

### Running tests

```bash
# Application tests
bun test

# Contract tests
cd contracts && forge test -vvv

# All tests (both layers)
bun test && (cd contracts && forge test)
```

### Known gaps

- No `test` script in package.json (uses bun:test directly)
- No E2E framework installed (Playwright recommended)
- No component tests (React Testing Library)
- No integration tests for the AI evaluation pipeline
- Contract deployment to Base Sepolia not done (chain integration untestable in real conditions)

## User Flows

### Golden Path

1. **Submit Proposal** (`/grants/submit`) — Fill out project name, description, budget, team members
2. **View Proposals** (`/grants`) — Browse submitted proposals
3. **View Detail** (`/grants/[id]`) — See proposal details and evaluation status
4. **Trigger Evaluation** (`/grants/[id]/evaluate`) — Start AI judge evaluation across 4 dimensions
5. **View Results** (`/grants/[id]`) — See scores, justifications, weighted total
6. **Verify On-Chain** (`/grants/[id]/verify`) — Check IPFS hash and on-chain record

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Bun 1.3+ |
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5+ (strict mode) |
| AI/LLM | Mastra + Vercel AI SDK + Anthropic Claude |
| Database | drizzle-orm + libSQL (Turso) |
| Storage | IPFS (Pinata) + on-chain (Base Sepolia) |
| Contracts | Solidity 0.8.24+ (Foundry) |
| UI | Tailwind CSS 4 + shadcn/ui |
| Rate limiting | Upstash Redis |
| Deployment | Vercel |

## Branch Strategy

Main holds shared project foundation. Each development methodology gets its own long-lived branch, worked on in isolated git worktrees:

| Branch | Framework | Status |
|--------|-----------|--------|
| `main` | Shared foundation | Stable |
| `speckit` | [Spec Kit](https://github.com/gallium-ai/speckit) — spec-first | Planning complete |
| `full-vision-roadmap` | [GSD](https://github.com/gallium-ai/gsd) — milestone-driven | Planning complete |
| `superpower` | [Superpowers](https://github.com/obra/superpowers) — brainstorm-first | Building |

## Documentation

| Document | Description |
|----------|-------------|
| [Audit Skills Toolkit](docs/audit-skills-toolkit.md) | 18 curated Claude Code skills for auditing all layers |
| [Agent Team Audit Launch Guide](docs/agent-team-audit-launch.md) | Run audits across 3 worktrees in parallel |
| [Design Security Audit Report](docs/DESIGN-AUDIT-REPORT.md) | Pre-implementation security review |

## License

Private — all rights reserved.
