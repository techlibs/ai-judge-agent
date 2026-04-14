# Superpowers Framework -- Process Forensics Report

## Executive Summary

The Superpowers worktree produced 87 commits over ~30 hours (Apr 12 16:01 to Apr 13 22:22), building a complete AI Judge system with smart contracts, evaluation pipeline, chatbot, and BDD test suite. The framework's spec-then-plan-then-execute cycle generated substantial documentation (11 spec/plan files, ~10,325 lines in `docs/superpowers/`) but the GSD `.planning/` artifacts (19 files, ~5,464 lines) were never updated past initial state -- the ROADMAP shows 0% completion despite significant delivered functionality. The fix ratio is moderate at 16.1% (14 fix commits out of 87), with most bugs caught during integration and deployment rather than by the framework's own verification steps. A notable mid-project pivot from Vercel AI SDK to Mastra, and later from Anthropic to OpenAI, shows adaptability but also planning gaps.

## Complete Commit Timeline

| # | Hash | Category | Description | Timestamp | Work Unit | Notes |
|---|------|----------|-------------|-----------|-----------|-------|
| 1 | 2dff198 | config | Initialize project with CLAUDE.md and GSD foundation | Apr 12 16:01 | WU-00: Bootstrap | Shared bootstrap from main |
| 2 | 2547484 | config | Initial commit with README | Apr 12 18:29 | WU-00: Bootstrap | |
| 3 | 7a13e92 | docs | Add 4 implementation plans (Superpowers writing-plans) | Apr 12 18:39 | WU-01: Planning | Superpowers skill invoked |
| 4 | 7b90d84 | docs | Add superpowers workflow: GSD planning, research, specs | Apr 12 18:42 | WU-01: Planning | |
| 5 | 0e529df | docs | Update README with all active branches | Apr 12 18:47 | WU-01: Planning | |
| 6 | a8c03f5 | docs | Add project foundation files | Apr 12 19:03 | WU-01: Planning | |
| 7 | 194aea1 | docs | Move superpowers plans to superpower branch | Apr 12 19:03 | WU-01: Planning | |
| 8 | 7e617bc | docs | Add audit skills toolkit | Apr 12 19:03 | WU-02: Security Audit | Pre-implementation audit |
| 9 | 6735b8f | docs | Add brainstorming design spec and implementation plans | Apr 12 19:05 | WU-01: Planning | |
| 10 | 6ebbd57 | chore | Merge PR #4 (audit-skills-toolkit) | Apr 12 19:06 | WU-02: Security Audit | |
| 11 | 95085cf | chore | Merge: update with main | Apr 12 19:16 | WU-00: Bootstrap | |
| 12 | b4512fd | chore | Merge branch sync | Apr 12 19:17 | WU-00: Bootstrap | |
| 13 | f832f7d | docs | Update README for restructured branches | Apr 12 19:18 | WU-01: Planning | |
| 14 | d9312f7 | docs | Add pre-implementation security design audit | Apr 12 20:07 | WU-02: Security Audit | |
| 15 | 3a475b5 | chore | Merge PR #5 (design-security-audit) | Apr 12 20:22 | WU-02: Security Audit | |
| 16 | fac0bb4 | docs | Add audit section to README | Apr 12 20:28 | WU-02: Security Audit | |
| 17 | 9d65c00 | fix | Apply SECURITY-ADDENDUM fixes to plans | Apr 12 20:28 | WU-02: Security Audit | Security findings fed back into plans |
| 18 | 4a555a4 | feature | Initialize Foundry project with OpenZeppelin | Apr 12 23:03 | WU-03: Contracts | Plan 01 execution starts |
| 19 | 9b65b83 | test | Add IdentityRegistry test suite (red) | Apr 12 23:03 | WU-03: Contracts | TDD red phase |
| 20 | 7b4819d | feature | Implement IdentityRegistry (ERC-8004) | Apr 12 23:04 | WU-03: Contracts | TDD green phase |
| 21 | 3fd3ffd | test | Add ReputationRegistry test suite (red) | Apr 12 23:05 | WU-03: Contracts | TDD red phase |
| 22 | 40a4032 | feature | Implement ReputationRegistry (ERC-8004) | Apr 12 23:06 | WU-03: Contracts | TDD green phase |
| 23 | b7f16b9 | test | Add MilestoneManager test suite (red) | Apr 12 23:07 | WU-03: Contracts | TDD red phase |
| 24 | 882b4a8 | feature | Implement MilestoneManager (ARWF) | Apr 12 23:08 | WU-03: Contracts | TDD green phase |
| 25 | 4d72853 | feature | Add deployment script for Base Sepolia | Apr 12 23:09 | WU-03: Contracts | |
| 26 | 336ecc4 | feature | Initial Next.js commit | Apr 12 23:10 | WU-04: App Foundation | Plan 02 execution |
| 27 | 55be999 | feature | Scaffold Next.js with Tailwind + shadcn/ui | Apr 12 23:10 | WU-04: App Foundation | |
| 28 | 4da4ded | feature | Add AI SDK, Drizzle, Pinata, viem, Zod deps | Apr 12 23:11 | WU-04: App Foundation | |
| 29 | 2854880 | feature | Add environment config and domain constants | Apr 12 23:12 | WU-04: App Foundation | |
| 30 | 5fed4cc | feature | Add SQLite database schema and Drizzle client | Apr 12 23:12 | WU-04: App Foundation | |
| 31 | d4c9b15 | feature | Add Zod schemas for judge output and proposal input | Apr 12 23:13 | WU-04: App Foundation | |
| 32 | b67f26e | feature | Add Pinata IPFS client | Apr 12 23:13 | WU-04: App Foundation | |
| 33 | 1a0db17 | feature | Add viem chain client, contract ABIs, fix IPFS for Pinata v2 | Apr 12 23:15 | WU-04: App Foundation | Includes inline fix |
| 34 | ccf6dd0 | feature | Add judge system prompts and weighted scoring | Apr 12 23:16 | WU-05: Judge Pipeline | Plan 03 execution |
| 35 | c4b5374 | feature | Add judge evaluation pipeline | Apr 12 23:26 | WU-05: Judge Pipeline | |
| 36 | 52cfb88 | refactor | Switch AI framework from Vercel AI SDK to Mastra | Apr 12 23:27 | WU-05: Judge Pipeline | **PIVOT: Major framework switch** |
| 37 | 64e552a | feature | Add UI pages and components (Plan 04) | Apr 12 23:30 | WU-06: UI Pages | Plan 04 execution |
| 38 | 5c3b8aa | docs | Update CLAUDE.md with Mastra stack and worktrees | Apr 12 23:59 | WU-06: UI Pages | |
| 39 | fd038b9 | chore | Merge: sync with main CLAUDE.md | Apr 12 23:59 | WU-00: Bootstrap | |
| 40 | ac491ff | docs | Update README, add self-improvement lesson | Apr 13 00:25 | WU-06: UI Pages | |
| 41 | dcfb04c | test | Add Playwright E2E suite for golden path | Apr 13 00:32 | WU-07: E2E Tests | |
| 42 | 5e7d4ee | fix | Close 9 spec gaps (STORE, EVAL, CHAIN, UI) | Apr 13 00:33 | WU-08: Spec Gap Fix | Significant fix batch |
| 43 | e013444 | docs | Add Tier 1 audit report and human setup guide | Apr 13 00:33 | WU-08: Spec Gap Fix | |
| 44 | 654eafa | docs | Add breadth-first test suite design spec | Apr 13 02:35 | WU-09: Test Suite | Superpowers spec |
| 45 | 1178cbb | docs | Add breadth-first test suite implementation plan | Apr 13 02:47 | WU-09: Test Suite | Superpowers plan |
| 46 | 7265563 | test | Add shared mock factories | Apr 13 03:02 | WU-09: Test Suite | |
| 47 | 5a3f92d | test | Add utility tests (weights, sanitize, security) | Apr 13 03:04 | WU-09: Test Suite | |
| 48 | 4988657 | test | Add IPFS client and rate limiting tests | Apr 13 03:06 | WU-09: Test Suite | |
| 49 | 4c31e59 | test | Add chain publisher tests | Apr 13 03:08 | WU-09: Test Suite | |
| 50 | 5059a8c | test | Add orchestrator tests | Apr 13 03:12 | WU-09: Test Suite | |
| 51 | 3ded0a8 | config | Add Dockerfile and Cloud Run config | Apr 13 03:13 | WU-10: Deployment | |
| 52 | 9707b02 | test | Add API route tests (proposals, evaluate) | Apr 13 03:17 | WU-09: Test Suite | |
| 53 | 9390955 | test | Fill test gaps (publish-chain, orchestrator, trigger) | Apr 13 03:24 | WU-09: Test Suite | |
| 54 | cd5fe8d | test | Add evaluate-dimension API route tests | Apr 13 03:26 | WU-09: Test Suite | |
| 55 | 70de2de | docs | Add Mastra evaluation improvements design spec | Apr 13 03:41 | WU-11: Mastra Evals | Superpowers spec |
| 56 | 1cd1b03 | docs | Add E2E test fixes + evaluation mock spec | Apr 13 03:41 | WU-11: Mastra Evals | |
| 57 | 7efc236 | docs | Add Mastra evaluation improvements plan | Apr 13 03:46 | WU-11: Mastra Evals | Superpowers plan |
| 58 | 3afbcf2 | fix | Remove scoreDecimals literal from LLM schema | Apr 13 03:48 | WU-11: Mastra Evals | LLM output issue |
| 59 | bd4a3db | fix | Use explicit en-US locale for budget formatting | Apr 13 03:51 | WU-11: Mastra Evals | Locale-dependent prompt bug |
| 60 | 83933ca | feature | Add XML delimiters for injection defense | Apr 13 03:51 | WU-11: Mastra Evals | Security hardening |
| 61 | 6a898bd | refactor | Extract judge agent singletons | Apr 13 03:55 | WU-11: Mastra Evals | Performance refactor |
| 62 | 596b944 | fix | Resolve Cloud Run deployment issues | Apr 13 03:58 | WU-10: Deployment | Deploy fix |
| 63 | e98524f | feature | Implement @mastra/evals quality gate | Apr 13 03:59 | WU-11: Mastra Evals | Faithfulness + hallucination scorers |
| 64 | 17f7579 | feature | Create Mastra singleton with agent registry | Apr 13 04:04 | WU-11: Mastra Evals | |
| 65 | 1256ab2 | feature | Add test-only evaluation seed endpoint + E2E test | Apr 13 04:06 | WU-11: Mastra Evals | |
| 66 | d9b478d | feature | Add PromptInjectionDetector guardrail | Apr 13 04:07 | WU-11: Mastra Evals | Security feature |
| 67 | 26bcb99 | config | Add API project to Playwright, enhance setup | Apr 13 04:12 | WU-12: E2E Fixes | |
| 68 | fd96269 | feature | Refactor eval pipeline to server-orchestrated workflow | Apr 13 04:13 | WU-12: E2E Fixes | Architecture change |
| 69 | c77e419 | docs | Add eval-core-review audit reports | Apr 13 04:14 | WU-12: E2E Fixes | |
| 70 | be56367 | test | Add full BDD + API test suite with DB fixtures | Apr 13 04:16 | WU-12: E2E Fixes | 9 feature files + step defs |
| 71 | 0a6ade2 | feature | Switch AI judges from Anthropic to OpenAI GPT-5.4 | Apr 13 04:18 | WU-13: Provider Switch | **PIVOT: Provider change** |
| 72 | e916e9b | fix | Fix E2E test suite stability (prevent page crashes) | Apr 13 04:22 | WU-12: E2E Fixes | |
| 73 | 479a265 | feature | Switch to OpenAI GPT-5.4 for all judges and scorers | Apr 13 09:38 | WU-13: Provider Switch | 5h gap -- session break |
| 74 | 931b1ac | docs | Update self-improvement lessons | Apr 13 09:40 | WU-13: Provider Switch | |
| 75 | f83897f | chore | Update lockfiles and contract artifacts | Apr 13 09:41 | WU-13: Provider Switch | |
| 76 | 0649fe3 | test | Add AI judge mock for E2E evaluation tests | Apr 13 09:46 | WU-12: E2E Fixes | |
| 77 | d708c85 | feature | Add conversational chatbot for grant analysis | Apr 13 13:04 | WU-14: Chatbot | New feature |
| 78 | 7f15531 | feature | Add Superpowers framework badge to nav | Apr 13 13:33 | WU-14: Chatbot | UI polish |
| 79 | dc2fad5 | fix | Resolve AI SDK v6 compatibility in chatbot | Apr 13 13:34 | WU-14: Chatbot | SDK compat issue |
| 80 | 1578ff7 | fix | Add stopWhen + flexible message schema for chat | Apr 13 13:50 | WU-14: Chatbot | Multi-turn fix |
| 81 | bbdd4ec | feature | Integrate Colosseum Copilot (3-agent research team) | Apr 13 14:07 | WU-15: Colosseum | Advanced feature |
| 82 | 5d90823 | fix | Fix 10 failures, add chat + chain tests | Apr 13 15:11 | WU-16: Test Fixes | Batch test fix |
| 83 | 32b059c | fix | Add /api/health endpoint for Cloud Run liveness | Apr 13 22:19 | WU-17: Deploy Fix | 7h gap -- session break |
| 84 | b5270b5 | fix | Use dynamic import for colosseum client | Apr 13 22:19 | WU-17: Deploy Fix | Build-time route fix |
| 85 | 270877a | feature | Add client-side error tracking for E2E | Apr 13 22:20 | WU-17: Deploy Fix | |
| 86 | 1643273 | feature | Replace scaffold with IPE City landing page | Apr 13 22:22 | WU-18: Landing Page | |
| 87 | dea7bc1 | feature | Add GET handler for proposals API with pagination | Apr 13 22:22 | WU-18: Landing Page | |

