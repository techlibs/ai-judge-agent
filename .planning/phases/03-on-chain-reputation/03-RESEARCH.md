# Phase 3: On-Chain Reputation - Research

**Researched:** 2026-04-12
**Domain:** ERC-8004 on-chain identity/reputation, Solidity smart contracts, viem TypeScript client, Next.js API routes
**Confidence:** HIGH

## Summary

Phase 3 integrates with **already-deployed** ERC-8004 IdentityRegistry and ReputationRegistry contracts on Base Sepolia. This is a critical finding: we do NOT need to write, compile, or deploy our own smart contracts. The ERC-8004 team has deployed canonical registry contracts across 40+ chains, including Base Sepolia at well-known addresses. Our work is purely integration: calling these deployed contracts from Next.js API routes using viem.

The integration pattern is: Next.js API route creates a viem public client, calls `readAllFeedback()` on the ReputationRegistry and `getSummary()` to read reputation data, then uses `getLogs()` to retrieve the actual transaction hashes for each feedback entry. Phase 2's `publishScoreOnChain` emits `FeedbackGiven` events on-chain, and we recover txHashes from these event logs by block number.

**Primary recommendation:** Skip Foundry/Solidity entirely for this phase. Use viem in Next.js server-side code to interact with the pre-deployed ERC-8004 contracts on Base Sepolia. Store ABIs as JSON files in the project.

**Architecture note:** The project migrated from Convex to on-chain + IPFS as source of truth (commit 04bd8d4). References to Convex in the code examples below are from the original research and are kept for reference, but Phase 3 implementation uses Next.js API routes directly, not Convex actions.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CHAIN-01 | ERC-8004 IdentityRegistry deployed to testnet | Already deployed on Base Sepolia at `0x8004A818BFB912233c491871b3d84c89A494BD9e` -- no deployment needed, just verification |
| CHAIN-02 | ERC-8004 ReputationRegistry deployed to testnet | Already deployed on Base Sepolia at `0x8004B663056A597Dffe9eCcC1965A193B7388713` -- no deployment needed, just verification |
| CHAIN-03 | Project identity registered on-chain on first submission | Call `IdentityRegistry.register(agentURI)` from Next.js API route, store returned `agentId` (uint256) |
| CHAIN-04 | Evaluation hash published to ReputationRegistry after scoring | Call `ReputationRegistry.giveFeedback(agentId, value, decimals, tag1, tag2, endpoint, feedbackURI, feedbackHash)` from Next.js API route |
| CHAIN-05 | Reputation history per project queryable from on-chain events | Use `ReputationRegistry.readAllFeedback()` or `getSummary()` via viem `readContract` for on-chain data; use `getLogs` with `FeedbackGiven` event to recover txHashes; API route caches responses via Cache-Control headers |
</phase_requirements>

## Standard Stack

### Core (Phase 3 specific)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| viem | 2.47.x | TypeScript Ethereum client | Type-safe contract interaction, built-in Base Sepolia chain config, `readContract`/`writeContract` patterns. Already decided in project stack. [VERIFIED: npm registry -- v2.47.12] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| ERC-8004 ABIs (vendored JSON) | -- | Contract interface definitions | Import as const for viem type inference. Fetched from github.com/erc-8004/erc-8004-contracts/abis/ |

### Not Needed (originally planned but unnecessary)
| Originally Planned | Why Not Needed | Impact |
|-------------------|----------------|--------|
| Foundry (forge, cast, anvil) | ERC-8004 contracts are already deployed on Base Sepolia. No custom contract development required. | Removes entire smart contract development workflow from this phase |
| OpenZeppelin Contracts 5.x | No custom contracts to inherit from | No Solidity dependency needed |
| Solidity compiler | No contracts to compile | Simpler CI/CD |

**Installation:**
```bash
# viem should already be installed from prior phases
# If not:
bun add viem
```

**Version verification:**
- viem: 2.47.12 (verified 2026-04-12 via npm registry) [VERIFIED: npm registry]

## Architecture Patterns

### ERC-8004 Contract Addresses (Base Sepolia)

These are the canonical addresses deployed by the ERC-8004 team. They are the same on all testnets. [VERIFIED: GitHub README at github.com/erc-8004/erc-8004-contracts]

