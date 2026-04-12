# Phase 3: On-Chain Reputation - Research

**Researched:** 2026-04-12
**Domain:** ERC-8004 on-chain identity/reputation, Solidity smart contracts, viem TypeScript client, Convex actions
**Confidence:** HIGH

## Summary

Phase 3 integrates with **already-deployed** ERC-8004 IdentityRegistry and ReputationRegistry contracts on Base Sepolia. This is a critical finding: we do NOT need to write, compile, or deploy our own smart contracts. The ERC-8004 team has deployed canonical registry contracts across 40+ chains, including Base Sepolia at well-known addresses. Our work is purely integration: calling these deployed contracts from Convex actions using viem.

The integration pattern is: Convex action (with `"use node"` directive) creates a viem wallet client using a server-side private key, calls `register()` on the IdentityRegistry when a project is first submitted, and calls `giveFeedback()` on the ReputationRegistry after evaluation completes. Transaction hashes are stored back in Convex documents for UI display.

**Primary recommendation:** Skip Foundry/Solidity entirely for this phase. Use viem in Convex Node.js actions to interact with the pre-deployed ERC-8004 contracts on Base Sepolia. Store ABIs as JSON files in the project.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CHAIN-01 | ERC-8004 IdentityRegistry deployed to testnet | Already deployed on Base Sepolia at `0x8004A818BFB912233c491871b3d84c89A494BD9e` -- no deployment needed, just verification |
| CHAIN-02 | ERC-8004 ReputationRegistry deployed to testnet | Already deployed on Base Sepolia at `0x8004B663056A597Dffe9eCcC1965A193B7388713` -- no deployment needed, just verification |
| CHAIN-03 | Project identity registered on-chain on first submission | Call `IdentityRegistry.register(agentURI)` from Convex action, store returned `agentId` (uint256) in proposals table |
| CHAIN-04 | Evaluation hash published to ReputationRegistry after scoring | Call `ReputationRegistry.giveFeedback(agentId, value, decimals, tag1, tag2, endpoint, feedbackURI, feedbackHash)` from Convex action |
| CHAIN-05 | Reputation history per project queryable from Convex | Store tx hashes + block numbers in Convex; use `ReputationRegistry.readAllFeedback()` or `getSummary()` via viem `readContract` for on-chain verification |
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
- convex: 1.35.1 (verified 2026-04-12 via npm registry) [VERIFIED: npm registry]
- @convex-dev/workflow: 0.3.9 (verified 2026-04-12 via npm registry) [VERIFIED: npm registry]

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
convex/
  onchain/
    registerIdentity.ts    # Convex action: register project on IdentityRegistry
    publishEvaluation.ts   # Convex action: publish evaluation hash to ReputationRegistry
    queryReputation.ts     # Convex action: read reputation data from chain
    client.ts              # Shared viem client setup (publicClient + walletClient)
    abis/
      IdentityRegistry.json   # Vendored ABI from erc-8004-contracts repo
      ReputationRegistry.json # Vendored ABI from erc-8004-contracts repo
  schema.ts                # Extended with on-chain fields (agentId, txHash, etc.)
```

### Pattern 1: Convex Node.js Action with viem

Convex actions that use npm packages requiring Node.js APIs must use the `"use node"` directive. viem uses Node.js crypto APIs, so this is required.

**What:** Server-side blockchain interaction from Convex actions
**When to use:** All on-chain writes (register, giveFeedback) and reads (getSummary, readFeedback)

```typescript
// convex/onchain/client.ts
"use node";

import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

// Source: viem docs (https://viem.sh/docs/clients/wallet)
export function createClients(privateKey: `0x${string}`) {
  const account = privateKeyToAccount(privateKey);

  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(),
  });

  const walletClient = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(),
  });

  return { publicClient, walletClient, account };
}
```

```typescript
// convex/onchain/registerIdentity.ts
"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { createClients } from "./client";
import identityRegistryAbi from "./abis/IdentityRegistry.json";