## Iteration Cycles

### WU-00: Bootstrap (commits 1-2, 11-12, 39) -- 5 commits
- **Duration**: Spread across project
- **Fix ratio**: 0/5 (0%)
- **Notes**: Standard merges and initial setup. No issues.

### WU-01: Planning Phase (commits 3-7, 9, 13) -- 7 commits
- **Duration**: Apr 12 18:39 - 19:18 (~40 min)
- **Fix ratio**: 0/7 (0%)
- **Notes**: Heavy upfront planning. Generated 4 implementation plans, design spec, project foundation. All docs, no code.

### WU-02: Security Audit (commits 8, 10, 14-17) -- 6 commits
- **Duration**: Apr 12 19:03 - 20:28 (~1.5h)
- **Fix ratio**: 1/6 (17%) -- security addendum fed back into plans
- **Notes**: Pre-implementation security design audit via dedicated skill. Findings actually changed the plans before code was written. Good practice.

### WU-03: Smart Contracts (commits 18-25) -- 8 commits
- **Duration**: Apr 12 23:03 - 23:09 (~6 min)
- **Fix ratio**: 0/8 (0%)
- **Notes**: Clean TDD cycle: test(red) -> implement(green) for each contract. 3 contracts + deploy script in ~6 minutes. Zero rework. Plan execution was precise.