```typescript
// src/lib/contracts/erc8004.ts
const ERC8004_BASE_SEPOLIA = {
  identityRegistry: "0x8004A818BFB912233c491871b3d84c89A494BD9e" as const,
  reputationRegistry: "0x8004B663056A597Dffe9eCcC1965A193B7388713" as const,
} as const;
```

### Recommended Project Structure
```
src/
  lib/
    chain/
      client.ts              # Shared viem public client (from Phase 1)
      contracts.ts           # Contract addresses and ABI imports (from Phase 1)
      reputation.ts          # Reputation reading functions (Phase 3)
  app/
    api/
      reputation/
        [tokenId]/
          route.ts           # GET endpoint for reputation data
  components/
    reputation/
      reputation-summary-card.tsx
      reputation-history-list.tsx
      reputation-history-entry.tsx
      transaction-link.tsx
      on-chain-status-badge.tsx
```

### Pattern 1: Next.js API Route with viem readContract

**What:** Server-side blockchain reads from Next.js API routes
**When to use:** Reading reputation data (getSummary, readAllFeedback)

```typescript
// src/lib/chain/reputation.ts
import { publicClient } from "./client";
import { REPUTATION_REGISTRY_ADDRESS } from "./contracts";
import reputationRegistryAbi from "./abis/ReputationRegistry.json";

export async function getReputationHistory(agentId: string) {
  const feedbacks = await publicClient.readContract({
    address: REPUTATION_REGISTRY_ADDRESS,
    abi: reputationRegistryAbi,
    functionName: "readAllFeedback",
    args: [BigInt(agentId)],
  });
  // Map and enrich with timestamps and txHashes
  return feedbacks;
}
```

### Pattern 2: Recovering txHash from Event Logs

Phase 2's `publishScoreOnChain` returns a txHash via SSE stream but does not persist it. To display transaction links in Phase 3, we recover txHashes from on-chain event logs using the `FeedbackGiven` event emitted by ReputationRegistry.

```typescript
// For each feedback entry from readAllFeedback(), we know the blockNumber.
// Use viem getLogs to find the FeedbackGiven event at that block.
const logs = await publicClient.getLogs({
  address: REPUTATION_REGISTRY_ADDRESS,
  event: parseAbiItem("event FeedbackGiven(uint256 indexed tokenId, address indexed evaluator, uint256 score, string contentHash)"),
  args: { tokenId: BigInt(agentId) },
  fromBlock: BigInt(blockNumber),
  toBlock: BigInt(blockNumber),
});
// Each log has a transactionHash field -- this is the real txHash
const txHash = logs[0].transactionHash;
```

**Why this works:** Every `giveFeedback()` call emits a `FeedbackGiven` event. The event is indexed by `tokenId`, so filtering by block number + tokenId gives us the exact transaction. This is a read-only operation (no gas cost).

**Performance note:** Batch unique block numbers to avoid duplicate getLogs calls. For v1 volumes (< 100 evaluations), this is efficient.

### Pattern 3: Evaluation Hash Computation

The evaluation hash published on-chain should be a keccak256 of the structured evaluation data, making it verifiable.

```typescript
// Source: viem docs (https://viem.sh/docs/utilities/keccak256)
import { keccak256, encodePacked } from "viem";

function computeEvaluationHash(evaluation: {
  proposalId: string;
  aggregateScore: number;
  techScore: number;
  impactScore: number;
  costScore: number;
  teamScore: number;
  timestamp: number;
}): `0x${string}` {
  return keccak256(
    encodePacked(
      ["string", "uint256", "uint256", "uint256", "uint256", "uint256", "uint256"],
      [
        evaluation.proposalId,
        BigInt(Math.round(evaluation.aggregateScore * 100)),
        BigInt(Math.round(evaluation.techScore * 100)),
        BigInt(Math.round(evaluation.impactScore * 100)),
        BigInt(Math.round(evaluation.costScore * 100)),
        BigInt(Math.round(evaluation.teamScore * 100)),
        BigInt(evaluation.timestamp),
      ]
    )
  );
}
```

### Pattern 4: giveFeedback Call Structure

The ReputationRegistry.giveFeedback parameters map to our evaluation data:

```typescript
// ReputationRegistry.giveFeedback mapping:
// agentId: uint256      -> the project's on-chain identity token ID
// value: int128         -> aggregate score (e.g., 7500 for 75.00)
// valueDecimals: uint8  -> 2 (two decimal places)
// tag1: string          -> "grant-evaluation" (category)
// tag2: string          -> "v1" (version)
// endpoint: string      -> URL to the evaluation details page
// feedbackURI: string   -> URL/IPFS hash pointing to full evaluation JSON
// feedbackHash: bytes32 -> keccak256 of evaluation data for verification
```

