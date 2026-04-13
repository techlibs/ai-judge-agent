# Prompt: Ecosystem Analysis & Expansion Vision

## How This Was Produced

### Trigger
User asked: "https://docs.colosseum.com/copilot/introduction — this could be used on our project? how?" then requested a .md analysis with expansion vision attachable to the current roadmap.

### Agent Architecture
**3 parallel research agents** (general-purpose, web search enabled) + 1 synthesis pass:

1. **grant-tools-research** — AI grant evaluation tools, on-chain reputation/identity, AI research assistants for crypto, structured judge agent patterns
2. **ecosystem-tools-research** — AI coding assistant plugins/skills, crypto intelligence platforms, multi-agent orchestration frameworks, attestation protocols
3. **grants-landscape-research** — Active grant programs with evaluation infrastructure, proposal management platforms, AI + DAO governance tools, market gaps

**Why parallel:** Each research domain is independent. Running sequentially would have tripled wall-clock time with no quality benefit.

**Synthesis:** Main agent read all 3 research reports, the current ROADMAP.md, and PROJECT.md, then synthesized into a single analysis document with expansion phases mapped to the existing roadmap structure.

### Model & Tools
- **Model:** Claude Opus 4.6 (1M context) via Claude Code CLI
- **Research tools:** WebFetch (Colosseum Copilot docs), WebSearch (across all 3 agents for competitive landscape)
- **Context tools:** Read (ROADMAP.md, PROJECT.md for current project state)

### Methodology
1. Fetched Colosseum Copilot documentation to understand the reference product
2. Dispatched 3 research agents with specific scopes to avoid overlap
3. Cross-referenced findings against current ROADMAP.md phases
4. Designed expansion phases that extend (not replace) the existing 4-phase roadmap
5. Prioritized expansions by effort/value/risk

### Limitations
- **No primary user interviews** — competitive analysis is based on public documentation and web search, not conversations with grant program operators
- **Pricing data incomplete** — enterprise APIs (Nansen, Messari) don't publish pricing; effort estimates may undercount integration costs
- **Tool status may shift** — web3 tools evolve rapidly; some tools listed as "active" may pivot or sunset
- **Colosseum Copilot research was Solana-skewed** — the initial inspiration is Solana-ecosystem; EVM equivalents may exist that weren't surfaced
- **No validation of claimed GitHub stars or adoption metrics** — numbers come from tool documentation/READMEs

### Reproduction
1. Open Claude Code in `agent-reviewer/` directory
2. Run: "Research tools similar to Colosseum Copilot and provide a .md analysis with expansion vision for our roadmap"
3. Claude Code will fetch Copilot docs, dispatch parallel research agents, synthesize into doc
