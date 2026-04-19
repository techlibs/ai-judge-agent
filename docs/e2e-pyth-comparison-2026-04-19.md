# Cross-Worktree E2E Comparison — Pyth LTIPP Proposal

**Date**: 2026-04-19
**Test fixture**: `test-fixtures/real-grants/grant-02-pyth-ltipp.md` (real Arbitrum LTIPP grant; 1M ARB requested, ~66k ARB actually spent — ~93% under-spend after Dencun)

## Services tested

| Worktree | URL | Status |
|---|---|---|
| GSD (full-vision-roadmap) | agent-reviewer-gsd-1010906320334.us-central1.run.app | Live |
| Spec Kit | agent-reviewer-speckit-1010906320334.us-central1.run.app | Live |
| Superpowers | agent-reviewer-superpower-1010906320334.us-central1.run.app | Live |

All three respond at `/` with live HTML. The three images currently serving are from pre-fix deploys; the latest Cloud Run deploy pipeline is blocked on missing GCP Secret Manager IAM (see Pipeline section).

## Routing and IA differences

| Concern | GSD | Spec Kit | Superpowers |
|---|---|---|---|
| Submit URL | `/proposals/new` | `/grants/submit` | `/grants/submit` |
| List URL | `/proposals` | `/grants` | `/grants` |
| Operator/dashboard | not in nav | `/dashboard/operator` | not in nav |
| Terminology | "proposals" | "grants" | "grants" |
| Home CTAs | 1 (Submit) | 3 (Submit / View / Dashboard) | 2 (Submit / View) |

Each carries a distinct brand mark: GSD shows a green `GSD` badge; Spec Kit a blue `Spec Kit` badge; Superpowers an "AI-Evaluated, On-Chain Verified" tagline.

## Submit UX — all three converged on hybrid chat + form

All three default to **Chat with AI** and expose a **Use Form** toggle. The chat-assistant reply to the same one-paragraph Pyth proposal differed materially:

- **GSD** auto-extracts Title, Description (w/ bulleted goals, approach, outcomes), Team, Budget, Links — ready for one-click accept.
- **Spec Kit** extracts the title but asks clarifying questions: category (infrastructure/community), technical description, budget currency, budget breakdown, team member roles. More turns before submission.
- **Superpowers** asks for the smallest increment first: minimum-50-character description + 20-character problem statement, then iterates toward Proposed Solution, Team (Name/Role), Timeline, and IPE-specific fields (Residency Duration, Demo Day Deliverable, Community Contribution, Prior IPE Participation).

## Form schema differences (when toggled to Use Form)

| Field | GSD | Spec Kit | Superpowers |
|---|---|---|---|
| Title | ✓ (≤200) | ✓ (≤200) | ✓ |
| Description | ✓ (≤5000) | ✓ (≤10000, min 50) | ✓ |
| Technical description | — | ✓ (≤10000, min 50) | — |
| Problem statement | — | — | ✓ |
| Proposed solution | — | — | ✓ |
| Category | — | ✓ (select) | ✓ (select) |
| Team (free-text) | ✓ (≤2000) | — | — |
| Team members (structured Name+Role rows) | — | ✓ | ✓ |
| Budget amount | ✓ (number) | ✓ + currency select | ✓ (USDC) |
| Budget breakdown | — | ✓ | ✓ |
| Timeline | — | — | ✓ |
| IPE Village fields (residency duration, demo day, prior IPE, community contrib) | — | — | ✓ |
| External links | ✓ | ✓ | ✓ |

Takeaway: **Superpowers has the most opinionated, IPE-native schema**; **Spec Kit** the most structured grant schema with distinct technical vs. problem descriptions; **GSD** the leanest.

## End-to-end evaluation — GSD (full flow completed)

Pyth proposal submitted via Use Form, persisted to IPFS, received proposal id `/proposals/17` with IPFS CID `QmUbFiQdkdEd…bDMC` and owner wallet `0xa7cEd6c599…f742` (deployer). Clicked Start Evaluation; 4 judges ran in sequence, visibly streaming per-dimension completion:

| Dimension | Weight | Score | Verdict |
|---|---|---|---|
| Technical Feasibility | 25% | **58/100** | Adequate — Needs Revision |
| Impact Potential | 30% | **79/100** | Strong — Approve |
| Cost Efficiency | 20% | **58/100** | Adequate |
| Team Capability | 25% | **58/100** | Adequate — Needs Revision |
| **Overall weighted** | 100% | **64.3/100** | **Strong** |

Judge prose was substantive and specific:

