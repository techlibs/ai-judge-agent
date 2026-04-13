# Pitfalls Research

**Domain:** AI Judge System with Convex backend and on-chain reputation (ERC-8004)
**Researched:** 2026-04-12
**Confidence:** HIGH (LLM-as-judge domain well-studied; Convex patterns verified; ERC-8004 is live standard)

## Critical Pitfalls

### Pitfall 1: Score Drift from Naive Prompts

**What goes wrong:**
The same grant proposal evaluated twice produces significantly different scores (e.g., 72 vs 58). Without structured rubrics and anchored scoring criteria, LLM judges exhibit high variance. Research shows 93% of teams struggle with LLM judge implementation. LLMs without careful prompt design produce scores that cluster around training-data-biased ranges (typically 60-80) rather than utilizing the full 0-100 scale.

**Why it happens:**
LLMs default to "generous grading" patterns from their training data. Without explicit scoring anchors (what does a 30 look like vs a 70?), the model interprets the scale differently each run. Temperature > 0 amplifies this. Vague rubric language like "evaluate the technical feasibility" gives the model too much interpretive freedom.

**How to avoid:**
- Use temperature 0 for all judge evaluations (deterministic output).
- Define explicit scoring bands with examples: "0-20: No technical plan. 21-40: Vague technical approach. 41-60: Clear approach with gaps. 61-80: Solid plan with minor concerns. 81-100: Exceptional, detailed, proven approach."
- Use Mastra `agent.generate({ structuredOutput })` (backed by Vercel AI SDK) to force consistent output shape via Zod schemas.
- Include 1-2 "anchor examples" in the system prompt showing a scored proposal at different quality levels.
- Run the same proposal 3 times during development and compare scores. Variance > 5 points means the prompt needs tightening.

**Warning signs:**
- Scores cluster in a narrow band (everything is 65-75).
- Justification text is generic and could apply to any proposal.
- Re-running the same proposal gives different scores.

**Phase to address:**
Phase 1 (Core AI evaluation) -- prompt engineering is foundational. The before/after prompt comparison (listed in requirements) directly demonstrates this pitfall.

---

### Pitfall 2: Convex Action Timeout on Parallel LLM Calls

**What goes wrong:**
Running 4 independent judge agents sequentially in a single Convex action risks approaching the 10-minute timeout, especially if OpenAI has latency spikes (p99 can exceed 30s per call). If any call fails at minute 8, the entire evaluation is lost with no partial results saved.

**Why it happens:**
Developers naturally write a single action that calls OpenAI 4 times in sequence, saves results, and returns. This is the simplest pattern but ignores that Convex actions cannot be automatically retried (they have side effects) and that a single timeout kills all progress.

**How to avoid:**
- Split evaluation into 5 Convex actions: 1 orchestrator mutation + 4 independent judge actions (one per dimension).
- The orchestrator mutation creates an evaluation record with status "pending", then schedules 4 judge actions via `ctx.scheduler.runAfter(0, ...)`.
- Each judge action calls OpenAI once, then calls a mutation to save its result and check if all 4 are complete.
- When the 4th judge mutation fires, it computes the aggregate score (S0) and marks evaluation as "complete".
- Each individual action has a comfortable timeout budget (10 min for one OpenAI call is very safe).
- Use the Convex ActionRetrier component for automatic retry with exponential backoff on transient failures.

**Warning signs:**
- Evaluation takes > 60 seconds end-to-end in development.
- Occasional "function timeout" errors in Convex logs.
- Partial evaluation states that never resolve.

**Phase to address:**
Phase 1 (Core evaluation pipeline) -- the action architecture must be fan-out from the start. Retrofitting is painful.

---

### Pitfall 3: Structured Output Schema Mismatch Crashes Pipeline

**What goes wrong:**
OpenAI Structured Outputs guarantees JSON schema compliance at ~99.7%, but the 0.3% edge case (deeply nested optional fields) plus network errors, rate limits (429), and model errors (500) means the action will occasionally receive malformed or no response. If the code assumes the happy path, the evaluation pipeline crashes silently or throws unhandled errors.

