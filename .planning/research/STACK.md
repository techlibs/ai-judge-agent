# Technology Stack

**Project:** Agent Reviewer (AI Judge for IPE City Grants)
**Researched:** 2026-04-12

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Next.js | 15.x (App Router) | Web framework | Already decided. App Router enables RSC for fast initial loads, Server Actions for form handling. Convex handles real-time data, so Next.js focuses on rendering + routing. | HIGH |
| TypeScript | 5.7+ (strict) | Language | Already decided. Strict mode + no `any` policy aligns with Zod validation at boundaries. | HIGH |
| Bun | 1.3+ | Runtime & package manager | Already decided. Faster installs and test runs than Node. Convex CLI works fine under Bun. | HIGH |

### Database & Backend

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Convex | 1.35.x | Database + backend functions | Already decided. Real-time subscriptions for live evaluation updates. Actions for OpenAI calls. Scheduling for fire-and-forget evaluation pipelines. Team has production experience. | HIGH |
| @convex-dev/workflow | 0.3.x | Durable multi-step evaluation | Orchestrates the 4 judge agents as a durable workflow: if one step fails, it retries without re-running completed steps. Each agent evaluation becomes a workflow step. Perfect for the "submit proposal -> run 4 agents -> compute aggregate -> publish hash" pipeline. | HIGH |

### AI / LLM

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Mastra (`@mastra/core`) | latest | Agent framework | Typed workflow engine with `workflow.parallel()` for parallel judge execution, built-in evaluation scorer pipeline (`@mastra/evals` with `createScorer()`), and automatic tracing. Built on Vercel AI SDK so Zod schemas and `generateObject` patterns work unchanged. | HIGH |
| `@mastra/evals` | latest | Evaluation scorer pipeline | Built-in scorer framework with `createScorer()` for calibrating and validating judge output quality. Integrates with Mastra agents natively. | HIGH |
| ai (Vercel AI SDK) | latest | LLM abstraction layer | Used internally by Mastra. Provides `generateObject` with Zod structured output, provider-agnostic model interface. | HIGH |
| @ai-sdk/anthropic | latest | Anthropic provider | Anthropic Claude models via Vercel AI SDK provider interface. Used by Mastra agents for judge evaluations. | HIGH |
| Zod | 3.x | Schema validation + structured output | Define judge evaluation schemas once, use for: (1) Mastra/AI SDK structured output via `generateObject()`, (2) Convex validator generation, (3) TypeScript type inference. Single source of truth for evaluation shapes. | HIGH |

**NOT using @convex-dev/agent:** While Convex has an official Agent component (v0.3.2), it's designed for conversational AI with threads, memory, and RAG. Our judge agents are stateless evaluators -- they receive a proposal, produce a structured score, and exit. The Agent component adds unnecessary complexity (thread management, message history) for a non-conversational use case. Mastra agents are a better fit for structured evaluation workflows.

**Using Mastra over Vercel AI SDK directly:** Mastra wraps Vercel AI SDK and adds: typed workflow engine with `workflow.parallel()` for orchestrating 4 judges, built-in evaluation scorer pipeline (`@mastra/evals`) for calibrating judge quality, and automatic tracing for observability. The Zod schemas and structured output patterns stay the same since Mastra uses AI SDK internally.

### On-Chain / Web3

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Foundry (forge, cast, anvil) | 1.6.x | Smart contract development | Best-in-class Solidity toolchain. Native Solidity tests (no JS context switching), fast compilation, built-in fuzzing. `anvil` for local testnet, `cast` for CLI interactions. | HIGH |
| Solidity | 0.8.24+ | Smart contract language | Required for ERC-8004. Use 0.8.24+ for latest optimizations and custom errors. | HIGH |
| viem | 2.47.x | TypeScript Ethereum client | Type-safe, tree-shakeable, ~35KB bundle. Used server-side in Convex actions to publish evaluation hashes on-chain. Better TypeScript inference than ethers.js, actively maintained by wagmi team. | HIGH |
| OpenZeppelin Contracts | 5.x | Contract base classes | ERC-8004 Identity Registry extends ERC-721. OpenZeppelin provides battle-tested ERC-721, access control, and upgradeable patterns. | HIGH |

