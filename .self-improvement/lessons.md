# Self-Improvement Lessons

Lessons learned from user corrections. All rules below are incorporated into CLAUDE.md — this file tracks the history and prevention checks.

## Architecture
- **Date**: 2026-04-13
- **Pattern**: Had to decide between parallel subagents and agent teams for 4+ independent research tasks. Chose correctly (subagents), but need a repeatable framework.
- **Rule**: Default to parallel background subagents for independent research (no inter-agent communication). Reserve agent teams for collaborative work requiring debate, shared findings, or multi-file coordination. Key signal: "do agents need to talk to each other?" If no, subagents. If yes, agent teams.
- **Why**: Agent teams add token cost (each has full context window) and coordination overhead (messaging, task-claiming) that isn't needed for independent research. Subagents are cheaper and simpler when only the final result matters. Confirmed by Claude Code docs: "Use subagents when you need quick, focused workers that report back."

## Code Patterns
- **Date**: 2026-04-13
- **Pattern**: Used `page.getByLabel("Name")` for shadcn/ui `<Label>` without `htmlFor`/`id` binding. Hung indefinitely.
- **Rule**: For shadcn/ui fields without `htmlFor`/`id`, use CSS: `page.locator("form div.flex-1:has(label:text-is('Name')) input")`. Only use `getByLabel` with explicit `htmlFor`+`id`.
- **Why**: shadcn `<Label>` without `htmlFor` has no ARIA association. `getByLabel` fails silently.

- **Date**: 2026-04-13
- **Pattern**: `page.getByText("pending")` resolved to multiple elements (badge + text). Strict mode violation.
- **Rule**: Always use `.first()` for text that may appear in multiple places (status badges, scores).
- **Why**: shadcn Badge duplicates text elsewhere on the page.

- **Date**: 2026-04-13
- **Pattern**: `getByRole("heading")` failed for shadcn CardTitle (renders as `<div>`).
- **Rule**: Use `getByText(text, { exact: true }).first()` for CardTitle, not `getByRole("heading")`.
- **Why**: CardTitle type is `React.ComponentProps<"div">`.

## Tool Usage
- **Date**: 2026-04-13
- **Pattern**: Next.js 16 exits code 1 on port conflict even with `reuseExistingServer: true`.
- **Rule**: Kill existing `next dev` processes before `npx playwright test`. Or start server manually and let Playwright reuse it.
- **Why**: Next.js 16 port detection exits before Playwright's URL check can determine the server is usable.

## Domain Knowledge
- **Date**: 2026-04-13
- **Pattern**: Assumed `.toFixed(2)` for scores but app uses `.toFixed(1)` everywhere.
- **Rule**: All scores display as `(bps / 100).toFixed(1)`. Feature files must use single decimal (75.0 not 75.00).
- **Why**: Didn't read ScoreGauge/ProposalCard components before writing feature expectations.

- **Date**: 2026-04-13
- **Pattern**: User said "we dont need anthropic_api_key, use openai instead."
- **Rule**: Use OpenAI (gpt-4o) as primary AI provider, not Anthropic.
- **Why**: User's explicit preference for this project.

## Testing Patterns

- **Date**: 2026-04-13
- **Pattern**: bun:test `mock.module()` for drizzle-orm requires understanding drizzle internals. Plan assumed `left.name`/`right.value` but actual drizzle uses `queryChunks[1].name`/`queryChunks[3].value` and `Symbol(drizzle:Name)` for table names (not `_.name`).
- **Rule**: When mocking drizzle DB queries, test the actual internal structure first with a debug log before building the mock. The shared `createMockDb()` helper was unreliable — each test file ended up needing custom DB mocks.
- **Why**: Drizzle ORM internals change between versions and are not documented. Assumptions break silently.

- **Date**: 2026-04-13
- **Pattern**: Testnet faucets (QuickNode, Alchemy) require the wallet to have 0.001+ mainnet ETH as anti-sybil. Brand new wallets from `cast wallet new` can't get testnet ETH.
- **Rule**: For contract deployment, use an existing wallet with mainnet balance for faucet access. Or deploy to local Anvil for dev and defer testnet to later.
- **Why**: Wasted time trying 2 faucets before discovering the mainnet balance requirement.

- **Date**: 2026-04-13
- **Pattern**: E2E tests failed because form submission redirected to `/evaluate` page, which auto-triggered AI evaluation without API key, crashing the dev server. All subsequent tests then got ERR_CONNECTION_REFUSED.
- **Rule**: In E2E tests, after confirming a redirect URL, navigate away (`page.goto("about:blank")`) before the page loads if it triggers expensive background operations.
- **Why**: A single server crash cascades to fail all remaining tests, masking the real root cause.

- **Date**: 2026-04-13
- **Pattern**: Next.js App Router treats `_`-prefixed directories as private folders — `/api/__test/` won't generate routes.
- **Rule**: Use non-underscore paths for test-only API routes (e.g., `/api/test-seed/`).
- **Why**: Track B initially planned `/api/__test/` but had to use `/api/test-seed/` instead.

## Workflow Patterns

- **Date**: 2026-04-13
- **Pattern**: Breadth-first test implementation with subagent-driven development achieved 100 tests across 15 files in ~45 minutes. Key: complete code in the plan + sonnet for mechanical tasks + opus for complex mocking tasks.
- **Rule**: For test suite buildout, write full test code in the plan document. Use fast models for copy-paste tasks (utilities, schemas). Use capable models for tasks requiring mock engineering (orchestrator, chain publisher, API routes with drizzle mocking).
- **Why**: Plans with complete code let cheaper models execute accurately. Plans with vague specs require expensive models to fill gaps.

- **Date**: 2026-04-13
- **Pattern**: User prefers "go ahead" over being asked for permission. When they say "do that" they mean execute now, don't ask.
- **Rule**: When user gives clear direction, execute immediately. Don't ask confirmation for: pushing to feature branches, committing test code, running test suites. Only confirm for: destructive ops on main, deleting data, sending external messages.
- **Why**: User explicitly said "dont ask permission to push, bypass it."
