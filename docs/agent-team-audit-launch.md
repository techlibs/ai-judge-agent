# Agent Team Audit Launch Guide

Run all audit skills from `audit-skills-toolkit.md` across 3 worktrees in parallel using Claude Code Agent Teams.

## Prerequisites

1. **Claude Code v2.1.32+** (you have v2.1.104)
2. **Agent Teams enabled** in `~/.claude/settings.json`:
   ```json
   {
     "env": {
       "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
     }
   }
   ```
3. **Audit skills installed** (run the install commands from `audit-skills-toolkit.md`)
4. **tmux installed** (for split-pane mode): `brew install tmux`

## Worktrees Available

| Worktree | Branch | Path |
|----------|--------|------|
| Main | `main` | `.` (repo root) |
| GSD (full-vision) | `full-vision-roadmap` | `.worktrees/full-vision-roadmap/` |
| Speckit | `speckit` | `.worktrees/speckit/` |
| Superpowers | `superpower` | `.worktrees/superpower/` |

## Launch Command

Start Claude Code from the repo root, then paste this prompt:

```
Create an agent team to run a comprehensive security audit across 3 worktrees in parallel.
Use tmux split panes so I can monitor all 3.

Spawn 3 teammates:

1. Teammate "gsd-auditor" — work in /Users/libardo/carlos/projects/ipe-city/agent-reviewer/.worktrees/full-vision-roadmap/
   Run these audit skills sequentially:
   - /solidity-audit (on any .sol files)
   - /solidity-security-audit (on any .sol files)
   - /security-nextjs (on Next.js app code)
   - /owasp-security-check (on API routes and server actions)
   - /dependency-auditor (on package.json)
   - /secrets-scanner (full directory scan)
   - /code-audit-readonly (full repo sweep)
   Report all findings with severity (critical/high/medium/low/info).

2. Teammate "speckit-auditor" — work in /Users/libardo/carlos/projects/ipe-city/agent-reviewer/.worktrees/speckit/
   Run these audit skills sequentially:
   - /solidity-audit (on any .sol files)
   - /solidity-security-audit (on any .sol files)
   - /security-nextjs (on Next.js app code)
   - /owasp-security-check (on API routes and server actions)
   - /dependency-auditor (on package.json)
   - /secrets-scanner (full directory scan)
   - /code-audit-readonly (full repo sweep)
   Report all findings with severity (critical/high/medium/low/info).

3. Teammate "superpowers-auditor" — work in /Users/libardo/carlos/projects/ipe-city/agent-reviewer/.worktrees/superpower/
   Run these audit skills sequentially:
   - /solidity-audit (on any .sol files)
   - /solidity-security-audit (on any .sol files)
   - /security-nextjs (on Next.js app code)
   - /owasp-security-check (on API routes and server actions)
   - /dependency-auditor (on package.json)
   - /secrets-scanner (full directory scan)
   - /code-audit-readonly (full repo sweep)
   Report all findings with severity (critical/high/medium/low/info).

After all teammates finish, synthesize a cross-worktree comparison:
- Findings that appear in ALL worktrees (shared vulnerabilities)
- Findings unique to each worktree
- Top 10 most critical issues across all 3
- Recommended fix priority order

Write the consolidated report to docs/AUDIT-REPORT.md
```

## Alternative: Lightweight Version (Tier 1 Only)

If you want a faster run with just the essential 7 skills:

```
Create an agent team with 3 teammates. Each teammate audits one worktree using only Tier 1 skills:
/solidity-audit, /solidity-security-audit, /security-nextjs, /owasp-security-check,
/dependency-auditor, /secrets-scanner, /openclaw-audit-watchdog.

Teammate "gsd": /Users/libardo/carlos/projects/ipe-city/agent-reviewer/.worktrees/full-vision-roadmap/
Teammate "speckit": /Users/libardo/carlos/projects/ipe-city/agent-reviewer/.worktrees/speckit/
Teammate "superpowers": /Users/libardo/carlos/projects/ipe-city/agent-reviewer/.worktrees/superpower/

Synthesize findings into docs/AUDIT-REPORT.md when done.
```

## Alternative: Full Audit (All 18 Skills)

For the most comprehensive run, add Tier 2 and 3 skills after Tier 1:

```
After completing Tier 1 skills, each teammate should also run:
- /token-integration-analyzer (on ERC contracts)
- /solidity-security (reference patterns)
- /dependency-supply-chain-security (npm supply chain)
- /static-analysis (CodeQL/Semgrep patterns)
- /solidity-gas-optimization (gas efficiency)
- /foundry-solidity (test quality)
- /solidity-testing (coverage gaps)
- /code-quality (TypeScript quality)
- /security-engineer (security posture)
- /security (unified checklist)
```

## Monitoring the Team

| Action | Command |
|--------|---------|
| Cycle through teammates | `Shift+Down` |
| View teammate session | `Enter` on teammate |
| Interrupt teammate | `Escape` |
| Toggle task list | `Ctrl+T` |
| Message teammate directly | Cycle to them, then type |

## Token Budget Estimate

Each teammate uses its own 1M context window. Rough estimate per teammate:
- 7 Tier 1 skills: ~200-400K tokens consumed
- All 18 skills: ~500-800K tokens consumed
- Total for 3 teammates (Tier 1): ~600K-1.2M tokens
- Total for 3 teammates (all): ~1.5-2.4M tokens

## Troubleshooting

- **Teammate stops mid-audit**: Message it directly with "continue running the remaining skills"
- **Skill not found**: Verify installation with `npx skills list -g`
- **Permission prompts blocking**: Add skill-specific bash patterns to `settings.json` permissions
- **tmux not working**: Fall back to in-process mode: `claude --teammate-mode in-process`

## Post-Audit

After the consolidated report is generated:
1. Review `docs/AUDIT-REPORT.md`
2. Use `/gsd-audit-fix` to auto-fix critical/high findings
3. Re-run affected skills to verify fixes
