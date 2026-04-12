# Phase 1: Foundation and Proposals - Research

**Researched:** 2026-04-12
**Domain:** Next.js App Router + Convex DB + shadcn/ui (greenfield project setup + proposal CRUD)
**Confidence:** HIGH

## Summary

Phase 1 establishes the entire project foundation -- Next.js App Router application with Convex as the database/backend, shadcn/ui for components, and the complete proposal submission and browsing workflow. This is a greenfield build: no `package.json`, no `src/`, no existing code exists yet.

The core technical challenge is straightforward: Convex schema design for proposals with status tracking, a form for submission, a list page, and a detail page. The stack is well-documented and the team has prior Convex experience (learn-to-fly-prod reference). All pages are public (no auth), which simplifies the entire phase.

**Primary recommendation:** Bootstrap with `create-next-app`, add Convex + shadcn/ui, define the proposals schema with status enum and indexes, then build the three pages (submit, list, detail) using Convex queries/mutations with shadcn/ui form components.

## Project Constraints (from CLAUDE.md)

### Locked Decisions (from PROJECT.md / CLAUDE.md)
- **Runtime:** Bun as package manager and runner
- **Framework:** Next.js 15.x App Router on Vercel
- **Language:** TypeScript strict mode -- no `any`, no `as Type`, no `!`, no `@ts-ignore`
- **Database:** Convex DB with domain-driven `convex/model/` structure
- **Styling:** Tailwind CSS 4.x + shadcn/ui
- **Validation:** Zod at boundaries
- **No auth for v1:** All pages publicly accessible (UI-04)
- **Deployment:** Vercel with Convex Cloud

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
| PROP-01 | User can submit a proposal with structured fields (title, description, team info, budget, external links) | Convex mutation pattern with `v` validators for typed args; shadcn/ui form components (Input, Textarea, Button); Zod schema for client-side validation |
| PROP-02 | User can view a list of all proposals with status and aggregate scores | Convex query with `collect()` on proposals table; index `by_status` for filtered views; scores display placeholder (0 until Phase 2) |
| PROP-03 | Proposal status transitions through: submitted -> evaluating -> evaluated | Schema uses `v.union(v.literal("submitted"), v.literal("evaluating"), v.literal("evaluated"))` for type-safe status enum; internal mutation for status transitions |
| PROP-04 | User can view full proposal details on a dedicated page | Next.js dynamic route `app/proposals/[id]/page.tsx`; Convex query by `_id` |
| UI-04 | Public access -- no authentication required for any page | No auth provider needed; ConvexProvider without auth wrapper; all queries/mutations are public |
</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 15.5.15 | Web framework (App Router) | Project decision. Latest stable 15.x. App Router for RSC + Server Components. [VERIFIED: npm registry] |
| convex | 1.35.1 | Database + backend functions | Project decision. Real-time subscriptions, typed schema, transactional mutations. [VERIFIED: npm registry] |
| typescript | 5.7.x | Language | Project specifies strict mode + 5.7+. [VERIFIED: npm registry -- 5.7.3 latest in 5.7 line] |
| zod | 4.3.6 | Schema validation | Project decision. Client-side form validation + future OpenAI structured output. [VERIFIED: npm registry] |
| tailwindcss | 4.2.2 | Styling | Project decision. v4 with new @theme directive. [VERIFIED: npm registry] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| shadcn (CLI) | 4.2.0 | Component library CLI | Init project components + add individual components. [VERIFIED: npm registry] |
| convex-helpers | 0.1.114 | Convex utilities | Zod-to-Convex validator conversion if needed. [VERIFIED: npm registry] |
| @tailwindcss/postcss | 4.2.2 | PostCSS plugin for Tailwind v4 | Required for Tailwind v4 with Next.js. [VERIFIED: npm registry] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Convex validators for forms | react-hook-form + zod | Adds complexity; for Phase 1's simple form, Zod + controlled inputs suffice. Can add react-hook-form later if forms get complex. |
| shadcn/ui Card for proposals | Custom components | shadcn/ui Card, Badge, Table provide consistent styling with zero custom CSS work |