### WU-04: App Foundation (commits 26-33) -- 8 commits
- **Duration**: Apr 12 23:10 - 23:15 (~5 min)
- **Fix ratio**: 0/8 (0%)
- **Notes**: Rapid scaffolding. One commit included an inline fix for IPFS client (Pinata v2 API change), but it was caught during implementation, not post-facto.

### WU-05: Judge Pipeline (commits 34-36) -- 3 commits
- **Duration**: Apr 12 23:16 - 23:27 (~11 min)
- **Fix ratio**: 0/3 (0%)
- **Notes**: Contains the **major Mastra pivot** (commit 36). Built the pipeline with Vercel AI SDK first, then immediately refactored to Mastra. The plan called for Mastra from the start, so this was correcting an implementation deviation.

### WU-06: UI Pages (commits 37-40) -- 4 commits
- **Duration**: Apr 12 23:30 - Apr 13 00:25 (~55 min)
- **Fix ratio**: 0/4 (0%)
- **Notes**: Full UI implementation in one commit + docs cleanup.

### WU-07: First E2E Tests (commit 41) -- 1 commit
- **Duration**: Apr 13 00:32
- **Fix ratio**: 0/1 (0%)
- **Notes**: Initial Playwright golden path test.

### WU-08: Spec Gap Fix (commits 42-43) -- 2 commits
- **Duration**: Apr 13 00:33
- **Fix ratio**: 1/2 (50%) -- 9 spec gaps closed
- **Notes**: Major batch fix closing gaps across STORE, EVAL, CHAIN, and UI requirements. This is the biggest single fix commit, addressing issues found through spec-vs-implementation comparison.

