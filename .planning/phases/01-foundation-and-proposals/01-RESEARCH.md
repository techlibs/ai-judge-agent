# Phase 1: Foundation and Proposals - Research

**Researched:** 2026-04-12
**Updated:** 2026-04-12 (architecture migration: Convex DB replaced with on-chain + IPFS)
**Domain:** Next.js App Router + On-Chain (ERC-8004) + IPFS + shadcn/ui (greenfield project setup + proposal CRUD)
**Confidence:** HIGH

> **ARCHITECTURE NOTE:** This research was originally written for a Convex DB architecture. The project has since migrated to **on-chain + IPFS** as the storage layer (see CLAUDE.md "Alternatives Considered" — Convex DB was explicitly rejected in favor of web3-native storage). All Convex-specific patterns below are **SUPERSEDED** and retained only for historical reference. The active architecture uses:
> - **IPFS (Pinata)** for content storage (proposals, evaluations)
> - **viem** for TypeScript Ethereum client (Base Sepolia)
> - **Foundry** for smart contract development (ERC-8004)
> - **Next.js API routes** for server-side IPFS pinning and chain transactions

## Summary

Phase 1 establishes the entire project foundation -- Next.js App Router application with on-chain + IPFS as the storage layer, shadcn/ui for components, and the complete proposal submission and browsing workflow. This is a greenfield build: no `package.json`, no `src/`, no existing code exists yet.

The core technical challenge involves: Foundry smart contract development (IdentityRegistry + ReputationRegistry), IPFS content pinning via Pinata, viem chain interactions for reading/writing, and a form-based submission UI. All pages are public (no auth), which simplifies the entire phase.

**Primary recommendation:** Bootstrap with `create-next-app`, add viem + zod + shadcn/ui, deploy ERC-8004 contracts with Foundry, then build the three pages (submit, list, detail) using Next.js API routes that interact with IPFS and chain.

## Project Constraints (from CLAUDE.md)

### Locked Decisions (from PROJECT.md / CLAUDE.md)
- **Runtime:** Bun as package manager and runner
- **Framework:** Next.js 15.x App Router on Vercel
- **Language:** TypeScript strict mode -- no `any`, no `as Type`, no `!`, no `@ts-ignore`
- **Storage:** On-chain (ERC-8004) + IPFS (Pinata) -- NO centralized database
- **Styling:** Tailwind CSS 4.x + shadcn/ui
- **Validation:** Zod at boundaries
- **Chain client:** viem (server-side in API routes)
- **Smart contracts:** Foundry + Solidity 0.8.24+ + OpenZeppelin 5.x
- **Testnet:** Base Sepolia
- **No auth for v1:** All pages publicly accessible (UI-04)
- **Deployment:** Vercel

### Project Conventions
- Semantic naming (no `Helper`, `Util` suffixes)
- Guard clauses over nesting
- No magic numbers or strings -- extract to named constants
- No flag arguments -- split into distinct functions
- Group related parameters into objects
- Prompt transparency: AI-generated docs need `.prompt.md` companions

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PROP-01 | User can submit a proposal with structured fields (title, description, team info, budget, external links) | Next.js API route validates with Zod, pins to IPFS via Pinata REST API, registers on IdentityRegistry via viem |
| PROP-02 | User can view a list of all proposals with status and aggregate scores | API route reads ProjectRegistered events via viem getLogs, fetches content from IPFS, reads ReputationRegistry for scores |
| PROP-03 | Proposal status transitions through: submitted -> evaluating -> evaluated | Status derived from on-chain state: no feedback = submitted, feedback exists = evaluated. Evaluating set during Phase 2 |
| PROP-04 | User can view full proposal details on a dedicated page | Next.js dynamic route `app/proposals/[id]/page.tsx`; API route reads IdentityRegistry.getMetadata + IPFS content |
| UI-04 | Public access -- no authentication required for any page | No auth provider needed; all API routes and pages are public |
| STORE-01 | Proposal content stored on IPFS with content hash recorded on-chain | Pinata REST API for IPFS pinning; CID stored as agentURI in IdentityRegistry |
| STORE-03 | On-chain contract stores scores and IPFS content hashes as canonical source of truth | IdentityRegistry stores project identity + IPFS CID; ReputationRegistry stores evaluation scores |
| STORE-04 | Any off-chain read cache must be fully rebuildable from on-chain events and IPFS content | List API reads from chain events (getLogs) + IPFS; no database cache needed |
| CHAIN-01 | ERC-8004 IdentityRegistry deployed to testnet | Foundry deploy script broadcasts to Base Sepolia |
| CHAIN-02 | ERC-8004 ReputationRegistry deployed to testnet | Foundry deploy script broadcasts to Base Sepolia |
| CHAIN-03 | Project identity registered on-chain when first proposal is submitted | API route calls IdentityRegistry.register() after IPFS pin |
</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 15.5.15 | Web framework (App Router) | Project decision. Latest stable 15.x. App Router for RSC + Server Components. [VERIFIED: npm registry] |
| typescript | 5.7.x | Language | Project specifies strict mode + 5.7+. [VERIFIED: npm registry -- 5.7.3 latest in 5.7 line] |
| zod | 4.3.6 | Schema validation | Project decision. Client-side form validation + future Mastra/AI SDK structured output. [VERIFIED: npm registry] |
| tailwindcss | 4.2.2 | Styling | Project decision. v4 with new @theme directive. [VERIFIED: npm registry] |
| viem | 2.47.x | TypeScript Ethereum client | Type-safe, tree-shakeable. Server-side chain interactions via Next.js API routes. [VERIFIED: npm registry] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| shadcn (CLI) | 4.2.0 | Component library CLI | Init project components + add individual components. [VERIFIED: npm registry] |
| @tailwindcss/postcss | 4.2.2 | PostCSS plugin for Tailwind v4 | Required for Tailwind v4 with Next.js. [VERIFIED: npm registry] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| viem (server-side) | wagmi (React hooks) | No wallet UI needed; on-chain writes are server-side from API routes |
| Pinata REST API | Pinata SDK | REST API avoids extra dependency; SDK adds convenience but more bundle |
| Foundry | Hardhat | Foundry is faster, Solidity-native tests, no JS dependency bloat |

