# Cross-Project Knowledge

Knowledge that applies across projects. Updated when learning reusable patterns.

## Post-Build Quality Audit Pattern

When a branch has code built but untested/unverified, run these 5 checks as parallel subagents:

1. **Spec-vs-Code Audit** — compare .planning/ docs against src/ code, mark each requirement as IMPLEMENTED/PARTIAL/STUB/MISSING
2. **Testing Gap Analysis** — inventory existing tests, check framework testing skills, plan E2E suite, compare Playwright vs agent-browser
3. **Deployment Status** — contracts deployed where? env vars real or placeholder? app deployed?
4. **Audit Skills Readiness** — cross-reference audit-skills-toolkit.md against installed skills
5. **README.md for Humans** — setup instructions, env vars, scripts, project structure, testing status

This pattern is framework-agnostic (works on speckit, gsd, superpower branches). Use parallel subagents, not agent teams, because tasks are independent research.

## Playwright vs agent-browser Decision

- **Playwright**: deterministic regression suite, CI gates, golden path. Free, fast, reproducible.
- **agent-browser**: exploratory testing, dogfooding, smoke tests. AI-adaptive but non-deterministic, costs tokens per run.
- They're complementary, not competing. Use both.
