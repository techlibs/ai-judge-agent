# Research: ARWF Judge System

**Feature**: 001-arwf-judge-system
**Date**: 2026-04-12
**Status**: Complete (revised — web3-native storage architecture)

## R-001: Storage Architecture

**Decision**: Three-layer web3-native architecture — On-chain (Base L2) + IPFS (Pinata) as source of truth, SQLite (Turso) as disposable read cache, The Graph for indexed queries.

**Rationale**: All evaluation data in this system is public, write-once, and meant for transparency. Storing it in a traditional database contradicts the web3 values of the project. The chain is the database; IPFS is the file store. The read cache exists purely for dashboard query performance and can be deleted and rebuilt from chain events at any time.

**Data flow**: `Webhook → Next.js → IPFS (pin content) → Chain (record hash + scores) → The Graph (index events) → SQLite cache (materialize for fast reads)`

**Layer responsibilities**:

| Layer | Role | Data | Disposable? |
|-------|------|------|-------------|
| **On-chain (Base L2)** | Source of truth for scores, identity, reputation, fund releases, disputes | Numeric scores, IPFS content hashes, wallet addresses, vote tallies | No — permanent |
| **IPFS (Pinata)** | Source of truth for content | Proposal text, evaluation justifications, monitoring reports | No — content-addressed, immutable |
| **The Graph** | Decentralized query/index layer | Subgraph indexing contract events into queryable entities | Rebuildable — anyone can re-index from chain |
| **SQLite (Turso)** | Disposable read cache for dashboard UX | Denormalized views, full-text search indexes, precomputed aggregates | Yes — fully rebuildable from chain + IPFS |

**Alternatives considered**:
- **PostgreSQL (Neon) as primary store**: Traditional approach. Fast queries, mature tooling, but evaluation data lives on corporate servers. Not verifiable, not portable. Contradicts on-chain accountability principle.
- **Convex**: Real-time reactive DB. Good DX but same corporate-hosted trust problem. Unnecessary if chain + IPFS is the source of truth.
- **On-chain only (no cache)**: Purest approach but The Graph queries are slower than local SQLite for list views, filtering, and full-text search. Dashboard would feel sluggish.

## R-001a: IPFS Provider

**Decision**: Pinata

**Rationale**: Managed IPFS pinning with dedicated gateways for reliable reads. Generous free tier (100 files, 500 MB). SDK for programmatic pinning (`pinata`). Content-addressed storage means data is verifiable by anyone — hash the content, compare to on-chain hash. If Pinata disappears, content can be re-pinned from any IPFS node that cached it.

**Alternatives considered**:
- **web3.storage**: Free via Filecoin but less reliable gateway performance and SDK churn.
- **Self-hosted IPFS node**: Maximum control but operational burden for a Vercel-deployed app.

**Packages**: `pinata` (Pinata SDK)

## R-001b: On-Chain Query Layer

**Decision**: The Graph (hosted subgraph on Base)

**Rationale**: Decentralized indexing of contract events into a GraphQL API. Anyone can run the indexer — not dependent on our infrastructure. Mature Base L2 support. Subgraph definitions are version-controlled and redeployable. Eliminates the need for custom event listener cron jobs.

**Alternatives considered**:
- **Custom event listener (Vercel cron)**: Simpler but centralized. If our cron breaks, the cache goes stale. Contradicts decentralization values.
- **Direct chain reads (viem)**: Works for individual lookups but too slow for list views and aggregations.

**Packages**: `@graphprotocol/client` (Graph client for Next.js)

## R-001c: Read Cache

**Decision**: SQLite via Turso (LibSQL)

**Rationale**: Zero-infra embedded database. Runs on Vercel serverless via HTTP. Trivially disposable — delete and rebuild from The Graph + IPFS fetches. Drizzle ORM supports LibSQL driver with full type inference. No connection pooling needed (HTTP-based). Turso's edge replicas give sub-10ms reads globally.

**Alternatives considered**:
- **PostgreSQL (Neon)**: Overkill for a read cache. Connection pooling complexity for serverless. Not "disposable" in the same way.
- **Vercel KV/Redis**: Good for hot cache but not for relational queries or full-text search.
- **No cache at all**: Dashboard reads would hit The Graph for every request. Slower and costs more (Graph query units).

**Packages**: `drizzle-orm`, `@libsql/client`, `drizzle-kit` (dev)

## R-002: Testing Framework

**Decision**: Vitest + MSW for API mocking + Playwright for E2E

**Rationale**: Vitest is the officially recommended test runner in Next.js docs. Full `@testing-library/react` support, `vi.mock()`/`vi.spyOn()` for unit isolation, and MSW for deterministic LLM API mocking at the network layer. Runs via `bun run test` with Vitest executing on Node. Playwright covers async Server Components and full Server Actions flows that unit test runners cannot reach.

**Alternatives considered**:
- **Bun built-in test runner**: No jsdom, limited `@testing-library/react` support. Could complement Vitest for pure logic tests.
- **Jest**: No native Bun support, effectively superseded by Vitest in this stack.