**Installation (Phase 1 bootstrap sequence):**
```bash
# 1. Create Next.js app with Bun
bunx create-next-app@latest . --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --yes

# 2. Install core dependencies
bun add zod viem

# 3. Initialize shadcn/ui
bunx shadcn@latest init --defaults --yes

# 4. Add needed shadcn components
bunx shadcn@latest add button card input textarea badge separator skeleton label

# 5. Smart contracts (separate directory: contracts/)
# Install Foundry via foundryup
cd contracts && forge init --no-commit --no-git
forge install OpenZeppelin/openzeppelin-contracts@v5.3.0 --no-commit --no-git
```

## Architecture Patterns

### Recommended Project Structure
```
agent-reviewer/
  src/
    app/
      layout.tsx              # Root layout with AppShell
      page.tsx                # Home / redirect to proposals
      proposals/
        layout.tsx            # Max-width container
        page.tsx              # Proposal list (PROP-02)
        new/
          page.tsx            # Proposal submission form (PROP-01)
        [id]/
          page.tsx            # Proposal detail (PROP-04)
      api/
        proposals/
          submit/
            route.ts          # POST: validate -> IPFS pin -> chain register
          route.ts            # GET: list from chain events + IPFS
          [tokenId]/
            route.ts          # GET: single proposal from chain + IPFS
    components/
      ui/                     # shadcn/ui components (auto-generated)
      proposals/
        proposal-form.tsx     # Submission form component
        proposal-card.tsx     # Card for list view
        proposal-status-badge.tsx  # Status badge component
      app-shell.tsx           # NavBar + Footer + MainContent
    lib/
      utils.ts                # shadcn/ui cn() utility
      env.ts                  # Zod-validated environment variables
      schemas/
        proposal.ts           # Zod schemas for proposal validation
      constants/
        proposal.ts           # Status labels, score weights, field limits
      chain/
        client.ts             # viem public + wallet clients
        contracts.ts          # ABIs + contract addresses
      ipfs/
        client.ts             # Pinata REST API client
        types.ts              # IPFS content types + Zod schemas
  contracts/
    src/
      IdentityRegistry.sol    # ERC-8004 identity registry
      ReputationRegistry.sol  # Reputation/feedback registry
    test/
      IdentityRegistry.t.sol
      ReputationRegistry.t.sol
    script/
      Deploy.s.sol            # Deployment script
    foundry.toml
```

### Pattern 1: IPFS + On-Chain Storage
**What:** Content pinned to IPFS, content hash stored on-chain
**When to use:** All proposal content and evaluation results
**Example:**
```typescript
// Pin content to IPFS
const ipfsCID = await pinJSON(proposalContent);

// Register on-chain with IPFS CID as agentURI
const txHash = await walletClient.writeContract({
  address: identityRegistry,
  abi: IDENTITY_REGISTRY_ABI,
  functionName: "register",
  args: [ownerAddress, ipfsCID],
});
```

### Pattern 2: Chain Event Reading for Lists
**What:** Read all proposals from on-chain events instead of a database
**When to use:** List views that need all historical data (STORE-04 compliant)
**Example:**
```typescript
const logs = await publicClient.getLogs({
  address: identityRegistry,
  event: ProjectRegisteredEvent,
  fromBlock: 0n,
  toBlock: "latest",
});
// Enrich with IPFS content for display
```