**Installation (Phase 1 bootstrap sequence):**
```bash
# 1. Create Next.js app with Bun
bunx create-next-app@latest agent-reviewer --ts --tailwind --eslint --app --src-dir --import-alias "@/*"

# 2. Install Convex
bun add convex

# 3. Initialize Convex project
bunx convex dev

# 4. Initialize shadcn/ui
bunx shadcn@latest init

# 5. Add needed shadcn components
bunx shadcn@latest add button card input textarea badge table separator

# 6. Install Zod for form validation
bun add zod
```

## Architecture Patterns

### Recommended Project Structure
```
agent-reviewer/
  src/
    app/
      layout.tsx              # Root layout with ConvexClientProvider
      page.tsx                # Home / redirect to proposals
      providers.tsx           # "use client" ConvexProvider wrapper
      proposals/
        page.tsx              # Proposal list (PROP-02)
        new/
          page.tsx            # Proposal submission form (PROP-01)
        [id]/
          page.tsx            # Proposal detail (PROP-04)
    components/
      ui/                     # shadcn/ui components (auto-generated)
      proposals/
        proposal-form.tsx     # Submission form component
        proposal-card.tsx     # Card for list view
        proposal-status-badge.tsx  # Status badge component
    lib/
      utils.ts                # shadcn/ui cn() utility
      schemas/
        proposal.ts           # Zod schemas for proposal validation
      constants/
        proposal.ts           # Status labels, score weights, field limits
  convex/
    schema.ts                 # Table definitions with indexes
    model/
      proposals.ts            # Business logic helpers (plain TS functions)
    proposals.ts              # Public query/mutation API (thin wrappers)
    _generated/               # Auto-generated by Convex CLI
```

### Pattern 1: Convex Schema with Status Enum
**What:** Type-safe status field using union of literals
**When to use:** Any field with a fixed set of values
**Example:**
```typescript
// Source: https://docs.convex.dev/database/schemas
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Extract status values as constants
const proposalStatus = v.union(
  v.literal("submitted"),
  v.literal("evaluating"),
  v.literal("evaluated"),
);

export default defineSchema({
  proposals: defineTable({
    title: v.string(),
    description: v.string(),
    teamInfo: v.string(),
    budget: v.number(),
    externalLinks: v.array(v.string()),
    status: proposalStatus,
    // Scores populated by Phase 2
    aggregateScore: v.optional(v.number()),
  })
    .index("by_status", ["status"])
    .index("by_creation", ["_creationTime"]),
});
```

### Pattern 2: Model + Public API Separation
**What:** Business logic in `convex/model/`, thin wrappers in `convex/proposals.ts`
**When to use:** Always -- follows Convex best practices [CITED: docs.convex.dev/understanding/best-practices/]
**Example:**
```typescript
// convex/model/proposals.ts -- business logic
import { MutationCtx, QueryCtx } from "../_generated/server";

export async function getAllProposals(ctx: QueryCtx) {
  return await ctx.db
    .query("proposals")
    .withIndex("by_creation")
    .order("desc")
    .collect();
}

export async function getProposalById(ctx: QueryCtx, id: Id<"proposals">) {
  return await ctx.db.get(id);
}

export async function createProposal(
  ctx: MutationCtx,
  data: {
    title: string;
    description: string;
    teamInfo: string;
    budget: number;
    externalLinks: string[];
  },
) {
  return await ctx.db.insert("proposals", {
    ...data,
    status: "submitted",
  });
}

// convex/proposals.ts -- public API
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAllProposals, getProposalById, createProposal } from "./model/proposals";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await getAllProposals(ctx);
  },
});

export const getById = query({
  args: { id: v.id("proposals") },
  handler: async (ctx, args) => {
    return await getProposalById(ctx, args.id);
  },
});

export const submit = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    teamInfo: v.string(),
    budget: v.number(),
    externalLinks: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    return await createProposal(ctx, args);
  },
});
```