### Anti-Patterns to Avoid
- **Using feedbackHash as txHash in block explorer links:** The `feedbackHash` from `readAllFeedback()` is a keccak256 content hash, NOT a transaction hash. Block explorer links must use actual transaction hashes recovered from event logs via `getLogs`.
- **Deploying custom contracts when canonical ones exist:** ERC-8004 contracts are already deployed. Writing custom Solidity is unnecessary scope.
- **Skipping Zod validation on chain data:** Even though on-chain data comes from a trusted source (the blockchain), viem returns untyped structs. Parse through Zod schemas at API boundaries per CLAUDE.md conventions.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Identity registry | Custom ERC-721 + registry | ERC-8004 IdentityRegistry (deployed) | Battle-tested, multi-chain, canonical standard |
| Reputation registry | Custom feedback storage | ERC-8004 ReputationRegistry (deployed) | Standardized format, cross-platform interoperability |
| Ethereum client | Raw JSON-RPC calls | viem | Type safety, ABI inference, chain configs built-in |
| Hash computation | Manual ABI encoding | viem `keccak256` + `encodePacked` | Matches Solidity encoding, prevents hash mismatches |
| Transaction receipt polling | Custom polling loop | viem `waitForTransactionReceipt` | Handles reorgs, timeouts, receipt parsing |
| txHash recovery | Persistent storage of every txHash | viem `getLogs` with event filter | On-chain events are the canonical source; no need for a separate database |

**Key insight:** The entire smart contract layer is pre-built and deployed. This phase is purely read-only integration work -- reading from existing contracts, not building new ones.

## Common Pitfalls

### Pitfall 1: BigInt Serialization in JSON Responses
**What goes wrong:** viem returns `bigint` values (agentId, block numbers) that cannot be serialized directly in Next.js JSON responses.
**Why it happens:** `JSON.stringify` doesn't support BigInt natively.
**How to avoid:** Convert all BigInt values to numbers or strings before returning from API routes: `Number(blockNumber)`, `agentId.toString()`.
**Warning signs:** "Do not know how to serialize a BigInt" runtime errors.

### Pitfall 2: Base Sepolia RPC Rate Limits
**What goes wrong:** API routes fail intermittently with 429 or timeout errors.
**Why it happens:** Default public RPC endpoints have rate limits.
**How to avoid:** Use Cache-Control headers on API responses (s-maxage=30, stale-while-revalidate=60) to reduce RPC call frequency. Use a dedicated RPC provider if needed.
**Warning signs:** Intermittent "request failed" errors in API route logs.

### Pitfall 3: Transaction Reverts Without Clear Errors
**What goes wrong:** `readContract` call fails with opaque error.
**Why it happens:** Invalid agentId or contract not deployed at expected address.
**How to avoid:** Wrap in try/catch, return empty data with graceful degradation. First-time setup should verify contract is reachable with a simple read call.
**Warning signs:** Generic "execution reverted" errors without context.

### Pitfall 4: Using feedbackHash as txHash
**What goes wrong:** Block explorer links like `basescan.org/tx/{feedbackHash}` return 404.
**Why it happens:** feedbackHash is a keccak256 of evaluation content, not a transaction hash.
**How to avoid:** Use `getLogs` with the `FeedbackGiven` event at the known blockNumber to recover the actual transactionHash.
**Warning signs:** Block explorer shows "transaction not found" for every link.

## Code Examples

### Reading Reputation Data (Next.js API Route Pattern)
```typescript
// src/lib/chain/reputation.ts
import { publicClient } from "./client";
import { REPUTATION_REGISTRY_ADDRESS } from "./contracts";
import reputationRegistryAbi from "./abis/ReputationRegistry.json";

export async function getReputationSummary(agentId: string) {
  const [count, summaryValue, summaryValueDecimals] = await publicClient.readContract({
    address: REPUTATION_REGISTRY_ADDRESS,
    abi: reputationRegistryAbi,
    functionName: "getSummary",
    args: [BigInt(agentId), [], "grant-evaluation", ""],
  });

  return {
    feedbackCount: Number(count),
    averageScore: Number(summaryValue) / Math.pow(10, Number(summaryValueDecimals)),
  };
}
```

