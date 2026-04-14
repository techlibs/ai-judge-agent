# GSD Framework — Process Forensics Report

## Executive Summary

The GSD worktree produced 119 commits building an AI-powered grant evaluation system across 4 phases. A defining characteristic was **massive upfront planning**: 57 commits (48%) were docs/planning before a single line of application code was written. The feature implementation itself was fast and disciplined (phases 1-3 built in ~4 hours), but was followed by a prolonged tail of 28 fix commits (24%) addressing type safety violations, security gaps, and integration issues. The framework created 39 planning files totaling ~9,900 lines — a significant overhead that produced thorough specs but whose plans were not always followed (e.g., Mastra was planned but Vercel AI SDK was used first, requiring a later refactor).

## Complete Commit Timeline

| # | Hash | Category | Description | Timestamp | Work Unit | Notes |
|---|------|----------|-------------|-----------|-----------|-------|
| 1 | 2dff198 | config | Initialize project with CLAUDE.md and GSD foundation | Apr 12 16:01 | Setup | First commit |
| 2 | 2547484 | docs | Initial commit with README | Apr 12 18:29 | Setup | |
| 3 | 7a13e92 | docs | Add 4 implementation plans (Superpowers writing-plans) | Apr 12 18:39 | Setup | Cross-worktree artifact |
| 4 | 0e529df | docs | Update README with all active branches | Apr 12 18:47 | Setup | |
| 5 | 907cd65 | docs | Initialize project | Apr 12 16:46 | GSD Init | GSD project init |
| 6 | a29bc6a | config | Add project config | Apr 12 16:47 | GSD Init | config.json |
| 7 | d0cf9ba | docs | Complete project research | Apr 12 16:57 | GSD Research | |
| 8 | db33106 | docs | Define v1 requirements | Apr 12 17:02 | GSD Requirements | |
| 9 | d200ea6 | docs | Create roadmap (4 phases) | Apr 12 17:13 | GSD Roadmap | |
| 10 | 6470b34 | docs | Phase 4 research | Apr 12 17:21 | Phase Research | |
| 11 | e0d75ee | docs | Phase 1 research | Apr 12 17:22 | Phase Research | |
| 12 | 13fa20c | docs | Phase 2 research | Apr 12 17:22 | Phase Research | |
| 13 | 1b280cc | docs | Phase 3 research | Apr 12 17:23 | Phase Research | |
| 14 | 1983bc8 | docs | Phase 4 UI design contract | Apr 12 17:25 | UI Specs | |
| 15 | 2329e15 | fix | Phase 4 UI-SPEC typography fix | Apr 12 17:28 | UI Specs | Fix-up of #14 |
| 16 | 3df98cb | docs | Phase 3 UI design contract | Apr 12 17:44 | UI Specs | |
| 17 | 47c0006 | docs | Phase 1 UI design contract | Apr 12 17:44 | UI Specs | |
| 18 | 1409288 | docs | Phase 2 UI design contract | Apr 12 17:45 | UI Specs | |
| 19 | 7649a74 | fix | Phase 1 UI-SPEC typography fix | Apr 12 17:48 | UI Specs | Fix-up of #17 |
| 20 | 7b69d01 | docs | Migrate architecture from Convex to on-chain + IPFS | Apr 12 17:50 | Architecture | Pivot moment |
| 21 | f5d122d | docs | Phase 4 plan | Apr 12 17:52 | Phase Plans | |
| 22 | cd3743f | config | Add .worktrees/ to gitignore | Apr 12 17:55 | Chore | |
| 23 | a57d6e4 | docs | Full-vision roadmap extension | Apr 12 17:58 | Architecture | |
| 24 | c58d672 | docs | Phase 1 plan | Apr 12 18:15 | Phase Plans | |
| 25 | fb99b09 | docs | Phase 2 plan | Apr 12 18:15 | Phase Plans | |
| 26 | 33fbe40 | docs | Phase 2 research questions resolved | Apr 12 18:18 | Phase Plans | |
| 27 | 9c7c177 | fix | Phase 1 plans revised (checker feedback) | Apr 12 18:29 | Plan Review | Fix-up |
| 28 | ee50119 | docs | Phase 3 plan | Apr 12 18:31 | Phase Plans | |
| 29 | 425fc81 | docs | Cross-AI review for phase 4 | Apr 12 18:36 | Plan Review | |
| 30 | 96b4556 | fix | Phase 3 plan revised (checker feedback) | Apr 12 18:40 | Plan Review | Fix-up |
| 31 | a088eef | docs | Cross-AI review for phase 2 | Apr 12 18:43 | Plan Review | |
| 32 | a77def4 | docs | Phase 1 planning completion recorded | Apr 12 18:43 | Plan Review | |
| 33 | 4fea61b | fix | Phase 4 plan revised (cross-AI review) | Apr 12 18:47 | Plan Review | Fix-up |
| 34 | 2ec4ec0 | docs | Cross-AI review for phase 3 | Apr 12 18:50 | Plan Review | |
| 35 | 7cfc6b4 | docs | Cross-AI review for phase 1 | Apr 12 18:53 | Plan Review | |
| 36 | 5857ffe | fix | Phase 4 plan revised (checker feedback) | Apr 12 18:56 | Plan Review | Fix-up |
| 37 | 85f7cd2 | fix | Phase 3 plan revised (cross-AI review) | Apr 12 18:58 | Plan Review | Fix-up |
| 38 | 03e7586 | docs | Phase 2 plans revised (cross-AI review) | Apr 12 18:58 | Plan Review | |
| 39 | a8c03f5 | docs | Add project foundation files | Apr 12 19:03 | Setup | |
| 40 | 194aea1 | docs | Move superpowers plans to superpower branch | Apr 12 19:03 | Chore | |
| 41 | 7e617bc | docs | Add audit skills toolkit | Apr 12 19:03 | Chore | |
| 42 | 6ebbd57 | chore | Merge PR #4 audit-skills-toolkit | Apr 12 19:06 | Chore | |
| 43 | 3752812 | fix | Phase 2 plans CLAUDE.md compliance | Apr 12 19:09 | Plan Review | as Type removal |
| 44 | ed5d70f | docs | GSD full 4-phase roadmap summary | Apr 12 19:15 | Planning Complete | Planning milestone |
| 45 | 8e7c5fd | chore | Merge: update with main | Apr 12 19:16 | Merge | |
| 46 | cdf60b3 | chore | Merge: resolve .planning conflicts | Apr 12 19:17 | Merge | |
| 47 | f832f7d | docs | Update README | Apr 12 19:18 | Docs | |
| 48 | 668848b | fix | Phase 2 compliance: requireHexString | Apr 12 19:20 | Plan Review | |
| 49 | d3b1072 | fix | Phase 2 compliance: Zod safeParse | Apr 12 19:26 | Plan Review | |
| 50 | d20d795 | docs | Phase 2 planning completion recorded | Apr 12 19:26 | Plan Review | |
| 51 | 6dabafe | docs | Update README | Apr 12 19:18 | Docs | Duplicate |
| 52 | 273e3d3 | docs | Phase 1 plans updated (cross-AI review) | Apr 12 19:25 | Plan Review | |
| 53 | d9312f7 | docs | Pre-implementation security audit | Apr 12 20:07 | Security Audit | |
| 54 | 3a475b5 | chore | Merge PR #5 security audit | Apr 12 20:22 | Merge | |
| 55 | d4298a6 | fix | Apply security addendum fixes | Apr 12 20:26 | Security Audit | |
| 56 | fac0bb4 | docs | Add audit docs to README | Apr 12 20:28 | Docs | |
| 57 | 7b8df5c | fix | Remove duplicate .worktrees/ files | Apr 12 20:32 | Chore | |
| 58 | 97f7e44 | chore | Merge: sync with main | Apr 12 21:19 | Merge | |
| 59 | d03d15a | config | Initialize Foundry project | Apr 12 23:05 | Phase 1 Exec | **Code starts here** |
| 60 | 862a532 | feature | IdentityRegistry + ReputationRegistry contracts | Apr 12 23:07 | Phase 1 Exec | Plan 01-01 |
| 61 | 36e87a8 | docs | Plan 01-01 execution summary | Apr 12 23:07 | Phase 1 Exec | |
| 62 | 8c2d797 | feature | Initial commit (app bootstrap) | Apr 12 23:08 | Phase 1 Exec | |
| 63 | 4cd1371 | feature | Next.js with Bun, shadcn/ui, security headers | Apr 12 23:09 | Phase 1 Exec | Plan 01-02 |
| 64 | 396bab7 | feature | Shared Zod schemas, constants, env validation | Apr 12 23:10 | Phase 1 Exec | Plan 01-02 |
| 65 | a8718b5 | feature | App shell with navbar, footer, proposals layout | Apr 12 23:11 | Phase 1 Exec | Plan 01-02 |
| 66 | d5b260e | docs | Plan 01-02 execution summary | Apr 12 23:12 | Phase 1 Exec | |
| 67 | 8eb8766 | feature | Chain client, contract ABIs, IPFS client | Apr 12 23:13 | Phase 1 Exec | Plan 01-03 |
| 68 | 3da7632 | feature | Proposal submission API route | Apr 12 23:13 | Phase 1 Exec | Plan 01-03 |
| 69 | 52b2e26 | feature | Proposal submission form with Zod validation | Apr 12 23:14 | Phase 1 Exec | Plan 01-03 |
| 70 | e586e7d | docs | Plan 01-03 execution summary | Apr 12 23:14 | Phase 1 Exec | |
| 71 | d6dde03 | feature | Proposal list and detail API routes | Apr 12 23:16 | Phase 1 Exec | Plan 01-04 |
| 72 | 91e4005 | feature | Proposal list page | Apr 12 23:17 | Phase 1 Exec | Plan 01-04 |
| 73 | a73d8fc | feature | Proposal detail page | Apr 12 23:18 | Phase 1 Exec | Plan 01-04 |
| 74 | 885fa80 | docs | Plan 01-04 execution summary | Apr 12 23:18 | Phase 1 Exec | |
| 75 | 148cd46 | docs | Phase 01 complete | Apr 12 23:19 | Phase 1 Exec | Phase milestone |
| 76 | 3e190d9 | feature | AI evaluation schemas, prompts, agents | Apr 12 23:23 | Phase 2 Exec | Plan 02-01 |
| 77 | a024007 | feature | Evaluation orchestrator, storage, SSE API | Apr 12 23:25 | Phase 2 Exec | Plan 02-02 |
| 78 | ec0b9d1 | feature | Evaluation UI with real-time progress | Apr 12 23:28 | Phase 2 Exec | Plan 02-03 |
| 79 | de46c27 | docs | Phase 02 execution summaries | Apr 12 23:28 | Phase 2 Exec | Phase milestone |
| 80 | 32ee939 | refactor | Switch from Vercel AI SDK to Mastra | Apr 12 23:53 | Pivot | Framework switch |
| 81 | 10da405 | feature | On-chain reputation history with API and UI | Apr 12 23:56 | Phase 3 Exec | Plan 03-01 |
| 82 | 5c3b8aa | docs | Update CLAUDE.md with Mastra stack | Apr 12 23:59 | Docs | |
| 83 | 4b0cd1e | chore | Merge: sync with main | Apr 12 23:59 | Merge | |
| 84 | 3785877 | fix | Phase 3: replace `as Type` with Zod | Apr 13 00:25 | Audit Fixes | Type safety |
| 85 | 413e534 | fix | Phase 3: extract event ABI, guard env vars | Apr 13 00:26 | Audit Fixes | |
| 86 | 627f4d9 | fix | Phase 3: status badge, time guard, satisfies | Apr 13 00:26 | Audit Fixes | |
| 87 | d536c61 | fix | Phase 4-high: as-cast to Zod parse | Apr 13 00:26 | Audit Fixes | |
| 88 | 5406b3d | fix | Phase 4-medium: extract IIFE, derive weights | Apr 13 00:27 | Audit Fixes | |
| 89 | d22d4e7 | fix | Phase 4-low: aria-hidden on radar chart | Apr 13 00:27 | Audit Fixes | |
| 90 | 38afdbe | fix | Critical: replace as-Type casts with Zod | Apr 13 00:27 | Audit Fixes | |
| 91 | 22be9ac | fix | High: server wallet, body-size, pagination | Apr 13 00:28 | Audit Fixes | |
| 92 | 8f48228 | fix | Medium: CID validation, env vars, rate limiting | Apr 13 00:28 | Audit Fixes | |
| 93 | 718aec5 | fix | Low: derive type, contract tests, skeleton | Apr 13 00:28 | Audit Fixes | |
| 94 | b7bbec0 | fix | Phase 2-critical: race condition, as-Type | Apr 13 00:31 | Audit Fixes | |
| 95 | 60671a9 | fix | Phase 2-high: input limits, SSE heartbeat | Apr 13 00:31 | Audit Fixes | |
| 96 | 5a36ee8 | fix | Phase 2-medium: dead code, API auth, sanitize | Apr 13 00:31 | Audit Fixes | |
| 97 | 8030ebb | fix | Phase 2-low: running status for pending dims | Apr 13 00:31 | Audit Fixes | |
| 98 | 485720d | feature | E2E testing suite + security fixes | Apr 13 01:01 | Testing | |
| 99 | 55d3c98 | refactor | Switch AI from Anthropic to OpenAI | Apr 13 01:11 | Pivot | Provider switch |
| 100 | 4e50a7f | fix | Align BDD steps with actual UI selectors | Apr 13 01:25 | Testing | |
| 101 | de27c20 | fix | Golden path: IPFS auth, score format, key | Apr 13 03:12 | Integration Fix | Critical fix |
| 102 | 616256e | config | Dockerfile and Cloud Run config | Apr 13 03:12 | Deploy | |
| 103 | ac62dda | fix | .env.production for build-time vars | Apr 13 03:58 | Deploy | |
| 104 | cc10368 | docs | Eval-core-review audit reports | Apr 13 04:14 | Audit | |
| 105 | a62ce16 | test | Harden E2E suite, eliminate false positives | Apr 13 04:17 | Testing | |
| 106 | 0481568 | feature | Upgrade judge model to GPT-5.4 | Apr 13 09:38 | Enhancement | |
| 107 | 6e4e0e1 | chore | Self-improvement lessons, build artifacts | Apr 13 09:40 | Chore | |
| 108 | d9233f3 | feature | Conversational chatbot for proposal discussion | Apr 13 13:06 | New Feature | Post-plan feature |
| 109 | 8da0a06 | feature | GSD framework badge in nav | Apr 13 13:32 | UI | |
| 110 | 3356d91 | fix | proposalContext body capture in chat | Apr 13 13:34 | Chat Fixes | |
| 111 | 838a1ca | fix | Accept all UI message part types in chat | Apr 13 13:49 | Chat Fixes | |
| 112 | 902095d | feature | Colosseum Copilot competitive intelligence | Apr 13 14:07 | New Feature | Post-plan feature |
| 113 | 652efa1 | test | Fix bun test, rewrite component tests | Apr 13 15:11 | Testing | |
| 114 | 7ae291f | fix | /api/health endpoint for Cloud Run | Apr 13 22:19 | Deploy Fix | |
| 115 | ee8c4b8 | fix | Dynamic import for colosseum client | Apr 13 22:19 | Deploy Fix | |
| 116 | d082e03 | feature | Client-side error tracking | Apr 13 22:20 | Enhancement | |
| 117 | ed5728d | fix | router.push for proposal card navigation | Apr 13 22:22 | UI Fix | |
| 118 | 17af671 | feature | 60s in-memory cache for proposals API | Apr 13 22:23 | Enhancement | |
| 119 | 1d0783e | feature | Testnet banner to proposals page | Apr 13 22:23 | UI | |

