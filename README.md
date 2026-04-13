# AI Judge Agent

AI Judge system for evaluating grant proposals and surfacing community consensus fairly. Lives at **ipe.city/grants** -- the first product in the IPE City ecosystem.

The system evaluates grant proposals using AI-powered Judge Agents that score across four dimensions: Technical Feasibility (25%), Impact Potential (30%), Cost Efficiency (20%), and Team Capability (25%). Scores and justifications are pinned to IPFS and recorded on-chain (Base L2), making every evaluation publicly verifiable.

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) 1.3+
- [Foundry](https://getfoundry.sh/) 1.6+ (for smart contracts)
- Node.js 22+ (for Next.js compatibility)

### Quick Start

```bash
# Clone and enter the speckit branch
git clone https://github.com/carloslibardo/agent-reviewer.git
cd agent-reviewer
git checkout speckit

# Install dependencies
bun install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your credentials (see Environment Variables below)

# Run database migrations (Turso/LibSQL)
bun run cache:migrate

# Start development server (Turbopack)
bun run dev
# Open http://localhost:3000
```

### Smart Contracts Setup

```bash
cd contracts

# Install Foundry dependencies
forge install

# Run contract tests
forge test

# Deploy to Base Sepolia (requires DEPLOYER_PRIVATE_KEY in env)
forge script script/Deploy.s.sol --rpc-url https://sepolia.base.org --broadcast

# After deployment, copy the 6 contract addresses into .env.local
```

## Human Setup Guide (Step by Step)

These are the manual steps a developer must complete before running the project. Each step requires creating accounts or obtaining credentials from external services.

### Step 1: Install Prerequisites

```bash
# Install Bun (macOS/Linux)
curl -fsSL https://bun.sh/install | bash

# Install Foundry (smart contract toolchain)
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Verify installations
bun --version    # should be 1.3+
forge --version  # should be 1.6+
```

### Step 2: Get an Anthropic API Key

1. Go to [console.anthropic.com](https://console.anthropic.com/)
2. Create an account or sign in
3. Navigate to **API Keys** in the left sidebar
4. Click **Create Key**, name it (e.g. `agent-reviewer-dev`)
5. Copy the key -- it starts with `sk-ant-`
6. Set in `.env.local`: `ANTHROPIC_API_KEY=sk-ant-...`

**Cost estimate**: Each proposal evaluation runs 4 Claude calls (~$0.05-0.15 per evaluation depending on proposal length).

### Step 3: Set Up Pinata (IPFS)

1. Go to [pinata.cloud](https://www.pinata.cloud/) and create a free account
2. In the dashboard, go to **API Keys**
3. Click **New Key**, enable **pinFileToIPFS** and **pinJSONToIPFS** permissions
4. Copy the **JWT** token
5. Go to **Gateways** in the sidebar, copy your gateway URL (e.g. `https://yourname.mypinata.cloud`)
6. Set in `.env.local`:
   ```
   PINATA_JWT=eyJ...
   PINATA_GATEWAY=https://yourname.mypinata.cloud
   ```

**Free tier**: 100 pins, 500MB storage -- sufficient for development.

### Step 4: Set Up Turso Database

1. Install the Turso CLI:
   ```bash
   brew install tursodatabase/tap/turso   # macOS
   # or: curl -sSfL https://get.tur.so/install.sh | bash
   ```
2. Sign up and authenticate:
   ```bash
   turso auth signup    # or: turso auth login
   ```
3. Create a database:
   ```bash
   turso db create agent-reviewer-dev
   ```
4. Get the connection URL:
   ```bash
   turso db show agent-reviewer-dev --url
   # Output: libsql://agent-reviewer-dev-yourname.turso.io
   ```
5. Create an auth token:
   ```bash
   turso db tokens create agent-reviewer-dev
   ```
6. Set in `.env.local`:
   ```
   TURSO_DATABASE_URL=libsql://agent-reviewer-dev-yourname.turso.io
   TURSO_AUTH_TOKEN=eyJ...
   ```

**Free tier**: 500 databases, 9GB total storage, 25M row reads/month.

### Step 5: Generate Auth.js Secret

```bash
# Generate a random 32-byte hex secret
openssl rand -hex 32
```

Set in `.env.local`: `AUTH_SECRET=<output>`

### Step 6: Generate Webhook API Key

The webhook endpoints use HMAC + API key authentication. Generate a key and its SHA-256 hash:

```bash
# Generate a random API key
export WEBHOOK_KEY=$(openssl rand -hex 24)
echo "Your webhook API key: $WEBHOOK_KEY"

# Hash it for storage in env
echo -n "$WEBHOOK_KEY" | shasum -a 256 | cut -d' ' -f1
```

Set in `.env.local`: `WEBHOOK_API_KEY_HASH=<the hash output>`

Save the unhashed key -- you'll need it to authenticate webhook requests (sent as `x-api-key` header).

### Step 7: Set Up Base Sepolia Wallet (for Contract Deployment)

1. **Get a wallet**: Use [MetaMask](https://metamask.io/) or generate a key with `cast`:
   ```bash
   cast wallet new
   # Save the private key and address
   ```

2. **Add Base Sepolia network** to MetaMask (if using):
   - Network: Base Sepolia
   - RPC URL: `https://sepolia.base.org`
   - Chain ID: `84532`
   - Currency: ETH
   - Explorer: `https://sepolia.basescan.org`

3. **Get testnet ETH** (you need ~0.01 ETH for deployment):
   - [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-ethereum-goerli-faucet) (Coinbase -- requires account)
   - [Alchemy Base Sepolia Faucet](https://www.alchemy.com/faucets/base-sepolia)
   - [Superchain Faucet](https://app.optimism.io/faucet) (select Base Sepolia)

4. **Deploy contracts**:
   ```bash
   cd contracts
   forge install

   # Set your deployer private key (DO NOT commit this)
   export DEPLOYER_PRIVATE_KEY=0x...

   # Deploy all 6 contracts
   forge script script/Deploy.s.sol \
     --rpc-url https://sepolia.base.org \
     --broadcast

   # The script outputs 6 contract addresses -- copy them to .env.local
   ```

5. Set deployed addresses in `.env.local`:
   ```
   NEXT_PUBLIC_EVALUATION_REGISTRY_ADDRESS=0x...
   NEXT_PUBLIC_IDENTITY_REGISTRY_ADDRESS=0x...
   NEXT_PUBLIC_MILESTONE_MANAGER_ADDRESS=0x...
   NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS=0x...
   NEXT_PUBLIC_VALIDATION_REGISTRY_ADDRESS=0x...
   NEXT_PUBLIC_DISPUTE_REGISTRY_ADDRESS=0x...
   ```

6. Update the deployment block to avoid slow genesis scans:
   ```bash
   # Find the block number of your deployment tx on https://sepolia.basescan.org
   # Set in .env.local:
   DEPLOYMENT_BLOCK=<block_number>
   ```

### Step 8: Set Up Upstash Redis (Optional -- Rate Limiting)

Rate limiting is disabled if these env vars are unset. To enable:

1. Go to [upstash.com](https://upstash.com/) and create a free account
2. Create a new Redis database (select a region close to your Vercel deployment)
3. Copy the **REST URL** and **REST Token** from the database details page
4. Set in `.env.local`:
   ```
   UPSTASH_REDIS_REST_URL=https://...upstash.io
   UPSTASH_REDIS_REST_TOKEN=AX...
   ```

**Free tier**: 10,000 commands/day -- sufficient for development.

### Step 9: Deploy The Graph Subgraph (Optional)

The subgraph indexes on-chain events for efficient querying. For local development, you can skip this and the cache sync will fall back to direct RPC calls.

1. Install The Graph CLI: `npm install -g @graphprotocol/graph-cli`
2. Deploy to The Graph Studio or a hosted service
3. Set in `.env.local`: `NEXT_PUBLIC_GRAPH_URL=https://api.studio.thegraph.com/query/...`

### Step 10: Run the Application

```bash
# Install dependencies
bun install

# Run database migrations
bun run cache:migrate

# Start dev server
bun run dev
# Open http://localhost:3000
```

### Minimal Setup (Dashboard Only)

To run just the dashboard UI without on-chain features, you only need:

```
TURSO_DATABASE_URL=...      # Step 4
TURSO_AUTH_TOKEN=...        # Step 4
AUTH_SECRET=...             # Step 5
NEXT_PUBLIC_CHAIN_ID=84532
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

The dashboard will display cached data but won't be able to submit evaluations on-chain.

## Environment Variables

Copy `.env.example` to `.env.local` and fill in the values:

| Variable | Required | Where to Get | Description |
|----------|----------|-------------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Step 2 | Claude API key for Judge Agent scoring |
| `PINATA_JWT` | Yes | Step 3 | Pinata JWT for IPFS content pinning |
| `PINATA_GATEWAY` | Yes | Step 3 | Your Pinata gateway URL |
| `TURSO_DATABASE_URL` | Yes | Step 4 | Turso/LibSQL database URL for read cache |
| `TURSO_AUTH_TOKEN` | Yes | Step 4 | Turso authentication token |
| `AUTH_SECRET` | Yes | Step 5 | Auth.js session encryption secret |
| `WEBHOOK_API_KEY_HASH` | Yes | Step 6 | SHA-256 hash of the webhook API key |
| `NEXT_PUBLIC_CHAIN_ID` | Yes | -- | Chain ID (default: `84532` for Base Sepolia) |
| `NEXT_PUBLIC_GRAPH_URL` | Yes | Step 9 | The Graph subgraph endpoint |
| `NEXT_PUBLIC_EVALUATION_REGISTRY_ADDRESS` | Yes | Step 7 | Deployed EvaluationRegistry contract address |
| `NEXT_PUBLIC_IDENTITY_REGISTRY_ADDRESS` | Yes | Step 7 | Deployed IdentityRegistry contract address |
| `NEXT_PUBLIC_MILESTONE_MANAGER_ADDRESS` | Yes | Step 7 | Deployed MilestoneManager contract address |
| `NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS` | Yes | Step 7 | Deployed ReputationRegistry contract address |
| `NEXT_PUBLIC_VALIDATION_REGISTRY_ADDRESS` | Yes | Step 7 | Deployed ValidationRegistry contract address |
| `NEXT_PUBLIC_DISPUTE_REGISTRY_ADDRESS` | Yes | Step 7 | Deployed DisputeRegistry contract address |
| `BASE_SEPOLIA_RPC_URL` | Yes | -- | Base Sepolia RPC (default: `https://sepolia.base.org`) |
| `DEPLOYMENT_BLOCK` | No | Step 7 | Block number of first contract deployment |
| `UPSTASH_REDIS_REST_URL` | No | Step 8 | Upstash Redis URL for rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | No | Step 8 | Upstash Redis token |
| `CRON_SECRET` | No | -- | Bearer token for cron/monitoring endpoint auth |
| `NEXT_PUBLIC_APP_URL` | No | -- | App URL for CORS origin validation |

## Available Scripts

### Application

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `bun run dev` | Start Next.js dev server with Turbopack |
| `build` | `bun run build` | Production build |
| `start` | `bun run start` | Start production server |
| `lint` | `bun run lint` | ESLint check |
| `lint:fix` | `bun run lint:fix` | ESLint auto-fix |
| `typecheck` | `bun run typecheck` | TypeScript type checking (`tsc --noEmit`) |
| `test` | `bun run test` | Run vitest test suite |
| `test:watch` | `bun run test:watch` | Run vitest in watch mode |

### Smart Contracts (from `contracts/` directory)

| Command | Description |
|---------|-------------|
| `forge build` | Compile Solidity contracts |
| `forge test` | Run all contract tests |
| `forge test -vvv` | Run tests with verbose stack traces |
| `forge test --match-test testFunctionName` | Run a specific test |
| `forge coverage` | Generate test coverage report |
| `forge script script/Deploy.s.sol --rpc-url $RPC --broadcast` | Deploy contracts |
| `cast call $ADDRESS "functionName()" --rpc-url $RPC` | Read contract state |

## Project Structure

```
agent-reviewer/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── page.tsx                  # Home page
│   │   ├── grants/
│   │   │   ├── page.tsx              # Browse proposals (search, filter, paginate)
│   │   │   └── [id]/page.tsx         # Proposal detail (scores, disputes, verification)
│   │   ├── dashboard/
│   │   │   └── operator/page.tsx     # Operator dashboard (sync, status)
│   │   └── api/
│   │       ├── proposals/            # GET list, GET detail, POST create
│   │       ├── evaluate/[id]/        # POST finalize evaluation
│   │       ├── webhooks/             # POST proposals, POST disputes
│   │       ├── rounds/[id]/stats/    # GET funding round statistics
│   │       ├── sync/                 # POST cache rebuild from chain
│   │       ├── health/               # GET system health check
│   │       └── cron/monitoring/      # GET monitoring cycle trigger
│   ├── evaluation/
│   │   ├── orchestrate.ts            # Main evaluation pipeline
│   │   ├── scoring.ts                # Weighted score + reputation multiplier
│   │   ├── anomaly.ts                # Score anomaly detection
│   │   ├── sanitization.ts           # PII removal before AI evaluation
│   │   ├── dispute-override.ts       # Dispute resolution score override
│   │   ├── schemas.ts                # Zod schemas for evaluation data
│   │   └── agents/
│   │       ├── runner.ts             # Judge agent execution (4 dimensions)
│   │       ├── prompts.ts            # LLM prompt templates
│   │       └── registration.ts       # Agent identity registration on IPFS
│   ├── chain/                        # viem contract interactions
│   │   ├── contracts.ts              # Client setup (Base Sepolia)
│   │   ├── evaluation-registry.ts    # Score submission
│   │   ├── identity-registry.ts      # Agent registration
│   │   ├── milestone-manager.ts      # Fund release
│   │   ├── reputation-registry.ts    # Feedback posting
│   │   ├── validation-registry.ts    # Proposal validation
│   │   └── dispute-registry.ts       # Dispute management
│   ├── ipfs/                         # Pinata IPFS integration
│   │   ├── client.ts                 # IPFS gateway client
│   │   ├── pin.ts                    # Content pinning
│   │   └── schemas.ts                # ProposalContent + EvaluationContent schemas
│   ├── cache/                        # SQLite read cache (Turso/LibSQL)
│   │   ├── client.ts                 # Database client
│   │   ├── schema.ts                 # Drizzle ORM schema
│   │   ├── queries.ts                # Database queries
│   │   └── sync.ts                   # Chain event → cache materialization
│   ├── reputation/                   # On-chain reputation system
│   │   ├── feedback.ts               # Feedback posting to ReputationRegistry
│   │   └── multiplier.ts             # Reputation multiplier (1.0-1.05)
│   ├── monitoring/                   # Post-evaluation monitoring agents
│   │   ├── orchestrate.ts            # Monitoring orchestration
│   │   ├── runner.ts                 # Monitor agent execution
│   │   ├── github.ts                 # GitHub metrics collection
│   │   ├── onchain.ts                # On-chain activity tracking
│   │   └── social.ts                 # Social signal detection
│   ├── graph/                        # The Graph subgraph queries
│   ├── lib/                          # Shared utilities
│   │   ├── api-key.ts                # API key validation (timing-safe)
│   │   ├── auth.ts                   # Auth.js integration
│   │   ├── rate-limit.ts             # Upstash rate limiting
│   │   ├── retry.ts                  # Exponential backoff (3x eval, 5x chain)
│   │   ├── sanitize-html.ts          # XSS prevention for IPFS content display
│   │   ├── security-log.ts           # Structured security event logging
│   │   ├── validate-origin.ts        # CORS origin validation
│   │   └── request-id.ts             # Request tracing
│   └── components/                   # React UI components
├── contracts/
│   ├── src/                          # Solidity contracts
│   │   ├── EvaluationRegistry.sol    # Stores scores + IPFS content hashes
│   │   ├── IdentityRegistry.sol      # ERC-721 soulbound agent identity (ERC-8004)
│   │   ├── MilestoneManager.sol      # Fund release based on scores
│   │   ├── ReputationRegistry.sol    # Agent reputation feedback (ERC-8004)
│   │   ├── ValidationRegistry.sol    # Proposal validation (ERC-8004)
│   │   └── DisputeRegistry.sol       # On-chain dispute resolution
│   ├── test/                         # Foundry tests (6 files, 1,614 lines)
│   ├── script/                       # Deployment scripts
│   ├── subgraph/                     # The Graph entity mappings
│   └── foundry.toml                  # Foundry config (solc 0.8.24)
├── specs/001-arwf-judge-system/      # Spec Kit specification artifacts
│   ├── spec.md                       # 6 user stories with acceptance criteria
│   ├── plan.md                       # 9 phases, 86 tasks
│   ├── tasks.md                      # Task breakdown + status
│   ├── data-model.md                 # Entity relationships
│   └── requirements.md               # Feature checklist
├── docs/                             # Reference documentation
│   ├── audit-skills-toolkit.md       # Security audit skills catalog
│   ├── agent-team-audit-launch.md    # Multi-worktree audit orchestration
│   └── DESIGN-AUDIT-REPORT.md        # Pre-implementation security review
└── .env.example                      # Environment variable template
```

## Architecture

### Evaluation Pipeline (Golden Path)

```
1. Proposal submitted via webhook (POST /api/webhooks/proposals)
   ↓
2. PII sanitized (emails, phones, CPF redacted; team hashed)
   ↓
3. Sanitized proposal pinned to IPFS → ProposalContent CID
   ↓
4. Four Judge Agents score independently (Claude via generateObject):
   - Technical Feasibility (25%)
   - Impact Potential (30%)
   - Cost Efficiency (20%)
   - Team Capability (25%)
   ↓
5. Anomaly detection flags suspicious scores
   ↓
6. Weighted final score computed (0-10)
   ↓
7. Reputation multiplier applied (1.0-1.05 based on judge history)
   ↓
8. Evaluation results pinned to IPFS → EvaluationContent CID
   ↓
9. Score + CID submitted on-chain (EvaluationRegistry)
   ↓
10. Fund release calculated (MilestoneManager: score/10 = release %)
    ↓
11. Dashboard displays scores, justifications, IPFS + chain verification links
```

### On-Chain Contracts (Base Sepolia)

| Contract | Standard | Purpose |
|----------|----------|---------|
| EvaluationRegistry | -- | Stores final scores and IPFS content hashes |
| IdentityRegistry | ERC-721 / ERC-8004 | Soulbound agent identity tokens (non-transferable) |
| MilestoneManager | -- | Fund release calculation and distribution |
| ReputationRegistry | ERC-8004 | Agent reputation feedback and history |
| ValidationRegistry | ERC-8004 | Dispute validation with threshold checks |
| DisputeRegistry | -- | On-chain dispute resolution with voting |

### Data Flow

- **Source of truth**: On-chain events + IPFS content
- **Read cache**: SQLite (Turso/LibSQL) -- fully rebuildable from chain events via The Graph
- **Verification path**: Chain CID → IPFS fetch → hash comparison → score match

## Testing Status

| Layer | Framework | Tests | Coverage | Status |
|-------|-----------|-------|----------|--------|
| Smart Contracts | Foundry | 6 test files (1,614 lines) | All 6 contracts covered | Done |
| TypeScript Backend | Vitest (installed) | 0 test files | 0% | Not started |
| API Routes | Vitest (installed) | 0 test files | 0% | Not started |
| React Components | @testing-library/react (installed) | 0 test files | 0% | Not started |
| E2E | Not installed | -- | -- | Not started |

### Contract Test Details

All contract tests are in `contracts/test/` and run with `forge test`:

- `EvaluationRegistry.t.sol` -- score submission, storage, access control
- `IdentityRegistry.t.sol` -- agent registration, soulbound transfer blocks, metadata
- `MilestoneManager.t.sol` -- fund release calculations, milestone tracking
- `ReputationRegistry.t.sol` -- feedback posting, summary aggregation
- `ValidationRegistry.t.sol` -- proposal validation, threshold checks
- `DisputeRegistry.t.sol` -- dispute lifecycle, voting, resolution

### Testing Gaps (Priority Order)

1. **Evaluation pipeline** -- `orchestrate.ts`, `scoring.ts`, `anomaly.ts` (core feature, no tests)
2. **API routes** -- 8 route handlers, 646 LOC (user-facing, no tests)
3. **Chain interactions** -- 7 viem integration files (financial impact, no tests)
4. **Cache/database** -- Drizzle queries, sync logic (data integrity, no tests)
5. **Security utilities** -- rate limiting, API key validation, sanitization (security-critical, no tests)

## Deployment Status

| Component | Status | Details |
|-----------|--------|---------|
| Smart Contracts (code) | Complete | All 6 contracts written and tested |
| Smart Contracts (deployed) | Pending | No on-chain deployment yet -- addresses empty in .env.example |
| Target Network | Base Sepolia | Testnet (chain ID 84532) |
| Next.js App | Runs locally | `bun run dev` works with Turbopack |
| Vercel Deployment | Not configured | No vercel.json or .vercel/ directory |
| The Graph Subgraph | Schema ready | Entity mappings written, not deployed |

### To Deploy Contracts

```bash
cd contracts

# Set deployer private key (Base Sepolia account with testnet ETH)
export DEPLOYER_PRIVATE_KEY=0x...

# Deploy all 6 contracts
forge script script/Deploy.s.sol \
  --rpc-url https://sepolia.base.org \
  --broadcast

# Copy output addresses into .env.local
# Update DEPLOYMENT_BLOCK to the deployment block number
```

## Spec-vs-Code Compliance

Based on the Spec Kit specification (`specs/001-arwf-judge-system/`):

| Category | Specified | Implemented | Coverage |
|----------|-----------|-------------|----------|
| Functional Requirements | 17 | 16 full + 1 stub | 94% |
| User Stories | 6 | 5 full + 1 stub (monitoring) | 83% |
| API Endpoints | 10 | 9 full + 1 missing | 90% |
| Smart Contracts | 6 | 6 | 100% |
| Zod Schemas | 8+ | 8+ | 100% |

### Known Gaps

- **Monitoring cycle** (US4): Metric collectors exist but cron endpoint returns placeholder -- deferred to v2
- **GET /api/evaluate/[id]/status**: Spec requires it; not implemented (cache table supports it)
- **Dispute voting UI**: Contract + webhook work; no frontend voting panel
- **Operator dashboard**: Minimal -- shows sync button only

## Branch Strategy

Main holds shared project foundation. Each development methodology gets its own long-lived branch, worked on in isolated git worktrees:

| Branch | Framework | Purpose | Status |
|--------|-----------|---------|--------|
| `main` | -- | Shared foundation: CLAUDE.md, reference architecture, framework analysis | Stable |
| `speckit` | [Spec Kit](https://github.com/gallium-ai/speckit) | Specification-first: formal spec, data model, contracts, tasks | **9 phases complete** |
| `full-vision-roadmap` | [GSD](https://github.com/gallium-ai/gsd) | Milestone-driven: 4-phase roadmap with research, UI specs, and execution plans | Planning complete |
| `superpower` | [Superpowers](https://github.com/obra/superpowers) | Brainstorming-first: design spec from creative exploration, then implementation plans | Planning complete |

## Documentation

| Document | Description |
|----------|-------------|
| [Spec Kit Specification](specs/001-arwf-judge-system/spec.md) | 6 user stories with acceptance criteria |
| [Implementation Plan](specs/001-arwf-judge-system/plan.md) | 9 phases, 86 tasks |
| [Data Model](specs/001-arwf-judge-system/data-model.md) | Entity relationships and schemas |
| [Audit Skills Toolkit](docs/audit-skills-toolkit.md) | 18 curated security audit skills across all layers |
| [Agent Team Audit Launch Guide](docs/agent-team-audit-launch.md) | Multi-worktree parallel audit orchestration |
| [Design Security Audit Report](docs/DESIGN-AUDIT-REPORT.md) | Pre-implementation security review |

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | Bun | 1.3+ |
| Framework | Next.js (App Router) | 15.3 |
| Language | TypeScript (strict) | 5.8 |
| AI/LLM | Vercel AI SDK + @ai-sdk/anthropic | ai 4.3, anthropic 1.2 |
| Validation | Zod | 3.24 |
| On-chain | viem (Base Sepolia) | 2.28 |
| Contracts | Solidity (Foundry) | 0.8.24 |
| Contract Base | OpenZeppelin Contracts | 5.x |
| IPFS | Pinata SDK | 1.7 |
| Database | Drizzle ORM + Turso (LibSQL) | drizzle 0.43 |
| Indexing | The Graph (GraphQL) | graphql 16.10 |
| Auth | Auth.js (next-auth) | 5.0 beta |
| Rate Limiting | Upstash Redis | ratelimit 2.0 |
| Styling | Tailwind CSS + shadcn/ui | 4.1 |
| Testing | Vitest + Testing Library (TS), Foundry (Solidity) | vitest 3.1 |

## License

Private -- all rights reserved.