**NOT using ethers.js:** Larger bundle (~130KB vs ~35KB), weaker TypeScript types, v6 migration caused ecosystem fragmentation. viem is the modern standard.

**NOT using wagmi:** wagmi provides React hooks for wallet connection -- we don't need wallet UIs. Our on-chain writes happen server-side from Convex actions using a backend wallet (viem only).

**NOT using Hardhat:** The ERC-8004 reference repo uses Hardhat, but Foundry is faster, has better testing (Solidity-native), and avoids Node.js dependency sprawl. We can reference the ERC-8004 contracts and adapt to Foundry.

### UI

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Tailwind CSS | 4.x | Styling | Already decided. Utility-first, works great with shadcn/ui. | HIGH |
| shadcn/ui | latest | Component library | Already decided. Copy-paste components, full control, no version lock-in. | HIGH |

### Deployment

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Vercel | -- | Frontend hosting | Already decided. Native Next.js support. Build command: `npx convex deploy --cmd 'bun run build'` to deploy Convex + Next.js together. | HIGH |
| Convex Cloud | -- | Backend hosting | Convex functions deploy to Convex Cloud automatically. Vercel integration handles env vars. | HIGH |
| Base Sepolia | -- | Testnet | Base L2 testnet over Ethereum Sepolia. Lower gas costs, ERC-8004 is confirmed expanding to Base. Faster block times for better DX during development. | MEDIUM |

### Supporting Libraries

| Library | Version | Purpose | When to Use | Confidence |
|---------|---------|---------|-------------|------------|
| convex-helpers | latest | Convex utilities | Zod-to-Convex validator conversion, custom function wrappers, relationship helpers. Saves boilerplate. | MEDIUM |
| zod-to-json-schema | 3.x | Schema conversion | Bridge Zod schemas to JSON Schema format for structured output. Vercel AI SDK (used by Mastra) handles this internally via `generateObject`, so may not need directly. | MEDIUM |

## Architecture Decisions

### Convex + OpenAI Integration Pattern

The recommended pattern for judge evaluations:

1. **Client calls mutation** (not action) to submit a proposal -- writes to DB
2. **Mutation schedules action** via `ctx.scheduler.runAfter(0, ...)` for evaluation
3. **Action calls OpenAI** with structured output (`zodResponseFormat`) for each judge dimension
4. **Action calls mutation** via `ctx.runMutation()` to persist results
5. **Mutation schedules another action** to publish evaluation hash on-chain

This follows Convex's documented anti-pattern avoidance: never call actions directly from clients.

### Convex + On-Chain Bridge Pattern

To publish evaluation hashes on-chain from Convex:

1. **Convex action** uses viem to create a wallet client from a private key (stored as Convex env var)
2. **Action computes** keccak256 hash of the evaluation JSON
3. **Action calls** the ERC-8004 ReputationRegistry's `giveFeedback()` with the hash
4. **Action stores** the transaction hash back in Convex via `ctx.runMutation()`

This is server-side only -- no wallet connection UI needed for v1. The backend wallet is a hot wallet funded with testnet ETH.

### Mastra Agent Structured Output Pattern

```typescript
import { Agent } from "@mastra/core";
import { anthropic } from "@ai-sdk/anthropic";

const JudgeEvaluation = z.object({
  score: z.number().min(0).max(100),
  justification: z.string(),
  recommendation: z.enum(["strong_approve", "approve", "neutral", "reject", "strong_reject"]),
  keyFindings: z.array(z.string()).max(3),
});

const judgeAgent = new Agent({
  name: "tech-judge",
  model: anthropic("claude-sonnet-4-20250514"),
  instructions: systemPrompt,
});

const result = await judgeAgent.generate(proposalContext, {
  structuredOutput: JudgeEvaluation,
});

const evaluation = result.object; // Fully typed via Zod schema
```