## Iteration Cycles

### Work Unit 1: GSD Initialization & Research (commits 1-9)
- **Commits:** 9 | **Duration:** ~1.5 hrs | **Fixes:** 0
- GSD framework produced PROJECT.md, REQUIREMENTS.md (26 requirements), ROADMAP.md (4 phases)
- Smooth execution, no rework needed

### Work Unit 2: Phase Research & UI Specs (commits 10-19)
- **Commits:** 10 | **Duration:** ~25 min | **Fixes:** 2 (typography corrections to UI-SPEC)
- **Fix ratio:** 20%
- All 4 phases got RESEARCH.md + UI-SPEC.md simultaneously before any planning

### Work Unit 3: Phase Planning & Cross-AI Review (commits 20-52)
- **Commits:** 33 | **Duration:** ~2.5 hrs | **Fixes:** 12 (plan revisions from checker/cross-AI feedback)
- **Fix ratio:** 36%
- Plans underwent iterative review cycles — each phase plan was revised 2-3 times
- Architecture pivot: Convex DB abandoned in favor of on-chain + IPFS (commit 20)
- CLAUDE.md compliance fixes drove multiple plan revisions (as Type removal in planning docs)
- This unit represents the **most overhead** — 33 commits for planning documents alone

### Work Unit 4: Security Audit (commits 53-55)
- **Commits:** 3 | **Duration:** ~25 min | **Fixes:** 1 (security addendum)
- Pre-implementation security audit generated 37 security requirements (SEC-01 through SEC-37)