**Packages**: `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `msw` (dev), `@playwright/test` (dev)

## R-003: LLM Provider and SDK

**Decision**: Vercel AI SDK (`ai` + `@ai-sdk/anthropic`) with `generateObject` for structured output

**Rationale**: `generateObject` with `schema: z.object(...)` produces type-safe JSON matching the scoring schema in a single call — no prompt engineering for JSON parsing. Provider flexibility via adapter pattern: swap `@ai-sdk/anthropic` for `@ai-sdk/openai` with zero application logic changes. Fully typed with Zod schema inference, no `any` leakage. First-party Vercel integration for streaming and serverless.

**Alternatives considered**:
- **Direct OpenAI SDK**: Provider lock-in. `zodResponseFormat` exists but is OpenAI-specific.
- **Direct Anthropic SDK**: Tool-use-as-structured-output works but is verbose and provider-locked.
- **LangChain**: Heavy abstraction, poor TypeScript strict mode support (`any` leaks), harder to audit.

**Recommended models**: Claude Sonnet 4.6 for scoring quality, Claude Haiku for cost-sensitive batch runs. OpenAI as failover provider.

**Packages**: `ai`, `@ai-sdk/anthropic`, `@ai-sdk/openai` (failover)

## R-004: EVM Chain

**Decision**: Base (Coinbase L2, OP Stack)

**Rationale**: Optimal intersection of cost (~$0.001-0.01/tx), ERC-4337 support (Biconomy, ZeroDev, Coinbase CDP), and grants ecosystem alignment. Coinbase CDP provides sponsored transactions via paymaster for near-zero-cost AI agent submissions. Inherits Optimism's battle-tested OP Stack. Base Ecosystem Fund provides co-funding opportunities aligned with IPE City's target users.

**Alternatives considered**:
- **Optimism**: Nearly identical stack, stronger public goods DNA (RPGF), but smaller developer momentum.
- **Arbitrum**: Best raw tooling maturity and TVL, but grants ecosystem is DeFi-oriented.
- **Polygon PoS**: Cheapest gas but ecosystem fragmentation between PoS and zkEVM.

**Packages**: `viem`, `@coinbase/cdp-sdk` (account abstraction), `@openzeppelin/contracts` (smart contracts)

## R-005: Authentication

**Decision**: Auth.js v5 for operator OAuth2 + custom API key validation for webhooks

**Rationale**: Auth.js v5 is MIT-licensed, self-hosted, with first-class App Router support (`middleware.ts` matcher, `await auth()` in Server Components). Handles OAuth2 providers with minimal config. Zero external user data storage, zero per-MAU cost — critical for a funding platform where operator trust matters. Webhook routes use a simple `X-API-Key` header check (10-15 lines) independent of the session layer.

**Alternatives considered**:
- **Clerk**: Fastest setup, native Vercel Marketplace, but vendor lock-in for operator credentials is a compliance risk for a funding platform.
- **Custom JWT + API keys**: Maximum control but unnecessary complexity when Auth.js already handles CSRF, session rotation, and OAuth2 callbacks correctly.

**Architecture**:
| Concern | Solution |
|---------|----------|
| Public dashboard | No auth guard |
| Operator OAuth2 | Auth.js v5 with matcher on `/dashboard/operator/*` |
| Webhook ingestion | Route Handler validates `X-API-Key` against hashed env secret |

**Packages**: `next-auth` (Auth.js v5)

## R-006: ERC-8004 Identity and Reputation

**Decision**: Full ERC-8004 compliance for Judge Agents and Monitor Agents. All three registries implemented: Identity, Reputation, Validation.

**Rationale**: ERC-8004 ("Trustless Agents") is designed for AI agent identity, reputation, and capability validation — an exact match for our Judge Agents. Each Judge Agent (technical_feasibility, impact_potential, cost_efficiency, team_capability) and the Monitor Agent are registered as ERC-8004 agents with on-chain identities, structured reputation feedback, and capability validation.

This is stronger than our original plan which used ERC-8004 as a "portable project identity" — a misuse of the spec. ERC-8004 agents have:
- **agentURI** pointing to a registration JSON (name, description, services, supported trust mechanisms)
- **Structured reputation** via `giveFeedback()` with value, tags, endpoint, feedbackURI — not a simple integer index
- **Capability validation** via `validationRequest()`/`validationResponse()` with 0-100 scoring
- **Anti-Sybil** rules: feedback submitter MUST NOT be agent owner
- **Wallet management** with EIP-712/ERC-1271 signature verification

**Architecture mapping**:

| ERC-8004 Concept | ARWF Usage |
|-----------------|------------|
| Agent | Each Judge Agent (4) + Monitor Agent (1) |
| agentURI | IPFS-hosted JSON with agent description, scoring dimension, prompt version, service endpoints |
| ReputationRegistry.giveFeedback() | Community/operators rate evaluation quality per dimension |
| ReputationRegistry tags | `tag1` = scoring dimension, `tag2` = funding round |
| ValidationRegistry | Verify judge capabilities (e.g., "can this judge score technical feasibility?") |
| Agent wallet | Receives payments for evaluation services (future: x402 micropayments) |

**Project team identities**: Separate from ERC-8004. Project teams are NOT AI agents. Use plain ERC-721 with custom metadata for project wallet identity, or simply link project wallets to their on-chain activity.

**Dependencies**: ERC-721 (base), EIP-712 (typed signing), ERC-1271 (contract wallet signatures), EIP-155 (chain ID)

**Packages**: `viem` (contract interaction), `@openzeppelin/contracts` (ERC-721 base)
