# Self-Improvement Lessons

## 2026-04-13: E2E False Positive Patterns

**Mistake**: Wrote E2E tests with conditional assertion skipping that let tests pass when features were broken.

**Anti-patterns to never use**:
1. `if (loaded) { expect(x).toBeVisible() }` → assertion never runs if condition false
2. `.catch(() => false)` on visibility checks → swallows real failures
3. `.or()` chain accepting error states as "valid" → can't distinguish success from failure
4. `expect(a || b || c).toBeTruthy()` → always passes if any DOM element renders

**Rule**: Assert unconditionally. Use `test.skip()` with explicit reason for infra issues.

## 2026-04-13: IPFS Gateway

**Mistake**: Public Pinata gateway too slow (7s). Dedicated gateway with JWT auth is 15x faster (0.5s).

**Rule**: Use dedicated gateway + `?pinataGatewayToken=JWT`. Get domain via Pinata API.

## 2026-04-13: Contract Score Format

**Mistake**: Sent basis points (score*100) to contract expecting 0-100.

**Rule**: Read contract's MAX_SCORE before sending. Match contract format.

## 2026-04-13: Private Key 0x Prefix

**Mistake**: Hex validator rejected `0x` prefix, then code added `0x` again.

**Rule**: Strip `0x` before validation, re-add for viem.

## 2026-04-13: Contract Address Across Worktrees

**Mistake**: Superpower worktree had different contracts ("ARWF Agent Identity" vs "IPE City Projects").

**Rule**: Verify contract identity with `cast call name()` before using addresses.

## 2026-04-13: Subagents vs Teams

**Use subagents**: Independent tasks, no inter-agent communication needed.
**Use teams**: Shared state, sequential handoff, iterative refinement.

## 2026-04-13: Playwright Server Lifecycle

**Rule**: Kill port 3000 before E2E. Set webServer timeout to 60s+ for cold-start compilation.
