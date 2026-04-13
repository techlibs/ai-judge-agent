# Self-Improvement Lessons

Lessons learned from user corrections. All rules below are incorporated into CLAUDE.md — this file tracks the history and prevention checks.

## Architecture
- **Date**: 2026-04-13
- **Pattern**: Had to decide between parallel subagents and agent teams for 4+ independent research tasks. Chose correctly (subagents), but need a repeatable framework.
- **Rule**: Default to parallel background subagents for independent research (no inter-agent communication). Reserve agent teams for collaborative work requiring debate, shared findings, or multi-file coordination. Key signal: "do agents need to talk to each other?" If no, subagents. If yes, agent teams.
- **Why**: Agent teams add token cost (each has full context window) and coordination overhead (messaging, task-claiming) that isn't needed for independent research. Subagents are cheaper and simpler when only the final result matters. Confirmed by Claude Code docs: "Use subagents when you need quick, focused workers that report back."
