<!--
  Sync Impact Report
  ==================
  Version change: (new) → 1.0.0
  Modified principles: N/A (initial ratification)
  Added sections:
    - Core Principles (6 principles)
    - Technology Constraints
    - Quality Gates
    - Governance
  Removed sections: N/A
  Templates requiring updates:
    - .specify/templates/plan-template.md ✅ aligned (Constitution Check section present)
    - .specify/templates/spec-template.md ✅ aligned (mandatory sections match)
    - .specify/templates/tasks-template.md ✅ aligned (phase structure compatible)
  Follow-up TODOs: none
-->

# Agent Reviewer Constitution

## Core Principles

### I. Transparent Evaluation

Every AI-generated score MUST produce a structured justification containing:
the input data considered, the rubric applied, the dimension scores, and
the reasoning chain. Evaluations MUST be reproducible given identical inputs
and model configuration. No black-box decisions are permitted. All scoring
metadata MUST be persisted for audit.

### II. Specification-First Development

Features begin as specifications, not code. The reference architecture in
`docs/big-reference-architecture/` informs design choices but is not
prescriptive. Each milestone delivers user-facing value defined in advance.
Implementation MUST NOT begin until a spec is approved.

### III. On-Chain Accountability

Fund releases, reputation updates, and dispute resolutions MUST be recorded
on-chain via deterministic smart contracts. Off-chain agents handle semantic
evaluation; on-chain contracts handle financial logic. The system MUST
maintain a clear boundary between off-chain inference and on-chain state
transitions.

### IV. Type Safety and Zero Escape Hatches

TypeScript strict mode is mandatory. The following are prohibited without
exception: `any`, `as Type`, `!` (non-null assertion), `@ts-ignore`,
`@ts-expect-error`, `@ts-nocheck`. Use generics, type guards,
`unknown` + Zod validation, and discriminated unions. Runtime validation
with Zod MUST be applied at all system boundaries (API inputs, LLM outputs,
webhook payloads).

### V. Privacy-Preserving by Design

Team member PII (emails, real names, physical addresses) MUST NOT appear in
evaluation context, LLM prompts, or stored scoring records. Use hashed
identifiers and pseudonymous profiles only. LLM inputs MUST be sanitized
before processing: sensitive URLs replaced with placeholders, emails
obfuscated, and team names hashed.

### VI. Incremental Delivery

Ship working features in small increments. Each milestone MUST deliver
independently testable, user-facing value. The full ARWF vision is achieved
through composed milestones, not a big-bang release. Guard clauses over
nesting; no magic numbers or strings; no flag arguments; group related
parameters into objects.

## Technology Constraints

- **Runtime**: Bun
- **Framework**: Next.js (App Router) deployed on Vercel
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS + shadcn/ui
- **Validation**: Zod for all runtime boundaries
- **AI Scoring**: Four-dimension weighted model (Technical Feasibility 25%,
  Impact Potential 30%, Cost Efficiency 20%, Team Capability 25%)
- **On-Chain**: ERC-8004 for identity/reputation, Safe + ERC-4337 for
  project wallets, deterministic fund release via MilestoneManager
- **Naming**: Semantic domain names only; no `Helper`, `Util`, `Public`
  suffixes

## Quality Gates

- All PRs MUST pass TypeScript strict compilation with zero errors
- All PRs MUST pass lint checks (`bun run lint`)
- No PR may introduce type escape hatches (Principle IV violations)
- Specifications MUST be reviewed before implementation begins
- LLM prompt templates MUST include structured output schemas
- Scoring justifications MUST be stored alongside numeric scores
- PII sanitization MUST be verified before any LLM call

## Governance

This constitution supersedes all other development practices for the
agent-reviewer project. Amendments require:

1. A documented proposal explaining the change and its rationale
2. A version bump following semantic versioning (MAJOR for principle
   removals or redefinitions, MINOR for additions or expansions, PATCH
   for clarifications)
3. A propagation check across all spec-kit templates and dependent
   artifacts

All code reviews MUST verify compliance with these principles.
Complexity beyond what is specified here MUST be justified in writing.

**Version**: 1.0.0 | **Ratified**: 2026-04-12 | **Last Amended**: 2026-04-12