### Work Unit 5: Phase 1 Execution — Foundation & Proposals (commits 59-75)
- **Commits:** 17 | **Duration:** ~14 min (23:05-23:19) | **Fixes:** 0
- **Fix ratio:** 0% — cleanest execution phase
- 4 plans executed in sequence, each with 2-4 feature commits + 1 summary commit
- Smart contracts (Foundry), Next.js bootstrap, proposal submission, proposal browsing all done

### Work Unit 6: Phase 2 Execution — AI Evaluation Pipeline (commits 76-79)
- **Commits:** 4 | **Duration:** ~5 min (23:23-23:28) | **Fixes:** 0
- Evaluation schemas, orchestrator, UI all built rapidly
- Used Vercel AI SDK directly (not Mastra as planned)

### Work Unit 7: Mastra Refactor & Phase 3 (commits 80-83)
- **Commits:** 4 | **Duration:** ~7 min | **Fixes:** 0
- Framework switch from Vercel AI SDK to Mastra (the originally planned framework)
- Phase 3 (reputation history) built in a single commit

### Work Unit 8: Post-Execution Audit Fixes (commits 84-97)
- **Commits:** 14 | **Duration:** ~6 min (00:25-00:31) | **Fixes:** 14
- **Fix ratio:** 100% — entirely remediation
- Addressed type safety (as-Type casts), race conditions, missing validation, dead code
- Organized by severity: critical, high, medium, low across phases 2, 3, 4
- This burst suggests the fast execution (Work Units 5-7) shipped code with known deficiencies