**Why it happens:**
Developers trust the "100% reliable" marketing of Structured Outputs and skip validation. OpenAI returns 429 (rate limit) or 500 (server error) responses that are not valid JSON at all. The Convex action catches no error, the mutation never fires, and the evaluation hangs in "pending" forever.

**How to avoid:**
- Always validate OpenAI responses with Zod before passing to mutations. The project already mandates Zod at boundaries -- enforce it here.
- Define a Zod schema for structured output via Mastra's `agent.generate({ structuredOutput })`. Parse with `schema.safeParse()`, not `schema.parse()`.
- On validation failure, save a structured error to the evaluation record (status: "error", error message, dimension that failed).
- Classify errors: 429/5xx = retryable (use ActionRetrier), 4xx = log and fail, validation error = log the raw response for debugging.
- Set explicit timeouts on the Mastra agent call (30s for a single evaluation call).

**Warning signs:**
- Evaluations stuck in "pending" status with no error logged.
- Console errors about unexpected JSON shapes.
- Intermittent failures that "work when you retry manually."

**Phase to address:**
Phase 1 (AI evaluation) -- Zod validation must wrap every OpenAI call from day one.

---

### Pitfall 4: ERC-8004 Scope Creep Derails the 3-Hour Timeline

**What goes wrong:**
The team attempts to implement full ERC-8004 compliance (Identity Registry + Reputation Registry + Validation Registry) and gets stuck on Solidity tooling, testnet faucets, gas estimation, and contract deployment -- burning 1-2 hours that should have gone to the core AI evaluation pipeline.

**Why it happens:**
ERC-8004 is a real, live standard (mainnet since Jan 2026) with three registries. The reference architecture document describes the full vision. It is tempting to "do it right" and implement all three registries. But the Validation Registry specification is not finalized, and deploying even a minimal Solidity contract with Foundry involves environment setup, compilation, testing, and deployment that consumes disproportionate time.

**How to avoid:**
- Phase the on-chain work strictly: Phase 1 = typed TypeScript interfaces for ERC-8004 data structures stored in Convex (no actual contracts). Phase 2 (or a later session) = actual Solidity deployment.
- Store evaluation hashes in Convex with a "chain_ready" flag. The data structure matches what would go on-chain, but the actual transaction is deferred.
- If time permits, deploy a single minimal contract (Identity Registry only, which is just ERC-721 with URIStorage). Skip Reputation and Validation registries for MVP.
- Use Convex as the source of truth. On-chain is proof/attestation, not the primary datastore.

**Warning signs:**
- More than 30 minutes spent on Foundry/Solidity setup.
- Debugging testnet faucet or gas issues.
- No working AI evaluation after 1.5 hours.

**Phase to address:**
Phase 2 or later -- on-chain integration should be a separate phase after the core AI pipeline works end-to-end.

---

### Pitfall 5: Cross-Contaminated Judge Scores

**What goes wrong:**
Judge agents that share context or see each other's scores produce correlated results rather than independent assessments. A low Technical Feasibility score biases the Impact Potential judge, defeating the purpose of multi-dimensional evaluation.

