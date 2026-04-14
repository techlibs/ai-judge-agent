# Ralph Fix Plan — Unified Agent Reviewer

## Phase 1: Foundation (High Priority) ✅ COMPLETE

- [x] Initialize Next.js 15 App Router project with Bun (package.json, tsconfig, tailwind, next.config)
- [x] Install core dependencies: next, react, typescript, tailwind, shadcn/ui, zod, viem, ai, @ai-sdk/anthropic, @ai-sdk/openai, mastra
- [x] Set up project structure mirroring speckit: src/app/, src/lib/, src/components/, src/types/
- [x] Port shared types and Zod schemas from speckit (src/types/ or src/lib/schemas/)
- [x] Port environment config with validation (no hardcoded secrets — use env vars only)

## Phase 2: UI Layer (High Priority) — PARTIALLY COMPLETE

- [x] Port layout.tsx and globals.css from speckit
- [x] Port landing page (src/app/page.tsx) from speckit
- [ ] Port shadcn/ui components (button, card, dialog, etc.) from speckit
- [ ] Port grants submission page from speckit (src/app/grants/)
- [ ] Port operator dashboard from speckit (src/app/dashboard/)
- [x] Port global navigation bar from speckit
- [x] Add security headers (CSP, X-Frame-Options) — missing from all worktrees

## Phase 3: AI Evaluation Pipeline (Critical)

- [ ] Port Mastra agent framework setup from superpower (agent config, tools, workflows)
- [ ] Port @mastra/evals scorer pipeline from superpower (score normalization, quality gates)
- [ ] Port 4 Judge Agent definitions (Technical Feasibility, Impact Potential, Cost Efficiency, Team Capability)
- [ ] Port structured output schemas (Zod) for evaluation results
- [x] Port prompt injection defense from superpower
- [ ] Port wave-based parallel execution pattern from GSD for concurrent judge runs
- [ ] Implement evaluation API route with authentication (POST /api/evaluate)
- [ ] Implement evaluation results API route (GET /api/evaluations/[id])
- [ ] Add rate limiting on cost-generating endpoints

## Phase 4: On-Chain Integration (Medium Priority)

- [ ] Port viem client setup and contract ABIs from speckit
- [ ] Port IdentityRegistry interactions (register, getMetadata)
- [ ] Port EvaluationRegistry interactions (publish scores)
- [ ] Port ReputationRegistry interactions (giveFeedback, getSummary) — FIX hardcoded lookup bug from speckit
- [ ] Port IPFS pinning service (Pinata) from speckit
- [ ] Add HMAC verification for on-chain data integrity (from speckit)

## Phase 5: Advanced Features (Medium Priority)

- [ ] Port dispute resolution system from speckit
- [ ] Port reputation portability from speckit
- [ ] Port monitoring agents from speckit
- [ ] Port SSE real-time evaluation progress from speckit — FIX resource exhaustion vulnerability
- [ ] Port DOMPurify sanitization for IPFS content display

## Phase 6: Quality & Security (Medium Priority)

- [ ] Add authentication middleware for all API routes (none of the 3 had this)
- [x] Add input validation with Zod on all API boundaries
- [ ] Add CSRF protection
- [x] Ensure no PII leaks in evaluation outputs
- [ ] Run full typecheck (`bun run typecheck`) — zero errors
- [ ] Run full lint (`bun run lint`) — zero errors
- [ ] Write tests for evaluation pipeline (judge agents, score normalization)
- [ ] Write tests for on-chain interactions (mock viem calls)
- [ ] Write E2E test: submit proposal → evaluate → publish scores

## Phase 7: Polish & Deploy (Low Priority)

- [ ] Update README.md with setup instructions
- [ ] Configure Vercel deployment (vercel.json if needed)
- [ ] Verify `bun run build` produces clean production build
- [ ] Verify `bun run dev` runs the full app end-to-end
- [ ] Final cross-check: all CRITICAL bugs from audit are fixed

## Completed

- [x] Ralph project setup
- [x] Framework comparison analysis (docs/)
- [x] Smart contract deployment (6 contracts on Base Sepolia + Mainnet)

## Notes

- **Primary source:** `/Users/libardo/carlos/projects/ipe-city/agent-reviewer/.worktrees/speckit/` — most complete, cleanest architecture
- **Mastra source:** `/Users/libardo/carlos/projects/ipe-city/agent-reviewer/.worktrees/superpower/` — only working Mastra integration
- **Flexibility patterns:** `/Users/libardo/carlos/projects/ipe-city/agent-reviewer/.worktrees/full-vision-roadmap/` — wave-based execution
- **Critical bugs to fix:** hardcoded reputation lookup (speckit), invalid model name "gpt-5.4" (gsd), missing API auth (all), resource exhaustion on SSE (speckit)
- Always read worktree code before implementing — extract, don't reinvent