### Work Unit 9: E2E Testing & Provider Switch (commits 98-100)
- **Commits:** 3 | **Duration:** ~14 min | **Fixes:** 1
- BDD test suite added, then selectors had to be realigned to actual UI

### Work Unit 10: Golden Path Integration (commit 101)
- **Commits:** 1 | **Fixes:** 1
- Critical fix: IPFS gateway auth, score format, private key handling — the "make it actually work" commit

### Work Unit 11: Deployment (commits 102-103)
- **Commits:** 2 | **Fixes:** 1
- Dockerfile added, then .env.production fix needed for build-time vars

### Work Unit 12: Post-Launch Features & Fixes (commits 106-119)
- **Commits:** 14 | **Duration:** spread over ~13 hrs | **Fixes:** 6
- **Fix ratio:** 43%
- New features added outside original plan: chatbot, Colosseum Copilot, error tracking
- Each new feature required 1-2 follow-up fixes

## Bug Discovery & Fix Timeline

| Bug | Introduced | Fix Commit | Gap | How Caught | Severity |
|-----|-----------|------------|-----|-----------|----------|
| UI-SPEC typography errors | 1983bc8 (#14) | 2329e15 (#15) | 1 commit | Manual review | Low |
| UI-SPEC typography weights | 47c0006 (#17) | 7649a74 (#19) | 2 commits | Manual review | Low |
| `as Type` casts in plans | Multiple | 3752812 (#43) | ~10 commits | CLAUDE.md compliance check | Medium |
| `as Type` casts in phase 3 code | 10da405 (#81) | 3785877 (#84) | 3 commits | Audit | High |
| Missing event ABI guard | 10da405 (#81) | 413e534 (#85) | 4 commits | Audit | Medium |
| `as Type` casts in phase 4 code | ec0b9d1 (#78) | d536c61 (#87) | 9 commits | Audit | High |
| Race condition in eval counter | a024007 (#77) | b7bbec0 (#94) | 17 commits | Audit | Critical |
| Missing SSE heartbeat/timeout | a024007 (#77) | 60671a9 (#95) | 18 commits | Audit | High |
| Dead code in eval pipeline | a024007 (#77) | 5a36ee8 (#96) | 19 commits | Audit | Medium |
| BDD selectors mismatch | 485720d (#98) | 4e50a7f (#100) | 2 commits | E2E test failure | Medium |
| IPFS gateway auth missing | 8eb8766 (#67) | de27c20 (#101) | 34 commits | Manual testing | Critical |
| .env.production missing | 616256e (#102) | ac62dda (#103) | 1 commit | Build failure | Medium |
| Chat body capture broken | d9233f3 (#108) | 3356d91 (#110) | 2 commits | Manual testing | Medium |
| Chat message types wrong | d9233f3 (#108) | 838a1ca (#111) | 3 commits | Manual testing | Medium |
| Health endpoint missing | 616256e (#102) | 7ae291f (#114) | 12 commits | Cloud Run deploy | High |
| Colosseum dynamic import | 902095d (#112) | ee8c4b8 (#115) | 3 commits | Build failure | High |
| Proposal card navigation | a73d8fc (#73) | ed5728d (#117) | 44 commits | Manual testing | Medium |

## Framework Planning Artifacts

### Inventory

| File | Lines | Purpose |
|------|-------|---------|
| PROJECT.md | 96 | Project definition and context |
| REQUIREMENTS.md | 163 | 26 v1 requirements + 37 security requirements |
| ROADMAP.md | 102 | 4-phase plan with success criteria |
| ROADMAP-FULL-VISION.md | ~300 | Extended vision document |
| STATE.md | 80 | Current progress tracker |
| config.json | ~30 | GSD configuration |
| research/ARCHITECTURE.md | ~200 | Architecture research |
| research/FEATURES.md | ~200 | Feature research |
| research/PITFALLS.md | ~200 | Pitfalls research |
| research/STACK.md | ~200 | Stack research |
| research/SUMMARY.md | ~200 | Research summary |
| 4x RESEARCH.md | ~800 | Per-phase research |
| 4x UI-SPEC.md | ~800 | Per-phase UI design contracts |
| 4x REVIEWS.md | ~800 | Cross-AI review feedback |
| 9x PLAN.md | ~2700 | Detailed implementation plans |
| 8x SUMMARY.md | ~400 | Execution summaries |

**Totals:**
- **39 planning files**
- **~9,900 lines of planning documentation**
- **6,940 lines of application code** (TypeScript/TSX)
- **Planning-to-code ratio: 1.43:1** (more planning docs than code)

### Plan-vs-Reality Assessment

| Aspect | Planned | Actual | Match? |
|--------|---------|--------|--------|
| AI Framework | Mastra from the start | Built with Vercel AI SDK first, refactored to Mastra later | Partial |
| AI Provider | Anthropic (Claude) | Started Anthropic, switched to OpenAI | No |
| Storage | On-chain + IPFS | On-chain + IPFS | Yes |
| Phases | 4 sequential | 3 executed + fixes, phase 4 done inline | Mostly |
| Smart Contracts | IdentityRegistry + ReputationRegistry | Both built as planned | Yes |
| UI Components | Detailed in UI-SPEC | Built, but specs not directly referenced | Unclear |
| Security Requirements | 37 SEC-* requirements | Partially addressed in audit fix wave | Partial |
| Chatbot feature | Not planned | Added post-execution | No (scope creep) |
| Colosseum integration | Not planned | Added post-execution | No (scope creep) |

### Planning Value Assessment

**High value:**
- REQUIREMENTS.md provided clear traceability (26 requirements mapped to phases)
- ROADMAP.md success criteria made phase completion measurable
- Research documents caught the Convex-to-IPFS pivot before code was written

**Low value:**
- UI-SPEC documents (4 files, ~800 lines) — unclear if they were referenced during implementation
- Cross-AI review cycles (12 commits of plan revision) — many revisions were about `as Type` compliance rather than architectural improvements
- STATE.md progress tracking — lagged behind actual execution and showed 44% when all phases were done

**Overhead concern:**
- 57 planning commits before first line of code (48% of total)
- Planning phase lasted ~7 hours (16:01 to 23:05) while implementation took ~4 hours
- The framework's "discuss → research → plan → review → execute" pipeline created thorough documentation but significant ceremony

## Velocity Analysis

### Commit Distribution by Time

```
Apr 12 16:00-17:00  |████          | 4 commits   (GSD init)
Apr 12 17:00-18:00  |████████████  | 14 commits  (research + UI specs)
Apr 12 18:00-19:00  |██████████████| 16 commits  (plans + reviews — peak planning)
Apr 12 19:00-20:00  |██████        | 8 commits   (plan fixes + compliance)
Apr 12 20:00-21:00  |████          | 5 commits   (security audit)
Apr 12 21:00-22:00  |█             | 1 commit    (merge)
Apr 12 22:00-23:00  |              | 0 commits   (gap)
Apr 12 23:00-00:00  |██████████████████████████| 25 commits (BURST: phases 1-3)
Apr 13 00:00-01:00  |████████████████| 16 commits (audit fixes + E2E)
Apr 13 01:00-02:00  |██            | 2 commits   (provider switch + BDD fix)
Apr 13 02:00-04:00  |████          | 4 commits   (golden path + deploy)
Apr 13 04:00-05:00  |██            | 2 commits   (audit + E2E hardening)
Apr 13 09:00-10:00  |██            | 2 commits   (model upgrade)
Apr 13 13:00-15:00  |██████        | 5 commits   (chatbot + Colosseum)
Apr 13 15:00-16:00  |█             | 1 commit    (test rewrite)
Apr 13 22:00-23:00  |██████        | 6 commits   (deploy fixes + polish)
```

### Key Velocity Patterns

1. **Massive burst at 23:00-00:00**: 25 commits in 1 hour — all of phases 1-3 implemented. This was the fastest execution period, averaging one commit every 2.4 minutes.

2. **Immediate remediation wave at 00:00-01:00**: 16 commits in 1 hour fixing issues from the burst. The fast execution traded quality for speed.

3. **Long tail**: 14 commits spread over 22 hours (01:00 to 22:23 next day) for features, fixes, and deployment — classic "last 20% takes 80% of the time" pattern.

### Per-Phase Metrics

| Phase | Feature Commits | Fix Commits | Fix Ratio | Duration |
|-------|----------------|-------------|-----------|----------|
| Phase 1 | 13 | 0 | 0% | 14 min |
| Phase 2 | 3 | 0 (immediate); 4 (later) | 57% total | 5 min + fixes |
| Phase 3 | 1 | 3 | 75% | 3 min + fixes |
| Post-plan features | 7 | 6 | 46% | ~13 hrs |

## Pivot Moments

### Pivot 1: Convex DB to On-Chain + IPFS (commit 7b69d01)
- **When:** During planning, before any code
- **Trigger:** Architecture alignment with project values (transparency, decentralization)
- **Impact:** Good — caught during research phase, zero rework cost
- **GSD value:** HIGH — the research phase successfully surfaced this decision early

### Pivot 2: Vercel AI SDK to Mastra (commit 32ee939)
- **When:** After Phase 2 was fully built with Vercel AI SDK
- **Trigger:** Original plan called for Mastra; implementation deviated; refactored to align
- **Impact:** One refactor commit, but raises questions about plan adherence during execution
- **GSD value:** MIXED — the plan was correct, but execution didn't follow it initially

### Pivot 3: Anthropic to OpenAI (commit 55d3c98)
- **When:** After E2E testing, before deployment
- **Trigger:** Alignment with superpower worktree env vars; practical provider choice
- **Impact:** Required code changes but straightforward
- **GSD value:** LOW — this wasn't captured in planning at all

### Pivot 4: Post-plan feature additions (commits 108, 112)
- **When:** After all planned phases were complete
- **Trigger:** Demo preparation, competitive intelligence needs
- **Impact:** Chatbot and Colosseum integration added without planning artifacts
- **GSD value:** N/A — bypassed the framework entirely for these features

## Key Metrics Summary

| Metric | Value |
|--------|-------|
| Total commits | 119 |
| Feature commits | 29 (24%) |
| Fix commits | 33 (28%) |
| Docs/planning commits | 42 (35%) |
| Config/chore/merge commits | 15 (13%) |
| Fix ratio (fix / feature+fix) | 53% |
| Planning files created | 39 |
| Planning lines written | ~9,900 |
| Application code lines | 6,940 |
| Planning-to-code ratio | 1.43:1 |
| Phases planned | 4 |
| Phases executed | 3 (+ phase 4 work inline) |
| Requirements defined | 26 functional + 37 security |
| Bugs found post-implementation | 17 |
| Average fix gap (commits) | 10.4 commits |
| Longest fix gap | 44 commits (proposal card navigation) |
| Planning duration | ~7 hours |
| Implementation duration (burst) | ~1 hour |
| Total development time | ~30 hours (including gaps) |
| Post-plan features (unplanned) | 4 (chatbot, Colosseum, error tracking, caching) |

### Notable Observations

1. **Planning-heavy, execution-light**: The GSD framework produced 1.43x more planning documentation than application code. Planning took 7 hours; core implementation took 1 hour.

2. **Burst-then-fix pattern**: All 3 phases were built in a 1-hour burst (23:05-00:00), immediately followed by 14 audit fix commits. The fast execution was possible because detailed plans existed, but the code quality required significant post-hoc remediation.

3. **Type safety was the dominant bug class**: The majority of fixes addressed `as Type` casts and missing Zod validation — ironic given that the CLAUDE.md explicitly forbids these patterns and the planning documents were themselves revised to remove them.

4. **Framework bypassed for late features**: The chatbot and Colosseum integration were added without GSD planning artifacts, suggesting the framework's ceremony was perceived as too heavy for smaller additions.

5. **Cross-AI review had diminishing returns**: Plan review cycles consumed 12 commits but primarily caught `as Type` violations in planning docs rather than architectural issues. The one genuine architectural catch (Convex to IPFS) happened during research, not review.