### Pattern 3: ConvexClientProvider for App Router
**What:** Client component wrapper required because root layout is a Server Component
**When to use:** Once, at app root [CITED: docs.convex.dev/client/nextjs/app-router/]
**Example:**
```typescript
// src/app/providers.tsx
"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode } from "react";

const convex = new ConvexReactClient(
  process.env.NEXT_PUBLIC_CONVEX_URL as string,
);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
```

Note: The quickstart uses `!` (non-null assertion) on the env var. Since the project forbids `!`, use `as string` -- but the project also forbids `as Type`. The solution is to validate the env var at startup:

```typescript
// src/lib/env.ts
import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_CONVEX_URL: z.string().url(),
});

// Validated at module load time -- crashes fast if missing
export const env = envSchema.parse({
  NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL,
});
```

Then use `env.NEXT_PUBLIC_CONVEX_URL` in the provider.

### Pattern 4: Zod Schema for Client-Side Form Validation
**What:** Define proposal validation once in Zod, use for form validation and type inference
**When to use:** All form inputs before sending to Convex mutation
**Example:**
```typescript
// src/lib/schemas/proposal.ts
import { z } from "zod";

export const proposalSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(200),
  description: z.string().min(50, "Description must be at least 50 characters").max(5000),
  teamInfo: z.string().min(10, "Team info must be at least 10 characters").max(2000),
  budget: z.number().positive("Budget must be positive").max(1_000_000),
  externalLinks: z.array(z.string().url("Must be a valid URL")).max(5),
});

export type ProposalInput = z.infer<typeof proposalSchema>;
```

### Anti-Patterns to Avoid
- **Calling actions from client for simple CRUD:** Mutations are sufficient for proposal creation. Actions are for side effects (API calls, file processing). [CITED: docs.convex.dev/functions/actions]
- **Using `ctx.runQuery` inside mutations:** Use plain TypeScript helper functions from `convex/model/` instead. `ctx.runQuery` adds unnecessary overhead within same-runtime calls. [CITED: docs.convex.dev/understanding/best-practices/]
- **Putting business logic in public API files:** Keep `convex/proposals.ts` as thin wrappers. Logic in `convex/model/proposals.ts`.
- **Using `v.any()` in schema:** Always use specific validators. The project enforces no type escapes.
- **Non-null assertions on env vars:** Use Zod validation for environment variables instead of `!` or `as string`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Form UI components | Custom inputs, buttons, cards | shadcn/ui (Input, Textarea, Button, Card, Badge) | Accessible, consistent, Tailwind-native |
| Form validation | Manual if/else validation | Zod schemas | Type inference, composable, reusable in Phase 2 for OpenAI structured output |
| Real-time data fetching | Custom WebSocket or polling | Convex `useQuery` hook | Automatic real-time subscriptions, cache management |
| Database schema types | Manual TypeScript interfaces | Convex schema `defineTable` + `v` validators | Auto-generates types, runtime validation |
| CSS utility merging | Manual className concatenation | `cn()` from shadcn/ui (clsx + tailwind-merge) | Handles Tailwind class conflicts correctly |

## Common Pitfalls

### Pitfall 1: Server Component vs Client Component Boundary
**What goes wrong:** Trying to use `useQuery` or `useMutation` from Convex in a Server Component
**Why it happens:** Next.js App Router defaults to Server Components; Convex hooks require client context
**How to avoid:** Mark any component using Convex hooks with `"use client"` directive. Page components that use Convex data must be client components, or pass data from client wrapper to presentational children.
**Warning signs:** "useQuery is not a function" or hydration mismatch errors

