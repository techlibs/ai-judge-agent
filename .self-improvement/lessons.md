# Self-Improvement Lessons

Lessons learned from user corrections. All rules below are incorporated into CLAUDE.md — this file tracks the history and prevention checks.

## Tool Usage
- **Date**: 2026-04-13
- **Pattern**: Tried to get testnet ETH via browser automation (agent-browser) but all faucets (Alchemy, Superchain, Chainlink) require CAPTCHA or wallet sign-in that can't be automated. Wasted several rounds of browser interaction.
- **Rule**: Testnet faucets universally require CAPTCHA/auth. Don't attempt browser automation for faucets. Use Anvil (local testnet) for dev, and tell the user to manually hit a faucet for real testnet deployment.
- **Why**: Faucets are designed to prevent bot abuse — exactly what automated browser interaction is.

## Environment
- **Date**: 2026-04-13
- **Pattern**: User asked to check Pinata JWT from sibling worktrees. Both had `placeholder` values. Should have checked these BEFORE telling the user "Pinata JWT pending".
- **Rule**: When the user says "read X from another worktree", always check immediately. Don't assume the value exists — verify and report what you find.
- **Why**: Reusing env vars across worktrees is a common pattern in this project. Check all sources proactively.

## Domain Knowledge
- **Date**: 2026-04-13
- **Pattern**: Created a new deployer wallet (`cast wallet new`) when the superpower worktree already used Anvil's default account #0 (`0xac09...`). The new wallet has no ETH anywhere.
- **Rule**: For local Anvil dev, always use Anvil's default accounts (pre-funded with 10000 ETH). Don't create new wallets for local development.
- **Why**: Anvil provides 10 pre-funded accounts. Creating new wallets means needing to fund them, which defeats the purpose of a local testnet.

## Environment
- **Date**: 2026-04-13
- **Pattern**: Next.js `.env.local` overrides env vars passed via Playwright's `webServer.env`. E2e tests passed when reusing an existing dev server (port 3000) but failed when starting fresh because the dev server loaded `.env.local` with `TURSO_DATABASE_URL=file:local.db` instead of `file:./test.db`.
- **Rule**: E2e tests must use a dedicated port (3001) with `reuseExistingServer: false` and explicitly pass `TURSO_DATABASE_URL` in the webServer env config to override `.env.local`. Never assume Playwright's env passthrough beats Next.js env file priority.
- **Why**: Next.js loads `.env.local` with higher priority than process.env for server-side code. The only reliable override is to pass env vars explicitly in the webServer config.

## Code Patterns
- **Date**: 2026-04-13
- **Pattern**: AI evaluation runner imported `anthropic` from `@ai-sdk/anthropic` but only `OPENAI_API_KEY` was available. The spec said "Claude Sonnet primary, OpenAI failover" but the code had no failover logic — it was hardcoded to Anthropic.
- **Rule**: Check which API keys are actually available in `.env.local` before assuming a provider works. The AI SDK's provider-agnostic pattern (`generateObject`) makes switching trivial — just change the import and model ID.
- **Why**: The project has `OPENAI_API_KEY` set but no `ANTHROPIC_API_KEY`. Provider choice must match available credentials.

## Domain Knowledge
- **Date**: 2026-04-13
- **Pattern**: Estimated mainnet deployment would cost 0.05 ETH (~$125 / R$550). Actual cost was 0.000103 ETH (~$0.26). Off by 500x. Scared the user with a wildly wrong number.
- **Rule**: Always check actual gas price on the target network with `cast gas-price --rpc-url` before estimating costs. Base L2 gas is ~0.01 gwei, not Ethereum mainnet prices (~30 gwei). Calculate: `gas_used * gas_price / 1e18 * ETH_price`.
- **Why**: L2 gas prices are orders of magnitude cheaper than L1. Never extrapolate from Ethereum mainnet gas costs to Base.

## Tool Usage
- **Date**: 2026-04-13
- **Pattern**: Coinbase CDP faucet works programmatically via `@coinbase/coinbase-sdk` — no CAPTCHA needed. Wasted time on browser automation before discovering this. The SDK pattern: `new Coinbase({apiKeyName, privateKey}); new ExternalAddress(network, address).faucet()`.
- **Rule**: For testnet ETH, try the CDP SDK faucet first if the user has Coinbase Developer Platform API keys. It's the only faucet that works without CAPTCHA.
- **Why**: CDP API keys bypass the CAPTCHA requirement that blocks all browser-based faucets.

## Code Patterns
- **Date**: 2026-04-13
- **Pattern**: Foundry test `vm.prank(unauthorized)` was consumed by a `registry.SCORER_ROLE()` staticcall inside `vm.expectRevert()` arguments. The prank is single-use — any external call consumes it, including view functions in argument evaluation.
- **Rule**: Always cache role/constant values BEFORE `vm.prank`. Place `vm.expectRevert` before `vm.prank`, and `vm.prank` immediately before the target call with nothing between them.
- **Why**: Solidity evaluates function arguments before calling the outer function. `vm.expectRevert(... registry.ROLE() ...)` calls `ROLE()` first, consuming the prank.