### Pattern 3: Zod Schema for Client-Side Form Validation
**What:** Define proposal validation once in Zod, use for form validation and type inference
**When to use:** All form inputs before sending to API route
**Example:**
```typescript
import { z } from "zod";

export const proposalSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().min(50).max(5000),
  teamInfo: z.string().min(10).max(2000),
  budget: z.number().positive().max(1_000_000),
  externalLinks: z.array(z.string().url()).max(5),
});

export type ProposalInput = z.infer<typeof proposalSchema>;
```

### Pattern 4: Zod Validation Instead of Type Assertions
**What:** Use Zod to validate and narrow types instead of `as Type` casts
**When to use:** Any place where data crosses a trust boundary (API responses, env vars, URL params)
**Example:**
```typescript
// WRONG (violates CLAUDE.md):
const result = (await response.json()) as PinataResponse;
const address = envVar as Address;

// RIGHT:
const json: unknown = await response.json();
const result = pinataResponseSchema.parse(json);

const address = addressSchema.parse(envVar); // Zod refine with isAddress
```

### Anti-Patterns to Avoid
- **Using `as Type` for any type narrowing:** Use Zod schemas or type guards instead. Zero tolerance per CLAUDE.md.
- **Raw topics parsing for event decoding:** Use viem's `decodeEventLog` for reliable event parsing.
- **Putting secrets in NEXT_PUBLIC_ env vars:** Server-side keys (PINATA_API_KEY, DEPLOYER_PRIVATE_KEY) must NOT be prefixed with NEXT_PUBLIC_.
- **Non-null assertions on env vars:** Use Zod validation for environment variables instead of `!` or `as string`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Form UI components | Custom inputs, buttons, cards | shadcn/ui (Input, Textarea, Button, Card, Badge) | Accessible, consistent, Tailwind-native |
| Form validation | Manual if/else validation | Zod schemas | Type inference, composable, reusable in Phase 2 for Mastra/AI SDK structured output |
| Chain interactions | Raw fetch to RPC | viem (createPublicClient, createWalletClient) | Type-safe, handles encoding/decoding |
| Event decoding | Raw topics/data parsing | viem decodeEventLog | Reliable ABI-based decoding |
| CSS utility merging | Manual className concatenation | `cn()` from shadcn/ui (clsx + tailwind-merge) | Handles Tailwind class conflicts correctly |

## Common Pitfalls

### Pitfall 1: Server Component vs Client Component Boundary
**What goes wrong:** Trying to use React hooks (useState, useEffect) in a Server Component
**Why it happens:** Next.js App Router defaults to Server Components
**How to avoid:** Mark any component using hooks with `"use client"` directive. API interactions via fetch in useEffect require client components.
**Warning signs:** "useState is not a function" or hydration mismatch errors

### Pitfall 2: Type Assertions Violating CLAUDE.md
**What goes wrong:** Using `as Type` to narrow types from external data
**Why it happens:** Quick shortcut when dealing with API responses, env vars, viem types
**How to avoid:** Always use Zod schemas to parse unknown data. For viem Address, use `isAddress()` as a Zod refinement. For private keys, validate hex format with Zod regex before template literal construction.
**Warning signs:** Any `as ` followed by a type name in the codebase

### Pitfall 3: IPFS Gateway Unavailability
**What goes wrong:** IPFS content fetch fails, breaking list and detail views
**Why it happens:** Public IPFS gateways have rate limits and occasional downtime
**How to avoid:** Graceful degradation: show "Content unavailable" for failed fetches. Use try/catch around each IPFS fetch in list view.
**Warning signs:** Blank proposal cards, 502 errors on detail pages

### Pitfall 4: Environment Variable Not Available in Client
**What goes wrong:** `process.env.RPC_URL` is `undefined` in client-side code
**Why it happens:** Only env vars prefixed with `NEXT_PUBLIC_` are exposed to client-side code in Next.js
**How to avoid:** Chain interaction env vars (RPC_URL, DEPLOYER_PRIVATE_KEY) are server-only. Only contract addresses need NEXT_PUBLIC_ prefix (for client display, e.g., block explorer links).
**Warning signs:** undefined errors when constructing viem clients