**Why it happens:**
To save tokens or simplify the code, developers pass the full proposal context (including other judges' outputs) to each judge. Or they run judges sequentially and include prior results in the conversation. The reference architecture explicitly requires independent evaluation, but implementation shortcuts violate this.

**How to avoid:**
- Each judge action receives ONLY: the proposal data + its specific dimension rubric + IPE City values context. Nothing about other dimensions.
- Never pass one judge's output as input to another judge.
- The aggregate score (S0) is computed purely mathematically from the 4 independent scores: `S0 = 0.25*tech + 0.30*impact + 0.20*cost + 0.25*team`.
- Use separate OpenAI API calls (not a multi-turn conversation) for each judge.

**Warning signs:**
- All 4 dimension scores are suspiciously similar (e.g., 72, 74, 71, 73).
- Judge justifications reference concerns from other dimensions.
- Changing one dimension's rubric affects scores in other dimensions.

**Phase to address:**
Phase 1 (AI evaluation architecture) -- the fan-out pattern naturally enforces independence if each action is truly isolated.

---

### Pitfall 6: Evaluation Justifications Are Useless

**What goes wrong:**
The LLM produces scores with justifications like "The project has strong technical feasibility because the team appears capable" -- generic text that does not reference specific proposal content. This undermines the transparency goal and makes evaluations indistinguishable.

**Why it happens:**
The prompt asks for a justification but does not specify what a good justification contains. The model defaults to vague, positive-sounding language. Without explicit instructions to cite specific proposal elements, the LLM summarizes rather than analyzes.

**How to avoid:**
- Require the structured output to include `key_findings` (max 3) that must quote or directly reference specific parts of the proposal.
- Add to the prompt: "Your justification MUST reference specific claims, numbers, or details from the proposal. Generic statements like 'the team is strong' without citing evidence are not acceptable."
- In the JSON schema, make `key_findings` an array of objects with `claim` (what the proposal says) and `assessment` (your analysis of it) fields.
- Review 3-5 evaluation outputs during development -- if you cannot tell which proposal was being evaluated from the justification alone, the prompt needs work.

**Warning signs:**
- Justifications are interchangeable between proposals.
- No specific numbers, names, or technical details appear in the justification.
- Key findings are generic categories rather than specific observations.

**Phase to address:**
Phase 1 (prompt engineering) -- bake this into the structured output schema from the start.

---

### Pitfall 7: Convex Mutation Conflicts in Fan-Out Pattern

**What goes wrong:**
When 4 judge actions complete near-simultaneously and each calls a mutation to save results + check completion, Convex's OCC (Optimistic Concurrency Control) causes write conflicts. Mutations retry automatically, but if they all read/write the same evaluation document, retries cascade and cause visible latency.

**Why it happens:**
Convex mutations are transactional. If two mutations read the same document and both try to write, one succeeds and the other retries. With 4 judges completing within milliseconds of each other, this is likely.

**How to avoid:**
- Store each judge's result in a separate document (one per dimension per evaluation), not as fields on a single evaluation document.
- Use a separate "completion check" mutation that reads the 4 result documents and writes the aggregate only when all 4 exist.
- Alternatively, have each judge mutation write its own result document and schedule the aggregation mutation. The aggregation mutation checks if all 4 results exist before computing S0.
- Index the results table on `(evaluationId, dimension)` for efficient lookups.

**Warning signs:**
- Convex dashboard shows high mutation retry rates.
- Evaluations occasionally take much longer than expected.
- "Too many retries" errors in logs.

**Phase to address:**
Phase 1 (database schema design) -- the schema must accommodate independent writes from the start.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hardcoded scoring weights (0.25/0.30/0.20/0.25) | Fast to implement | Cannot A/B test different weight schemes | MVP only -- extract to config by v2 |
| Single model for all judges | Simpler config | Cannot optimize per-dimension (cost vs quality) | MVP -- all judges use Claude Sonnet via Mastra |
| No evaluation versioning | Less schema complexity | Cannot compare old vs new prompt versions | MVP only -- add version field in Phase 2 |
| Storing full LLM response in Convex | Easy debugging | Document size grows, wasted storage | Acceptable in MVP -- trim to structured fields later |
| Skip rate limiting on submission | Fewer moving parts | Someone submits 100 proposals and burns your OpenAI budget | Only if submissions are not public-facing yet |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Mastra/AI SDK Structured Output | Using raw JSON parsing instead of `agent.generate({ structuredOutput })` | Use Mastra's structured output with Zod schemas for guaranteed valid output. |
| API Key in Convex | Hardcoding API key in action code | Use Convex environment variables (`process.env.ANTHROPIC_API_KEY` in actions). Never commit keys. |
| Convex Scheduler | Using `ctx.scheduler.runAfter` in an action | Schedulers are only available in mutations, not actions. To schedule from an action, first call a mutation via `ctx.runMutation` then schedule from there. |
| Convex + Mastra/AI SDK | Importing Mastra or AI SDK in a query/mutation | Mastra/AI SDK (and any Node API) can only be used in actions, not queries or mutations. Mutations run in Convex's V8 runtime without Node APIs. |
| ERC-8004 Identity Registry | Implementing custom NFT logic | Use OpenZeppelin's ERC-721 with URIStorage extension -- this is exactly what ERC-8004 Identity Registry is built on. |
| Foundry + Sepolia | Deploying without sufficient testnet ETH | Use Base Sepolia instead of Sepolia -- faucets are more reliable and gas is cheaper. Or defer deployment entirely. |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Sequential LLM calls in single action | 4x latency, timeout risk | Fan-out to parallel actions | Immediately (40-120s vs 10-30s) |
| Loading all evaluations to compute list view | Slow page load as evaluations grow | Use Convex indexes and pagination | ~100 evaluations |
| Storing raw LLM responses as large strings | Slow document reads, approaching 1 MiB limit | Store structured fields only, raw response in separate document if needed | ~50 evaluations per proposal |
| No index on `evaluations` by status | Full table scan on filtered queries | Add index on `(status)` and `(proposalId, status)` | ~500 documents |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Exposing Anthropic API key to client | Key theft, budget drain | Only use in Convex actions (server-side). Never pass to frontend. |
| No input sanitization on proposals | Prompt injection -- attacker crafts proposal text that manipulates judge scoring | Sanitize/truncate proposal text before including in LLM prompt. Set max lengths per field. |
| Trusting client-submitted scores | Fake evaluations in the system | All scoring happens server-side in Convex actions. Client only submits proposals and reads results. |
| Public mutations for evaluation triggers | Anyone can trigger expensive OpenAI calls | Use `internalAction`/`internalMutation` for the evaluation pipeline. Only expose a public `submitProposal` mutation that validates input. |
| On-chain private key in environment | Key compromise means contract ownership lost | Use a dedicated deployer wallet with minimal funds. For MVP testnet, this is low risk but establish the pattern. |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No loading state during evaluation | User submits proposal, sees nothing for 30+ seconds, resubmits | Show "Evaluating..." with per-dimension progress (use Convex subscriptions for real-time updates as each judge completes) |
| Showing only aggregate score | Users do not understand why their score is what it is | Show per-dimension breakdown with justifications prominently. The aggregate is the summary, not the story. |
| No explanation of scoring methodology | Users distrust "black box" AI scores | Display the rubric, weights, and IPE City values on the evaluation page. Transparency is a core project value. |
| Wall of text justifications | Users do not read long AI-generated paragraphs | Use the key_findings (max 3) as the primary display. Full justification available on expand/click. |
| No way to compare proposals | Evaluators cannot see relative ranking | Provide a sortable proposal list with score columns per dimension |

## "Looks Done But Isn't" Checklist

- [ ] **AI Evaluation:** Scores look reasonable on 2-3 test proposals -- verify with an intentionally BAD proposal (should score < 30) and a clearly EXCELLENT one (should score > 85). If both score 55-75, the rubric is broken.
- [ ] **Structured Output:** JSON parses correctly -- verify Zod validation catches a malformed response (test with a mock invalid response).
- [ ] **Fan-out Pattern:** All 4 judges complete -- verify behavior when 1 judge fails (should mark evaluation as partial/error, not hang).
- [ ] **Real-time Updates:** UI shows evaluation progress -- verify it works when navigating away and back (Convex subscription should reconnect).
- [ ] **Proposal Submission:** Form validates input -- verify max length enforcement on all text fields (prevent prompt injection via massive input).
- [ ] **ERC-8004 Types:** TypeScript interfaces match the standard -- verify against the actual EIP-8004 specification, not just the reference architecture doc.
- [ ] **Aggregate Score:** Weighted calculation is correct -- verify 0.25 + 0.30 + 0.20 + 0.25 = 1.0 and test with known inputs.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Score drift (inconsistent scoring) | LOW | Tighten prompt rubric, re-run evaluations. No schema changes needed. |
| Action timeout on sequential calls | MEDIUM | Refactor to fan-out pattern. Requires new actions and mutations but no schema change if results are already separate documents. |
| Structured output crash | LOW | Add Zod validation wrapper. Single file change per judge action. |
| ERC-8004 scope creep | LOW | Cut the on-chain phase entirely. Convex-stored typed interfaces are sufficient for MVP. |
| Cross-contaminated scores | MEDIUM | Verify action isolation. May require refactoring if judges share state. |
| Generic justifications | LOW | Prompt-only fix. Update system prompts with specificity requirements. |
| Mutation conflicts | MEDIUM | Schema refactor to separate result documents per dimension. Migration needed if using single-document pattern. |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Score drift from naive prompts | Phase 1 (Prompt Engineering) | Run same proposal 3x, variance < 5 points |
| Action timeout on sequential calls | Phase 1 (Evaluation Architecture) | All 4 judges complete in < 30s total |
| Structured output schema mismatch | Phase 1 (AI Integration) | Zod validation on every OpenAI response; error state saved on failure |
| ERC-8004 scope creep | Phase 2+ (On-chain) | Core evaluation works end-to-end before any Solidity code |
| Cross-contaminated scores | Phase 1 (Action Design) | Each judge action receives only its dimension rubric; no shared state |
| Useless justifications | Phase 1 (Prompt Engineering) | Justifications cite specific proposal content; distinguishable between proposals |
| Convex mutation conflicts | Phase 1 (Schema Design) | Separate result documents per dimension; no write conflicts in fan-out |

## Sources

- [LLM-as-a-Judge: Complete Guide (Evidently AI)](https://www.evidentlyai.com/llm-guide/llm-as-a-judge) -- comprehensive overview of bias types and mitigation
- [LLMs-as-Judges: Comprehensive Survey (arXiv)](https://arxiv.org/html/2412.05579v2) -- academic survey on LLM evaluation methods
- [Grading Scale Impact on LLM-as-a-Judge (arXiv)](https://arxiv.org/html/2601.03444v1) -- research showing 0-5 scales align better with humans than 0-100
- [Evaluating Scoring Bias in LLM-as-a-Judge (arXiv)](https://arxiv.org/html/2506.22316v1) -- scoring bias under prompt perturbations
- [LLM-as-Judge Best Practices (Monte Carlo Data)](https://www.montecarlodata.com/blog-llm-as-judge/) -- 7 practical implementation templates
- [Convex Limits Documentation](https://docs.convex.dev/production/state/limits) -- official timeout and transaction limits
- [Convex Error Handling](https://docs.convex.dev/functions/error-handling/) -- action error handling patterns
- [Automatically Retry Actions (Convex Stack)](https://stack.convex.dev/retry-actions) -- ActionRetrier component and idempotency patterns
- [Convex Actions Documentation](https://docs.convex.dev/functions/actions) -- action runtime constraints
- [ERC-8004: Trustless Agents (EIP)](https://eips.ethereum.org/EIPS/eip-8004) -- official standard specification
- [ERC-8004 Developer Guide (QuickNode)](https://blog.quicknode.com/erc-8004-a-developers-guide-to-trustless-ai-agent-identity/) -- implementation guide with registry details
- [OpenAI Structured Outputs](https://platform.openai.com/docs/guides/structured-outputs) -- official docs on JSON schema mode
- [OpenAI Error Codes](https://platform.openai.com/docs/guides/error-codes) -- error classification for retry logic

---
*Pitfalls research for: AI Judge System (Convex + OpenAI + ERC-8004)*
*Researched: 2026-04-12*