### Pitfall 2: Convex Schema Migration During Development
**What goes wrong:** Changing schema after data exists causes validation errors
**Why it happens:** Convex enforces schema at runtime; existing documents must match new schema
**How to avoid:** Use `v.optional()` for new fields added to existing tables. In early development, `npx convex dev --reset` can wipe the database to start fresh.
**Warning signs:** Deployment fails with schema validation errors

### Pitfall 3: Missing Indexes for Queries
**What goes wrong:** Queries without indexes scan the entire table -- slow and expensive
**Why it happens:** Convex does not auto-create indexes; you must define them explicitly
**How to avoid:** Add `.index()` in schema for every field used in `.withIndex()` queries. Plan indexes at schema design time.
**Warning signs:** Slow queries, Convex dashboard showing full table scans

### Pitfall 4: Environment Variable Not Available in Client
**What goes wrong:** `process.env.NEXT_PUBLIC_CONVEX_URL` is `undefined` at runtime
**Why it happens:** Only env vars prefixed with `NEXT_PUBLIC_` are exposed to client-side code in Next.js
**How to avoid:** Convex CLI creates `.env.local` with the correct prefix. Validate with Zod at startup to catch this early.
**Warning signs:** ConvexReactClient throws "invalid URL" error

### Pitfall 5: Zod v4 Breaking Changes
**What goes wrong:** Import paths or API changed between Zod 3.x and 4.x
**Why it happens:** Zod 4 was a major version bump with API changes
**How to avoid:** Use Zod 4.x documentation, not 3.x examples. Key change: `z.coerce.number()` and error formatting may differ. Test validation logic early. [ASSUMED]
**Warning signs:** TypeScript errors on Zod imports, unexpected validation behavior

## Code Examples

### Proposal Form with Zod Validation
```typescript
// src/components/proposals/proposal-form.tsx
"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { proposalSchema, type ProposalInput } from "@/lib/schemas/proposal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ProposalForm() {
  const submitProposal = useMutation(api.proposals.submit);
  // Form state + Zod validation + mutation call
  // Use proposalSchema.safeParse() before calling submitProposal()
}
```

### Proposal List with Real-Time Updates
```typescript
// src/app/proposals/page.tsx
"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

export default function ProposalsPage() {
  const proposals = useQuery(api.proposals.list);

  if (proposals === undefined) {
    return <div>Loading...</div>; // Convex returns undefined while loading
  }

  return (
    <div>
      {proposals.map((proposal) => (
        <ProposalCard key={proposal._id} proposal={proposal} />
      ))}
    </div>
  );
}
```

### Dynamic Route for Proposal Detail
```typescript
// src/app/proposals/[id]/page.tsx
"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

export default function ProposalDetailPage() {
  const params = useParams();
  const proposalId = params.id as Id<"proposals">; // Convex IDs are strings
  // NOTE: This is the ONE place where a type assertion is pragmatically
  // needed -- Convex IDs from URL params. Wrap in a validator:
  const proposal = useQuery(
    api.proposals.getById,
    proposalId ? { id: proposalId } : "skip",
  );
  // Render full proposal details
}
```

**Important note on Convex IDs from URL params:** Convex document IDs are opaque strings. When receiving from URL params, the safest approach is to pass the string directly to the Convex query and let Convex validate it server-side (the `v.id("proposals")` validator will reject invalid IDs). Avoid client-side casting.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Next.js Pages Router | Next.js App Router | Next.js 13+ (stable in 14+) | Server Components by default, new data fetching patterns |
| Tailwind CSS v3 (tailwind.config.js) | Tailwind CSS v4 (@theme directive, CSS-first config) | Early 2025 | No JS config file, CSS-native customization |
| Zod 3.x | Zod 4.x | 2025 | API changes, check migration guide [ASSUMED] |
| shadcn/ui with forwardRef | shadcn/ui without forwardRef (React 19) | 2025 | Components simplified for React 19 |
| Convex `convex/` flat files | Convex `convex/model/` + thin wrappers | Best practice (ongoing) | Better separation of concerns |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Zod 4.x has breaking changes from 3.x that affect form validation | Common Pitfalls (Pitfall 5) | LOW -- if API is compatible, no issue; if breaking, forms may need adjustment |
| A2 | `create-next-app` with `--ts --tailwind --app --src-dir` flags works with Bun (`bunx`) | Installation | LOW -- can fall back to `npx` if bun wrapper has issues |
| A3 | Convex ID from URL params can be passed directly as string to `v.id()` validator without client-side conversion | Code Examples | MEDIUM -- if Convex rejects the format, need ID validation utility |