### Pitfall 5: Zod v4 Breaking Changes
**What goes wrong:** Import paths or API changed between Zod 3.x and 4.x
**Why it happens:** Zod 4 was a major version bump with API changes
**How to avoid:** Use Zod 4.x documentation, not 3.x examples. Key change: `z.coerce.number()` and error formatting may differ. Test validation logic early. [ASSUMED]
**Warning signs:** TypeScript errors on Zod imports, unexpected validation behavior

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Next.js Pages Router | Next.js App Router | Next.js 13+ (stable in 14+) | Server Components by default, new data fetching patterns |
| Tailwind CSS v3 (tailwind.config.js) | Tailwind CSS v4 (@theme directive, CSS-first config) | Early 2025 | No JS config file, CSS-native customization |
| Zod 3.x | Zod 4.x | 2025 | API changes, check migration guide [ASSUMED] |
| shadcn/ui with forwardRef | shadcn/ui without forwardRef (React 19) | 2025 | Components simplified for React 19 |
| ethers.js | viem | 2024+ | Better TypeScript inference, tree-shakeable, smaller bundle |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Zod 4.x has breaking changes from 3.x that affect form validation | Common Pitfalls (Pitfall 5) | LOW -- if API is compatible, no issue; if breaking, forms may need adjustment |
| A2 | `create-next-app` with `--ts --tailwind --app --src-dir` flags works with Bun (`bunx`) | Installation | LOW -- can fall back to `npx` if bun wrapper has issues |
| A3 | Base Sepolia RPC is reliable enough for development | Architecture | LOW -- can switch to Ethereum Sepolia if Base has issues |

**All other claims verified via npm registry or official documentation.**

## Open Questions (RESOLVED)

1. **Proposal ID format in URLs** (RESOLVED)
   - Resolved: Proposals use on-chain tokenId (uint256, auto-incrementing starting at 1). These are URL-safe integers. Dynamic route is `/proposals/[id]` where id is the tokenId string.

2. **Convex project initialization with Bun** (RESOLVED — N/A)
   - Resolved: Convex was replaced with on-chain + IPFS storage. No Convex initialization needed.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Bun | Package manager / runner | Yes | 1.3.1 | npm / npx |
| Node.js | Next.js dev | Yes | v23.10.0 | -- |
| Git | Version control | Yes | 2.50.1 | -- |
| Foundry | Smart contract dev | Yes (via foundryup) | 1.6.x | -- |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** None. All required tools are available.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | No auth for v1 (UI-04) |
| V3 Session Management | No | No sessions for v1 |
| V4 Access Control | No | All public for v1 |
| V5 Input Validation | Yes | Zod validation on client + API route; Solidity custom errors on-chain |
| V6 Cryptography | Partial | Private key management for chain transactions (server-side only) |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malicious form input (XSS via proposal fields) | Tampering | React auto-escapes output; Zod validates input length/format; IPFS stores as JSON (not HTML) |
| Spam proposal submission | Denial of Service | Gas costs on Base Sepolia provide natural rate limiting; Pinata has API-level rate limits |
| Invalid tokenId in URL | Tampering | On-chain contract call reverts for non-existent tokens; caught as 404 |
| Private key exposure | Information Disclosure | DEPLOYER_PRIVATE_KEY only in .env.local (gitignored); only accessed via getServerEnv() in API routes |

## Sources

### Primary (HIGH confidence)
- [viem documentation](https://viem.sh/) - PublicClient, WalletClient, decodeEventLog, getLogs
- [ERC-8004 specification](https://eips.ethereum.org/EIPS/eip-8004) - Identity registry standard
- [Foundry toolchain](https://github.com/foundry-rs/foundry) - forge, cast, anvil
- [Pinata IPFS SDK](https://docs.pinata.cloud/) - REST API for pinning
- [shadcn/ui Next.js Installation](https://ui.shadcn.com/docs/installation/next) - CLI init, component adding
- npm registry - All package versions verified via `npm view`

### Secondary (MEDIUM confidence)
- [OpenZeppelin Contracts 5.x](https://docs.openzeppelin.com/contracts/5.x/) - ERC-721 base for IdentityRegistry

### Tertiary (LOW confidence)
- Zod 3.x to 4.x migration details -- assumed based on major version change, not verified against migration guide

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All versions verified via npm registry, project decisions are locked
- Architecture: HIGH - On-chain + IPFS pattern is well-documented with viem and Pinata
- Pitfalls: HIGH (4/5) / LOW (1/5) - Zod v4 pitfall is assumed

**Research date:** 2026-04-12
**Updated:** 2026-04-12 (Convex -> on-chain + IPFS migration)
**Valid until:** 2026-05-12 (stable stack, 30 days)

---

<details>
<summary>SUPERSEDED: Original Convex DB Architecture (historical reference only)</summary>

The following patterns were part of the original research when Convex DB was the planned storage layer. They are **no longer applicable** — retained only for historical context.

- Convex schema with `defineTable` and `v` validators
- `convex/model/` directory for business logic separation
- ConvexClientProvider for App Router
- `useQuery` / `useMutation` hooks for real-time data
- Convex project initialization (`bunx convex dev`)

See git history for the full original research content.

</details>
