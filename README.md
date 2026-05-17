# AI Judge Agent

AI Judge system for evaluating grant proposals and surfacing community consensus fairly. Lives at **ipe.city/grants** — the first product in the IPE City ecosystem.

The system evaluates grant proposals using AI-powered Judge Agents that score across four dimensions: Technical Feasibility (25%), Impact Potential (30%), Cost Efficiency (20%), and Team Capability (25%). Scores and justifications are pinned to IPFS and recorded on-chain (Base L2), making every evaluation publicly verifiable.

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) 1.3+
- Node.js 22+ (for Next.js compatibility)
- [Foundry](https://getfoundry.sh/) 1.6+ (for smart contract interactions)

### Quick Start

```bash
# Clone and install
git clone https://github.com/techlibs/ai-judge-agent.git
cd ai-judge-agent
bun install

# Set up environment
cp .env.example .env.local
# Edit .env.local with your API keys (see Environment Variables below)

# Start development
bun run dev
# Open http://localhost:3000
```

### Scripts

```bash
bun run dev          # Development server
bun run build        # Production build
bun run start        # Start production server
bun run lint         # Lint check
bun run lint:fix     # Lint and auto-fix
bun run typecheck    # TypeScript type checking
bun run test         # Run tests
bun run test:watch   # Run tests in watch mode
```

## Environment Variables

Create `.env.local` with the following:

```bash
# AI Providers (required for evaluation)
ANTHROPIC_API_KEY=sk-ant-...          # Claude Sonnet for judge agents
OPENAI_API_KEY=sk-...                 # Failover provider

# API Authentication
API_SECRET_KEY=your-secret-key        # Required for POST /api/evaluate

# IPFS Storage (Pinata)
PINATA_JWT=eyJ...                     # Pinata API JWT token
PINATA_GATEWAY=your-gateway.mypinata.cloud

# On-Chain Configuration
NEXT_PUBLIC_CHAIN_ID=84532            # 84532 = Base Sepolia, 8453 = Base Mainnet
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org

# Contract Addresses (same on testnet and mainnet)
NEXT_PUBLIC_IDENTITY_REGISTRY_ADDRESS=0xDf1ebEe392e6B6AFEE89Fb83CDBF97dA9f8b7B6a
NEXT_PUBLIC_EVALUATION_REGISTRY_ADDRESS=0xa86D6684De7878C36F03697657702A86D13028d8
NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS=0x0DB2eef99d1Efb3313c6Fe314D137914eCc6FB1f
NEXT_PUBLIC_VALIDATION_REGISTRY_ADDRESS=0x5A0Bf56694c8448F681c909C1F61849c1A183f17
NEXT_PUBLIC_MILESTONE_MANAGER_ADDRESS=0xb4161cB90f2664A0d4485265ee150A7f3a7d536b
NEXT_PUBLIC_DISPUTE_REGISTRY_ADDRESS=0x78f8688c1a3e4ec762E7351996B7b3c275f32b0e

# Optional
NEXT_PUBLIC_APP_URL=http://localhost:3000
GITHUB_TOKEN=ghp_...                  # For monitoring agent GitHub integration
DEPLOYMENT_BLOCK=0                    # Block number for event scanning start
```

## Architecture

```
src/
├── app/                          # Next.js App Router
│   ├── api/
│   │   ├── evaluate/             # POST evaluation trigger + SSE streaming
│   │   ├── evaluations/[id]/     # GET evaluation results from chain
│   │   └── health/               # Health check
│   ├── dashboard/operator/       # Operator dashboard
│   ├── grants/                   # Proposal listing, detail, and submission
│   └── page.tsx                  # Landing page
├── chain/                        # On-chain interactions (viem)
│   ├── contracts.ts              # Client setup, ABI definitions
│   ├── evaluation-registry.ts    # Score submission and retrieval
│   ├── identity-registry.ts      # Agent identity management
│   ├── reputation-registry.ts    # Feedback and reputation
│   ├── dispute-registry.ts       # Dispute resolution
│   ├── milestone-manager.ts      # Milestone-based fund release
│   └── validation-registry.ts    # Validator scoring
├── components/                   # React components
│   ├── ui/                       # shadcn/ui primitives
│   ├── nav-bar.tsx               # Global navigation
│   └── error-boundary.tsx        # Error handling
├── evaluation/                   # Scoring and sanitization
│   ├── scoring.ts                # Score normalization
│   ├── sanitization.ts           # PII removal
│   └── schemas.ts                # Evaluation data schemas
├── ipfs/                         # IPFS pinning (Pinata)
│   ├── client.ts                 # Pinata client setup
│   └── pin.ts                    # Pin JSON to IPFS
├── lib/
│   ├── evaluation/               # Evaluation pipeline
│   │   ├── workflow.ts           # Orchestrator: parallel judges + scoring
│   │   ├── scorers.ts            # @mastra/evals quality scoring
│   │   └── proposal-schema.ts    # Proposal validation schema
│   ├── judges/                   # Judge agent definitions
│   │   ├── agents.ts             # 4 judge agents + injection detection
│   │   ├── prompts.ts            # Judge system prompts
│   │   ├── schemas.ts            # Structured output schemas
│   │   └── scoring.ts            # Weighted aggregate scoring
│   ├── mastra/                   # Mastra framework setup
│   │   └── index.ts              # Agent registration
│   ├── api-auth.ts               # API key auth + HMAC signing
│   ├── rate-limit.ts             # In-memory rate limiting
│   ├── sanitize-html.ts          # DOMPurify for content display
│   ├── security-log.ts           # Security event logging
│   └── validate-origin.ts        # Origin validation
└── monitoring/                   # Funded project monitoring
    ├── agent-config.ts           # Monitor agent definitions
    ├── github.ts                 # GitHub activity tracker
    ├── onchain.ts                # On-chain activity tracker
    ├── social.ts                 # Social signal tracker
    ├── runner.ts                 # Individual agent runner
    └── orchestrate.ts            # Multi-agent orchestrator
```

## API Endpoints

### POST /api/evaluate
Trigger evaluation of a grant proposal. Requires `x-api-key` header.

### POST /api/evaluate/stream
Same as above but returns SSE stream with real-time progress events.

### GET /api/evaluations/[id]
Retrieve evaluation results from the on-chain registry.

### GET /api/health
Health check endpoint.

## Tech Stack

- **Runtime**: Bun + TypeScript (strict mode)
- **Framework**: Next.js 15 (App Router) on Vercel
- **AI**: Mastra 1.x + Vercel AI SDK, Claude Sonnet (primary), GPT-4o (failover)
- **Quality**: @mastra/evals scorer pipeline (faithfulness, hallucination, prompt alignment)
- **Storage**: On-chain (Base L2) + IPFS (Pinata)
- **Contracts**: Solidity 0.8.24 (Foundry), 6 contracts on Base Sepolia + Mainnet
- **UI**: Tailwind CSS 4 + shadcn/ui
- **Security**: API key auth, HMAC signing, rate limiting, prompt injection defense, PII sanitization

## On-Chain Contracts

Deployed on both **Base Sepolia** (testnet) and **Base Mainnet** at identical addresses:

| Contract | Address |
|----------|---------|
| IdentityRegistry | [`0xDf1ebEe392e6B6AFEE89Fb83CDBF97dA9f8b7B6a`](https://basescan.org/address/0xDf1ebEe392e6B6AFEE89Fb83CDBF97dA9f8b7B6a) |
| EvaluationRegistry | [`0xa86D6684De7878C36F03697657702A86D13028d8`](https://basescan.org/address/0xa86D6684De7878C36F03697657702A86D13028d8) |
| ReputationRegistry | [`0x0DB2eef99d1Efb3313c6Fe314D137914eCc6FB1f`](https://basescan.org/address/0x0DB2eef99d1Efb3313c6Fe314D137914eCc6FB1f) |
| ValidationRegistry | [`0x5A0Bf56694c8448F681c909C1F61849c1A183f17`](https://basescan.org/address/0x5A0Bf56694c8448F681c909C1F61849c1A183f17) |
| MilestoneManager | [`0xb4161cB90f2664A0d4485265ee150A7f3a7d536b`](https://basescan.org/address/0xb4161cB90f2664A0d4485265ee150A7f3a7d536b) |
| DisputeRegistry | [`0x78f8688c1a3e4ec762E7351996B7b3c275f32b0e`](https://basescan.org/address/0x78f8688c1a3e4ec762E7351996B7b3c275f32b0e) |

Switch between testnet and mainnet by changing `NEXT_PUBLIC_CHAIN_ID` (84532 or 8453) and `BASE_SEPOLIA_RPC_URL` in `.env.local`.

## License

Private — all rights reserved.