**All other claims verified via npm registry or official documentation.**

## Open Questions

1. **Convex project initialization with Bun**
   - What we know: `npx convex dev` is the standard initialization command
   - What's unclear: Whether `bunx convex dev` works identically or has any quirks
   - Recommendation: Try `bunx convex dev` first, fall back to `npx convex dev` if issues arise. The Convex CLI is a Node.js tool and should work via either runner.

2. **Proposal ID format in URLs**
   - What we know: Convex IDs are opaque strings (e.g., `k57fh2...`)
   - What's unclear: Whether these are URL-safe or need encoding
   - Recommendation: Convex IDs are URL-safe base62-ish strings. Use directly in routes. If issues arise, URL-encode them.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Bun | Package manager / runner | Yes | 1.3.1 | npm / npx |
| Node.js | Convex CLI, Next.js dev | Yes | v23.10.0 | -- |
| Git | Version control | Yes | 2.50.1 | -- |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** None. All required tools are available.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | No auth for v1 (UI-04) |
| V3 Session Management | No | No sessions for v1 |
| V4 Access Control | No | All public for v1 |
| V5 Input Validation | Yes | Zod validation on client, Convex `v` validators on server |
| V6 Cryptography | No | No sensitive data in Phase 1 |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malicious form input (XSS via proposal fields) | Tampering | Convex stores data as typed values (not raw HTML); React auto-escapes output. Zod validation limits input length. |
| Spam proposal submission | Denial of Service | Out of scope for v1 -- no auth means no rate limiting per user. Convex has built-in rate limiting at the platform level. |
| Invalid Convex ID in URL | Tampering | Server-side `v.id("proposals")` validator rejects invalid IDs; query returns null for non-existent documents |

## Sources

### Primary (HIGH confidence)
- [Convex Next.js App Router setup](https://docs.convex.dev/client/nextjs/app-router/) - Provider pattern, client component requirements
- [Convex Schemas](https://docs.convex.dev/database/schemas) - defineSchema, defineTable, validators, indexes
- [Convex Best Practices](https://docs.convex.dev/understanding/best-practices/) - model/ directory, thin wrappers, helper functions
- [Convex Reading Data](https://docs.convex.dev/database/reading-data/) - Query patterns, withIndex, collect, first
- [Convex Mutation Functions](https://docs.convex.dev/functions/mutation-functions) - Mutation pattern with args validation
- [shadcn/ui Next.js Installation](https://ui.shadcn.com/docs/installation/next) - CLI init, component adding
- npm registry - All package versions verified via `npm view`

### Secondary (MEDIUM confidence)
- [Convex Next.js Quickstart](https://docs.convex.dev/quickstart/nextjs) - Bootstrap flow, ConvexClientProvider pattern

### Tertiary (LOW confidence)
- Zod 3.x to 4.x migration details -- assumed based on major version change, not verified against migration guide

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All versions verified via npm registry, project decisions are locked
- Architecture: HIGH - Convex official docs prescribe the model/ + thin wrapper pattern
- Pitfalls: HIGH (4/5) / LOW (1/5) - Zod v4 pitfall is assumed

**Research date:** 2026-04-12
**Valid until:** 2026-05-12 (stable stack, 30 days)