### ERC-8004 Contract Scope

For v1 (testnet), implement a minimal subset:

- **IdentityRegistry**: `register()`, `setAgentURI()`, `getMetadata()` -- register projects
- **ReputationRegistry**: `giveFeedback()`, `getSummary()`, `readFeedback()` -- publish evaluation scores
- **Skip ValidationRegistry** for v1 -- adds complexity without value until there are multiple validators

Use the official reference at `github.com/erc-8004/erc-8004-contracts` as a starting point but simplify: non-upgradeable contracts for testnet, no proxy pattern needed yet.

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Agent Framework | Mastra (`@mastra/core`, `@mastra/evals`) | Vercel AI SDK direct (`ai`, `@ai-sdk/anthropic`) | Mastra adds typed workflow engine with `workflow.parallel()`, built-in evaluation scorer pipeline, and automatic tracing on top of AI SDK |
| Agent Framework | Mastra (`@mastra/core`) | @convex-dev/agent | Designed for conversational agents with threads/memory; our judges are stateless evaluators. Mastra's workflow engine is a better fit. |
| Ethereum Client | viem | ethers.js v6 | Larger bundle, weaker TS types, migration fragmentation |
| Ethereum Client | viem (server-side) | wagmi (React hooks) | No wallet UI needed; on-chain writes are server-side from Convex actions |
| Contract Toolchain | Foundry | Hardhat | Foundry is faster, Solidity-native tests, no JS dependency bloat |
| Testnet | Base Sepolia | Ethereum Sepolia | Lower gas, faster blocks, ERC-8004 expanding to Base |
| Workflow | @convex-dev/workflow | Manual scheduling | Workflow provides retry, step tracking, parallel execution out of the box |

## Installation

```bash
# Core application
bun add convex @mastra/core @mastra/evals ai @ai-sdk/anthropic zod next react react-dom

# Convex components
bun add @convex-dev/workflow

# Web3 (for Convex actions -- server-side only)
bun add viem

# UI
bun add tailwindcss@latest
bunx shadcn@latest init

# Dev dependencies
bun add -D typescript @types/react @types/react-dom convex-helpers

# Smart contracts (separate directory: contracts/)
# Install Foundry via foundryup
curl -L https://foundry.paradigm.xyz | bash
foundryup

# In contracts/ directory
forge init --no-git
forge install OpenZeppelin/openzeppelin-contracts
```

## Environment Variables

### Convex Dashboard
```
OPENAI_API_KEY=sk-...
CHAIN_RPC_URL=https://sepolia.base.org
WALLET_PRIVATE_KEY=0x...  # Backend hot wallet for testnet
```

### Vercel / .env.local
```
NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud
CONVEX_DEPLOY_KEY=prod:...  # Vercel only, not local
```

## Sources

- [Convex Actions documentation](https://docs.convex.dev/functions/actions)
- [Convex Next.js App Router setup](https://docs.convex.dev/client/nextjs/app-router/)
- [Convex + Vercel deployment](https://docs.convex.dev/production/hosting/vercel)
- [@convex-dev/workflow component](https://www.convex.dev/components/workflow)
- [Mastra documentation](https://mastra.ai/docs)
- [Mastra Evals documentation](https://mastra.ai/docs/evals)
- [Vercel AI SDK](https://sdk.vercel.ai/docs)
- [Convex npm package](https://www.npmjs.com/package/convex) -- v1.35.1
- [viem documentation](https://viem.sh/)
- [ERC-8004 specification](https://eips.ethereum.org/EIPS/eip-8004)
- [ERC-8004 reference contracts](https://github.com/erc-8004/erc-8004-contracts)
- [Foundry toolchain](https://github.com/foundry-rs/foundry)
- [Zod structured output patterns](https://hooshmand.net/zod-zodresponseformat-structured-outputs-openai/)
- [Convex anti-pattern: calling actions from clients](https://docs.convex.dev/functions/actions)
