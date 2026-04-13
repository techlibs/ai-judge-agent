---
plan: 01-02
phase: 01-foundation-and-proposals
status: complete
started: 2026-04-12T22:40:00Z
completed: 2026-04-12T22:55:00Z
duration_minutes: 15
---

# Plan 01-02 Summary: Next.js Bootstrap

## What Was Built

- **Next.js 16 App Router** bootstrapped with Bun, TypeScript strict mode
- **8 shadcn/ui components**: button, card, input, textarea, badge, separator, skeleton, label
- **Shared types**: Zod proposal schema with field limits, proposal status enum, scoring weights, env validation
- **App shell**: Navbar with "IPE City Grants" + "Submit Proposal" link, footer with IPE City link
- **Security headers**: CSP, HSTS, X-Frame-Options, Permissions-Policy in next.config.ts
- **Root redirect**: `/` redirects to `/proposals`
- **Proposals layout**: max-w-3xl centered container

## Deviations

- **shadcn v4 uses @base-ui/react**: Button no longer has `asChild` prop. Used `buttonVariants()` with Link instead.
- **Next.js 16** installed instead of 15.x (latest stable from create-next-app)
- **Zod 4.3.6** installed (latest, compatible API with v3 for schemas used)
- **Skipped health endpoint**: Will add in Plan 01-03 when chain/IPFS clients exist
- **Skipped rate limiting deps**: `@upstash/ratelimit` and `isomorphic-dompurify` not installed yet (needed in Plan 01-03)

## Key Files

### Created
- `package.json` -- Next.js + viem + zod dependencies
- `src/lib/constants/proposal.ts` -- Status enum, field limits, scoring weights
- `src/lib/schemas/proposal.ts` -- Zod proposal validation schema
- `src/lib/env.ts` -- Server/client env validation
- `src/components/app-shell.tsx` -- Navbar + footer layout
- `src/app/layout.tsx` -- Root layout with Inter font
- `src/app/page.tsx` -- Root redirect to /proposals
- `src/app/proposals/layout.tsx` -- 768px max-width container
- `src/app/proposals/page.tsx` -- Placeholder proposals list
- `.env.example` -- Environment variable template
- `next.config.ts` -- Security headers
- `components.json` -- shadcn/ui config

## Self-Check: PASSED

- [x] All tasks executed
- [x] Each task committed individually (3 commits)
- [x] bun run build exits 0
- [x] TypeScript strict mode enabled
- [x] 8 shadcn components installed
- [x] Proposal schema validates with field limits
- [x] App shell renders with navbar and footer
- [x] Root redirects to /proposals