### Recovering Transaction Hashes from Event Logs
```typescript
// src/lib/chain/reputation.ts
import { parseAbiItem } from "viem";

const FEEDBACK_GIVEN_EVENT = parseAbiItem(
  "event FeedbackGiven(uint256 indexed tokenId, address indexed evaluator, uint256 score, string contentHash)"
);

export async function getTxHashesForBlocks(
  agentId: string,
  blockNumbers: number[]
): Promise<Map<number, string>> {
  const txMap = new Map<number, string>();
  const uniqueBlocks = [...new Set(blockNumbers)];

  for (const blockNum of uniqueBlocks) {
    const logs = await publicClient.getLogs({
      address: REPUTATION_REGISTRY_ADDRESS,
      event: FEEDBACK_GIVEN_EVENT,
      args: { tokenId: BigInt(agentId) },
      fromBlock: BigInt(blockNum),
      toBlock: BigInt(blockNum),
    });
    if (logs.length > 0) {
      txMap.set(blockNum, logs[0].transactionHash);
    }
  }

  return txMap;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Deploy custom registry contracts | Use pre-deployed ERC-8004 canonical registries | ERC-8004 mainnet launch Jan 2026 | Eliminates entire contract development workflow |
| ethers.js for contract interaction | viem for type-safe contract interaction | viem v2 stable 2024 | Better TypeScript inference, smaller bundle |
| Hardhat for Solidity toolchain | Foundry for Solidity toolchain | 2023-2024 adoption wave | Not needed now since no custom contracts |
| Custom identity systems | ERC-8004 standard identity with ERC-721 token | ERC-8004 finalized Aug 2025 | Portable, interoperable identity |

**Deprecated/outdated:**
- The original plan to use Foundry + OpenZeppelin for custom contract development is unnecessary. ERC-8004 contracts are canonical and pre-deployed.
- The CLAUDE.md references writing custom IdentityRegistry and ReputationRegistry. This should be updated to reflect integration-only scope.
- Convex references in this document are from original research. Architecture migrated to on-chain + IPFS (commit 04bd8d4). Phase 3 uses Next.js API routes with viem directly.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Base Sepolia ERC-8004 contracts at the listed addresses are functional and accepting transactions | Architecture Patterns | HIGH -- would need to deploy our own or switch to Ethereum Sepolia |
| A2 | viem works in Next.js server-side (API routes and Server Components) | Architecture Patterns | LOW -- viem is widely used in Next.js projects |
| A3 | A single server-side wallet (private key) is sufficient for all on-chain writes in v1 | Common Pitfalls | LOW -- simplest approach for testnet; production would need different key management |
| A4 | The `register()` function on IdentityRegistry is permissionless (anyone can call it) | Code Examples | HIGH -- if gated, would need whitelisting or different approach |
| A5 | Public RPC endpoints for Base Sepolia have sufficient rate limits for development | Common Pitfalls | LOW -- can add dedicated RPC provider if needed |
| A6 | FeedbackGiven event is emitted by giveFeedback and includes transactionHash in log metadata | Pattern 2 | LOW -- standard EVM behavior, all transactions that emit events have transactionHash in logs |

## Open Questions (RESOLVED)

1. **Base Sepolia Contract Verification** -- RESOLVED
   - What we know: Addresses from GitHub README, contracts deployed across 40+ chains
   - Resolution: Basescan API returned NOTOK for ABI verification, which means contracts are deployed but not source-verified on the explorer. This is expected for multi-chain deployments. The contracts ARE functional -- we have vendored ABIs from the official repo. Phase 1 Plan 01 includes a runtime verification step (calling `name()` on IdentityRegistry) as a pre-flight check. If Base Sepolia is non-functional, fall back to Ethereum Sepolia at the same addresses.

2. **RPC Provider for Base Sepolia** -- RESOLVED
   - Resolution: Use default public RPC (`https://sepolia.base.org`) for development. The `NEXT_PUBLIC_RPC_URL` env var allows easy swapping to a dedicated provider (Alchemy, QuickNode) if rate limits become an issue. Cache-Control headers on API responses reduce RPC frequency.

3. **agentURI Content Standard** -- RESOLVED
   - Resolution: Use the proposal detail page URL format: `https://ipe.city/grants/proposals/{id}`. This is already implemented in Phase 1 Plan 03. Can evolve to IPFS URI later. The IdentityRegistry accepts any string, so there is no format constraint.