### WU-09: Breadth-First Test Suite (commits 44-54, excluding 51) -- 10 commits
- **Duration**: Apr 13 02:35 - 03:26 (~51 min)
- **Fix ratio**: 0/10 (0%)
- **Notes**: Spec-then-plan-then-execute for test suite. Generated design spec, implementation plan, then systematically built tests layer by layer. Clean execution.

### WU-10: Deployment (commits 51, 62) -- 2 commits
- **Duration**: Apr 13 03:13 - 03:58
- **Fix ratio**: 1/2 (50%) -- Cloud Run deployment fix
- **Notes**: Initial Dockerfile worked, but deployment needed fixes for runtime issues.

### WU-11: Mastra Evaluation Improvements (commits 55-66) -- 12 commits
- **Duration**: Apr 13 03:41 - 04:07 (~26 min)
- **Fix ratio**: 2/12 (17%) -- scoreDecimals, locale formatting
- **Notes**: Another full spec-plan-execute cycle. Added quality gates, injection defense, and prompt refinements. Two LLM-output bugs fixed.

### WU-12: BDD + E2E Fixes (commits 67-70, 72, 76) -- 6 commits
- **Duration**: Apr 13 04:12 - 09:46
- **Fix ratio**: 1/6 (17%) -- E2E stability fix
- **Notes**: Added 9 BDD feature files with step definitions. Had to fix E2E stability issues (evaluate page crashes).