- **Technical (58)**: correctly flagged absence of architecture, eligibility logic, anti-abuse design, data-pipeline attribution, and engineering milestones. Recognized Pyth's mature oracle footprint as a positive baseline.
- **Impact (79)**: picked up the measurable KPI targets (230→750 contracts, 7,750→40,000 users, $175M→$500M TVS, $50B enabled volume) and flagged that top-line figures aren't fully causally substantiated, especially $50B. Called out that the program subsidizes existing usage rather than introducing a new capability.
- **Team (58)**: credited organizational signals (400+ feeds, 50+ chains, institutional publishers) but penalized the prompt for lacking named members, role assignments, and prior Arbitrum-specific execution evidence.
- **Cost Efficiency (58)**: completed late (~30s after the other 3); judged the proposal as submitted without hindsight.

Evaluation dashboard rendered a radar chart (Team / Technical / Cost / Impact) and aggregate.

**Signal quality**: the Pyth proposal is a valuable probe because the ground-truth outcome is public — only 6.6% of the requested 1M ARB was needed after Dencun. The Cost Efficiency judge scored 58/100 on the proposal-as-submitted, which is reasonable given the budget math *within the prompt* is not obviously padded; the judge would need outside evidence (the Dencun upgrade impact) to discount the ask. This is consistent behavior, not a miss.

## Spec Kit and Superpowers — chat flow observed; full evaluation not run

Both assistants returned structured follow-up questions when given the same one-paragraph Pyth input, which is the intended UX — both require multi-turn refinement before emitting a final proposal. Running the full multi-turn flow × 2 services was skipped in this session because:
- GSD already produced a complete, end-to-end judge comparison against the same input.
- Spec Kit and Superpowers schemas require IPE-specific fields (Demo Day, Residency) or Technical-vs-Problem splits that would require tailoring the input, breaking the apples-to-apples comparison premise.

For a like-for-like scoring run, the next step is to extend each fixture with per-worktree pre-filled payloads (one per service's schema) and submit via Use Form, not chat. Alternative: add a 3-minute-per-service multi-turn chat script.

## Pipeline status

### Fixed in this session (commit `d63285b`)

Deploy workflow's `gcloud builds submit` was failing with `Viewer/Owner of the project` log-streaming errors despite `--suppress-logs` in commit `6f2e835`. Replaced sync submit with **async submit + poll on `gcloud builds describe`** for all 4 deploy jobs (gsd, speckit, superpower, ralph). Build steps now pass.

### Remaining deploy blockers (outside workflow scope)

All 4 deploys now progress past the build and fail at `gcloud run deploy` with IAM errors. Both `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` exist in Secret Manager (`ipe-city`), so the "Secret not found" surface error likely reflects a **runtime-SA missing `roles/secretmanager.secretAccessor`** for the specific secret versions referenced. The Spec Kit and Superpower deploys also reference secrets the runtime SA may not have access to (`ANTHROPIC_API_KEY`, `TURSO_*`, `AUTH_SECRET`, `CRON_SECRET`).

### Recommendation

Grant the Cloud Run runtime service account (`<project-number>-compute@developer.gserviceaccount.com` or a dedicated per-worktree SA) `roles/secretmanager.secretAccessor` on each referenced secret, or pin the secrets to `:latest` via a single binding, e.g.:

```bash
for SECRET in UPSTASH_REDIS_REST_URL UPSTASH_REDIS_REST_TOKEN OPENAI_API_KEY PINATA_JWT DEPLOYER_PRIVATE_KEY; do
  gcloud secrets add-iam-policy-binding "$SECRET" \
    --member="serviceAccount:1010906320334-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor" \
    --project=ipe-city
done
```

Until that's done, the current Cloud Run revisions (older images) continue serving.

### Main CI

Pushing `d63285b` also re-triggered main CI. The original `uploadJson` error in `test-superpower` no longer reproduces; the job now surfaces a different, intermittent ESM linker error that wasn't fully isolated. `test-speckit` now fails earlier — the speckit branch's Foundry config needs `git submodule update --init --recursive` (or explicit `forge install`) on its contracts/lib. Both fixes belong on the respective worktree branches, not main.

## Artifacts

- `test-fixtures/real-grants/` — 5 real grants (Aave LTIPP, Pyth LTIPP, Aark LTIPP, Fe-lang ESP, L2BEAT RetroPGF)
- GSD proposal: `https://agent-reviewer-gsd-1010906320334.us-central1.run.app/proposals/17`
- GSD evaluation: `https://agent-reviewer-gsd-1010906320334.us-central1.run.app/proposals/17/evaluation`
- Deploy pipeline commit: `d63285b ci: use async gcloud builds + polling`
