# Agent Build Instructions — Unified Agent Reviewer

## Project Setup
```bash
bun install
```

## Running Tests
```bash
bun run test
```

## Build Commands
```bash
bun run build        # Production build
bun run typecheck    # TypeScript strict checking
bun run lint         # ESLint check
bun run lint:fix     # ESLint auto-fix
```

## Development Server
```bash
bun run dev          # Start Next.js dev server at http://localhost:3000
```

## Environment Variables

Required in `.env.local`:
```bash
# AI Providers
ANTHROPIC_API_KEY=           # Claude (primary)
OPENAI_API_KEY=              # GPT (failover)

# IPFS
PINATA_API_KEY=
PINATA_SECRET_API_KEY=

# On-chain
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
NEXT_PUBLIC_CHAIN_ID=84532

# Contract addresses (same on testnet and mainnet)
NEXT_PUBLIC_IDENTITY_REGISTRY_ADDRESS=0xDf1ebEe392e6B6AFEE89Fb83CDBF97dA9f8b7B6a
NEXT_PUBLIC_EVALUATION_REGISTRY_ADDRESS=0xa86D6684De7878C36F03697657702A86D13028d8
NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS=0x0DB2eef99d1Efb3313c6Fe314D137914eCc6FB1f
NEXT_PUBLIC_VALIDATION_REGISTRY_ADDRESS=0x5A0Bf56694c8448F681c909C1F61849c1A183f17
NEXT_PUBLIC_MILESTONE_MANAGER_ADDRESS=0xb4161cB90f2664A0d4485265ee150A7f3a7d536b
NEXT_PUBLIC_DISPUTE_REGISTRY_ADDRESS=0x78f8688c1a3e4ec762E7351996B7b3c275f32b0e
```

## Source Worktrees (READ ONLY)

```bash
# Primary source — most feature-complete
.worktrees/speckit/

# Mastra integration source — only working AI pipeline
.worktrees/superpower/

# Flexibility patterns source — wave-based execution
.worktrees/full-vision-roadmap/
```

## Key Learnings
- Speckit has the cleanest component architecture — use as baseline
- Superpower is the ONLY worktree with working Mastra + @mastra/evals — must port from there
- All 3 worktrees lack API route authentication — must add from scratch
- Hardcoded reputation lookup in speckit must be fixed during port
- GSD has invalid model name "gpt-5.4" in constants — do not copy

## Feature Completion Checklist

Before marking ANY feature as complete, verify:

- [ ] All tests pass: `bun run test`
- [ ] TypeScript strict passes: `bun run typecheck`
- [ ] Lint passes: `bun run lint`
- [ ] Changes committed with conventional commit messages
- [ ] .ralph/fix_plan.md task marked as complete
- [ ] No `any`, `as Type`, `!`, or `@ts-ignore` in new code
- [ ] Zod validation at all API boundaries
- [ ] No hardcoded secrets — env vars only