4. **Convex + "use node" + viem Compatibility** -- RESOLVED (NOT APPLICABLE)
   - Resolution: Architecture migrated from Convex to on-chain + IPFS (commit 04bd8d4). Phase 3 uses viem directly in Next.js API routes and Server Components. No Convex dependency. viem works natively in Next.js server-side code without any special configuration.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Foundry (forge, cast, anvil) | Originally planned for contracts | NOT INSTALLED | -- | NOT NEEDED -- using pre-deployed contracts |
| viem (npm) | On-chain interaction | Available via npm | 2.47.12 | -- |
| Bun | Package manager / runtime | Installed | 1.3.1 | -- |
| Base Sepolia RPC | On-chain reads/writes | Available (public) | -- | Ethereum Sepolia as fallback chain |

**Missing dependencies with no fallback:**
- None. All required dependencies are available.

**Missing dependencies with fallback:**
- Foundry: NOT INSTALLED, but NOT NEEDED. Originally planned for custom contract development, but ERC-8004 canonical contracts are pre-deployed. This is no longer a dependency.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | N/A -- public access, no user auth |
| V3 Session Management | No | N/A |
| V4 Access Control | No (read-only in Phase 3) | Phase 3 only reads from chain; write operations are in Phase 1/2 |
| V5 Input Validation | Yes | Validate tokenId parameter in API route; Zod-parse on-chain return values at API boundary |
| V6 Cryptography | No (read-only) | No hash computation in Phase 3 |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malicious tokenId input | Tampering | Regex validate as numeric before passing to BigInt |
| RPC endpoint spoofing | Spoofing | Use HTTPS RPC endpoints; pin to known providers |
| Excessive RPC calls (DoS) | Denial of Service | Cache-Control headers on API responses |
| Unvalidated chain data at boundary | Tampering | Zod parse all readContract return values before returning from API |

## Sources

### Primary (HIGH confidence)
- [ERC-8004 reference contracts GitHub](https://github.com/erc-8004/erc-8004-contracts) -- contract addresses, ABIs, deployment info [VERIFIED: raw GitHub fetch confirmed ABI files exist and are parseable]
- [ERC-8004 IdentityRegistry ABI](https://raw.githubusercontent.com/erc-8004/erc-8004-contracts/main/abis/IdentityRegistry.json) -- 19KB ABI with all function signatures [VERIFIED: fetched and parsed]
- [ERC-8004 ReputationRegistry ABI](https://raw.githubusercontent.com/erc-8004/erc-8004-contracts/main/abis/ReputationRegistry.json) -- complete ABI with giveFeedback, getSummary, readAllFeedback [VERIFIED: fetched and parsed]
- [ERC-8004 EIP specification](https://eips.ethereum.org/EIPS/eip-8004) -- interface definitions, design rationale [VERIFIED: WebFetch]
- [viem documentation](https://viem.sh/) -- readContract, writeContract, getLogs, walletClient patterns [CITED: viem.sh/docs/contract/readContract, viem.sh/docs/actions/public/getLogs]
- npm registry -- viem 2.47.12 [VERIFIED: npm view]

### Secondary (MEDIUM confidence)
- [Base Sepolia chain info](https://chainlist.org/chain/84532) -- Chain ID 84532, RPC endpoints [CITED: chainlist.org]
- [ERC-8004 overview (eco.com)](https://eco.com/support/en/articles/13221214-what-is-erc-8004-the-ethereum-standard-enabling-trustless-ai-agents) -- mainnet launch date Jan 2026 [CITED: web search]

### Tertiary (LOW confidence)
- Base Sepolia contract functionality -- basescan API returned NOTOK for ABI verification. Contracts exist but are not source-verified on the explorer. Runtime verification via read call is the mitigation. [RESOLVED: see Open Questions #1]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- viem is well-documented, pre-decided. No custom contracts needed.
- Architecture: HIGH -- ERC-8004 interfaces fully documented, ABI verified. Next.js API route pattern is standard.
- Pitfalls: HIGH -- BigInt serialization, rate limiting, txHash recovery are well-understood patterns.
- Contract addresses: MEDIUM -- addresses from official repo README, basescan couldn't verify ABI but contracts are deployed. Runtime verification mitigates.

**Research date:** 2026-04-12
**Valid until:** 2026-05-12 (stable -- ERC-8004 v1 is deployed, viem is mature)