### WU-13: Provider Switch (commits 71, 73-75) -- 4 commits
- **Duration**: Apr 13 04:18 - 09:41
- **Fix ratio**: 0/4 (0%)
- **Notes**: **Second major pivot**: Switch from Anthropic to OpenAI GPT-5.4. Done in two passes (initial switch, then full coverage). 5-hour session break between passes.

### WU-14: Chatbot (commits 77-80) -- 4 commits
- **Duration**: Apr 13 13:04 - 13:50 (~46 min)
- **Fix ratio**: 2/4 (50%) -- SDK v6 compat, multi-turn schema
- **Notes**: New conversational feature. Half the commits were fixes -- AI SDK v6 compatibility and message schema issues. The chatbot was an unplanned addition not in the original roadmap.

### WU-15: Colosseum Copilot (commit 81) -- 1 commit
- **Duration**: Apr 13 14:07
- **Fix ratio**: 0/1 (0%)
- **Notes**: Advanced multi-agent feature (3-agent research team with 4-layer injection defense). Ambitious single commit.

### WU-16: Test Fixes (commit 82) -- 1 commit
- **Duration**: Apr 13 15:11
- **Fix ratio**: 1/1 (100%) -- 10 test failures fixed
- **Notes**: Batch fix for accumulated test failures from chatbot and provider switch changes.

### WU-17: Deploy Fixes (commits 83-85) -- 3 commits
- **Duration**: Apr 13 22:19 - 22:20
- **Fix ratio**: 2/3 (67%) -- health endpoint, dynamic import fix
- **Notes**: Cloud Run deployment broke due to missing health check and colosseum client build issue.

### WU-18: Landing Page (commits 86-87) -- 2 commits
- **Duration**: Apr 13 22:22
- **Fix ratio**: 0/2 (0%)
- **Notes**: Final polish -- proper landing page and proposals API pagination.

## Bug Discovery & Fix Timeline

| Bug | Introduced | Fix Commit | Gap (commits) | How Caught | Severity |
|-----|-----------|------------|---------------|------------|----------|
| Security issues in plans | WU-01 planning | 9d65c00 | ~10 | Pre-impl audit skill | Medium |
| IPFS client incompatible with Pinata v2 | b67f26e | 1a0db17 (same WU) | 1 | Implementation testing | Low |
| 9 spec gaps (STORE, EVAL, CHAIN, UI) | ~commits 26-37 | 5e7d4ee | ~5-15 | Spec-vs-code audit | High |
| scoreDecimals literal in LLM schema | c4b5374 | 3afbcf2 | ~22 | Testing/audit | Medium |
| Locale-dependent budget formatting | ccf6dd0 | bd4a3db | ~25 | Testing/audit | Low |
| Cloud Run deployment failures | 3ded0a8 | 596b944 | 11 | Deploy testing | Medium |
| E2E test suite instability (page crashes) | dcfb04c | e916e9b | ~31 | E2E test runs | Medium |
| AI SDK v6 compatibility in chatbot | d708c85 | dc2fad5 | 2 | Build/runtime | High |
| Multi-turn chat message schema | d708c85 | 1578ff7 | 3 | Manual testing | Medium |
| 10 test failures from chat + provider changes | d708c85, 0a6ade2 | 5d90823 | ~10 | Test suite run | Medium |
| Missing /api/health for Cloud Run | 3ded0a8 | 32b059c | ~32 | Deploy monitoring | Medium |
| Colosseum client build-time route drop | bbdd4ec | b5270b5 | 4 | Build failure | High |

**Bug classification summary:**
- Caught by pre-implementation audit: 1
- Caught by spec-vs-code comparison: 1
- Caught during implementation: 1
- Caught by build/runtime errors: 2
- Caught by test suite runs: 2
- Caught by deploy testing: 2
- Caught by manual/E2E testing: 3

