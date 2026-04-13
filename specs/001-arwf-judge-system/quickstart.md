# Quickstart: ARWF Judge System

**Feature**: 001-arwf-judge-system
**Branch**: `001-arwf-judge-system`

## Prerequisites

- Bun >= 1.3
- Node.js >= 22 (for Vitest)
- Foundry (for smart contract development)
- Anthropic API key (for Judge Agent LLM calls)
- Pinata account (for IPFS pinning)
- Turso account (for SQLite read cache) or local LibSQL

## Setup

```bash
# Clone and switch to feature branch
git clone git@github.com:carloslibardo/agent-reviewer.git
cd agent-reviewer
git checkout 001-arwf-judge-system

# Install JS dependencies
bun install

# Install Foundry (smart contracts)
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with:
#   ANTHROPIC_API_KEY=<your-key>
#   PINATA_JWT=<pinata-jwt-token>
#   PINATA_GATEWAY=<your-dedicated-gateway>
#   TURSO_DATABASE_URL=<turso-db-url>
#   TURSO_AUTH_TOKEN=<turso-token>
#   AUTH_SECRET=<random-32-char-string>
#   WEBHOOK_API_KEY_HASH=<bcrypt-hash-of-your-api-key>
#   NEXT_PUBLIC_CHAIN_ID=8453
#   NEXT_PUBLIC_GRAPH_URL=<subgraph-query-url>
#   UPSTASH_REDIS_REST_URL=<upstash-redis-url>
#   UPSTASH_REDIS_REST_TOKEN=<upstash-redis-token>
#   DEPLOYMENT_BLOCK=<block number when contracts were deployed>
#   CRON_SECRET=<random-secret-for-vercel-cron>

# Initialize SQLite cache schema
bun run cache:migrate

# Seed development data (optional — syncs from testnet)
bun run cache:sync

# Start development server
bun run dev
```

## Key URLs

| URL | Description |
|-----|-------------|
| `http://localhost:3000/grants` | Public dashboard |
| `http://localhost:3000/dashboard/operator` | Operator dashboard (requires auth) |
| `POST http://localhost:3000/api/webhooks/proposals` | Proposal ingestion webhook |
| `GET http://localhost:3000/api/proposals` | Public proposals API |
| `POST http://localhost:3000/api/sync` | Trigger cache rebuild |

## Running Tests

```bash
# Unit and integration tests
bun run test

# Watch mode
bun run test:watch

# Smart contract tests (Foundry)
cd contracts && forge test

# E2E tests (requires dev server running)
bun run test:e2e

# Type checking
bun run typecheck

# Lint
bun run lint
```

## Architecture Overview

### Three-Layer Storage

```
Source of Truth (permanent, verifiable):
├── On-chain (Base L2)           # Scores, CIDs, identity, reputation, disputes, fund releases
└── IPFS (Pinata)                # Proposal content, evaluation justifications, monitoring reports

Query Layer (decentralized, rebuildable):
└── The Graph subgraph           # Indexed contract events → GraphQL API

Read Cache (disposable, fast):
└── SQLite (Turso)               # Denormalized views for dashboard queries
```

### Data Flow

```
Webhook → Next.js → Sanitize PII → Pin to IPFS → Submit to Chain → Graph indexes → Cache materializes
                                                                                          ↓
Dashboard reads ← API routes ← SQLite cache ←──────────────────────────────────────────────┘
```

### Source Code Layout

```
src/
├── app/                          # Next.js App Router
│   ├── grants/                   # Public dashboard pages
│   ├── dashboard/operator/       # Protected operator routes
│   └── api/                      # Route handlers
├── ipfs/                         # Pinata: pin content, fetch CIDs
├── chain/                        # viem: interact with Base L2 contracts
├── graph/                        # The Graph: query indexed events
├── cache/                        # Drizzle + Turso: disposable read cache
├── evaluation/                   # Judge Agent system
├── monitoring/                   # Monitor Agent system
├── reputation/                   # Reputation calculation
└── lib/                          # Auth, API key validation

contracts/                        # Solidity (Foundry)
├── src/                          # Contract source
├── test/                         # Contract tests
└── subgraph/                     # The Graph subgraph definition
```

### Cache Rebuild

The SQLite cache can be fully rebuilt from chain + IPFS:

```bash
# Drop and rebuild cache from The Graph + IPFS
bun run cache:rebuild

# Incremental sync (process new events since last sync)
bun run cache:sync
```

## Development Workflow

1. Check current progress: review open GSD phases in `.planning/`
2. Pick the next phase via `/gsd-progress`
3. Implement following the phase plan
4. Run tests: `bun run test && bun run typecheck && bun run lint`
5. For contract changes: `cd contracts && forge test`
6. Verify via `/gsd-verify-work`
7. Ship via `/gsd-ship`