// Source: ERC-8004 ABI (github.com/erc-8004/erc-8004-contracts)
export const registerProjectIdentity = action({
  args: { proposalId: v.id("proposals"), agentURI: v.string() },
  handler: async (ctx, args) => {
    const privateKey = process.env.ONCHAIN_PRIVATE_KEY as `0x${string}`;
    const { publicClient, walletClient } = createClients(privateKey);

    const hash = await walletClient.writeContract({
      address: "0x8004A818BFB912233c491871b3d84c89A494BD9e",
      abi: identityRegistryAbi,
      functionName: "register",
      args: [args.agentURI],
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    // Extract agentId from Registered event logs
    // Store agentId + txHash back in Convex via ctx.runMutation(...)

    return { hash, agentId: /* parsed from logs */ };
  },
});
```

### Pattern 2: Evaluation Hash Computation

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

### Pattern 3: giveFeedback Call Structure

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

### Pattern 4: Convex Schema Extension

```typescript
// Additions to convex/schema.ts for on-chain fields
// proposals table additions:
//   onchainAgentId: v.optional(v.string()),        // ERC-8004 token ID (stored as string for bigint)
//   onchainRegistrationTx: v.optional(v.string()), // tx hash of identity registration

// New table: onchainPublications
// defineTable({
//   proposalId: v.id("proposals"),
//   evaluationId: v.id("evaluations"),
//   txHash: v.string(),
//   blockNumber: v.number(),
//   evaluationHash: v.string(),        // the keccak256 hash published
//   feedbackIndex: v.optional(v.number()), // from ReputationRegistry event
//   publishedAt: v.number(),
//   status: v.union(v.literal("pending"), v.literal("confirmed"), v.literal("failed")),
// })
```

### Anti-Patterns to Avoid
- **Calling actions from the client directly for on-chain writes:** Always trigger on-chain writes from mutations/internal actions via `ctx.scheduler.runAfter` or workflow steps, never from client-side code. [CITED: docs.convex.dev/functions/actions]
- **Storing private keys in Convex schema:** Private keys go in environment variables (`ONCHAIN_PRIVATE_KEY`), never in the database.
- **Blocking on transaction confirmation in the UI:** Fire-and-forget the on-chain publication. Update the Convex document when confirmation arrives. Use optimistic UI.
- **Deploying custom contracts when canonical ones exist:** ERC-8004 contracts are already deployed. Writing custom Solidity is unnecessary scope.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Identity registry | Custom ERC-721 + registry | ERC-8004 IdentityRegistry (deployed) | Battle-tested, multi-chain, canonical standard |
| Reputation registry | Custom feedback storage | ERC-8004 ReputationRegistry (deployed) | Standardized format, cross-platform interoperability |
| Ethereum client | Raw JSON-RPC calls | viem | Type safety, ABI inference, chain configs built-in |
| Hash computation | Manual ABI encoding | viem `keccak256` + `encodePacked` | Matches Solidity encoding, prevents hash mismatches |
| Transaction receipt polling | Custom polling loop | viem `waitForTransactionReceipt` | Handles reorgs, timeouts, receipt parsing |

**Key insight:** The entire smart contract layer is pre-built and deployed. This phase is purely integration work -- calling existing contracts from Convex, not building new ones.

## Common Pitfalls

### Pitfall 1: "use node" File Isolation
**What goes wrong:** Defining queries or mutations in a file with `"use node"` directive causes Convex build errors.
**Why it happens:** Files with `"use node"` can only export actions, not queries or mutations.
**How to avoid:** Keep `"use node"` files strictly for actions. Put schema definitions, queries, and mutations in separate files.
**Warning signs:** Convex build fails with "cannot define query/mutation in node action file."

### Pitfall 2: BigInt Serialization in Convex
**What goes wrong:** viem returns `bigint` values (agentId, block numbers) that cannot be stored directly in Convex.
**Why it happens:** Convex uses JSON serialization which doesn't support BigInt natively.
**How to avoid:** Convert all BigInt values to strings before storing: `agentId.toString()`. Parse back when needed: `BigInt(storedValue)`.
**Warning signs:** "Do not know how to serialize a BigInt" runtime errors.

### Pitfall 3: Transaction Reverts Without Clear Errors
**What goes wrong:** `writeContract` call fails with opaque revert data.
**Why it happens:** On-chain call reverts (e.g., duplicate registration, invalid agentId).
**How to avoid:** Always use `simulateContract` before `writeContract` to get decoded revert reasons. Handle specific error cases (already registered, not owner, etc.).
**Warning signs:** Generic "execution reverted" errors without context.

### Pitfall 4: Race Condition on Identity Registration
**What goes wrong:** Two proposals submitted simultaneously both try to register the same project identity.
**Why it happens:** No mutex between the "check if registered" and "register" steps.
**How to avoid:** Use Convex's transactional mutations to set a "registering" flag before launching the action. Check the flag in the action before calling the contract.
**Warning signs:** Duplicate on-chain registrations or failed transactions.

### Pitfall 5: Private Key Management
**What goes wrong:** Exposing the deployer private key or using the same key for testnet and mainnet.
**Why it happens:** Hardcoding keys or committing .env files.
**How to avoid:** Store `ONCHAIN_PRIVATE_KEY` in Convex environment variables (dashboard). Generate a dedicated testnet-only wallet. Never commit or log private keys.
**Warning signs:** Key visible in git history or Convex function logs.

### Pitfall 6: Base Sepolia RPC Rate Limits
**What goes wrong:** Actions fail intermittently with 429 or timeout errors.
**Why it happens:** Default public RPC endpoints have rate limits.
**How to avoid:** Use a dedicated RPC provider (Alchemy, QuickNode, Infura) for Base Sepolia. Set the RPC URL via environment variable.
**Warning signs:** Intermittent "request failed" errors in Convex action logs.

## Code Examples

### Complete Identity Registration Flow
```typescript
// convex/onchain/registerIdentity.ts
"use node";

import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { createClients } from "./client";
import { parseEventLogs } from "viem";
import identityRegistryAbi from "./abis/IdentityRegistry.json";

const IDENTITY_REGISTRY = "0x8004A818BFB912233c491871b3d84c89A494BD9e" as const;

// Source: ERC-8004 ABI + viem docs
export const registerProjectIdentity = internalAction({
  args: {
    proposalId: v.id("proposals"),
    agentURI: v.string(),
  },
  handler: async (ctx, args) => {
    const privateKey = process.env.ONCHAIN_PRIVATE_KEY as `0x${string}`;
    const { publicClient, walletClient } = createClients(privateKey);

    // Simulate first to catch reverts with clear error messages
    const { request } = await publicClient.simulateContract({
      address: IDENTITY_REGISTRY,
      abi: identityRegistryAbi,
      functionName: "register",
      args: [args.agentURI],
      account: walletClient.account,
    });

    const hash = await walletClient.writeContract(request);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    // Parse the Registered event to get the agentId
    const logs = parseEventLogs({
      abi: identityRegistryAbi,
      logs: receipt.logs,
      eventName: "Registered",
    });

    const agentId = logs[0].args.agentId.toString();

    // Store results back in Convex
    await ctx.runMutation(internal.proposals.setOnchainIdentity, {
      proposalId: args.proposalId,
      agentId,
      txHash: hash,
      blockNumber: Number(receipt.blockNumber),
    });
  },
});
```

### Complete Feedback Publication Flow
```typescript
// convex/onchain/publishEvaluation.ts
"use node";

import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { createClients } from "./client";
import { keccak256, encodePacked, parseEventLogs } from "viem";
import reputationRegistryAbi from "./abis/ReputationRegistry.json";

const REPUTATION_REGISTRY = "0x8004B663056A597Dffe9eCcC1965A193B7388713" as const;

// Source: ERC-8004 ReputationRegistry ABI
export const publishEvaluationHash = internalAction({
  args: {
    proposalId: v.id("proposals"),
    evaluationId: v.id("evaluations"),
    agentId: v.string(),
    aggregateScore: v.number(),
    evaluationHash: v.string(),
    evaluationURI: v.string(),
  },
  handler: async (ctx, args) => {
    const privateKey = process.env.ONCHAIN_PRIVATE_KEY as `0x${string}`;
    const { publicClient, walletClient } = createClients(privateKey);

    // Score as fixed-point with 2 decimals (75.50 -> 7550)
    const scoreValue = BigInt(Math.round(args.aggregateScore * 100));

    const { request } = await publicClient.simulateContract({
      address: REPUTATION_REGISTRY,
      abi: reputationRegistryAbi,
      functionName: "giveFeedback",
      args: [
        BigInt(args.agentId),           // agentId
        scoreValue,                      // value (int128)
        2,                               // valueDecimals (uint8)
        "grant-evaluation",              // tag1
        "v1",                            // tag2
        "",                              // endpoint (empty for now)
        args.evaluationURI,              // feedbackURI
        args.evaluationHash as `0x${string}`, // feedbackHash (bytes32)
      ],
      account: walletClient.account,
    });

    const hash = await walletClient.writeContract(request);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    // Store publication record
    await ctx.runMutation(internal.onchainPublications.record, {
      proposalId: args.proposalId,
      evaluationId: args.evaluationId,
      txHash: hash,
      blockNumber: Number(receipt.blockNumber),
      evaluationHash: args.evaluationHash,
      status: "confirmed",
    });
  },
});
```

### Reading Reputation Data
```typescript
// convex/onchain/queryReputation.ts
"use node";

import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";
import reputationRegistryAbi from "./abis/ReputationRegistry.json";

const REPUTATION_REGISTRY = "0x8004B663056A597Dffe9eCcC1965A193B7388713" as const;

// Source: ERC-8004 ReputationRegistry ABI
export const getReputationSummary = internalAction({
  args: { agentId: v.string(), clientAddresses: v.array(v.string()) },
  handler: async (_ctx, args) => {
    const publicClient = createPublicClient({
      chain: baseSepolia,
      transport: http(),
    });

    const [count, summaryValue, summaryValueDecimals] = await publicClient.readContract({
      address: REPUTATION_REGISTRY,
      abi: reputationRegistryAbi,
      functionName: "getSummary",
      args: [
        BigInt(args.agentId),
        args.clientAddresses,
        "grant-evaluation",
        "",
      ],
    });

    return {
      feedbackCount: Number(count),
      averageScore: Number(summaryValue) / Math.pow(10, Number(summaryValueDecimals)),
    };
  },
});
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

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Base Sepolia ERC-8004 contracts at the listed addresses are functional and accepting transactions | Architecture Patterns | HIGH -- would need to deploy our own or switch to Ethereum Sepolia |
| A2 | Convex Node.js actions can use viem without issues (viem works in Convex's Node.js runtime) | Architecture Patterns | MEDIUM -- may need `externalPackages` config in convex.json |
| A3 | A single server-side wallet (private key) is sufficient for all on-chain writes in v1 | Common Pitfalls | LOW -- simplest approach for testnet; production would need different key management |
| A4 | The `register()` function on IdentityRegistry is permissionless (anyone can call it) | Code Examples | HIGH -- if gated, would need whitelisting or different approach |
| A5 | Public RPC endpoints for Base Sepolia have sufficient rate limits for development | Common Pitfalls | LOW -- can add dedicated RPC provider if needed |

## Open Questions

1. **Base Sepolia Contract Verification**
   - What we know: Addresses from GitHub README, contracts deployed across 40+ chains
   - What's unclear: Whether the Base Sepolia instances are active and accepting calls (basescan API returned NOTOK for ABI verification)
   - Recommendation: First task should verify by calling a read function (e.g., `name()` on IdentityRegistry). If broken, fall back to Ethereum Sepolia where the same addresses exist.

2. **RPC Provider for Base Sepolia**
   - What we know: Public RPCs exist but may rate-limit
   - What's unclear: Whether the free tier of providers like Alchemy supports Base Sepolia
   - Recommendation: Start with default public RPC (`https://sepolia.base.org`). Add provider URL as env var for easy swapping.

3. **agentURI Content Standard**
   - What we know: IdentityRegistry accepts a `string agentURI` at registration
   - What's unclear: What format this URI should take (IPFS hash? HTTP URL? JSON schema?)
   - Recommendation: Use a JSON blob URL pointing to the proposal detail page (e.g., `https://ipe.city/grants/proposals/{id}`). Can evolve to IPFS later.

4. **Convex + "use node" + viem Compatibility**
   - What we know: Convex supports `"use node"` for Node.js-dependent packages
   - What's unclear: Whether viem needs to be added to `externalPackages` in convex.json
   - Recommendation: Try standard import first. If build fails, add to `node.externalPackages` config.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Foundry (forge, cast, anvil) | Originally planned for contracts | NOT INSTALLED | -- | NOT NEEDED -- using pre-deployed contracts |
| viem (npm) | On-chain interaction | Available via npm | 2.47.12 | -- |
| Bun | Package manager / runtime | Installed | 1.3.1 | -- |
| Base Sepolia RPC | On-chain reads/writes | Available (public) | -- | Ethereum Sepolia as fallback chain |
| Convex | Backend actions | Available via npm | 1.35.1 | -- |

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
| V4 Access Control | Yes (server-side key) | Private key stored in Convex env vars only; actions are `internalAction` not exposed to clients |
| V5 Input Validation | Yes | Validate agentId, scores, hashes before on-chain calls; Zod at boundaries |
| V6 Cryptography | Yes (hash computation) | viem `keccak256` + `encodePacked` -- never hand-roll hashing |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Private key exposure | Information Disclosure | Store in Convex env vars, never in code/schema/logs |
| Transaction replay | Tampering | ERC-8004 contracts handle nonces; viem handles tx nonce automatically |
| Malicious proposal data in hash | Tampering | Compute hash server-side from verified Convex data, not from client input |
| Front-running registration | Tampering | Low risk on testnet; permissionless register means no economic incentive |
| RPC endpoint spoofing | Spoofing | Use HTTPS RPC endpoints; pin to known providers |

## Sources

### Primary (HIGH confidence)
- [ERC-8004 reference contracts GitHub](https://github.com/erc-8004/erc-8004-contracts) -- contract addresses, ABIs, deployment info [VERIFIED: raw GitHub fetch confirmed ABI files exist and are parseable]
- [ERC-8004 IdentityRegistry ABI](https://raw.githubusercontent.com/erc-8004/erc-8004-contracts/main/abis/IdentityRegistry.json) -- 19KB ABI with all function signatures [VERIFIED: fetched and parsed]
- [ERC-8004 ReputationRegistry ABI](https://raw.githubusercontent.com/erc-8004/erc-8004-contracts/main/abis/ReputationRegistry.json) -- complete ABI with giveFeedback, getSummary, readAllFeedback [VERIFIED: fetched and parsed]
- [ERC-8004 EIP specification](https://eips.ethereum.org/EIPS/eip-8004) -- interface definitions, design rationale [VERIFIED: WebFetch]
- [viem documentation](https://viem.sh/) -- readContract, writeContract, walletClient patterns [CITED: viem.sh/docs/contract/readContract, viem.sh/docs/contract/writeContract]
- [Convex Actions documentation](https://docs.convex.dev/functions/actions) -- "use node" directive, action patterns [CITED: docs.convex.dev/functions/actions]
- npm registry -- viem 2.47.12, convex 1.35.1, @convex-dev/workflow 0.3.9 [VERIFIED: npm view]

### Secondary (MEDIUM confidence)
- [Base Sepolia chain info](https://chainlist.org/chain/84532) -- Chain ID 84532, RPC endpoints [CITED: chainlist.org]
- [ERC-8004 overview (eco.com)](https://eco.com/support/en/articles/13221214-what-is-erc-8004-the-ethereum-standard-enabling-trustless-ai-agents) -- mainnet launch date Jan 2026 [CITED: web search]

### Tertiary (LOW confidence)
- Base Sepolia contract functionality -- basescan API returned NOTOK for ABI verification. Contracts may exist but not be verified on the explorer. Needs runtime verification. [NEEDS VALIDATION]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- viem is well-documented, pre-decided. No custom contracts needed.
- Architecture: HIGH -- ERC-8004 interfaces fully documented, ABI verified. Convex action pattern is standard.
- Pitfalls: HIGH -- "use node" limitations, BigInt serialization, private key management are well-known Convex + blockchain patterns.
- Contract addresses: MEDIUM -- addresses from official repo README, but basescan couldn't verify ABI. Runtime test needed.

**Research date:** 2026-04-12
**Valid until:** 2026-05-12 (stable -- ERC-8004 v1 is deployed, viem is mature)