## Framework Planning Artifacts

### Inventory

**GSD `.planning/` directory (19 files, 5,464 lines):**
| File | Lines | Purpose | Value |
|------|-------|---------|-------|
| PROJECT.md | 95 | Project definition | Useful context |
| ROADMAP.md | 98 | 4-phase roadmap | Good structure, never updated |
| REQUIREMENTS.md | 128 | Extracted requirements | Comprehensive |
| STATE.md | 79 | Progress tracking | Shows 0% -- never updated |
| config.json | 40 | GSD config | Boilerplate |
| phases/01-*/01-RESEARCH.md | -- | Phase 1 research | Generated, not used |
| phases/01-*/01-UI-SPEC.md | -- | Phase 1 UI spec | Generated, not used |
| phases/02-*/02-RESEARCH.md | -- | Phase 2 research | Generated, not used |
| phases/02-*/02-UI-SPEC.md | -- | Phase 2 UI spec | Generated, not used |
| phases/03-*/03-RESEARCH.md | -- | Phase 3 research | Generated, not used |
| phases/03-*/03-UI-SPEC.md | -- | Phase 3 UI spec | Generated, not used |
| phases/04-*/04-01-PLAN.md | -- | Phase 4 plan | Generated, not used |
| phases/04-*/04-RESEARCH.md | -- | Phase 4 research | Generated, not used |
| phases/04-*/04-UI-SPEC.md | -- | Phase 4 UI spec | Generated, not used |
| research/* (5 files) | -- | Research artifacts | Generated during /gsd-new-project |

**Superpowers `docs/superpowers/` (11 files, 10,325 lines):**
| File | Category | Lines | Value |
|------|----------|-------|-------|
| specs/2026-04-12-ai-judge-design.md | Design Spec | ~800+ | **High** -- detailed architecture doc |
| plans/2026-04-12-01-smart-contracts.md | Plan | ~400+ | **High** -- executed precisely |
| plans/2026-04-12-02-app-foundation.md | Plan | ~400+ | **High** -- executed precisely |
| plans/2026-04-12-03-judge-pipeline.md | Plan | ~400+ | **High** -- mostly executed |
| plans/2026-04-12-04-ui-pages.md | Plan | ~400+ | **High** -- executed |
| specs/2026-04-13-breadth-first-test-suite-design.md | Design Spec | ~500+ | **Medium** -- guided test work |
| plans/2026-04-13-breadth-first-test-suite.md | Plan | ~400+ | **Medium** -- executed |
| specs/2026-04-13-e2e-test-fixes-design.md | Design Spec | ~300+ | **Medium** -- guided fixes |
| specs/2026-04-13-mastra-eval-improvements-design.md | Design Spec | ~500+ | **Medium** -- guided improvements |
| plans/2026-04-13-mastra-eval-improvements.md | Plan | ~400+ | **Medium** -- executed |
| plans/2026-04-13-bdd-api-tests-and-fixes.md | Plan | ~400+ | **Medium** -- guided BDD work |

**Other docs (9 files, 2,513 lines):**
- DESIGN-AUDIT-REPORT.md, TIER1-AUDIT-REPORT.md, audit-skills-toolkit.md
- colosseum-copilot-integration.md + prompt.md
- agent-team-audit-launch.md
- PROMPTING.md, spec-driven-frameworks-analysis.md + prompt.md

### Value Assessment

The Superpowers framework created a **dual planning layer**: GSD's `.planning/` for project-level tracking and Superpowers' `docs/superpowers/` for task-level specs and plans. The problem is these two layers were **disconnected**:

- `.planning/STATE.md` shows 0% progress despite 87 commits of delivered work
- `.planning/ROADMAP.md` has all phases marked "Not started" 
- The actual execution was guided by `docs/superpowers/plans/` which were the real working documents

**Plan-vs-reality comparison:**
- The original 4-phase plan (Contracts -> Foundation -> Pipeline -> UI -> Tests -> Polish) was followed roughly in order
- Features not in any plan: Chatbot (WU-14), Colosseum Copilot (WU-15), Landing Page (WU-18)
- The Mastra pivot was not in the original plan (plan specified Mastra, but implementation started with raw AI SDK)
- The Anthropic-to-OpenAI switch was not planned at all
- BDD feature files were added late (WU-12) despite being valuable for spec alignment

**Planning overhead ratio:**
- Total planning lines: ~15,789 (GSD) + ~10,325 (Superpowers) + ~2,513 (other docs) = ~28,627
- Total source code lines (TS/TSX): ~9,321 across 86 files
- **Planning-to-code ratio: ~3.1:1** (3 lines of planning per line of code)

## Velocity Analysis

### Commit Distribution by Day/Session

| Session | Time Window | Commits | Focus |
|---------|-------------|---------|-------|
| Session 1 | Apr 12 16:01 - 20:28 | 17 | Planning + Security Audit (all docs, no code) |
| Session 2 | Apr 12 23:03 - Apr 13 00:33 | 26 | Core implementation burst (contracts through E2E) |
| Session 3 | Apr 13 02:35 - 04:22 | 31 | Test suite + Mastra improvements + BDD + Deploy |
| Session 4 | Apr 13 09:38 - 09:46 | 4 | Provider switch completion |
| Session 5 | Apr 13 13:04 - 15:11 | 6 | Chatbot + Colosseum + test fixes |
| Session 6 | Apr 13 22:19 - 22:22 | 3 | Deploy fixes + landing page |

### Velocity Patterns

- **Session 2 was the productivity peak**: 26 commits in ~1.5 hours covering contracts, app foundation, judge pipeline, UI, and first E2E test. This was the core system built in one burst.
- **Session 3 was the testing peak**: 31 commits adding comprehensive test coverage, Mastra quality gates, and BDD.
- **Sessions 4-6 show deceleration**: Feature additions (chatbot, colosseum) each brought new bugs, and deployment fixes continued until the end.
- **Planning-heavy start**: 17 of the first 17 commits were documentation. Code didn't start until commit 18, ~4 hours after project init.

### Commits by Category

| Category | Count | Percentage |
|----------|-------|------------|
| feature | 33 | 37.9% |
| docs | 20 | 23.0% |
| test | 16 | 18.4% |
| fix | 14 | 16.1% |
| chore | 5 | 5.7% |
| refactor | 2 | 2.3% |
| config | 3 | 3.4% |

*Note: Some commits span categories; classified by primary intent.*

## Pivot Moments

### Pivot 1: Vercel AI SDK -> Mastra (commit 52cfb88, Apr 12 23:27)

- **Trigger**: The original design spec specified Mastra, but the initial implementation in WU-05 used raw Vercel AI SDK. This was corrected immediately.
- **Gap**: 1 commit (c4b5374 built with AI SDK, 52cfb88 refactored to Mastra)
- **Impact**: Low -- caught immediately. Shows the plan was authoritative.
- **Root cause**: Implementation deviated from spec; the spec-first approach caught it fast.

### Pivot 2: Anthropic -> OpenAI GPT-5.4 (commits 0a6ade2 + 479a265, Apr 13 04:18-09:38)

- **Trigger**: Likely API availability or cost issues with Anthropic provider.
- **Gap**: Required two commits (initial switch, then full coverage) and a session break.
- **Impact**: Medium -- cascading test failures (10 failures fixed in commit 5d90823).
- **Root cause**: Provider dependency was hard-coded rather than abstracted. Despite Mastra's provider-agnostic design, the switch still required explicit changes.

### Pivot 3: Server-Orchestrated Evaluation (commit fd96269, Apr 13 04:13)

- **Trigger**: The original client-streaming evaluation approach (SSE per judge) was replaced with a server-orchestrated workflow.
- **Impact**: Medium -- architectural change to evaluation pipeline. Improved reliability but diverged from original spec.
- **Root cause**: Real-world testing showed client-side orchestration was fragile.

### Pivot 4: Chatbot Addition (commit d708c85, Apr 13 13:04)

- **Trigger**: Unplanned feature addition -- conversational chatbot for grant analysis.
- **Impact**: High on stability -- introduced 2 immediate bugs (SDK v6 compat, message schema) and 10 cascading test failures.
- **Root cause**: Feature scope creep. Not in any plan or roadmap phase. Added without a Superpowers spec/plan cycle.

## E2E & BDD Analysis

### BDD Feature Files

| Feature File | Scenarios | Tags | Coverage Area |
|-------------|-----------|------|---------------|
| golden-path.feature | 1 (multi-step) | @e2e @golden-path | Full lifecycle: landing -> list -> submit -> evaluate -> verify |
| proposal-submission.feature | 2+ | -- | Form submission, valid proposal |
| proposal-validation.feature | 5+ | @validation | Input validation, length constraints, XSS |
| grants-listing.feature | 1+ | @needs-fixtures | List page with stats |
| proposal-detail.feature | 1+ | @needs-fixtures | Detail view for pending/published |
| live-evaluation.feature | 2+ | @needs-fixtures @needs-mock-judges | Real-time judge evaluation |
| api-proposals.feature | 2+ | @skip @api | Proposals CRUD API |
| api-evaluation.feature | 1+ | @skip @api | Evaluation trigger API |
| on-chain-verification.feature | 3+ | @needs-fixtures | Chain verification page |

**Total: 9 feature files covering 15+ scenarios.**

### Generated Test Evidence

The `.features-gen/` directory contains 7 generated spec files from BDD features:
- proposal-validation.feature.spec.js
- proposal-detail.feature.spec.js
- grants-listing.feature.spec.js
- live-evaluation.feature.spec.js
- golden-path.feature.spec.js
- proposal-submission.feature.spec.js
- on-chain-verification.feature.spec.js

### E2E Test Infrastructure

| Component | Files | Purpose |
|-----------|-------|---------|
| e2e/golden-path.spec.ts | 1 | Playwright golden path test |
| e2e/api/*.spec.ts | 5 | API-level E2E tests (proposals, evaluate-trigger, evaluate-status, evaluate-finalize, evaluate-retry) |
| e2e/steps/*.ts | 9 | BDD step definitions |
| e2e/helpers/test-state.ts | 1 | Shared test state |
| e2e/global-setup.ts | 1 | Global test setup |
| e2e/playwright.config.ts | 1 | Playwright configuration |

### Test File Summary

| Type | Count |
|------|-------|
| Unit tests (*.test.ts) | 21 |
| E2E/Integration tests (*.spec.ts) | 6 |
| Solidity tests (*.t.sol) | 49 |
| BDD feature files (*.feature) | 9 |
| **Total test files** | **85** |

### Coverage Assessment

- **Strong**: API routes, smart contracts (TDD), utility functions, schemas
- **Moderate**: Orchestrator, chain publisher, IPFS client
- **Weak**: UI components (no component tests), chatbot (added late, minimal testing), Colosseum integration
- **Missing**: No test coverage reporting configured, no CI test runner

## Key Metrics Summary

| Metric | Value |
|--------|-------|
| Total commits | 87 |
| Feature commits | 33 (37.9%) |
| Fix commits | 14 (16.1%) |
| Docs commits | 20 (23.0%) |
| Test commits | 16 (18.4%) |
| Fix ratio (fix / total) | 16.1% |
| Planning files created (.planning/) | 19 |
| Planning lines written (.planning/) | 5,464 |
| Superpowers spec/plan files | 11 |
| Superpowers spec/plan lines | 10,325 |
| Total planning lines (all docs) | ~28,627 |
| Source code lines (TS/TSX) | 9,321 |
| Source code files (TS/TSX) | 86 |
| Planning-to-code ratio | 3.1:1 |
| Phases planned | 4 |
| Phases marked complete in ROADMAP | 0 |
| Actual phases delivered (estimated) | ~2 (foundation + pipeline) |
| Bugs found post-implementation | 12 |
| Average fix gap (commits) | ~13 |
| BDD feature files | 9 |
| BDD scenarios | 15+ |
| Total test files | 85 |
| Solidity test files | 49 |
| Major pivots | 4 |
| Session count | 6 |
| Total duration (first to last commit) | ~30 hours |
| Active coding time (estimated) | ~8-10 hours |

## Observations

1. **Dual planning overhead**: The Superpowers framework created useful spec/plan documents, but the GSD `.planning/` layer was generated and abandoned. STATE.md showing 0% while substantial work was delivered means the framework's progress tracking was non-functional.

2. **Spec-first approach was effective for planned work**: The contracts (WU-03) and test suite (WU-09) work units had 0% fix ratios and were executed cleanly from their plans. The spec-plan-execute cycle works well when followed.

3. **Unplanned features caused most bugs**: The chatbot (WU-14) and its downstream effects (WU-16, WU-17) accounted for 5 of 14 fix commits. It was added without going through the Superpowers spec/plan cycle, and the quality difference is visible.

4. **Pre-implementation security audit was unique and valuable**: The dedicated security audit before code (WU-02) found issues that were fixed in the plans before they became code bugs. This is a distinctive Superpowers pattern not seen in other frameworks.

5. **TDD was strictly followed for contracts but not for application code**: The Solidity work shows clean red-green TDD cycles. The application code was built feature-first with tests added later in dedicated test work units.
