---
phase: 1
slug: foundation-scaffolding
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-13
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Foundry (forge test) + Anchor test (LiteSVM) |
| **Config file** | `contracts/foundry.toml` + `programs/Anchor.toml` |
| **Quick run command** | `forge test --root contracts && cd programs && anchor test` |
| **Full suite command** | `forge test --root contracts && cd programs && anchor test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick run command
- **After every plan wave:** Run full suite command
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 1 | — | — | N/A | build | `forge build --root contracts` | ❌ W0 | ⬜ pending |
| 1-01-02 | 01 | 1 | — | — | N/A | build | `cd programs && anchor build` | ❌ W0 | ⬜ pending |
| 1-01-03 | 01 | 1 | — | — | N/A | unit | `forge test --root contracts` | ❌ W0 | ⬜ pending |
| 1-01-04 | 01 | 1 | — | — | N/A | unit | `cd programs && anchor test` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `contracts/` — Foundry project scaffold with foundry.toml
- [ ] `programs/` — Anchor project scaffold with Anchor.toml
- [ ] `contracts/test/Counter.t.sol` — placeholder Foundry test
- [ ] `programs/tests/` — placeholder Anchor test

*Frameworks installed as part of scaffolding.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Local dev env runs both simulators | SC-2 | Requires running solana-test-validator + anvil | Start both, verify RPC responds |
| CI pipeline triggers on push | SC-3 | Requires GitHub Actions runner | Push commit, verify workflow runs |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
