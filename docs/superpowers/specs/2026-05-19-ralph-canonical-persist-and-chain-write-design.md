# ralph-unified canonical — persist + on-chain write fix

**Date:** 2026-05-19
**Branch:** main (canonical)
**Author:** Carlos Libardo
**Trigger:** Prompt Night n24 demo, 2026-05-19 20:00 BRT — `/grants` empty
because evaluation results are computed but never stored or written to chain.

## Problem

Canonical ralph-unified merge ships AI-judging workflow + on-chain ABI helpers,
but three pieces never connected:

1. `runEvaluationWorkflow` returns scores → Server Action drops them on the floor.
2. `/grants` list page is hardcoded "No proposals yet" with no query.
3. `/grants/[id]` detail page hardcoded "Awaiting on-chain confirmation" with no fetch.

`prepareSubmitScore` encodes calldata for `EvaluationRegistry.submitScore` —
but no caller invokes it. No `walletClient`, no signer.

## Goal

Submit-to-render loop completes end-to-end:
1. Submit proposal → judges run → result persisted server-side.
2. Pin proposal + evaluation JSON to IPFS.
3. Write evaluation to `EvaluationRegistry` on Base Sepolia via `DEPLOYER_PRIVATE_KEY`.
4. `/grants` lists submissions (off-chain store; on-chain badge per row).
5. `/grants/[id]` shows real per-dimension scores + tx hash + Basescan link.

## Non-goals

- Persistent DB (Cloud Run `/tmp` is ephemeral — demo-window scope only).
- Indexer that backfills from chain events.
- Auth on submit (rate-limit already in place).
- Migration of existing in-flight evaluations.

## Design

### Storage layer (new — `src/lib/evaluation-store.ts`)

Filesystem JSON at `EVALUATION_STORE_DIR` (default `/tmp/evaluations`).

```ts
type StoredEvaluation = {
  proposalId: string;            // app-level UUID
  proposalIdHex: `0x${string}`;  // keccak256("web-form:" + proposalId)
  title: string;
  aggregateScoreBps: number;     // 0–10000
  dimensions: DimensionResult[];
  anomalyFlags: string[];
  evaluatedAt: string;
  chain: { status: "pending" | "confirmed" | "failed";
           txHash?: `0x${string}`;
           blockNumber?: number;
           proposalContentCid?: string;
           evaluationContentCid?: string;
           error?: string; }
};

saveEvaluation(rec): Promise<void>
updateChainStatus(proposalId, patch): Promise<void>
getEvaluation(proposalId): Promise<StoredEvaluation | null>
listEvaluations(): Promise<StoredEvaluation[]>   // sorted by evaluatedAt desc
```

### Wallet client (new — extend `src/chain/contracts.ts`)

```ts
export function getWalletClient(): WalletClient   // throws if DEPLOYER_PRIVATE_KEY missing
```

Uses `viem` `createWalletClient` + `privateKeyToAccount` against same chain
+ RPC URL as `publicClient`.

### On-chain write wrapper (extend `src/chain/evaluation-registry.ts`)

```ts
export async function submitEvaluationOnChain(args: {
  proposalIdHex: Hex;
  fundingRoundId: Hex;          // bytes32(0) for now — no funding-round concept yet
  finalScore: number;           // 0–100 (scaler applies *SCORE_PRECISION → bps)
  proposalContentCid: string;
  evaluationContentCid: string;
}): Promise<{ txHash: Hex }>
```

Calls `walletClient.writeContract` with `submitScore` ABI. Returns immediately
with tx hash — does **not** await confirmation. Background `awaitTxConfirmation`
helper updates store when tx lands.

### Submit action wiring (extend `src/app/grants/submit/actions.ts`)

After `runEvaluationWorkflow` succeeds:
1. Compute `proposalIdHex = computeProposalId("web-form", proposalId)`.
2. Save `StoredEvaluation` w/ `chain.status = "pending"`.
3. **Fire-and-forget background task** (Promise not awaited in response):
   - Pin proposal + evaluation JSON → IPFS (sequential, `pinJsonToIpfs`).
   - Call `submitEvaluationOnChain` → get txHash.
   - Update store with `txHash, proposalContentCid, evaluationContentCid`.
   - Await confirmation → update `chain.status = "confirmed", blockNumber`.
   - On failure: `chain.status = "failed", error`.
4. Return existing `{ success, proposalId, detailUrl }`.

User sees instant redirect; chain status fills in as page revalidates.

### Page wiring

- `/grants` (server component, no `'use client'`): `listEvaluations()` → cards.
  Each card: title · score % · chain badge (`pending`/`confirmed` · txHash).
- `/grants/[id]` (server component): `getEvaluation(id)` → real scores per dim
  + chain section (status + Basescan link).
- Both pages: `export const revalidate = 5` so polling reflects status updates.

## TDD plan

| Track | Failing test before code |
|---|---|
| T1 | `evaluation-store.test.ts` — save, get, list round-trip; updateChainStatus patches one record. |
| T4 | `evaluation-registry.test.ts` — `submitEvaluationOnChain` builds correct calldata (mock wallet). |
| T1+T4 in actions | extend `actions.test.ts` — successful submit persists w/ `chain.status="pending"` + spawns background task. |
| T2 | `grants/page.test.tsx` — renders list when store has entries; empty state only when truly empty. |
| T3 | `grants/[id]/page.test.tsx` — renders dimension scores + tx hash badge when stored. |

## Risks

| Risk | Mitigation |
|---|---|
| `/tmp` reset on Cloud Run cold start | Acceptable — demo window. Document in CLAUDE.md. |
| Signer key leak | Already in GCP Secret Manager — no change. |
| Sepolia tx stuck unconfirmed | Background poll w/ 60s timeout → mark failed; UI still shows score. |
| IPFS pin slow | Run in background after immediate response. |
| Fire-and-forget Promise gc'd in serverless | Wrap in `globalThis.__pendingTasks` Set; Cloud Run waits for in-flight before scaling to zero. |

## Acceptance

- `bun test` green for new + modified tests.
- Local: `bun run dev` → submit proposal → `/grants` shows it within 5s → `/grants/[id]` shows real scores immediately + chain badge updates from pending → confirmed within ~30s on Sepolia.
- Deployed: same flow on `agent-reviewer-ralph-1010906320334.us-central1.run.app`.
- Slide 16 screenshots refreshed: list page populated, detail page shows real scores, dashboard shows green.
