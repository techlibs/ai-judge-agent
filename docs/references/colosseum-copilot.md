# Colosseum Copilot -- Comprehensive Reference

> Last updated: 2026-04-13
> Sources: docs.colosseum.com, glama.ai, blog.colosseum.com

---

## 1. What is Colosseum Copilot?

Colosseum Copilot is a **research skill for AI coding assistants** that transforms them into Solana startup analysts. It provides curated crypto ecosystem intelligence through an MCP (Model Context Protocol) server, giving AI agents access to hackathon submissions, archive documents, and live ecosystem data to validate startup ideas and research the Solana ecosystem.

Copilot is not a rubber-stamp validation tool. It is an evidence-based research system that tells builders what already exists, what the historical context looks like, and where genuine gaps remain -- or explicitly states when evidence is insufficient rather than speculating.

### Supported Platforms

- Claude Code
- Codex
- OpenClaw
- Cursor IDE

---

## 2. Data Sources

### Hackathon Submissions (5,400+)

- Full database of project submissions across every Colosseum hackathon
- Each entry includes: tech stack, problem/solution tags, competitive context, and positioning
- Hackathons covered: Renaissance, Radar, Breakout, Cypherpunk, and others
- Status tracking: accelerator portfolio status (C3, C4), placement (e.g., "Breakout 1st Place")
- Searchable by vertical, technology, and problem domain

### Archive Documents (84,000+)

Curated from **65+ hand-selected sources** spanning the full history of crypto and cypherpunk thought:

#### Historical / Foundational Sources
- **Cryptography Mailing List** (1990s era) -- original cypherpunk discussions
- **Satoshi Nakamoto correspondence** -- emails and early Bitcoin communications
- **Nick Szabo essays** -- smart contracts, bit gold, and digital institution design

#### Conference Transcripts
- **Solana Breakpoint transcripts** (2022-2025) -- keynotes, panels, technical talks

#### Venture Capital and Institutional Research
- **a16z** (Andreessen Horowitz) -- crypto research and state-of-crypto reports
- **Paradigm** -- protocol research and mechanism design
- **Multicoin Capital** -- thesis-driven crypto investment research
- **Pantera Capital** -- "Escape Velocity" and other crypto market analyses
- **Galaxy Digital** -- market intelligence and research
- Plus additional firms across the crypto VC landscape

#### Protocol and Technical Documentation
- Protocol docs from major Solana ecosystem projects
- Founder essays and technical write-ups
- Investor research papers

### The Grid (6,300+ Crypto Products)

- Live ecosystem metadata integration covering products across all of crypto
- Searchable by **vertical, chain, and status**
- Used to find competitors and identify gaps in real time
- Provides current landscape evidence for market assessments

### Web Search

- Real-time competitive intelligence capability
- Supplements structured data with current market information
- Used to verify claims and find recent developments

---

## 3. Two Research Modes

### Conversational Mode (Default)

- **Speed**: Fast, targeted responses
- **Behavior**: Direct answers with targeted API queries
- **Citations**: Embedded inline citations with every claim
- **Use case**: Quick lookups, competitor checks, specific questions
- **Example**: "Has anyone built X on Solana?" returns immediate results with project names, hackathons, and shipping status

### Deep Dive Mode (Explicit Opt-In)

Activates when the user says:
- "vet this idea"
- "deep dive"
- "full analysis"
- "validate this"
- "should I build X?"
- "is X worth building?"
- Or when accepting Copilot's offer to go deeper

#### 8-Step Research Workflow

1. **Parallel data gathering** across projects, archives, and web sources simultaneously
2. **Hackathon analysis** -- scanning submission database for precedents and similar projects
3. **Archive research** -- synthesizing foundational research to establish conceptual validity
4. **Incumbent validation** -- mapping existing players with segment-level precision
5. **Current landscape segmentation** -- breaking market into non-overlapping angles with maturity assessments
6. **Gap classification** -- categorizing competitive positioning (Full/Partial/False)
7. **Opportunity ranking** -- pattern recognition across cohorts to identify genuine whitespace
8. **Structured report** -- comprehensive output including revenue model, GTM strategy, risk assessment, and founder-market fit

---

## 4. Evaluation Approach

### Evidence-Based, Not Rubber-Stamp

Copilot operates as a rigorous analyst, not a cheerleader. Key principles:

- Every claim traces to a named project, archive source, or data point
- When another team is already building the exact same thing, Copilot says so immediately -- with project name, hackathon, and what they have shipped
- If evidence thresholds cannot be met, Copilot explicitly acknowledges the gap rather than filling it with speculation
- Market assessments are treated as **segment-discovery problems**, not market-size problems

### Evaluation Structure

The deep dive follows a **problem-evidence-gap-founder-risk** analytical loop:

1. **Identify specific, quantified pain** -- with concrete examples and dollar amounts
2. **Present incumbent landscape** -- with citations and source attribution
3. **Classify gap type** -- with segment-level precision
4. **Assess founder requirements** -- for closing the identified gap
5. **Model revenue and timeline risks** -- with reality-weighted scenarios

---

## 5. Evidence Floor Requirements

Every answer must meet **minimum evidence requirements** (the "evidence floor"). A market assessment needs all three:

| Evidence Type | Description | Example |
|---------------|-------------|---------|
| **Builder project data** | At least one relevant project from the hackathon database | "CargoBill targets freight forwarders (Breakout 1st Place)" |
| **Archive citation** | At least one reference from the 84k+ document archive | "Pantera Capital 'Escape Velocity' explicitly calls out B2B cross-border" |
| **Current landscape evidence** | Real-time market data from The Grid or web search | "McKinsey estimates B2B leading at $226B" |

### When Evidence Is Insufficient

- Copilot explicitly states that the evidence floor cannot be met
- No speculation or filler content is generated
- The response clearly communicates what is known vs unknown
- Suggests where additional research might be needed

---

## 6. Gap Classification System

### Full Gap

- **Definition**: Completely unaddressed problem space
- **Signal**: No projects in the submission database, no incumbents in The Grid
- **Implication**: Greenfield opportunity but requires validation of demand

### Partial Gap

Multiple subtypes with segment-level precision:

| Subtype | Definition | Example |
|---------|-----------|---------|
| **Segment** | Competitor exists but serves different buyer; same problem, different user | CargoBill serves logistics operators; Fortune 500 AP teams untapped |
| **UX** | Solution exists but user experience is inadequate for target segment | Technical CLI tools when target users need no-code interfaces |
| **Geography** | Solution exists in one market but not in the target region | US-focused solution with no LATAM presence |
| **Pricing** | Solution exists but pricing model excludes target segment | Enterprise pricing when SMBs need the solution |
| **Integration** | Solution exists but lacks critical integration points | No SAP/Oracle integration for enterprise procurement |

### False Gap

- **Definition**: Problem already solved -- appears open but is actually addressed
- **Signal**: Existing solutions adequately serve the identified need
- **Implication**: Avoid unless you have a concrete, differentiated wedge
- **Warning zones**: Saturated areas (e.g., 202+ competitors in SME remittance)

---

## 7. Quality Standards and Citation Requirements

### Citation Format

All claims must be attributed using these patterns:

- **Author-attributed research**: "Pantera Capital 'Escape Velocity'...explicitly calls out B2B cross-border"
- **Institutional reports**: "McKinsey estimates...US Treasury projects...Goldman Sachs published"
- **Company-verified facts**: "active at cargobill.co," "announced April 2025"
- **Data cohort references**: "202-project 'Stablecoin Payment Rails' cluster," "2,992 Cypherpunk + Breakout submissions"
- **Precedent analysis**: Status tags indicating accelerator stage (C3/C4 accelerator portfolio, Breakout 1st Place, Cypherpunk)

### Quantification Standards

- Market claims include source and methodology: "McKinsey estimates...B2B leading at $226B (60% of total)"
- Market velocity signals highlighted as forcing functions: "OpenFX speed: $0 to $10B annualized volume in under 12 months"
- Concrete friction examples with magnitude: "A $50M payment...costs ~$30K in opportunity cost alone (at 7% cost of capital)"
- TAM calculations use reality-weighted scenarios: "$17B TAM -- ~$1.7B realistic serviceable market at maturity"

### Comparative Positioning

- Uses explicit user personas: "Lisa, VP of Treasury at a $20B annual-revenue global retailer"
- Direct comparison across competitors on specific dimensions
- Incumbent analysis dissects each competitor across: direct segment positioning, current offering gaps, and evidence of gap

---

## 8. Technical Architecture

### MCP Server

Colosseum Copilot is implemented as an **MCP (Model Context Protocol) server** that AI coding assistants connect to for structured data access.

### NPX Installation

```bash
npx -y github:securecheckio/colosseum-copilot-mcp
```

### Configuration (Cursor / Claude Code)

```json
{
  "mcpServers": {
    "colosseum-copilot": {
      "command": "npx",
      "args": ["-y", "github:securecheckio/colosseum-copilot-mcp"],
      "env": {
        "COLOSSEUM_COPILOT_PAT": "your-token-here"
      }
    }
  }
}
```

### Token Authentication

- **Token type**: Free Personal Access Token (PAT)
- **Obtain at**: `arena.colosseum.org/copilot`
- **Environment variable**: `COLOSSEUM_COPILOT_PAT`
- **Error handling**: If token expired/invalid, get a new one at `arena.colosseum.org/copilot`

### System Requirements

- Node.js 18+
- Compatible IDE (Cursor, Claude Code, Codex, OpenClaw)

### Available MCP Tools (11 total)

| Tool | Description |
|------|-------------|
| `colosseum_status` | API connection verification |
| `colosseum_search_projects` | Search 5,400+ hackathon project submissions |
| `colosseum_search_archives` | Search 84,000+ archive documents |
| `colosseum_get_project` | Retrieve full project details by ID |
| `colosseum_get_archive_document` | Read full document content |
| `colosseum_get_filters` | List available filters and hackathons |
| `colosseum_analyze_cohort` | Analyze a cohort of projects |
| `colosseum_compare_cohorts` | Compare two project cohorts |
| `colosseum_get_cluster` | Get project cluster information |
| `colosseum_suggest_source` | Get archive source recommendations |
| `colosseum_feedback` | Submit user feedback |

### Setup Time

Under 5 minutes from start to first query.

---

## 9. Archive Sources (65+ Curated)

### Categories of Sources

#### Cypherpunk and Foundational Literature
- Cryptography Mailing List (1990s) -- original cypherpunk discussions and debates
- Satoshi Nakamoto emails and correspondence -- pre-Bitcoin and early Bitcoin communications
- Nick Szabo essays -- smart contracts concept, bit gold, digital institution design, "Trusted Third Parties Are Security Holes"

#### Conference and Event Transcripts
- Solana Breakpoint transcripts (2022, 2023, 2024, 2025) -- keynotes, technical sessions, panels
- Other ecosystem conference proceedings

#### Venture Capital Research
- **a16z / a16z crypto** -- State of Crypto reports, builder's guides, research posts
- **Paradigm** -- protocol research, mechanism design papers
- **Multicoin Capital** -- investment theses, sector analyses
- **Pantera Capital** -- market analysis ("Escape Velocity" and others)
- **Galaxy Digital** -- market intelligence reports
- Additional VC firms across the crypto landscape

#### Protocol Documentation
- Major Solana ecosystem project documentation
- Protocol specifications and technical papers
- Squads and other infrastructure project docs

#### Founder and Builder Content
- Founder essays and retrospectives
- Technical write-ups and post-mortems
- Builder guides and implementation notes

---

## 10. Domain Evaluation Areas

Copilot is rigorously evaluated against a suite of prompts covering these domains:

### DeFi (Decentralized Finance)
- Lending protocols and mechanisms
- Yield strategies and optimization
- Liquidity provision and AMM design

### MEV (Maximal Extractable Value)
- MEV protection mechanisms
- Transaction ordering and fairness
- Searcher and validator dynamics

### Prediction Markets
- Market design and resolution mechanisms
- Liquidity and pricing models
- Real-world event integration

### AI Agent Payments
- Payment infrastructure for autonomous agents
- Agent-to-agent transaction protocols
- AI service marketplaces on-chain

### Privacy Infrastructure
- Zero-knowledge proof applications
- Private transaction mechanisms
- Identity privacy solutions

### DePIN (Decentralized Physical Infrastructure Networks)
- Hardware network incentive design
- Real-world infrastructure tokenization
- DePIN skepticism and viability analysis

### Cross-Domain Synthesis
- Multi-sector opportunity identification
- Convergence of AI + crypto + real-world applications
- Novel category creation at domain intersections

### Empty-Result Handling
- Graceful handling when no relevant projects or archives exist
- Transparent communication about evidence gaps
- Honest "we don't know" responses

---

## 11. Key Insights for Building an AI Grant Evaluation Agent

Based on Colosseum Copilot's architecture and methodology, several patterns are directly relevant to building a grant evaluator:

### Evidence-First Assessment

- Never rubber-stamp; always require minimum evidence thresholds
- Three-source evidence floor: project data + archival citation + current landscape
- Explicitly state when evidence is insufficient rather than speculating

### Structured Gap Analysis

- Classify opportunities as Full Gap, Partial Gap (with subtypes), or False Gap
- Segment-level precision matters more than market-size estimates
- Identify saturated zones early to avoid wasting evaluation time

### Competitor Intelligence as Core Feature

- Instant lookup of whether the idea already exists in the ecosystem
- Map all incumbents with their specific positioning, strengths, and gaps
- Track accelerator portfolio status and hackathon placement as quality signals

### Multi-Source Research Pipeline

- Parallel data gathering across structured databases, archives, and real-time web
- Combine historical context (cypherpunk literature, foundational essays) with current data
- Use cohort analysis (clusters of similar projects) to identify patterns

### Rigorous Citation Standards

- Every claim must trace to a named source
- Quantified claims require methodology attribution
- Precedent analysis uses verifiable status tags

### Founder-Market Fit Evaluation

- Identify ideal founder backgrounds with specific credibility requirements
- Flag red flags (e.g., "Do NOT build this if you're a pure crypto-native without Fortune 500 procurement relationships")
- Specify required team composition with explicit skillsets

### Risk Framework

- Assess technical risk (Low/Medium/High with timeframe)
- Assess regulatory risk (with mitigation paths)
- Assess market risk (painkiller vs vitamin classification)
- Assess execution risk (competitive window estimate)

### Actionable Output Format

- Bootstrap strategies with economic incentive modeling
- Temporal pressure signals to establish urgency
- Further reading sections with specific study instructions
- TAM calculations with reality-weighted scenarios

---

## 12. Deep Dive Report Structure (Example)

Based on the B2B Stablecoin Payments example, a full deep dive report follows this five-phase pattern:

### Phase 1: Similar Projects Mapping
- Catalogs 7+ precedent startups with internal IDs
- Notes accelerator status for each
- Explicit product positioning comparison (e.g., "CargoBill targets freight forwarders, not Fortune 500 treasury teams")

### Phase 2: Archive Insights Layer
- Synthesizes foundational research (Pantera, Squads, Nick Szabo) to establish conceptual validity
- Provides historical grounding before market analysis

### Phase 3: Current Landscape Segmentation
- Breaks market into 3 non-overlapping angles
- Each angle gets a distinct maturity assessment (Growing, Emerging, Fragmented)
- Example: Enterprise Settlement (Growing), Trade Finance (Emerging), Emerging Markets (Growing/Fragmented)

### Phase 4: Pattern Recognition Across Cohorts
- Analyzes large project clusters (e.g., 202-project clusters, 2,992 submission datasets)
- Identifies systematic gaps: "overwhelmingly SME/mid-market focused...No Colosseum project explicitly targets Fortune 500 procurement"

### Phase 5: Opportunity Deep Dive
- Single-opportunity focus with full incumbent analysis
- Revenue modeling with realistic serviceable market estimates
- GTM friction analysis
- Founder-market fit assessment with specific credibility requirements
- Competitive window estimate (e.g., "likely 12-24 months before one of these players closes the ERP integration gap")
- Required team composition (3 roles with explicit skillsets)
- Further reading with 5 specific resources and study instructions

---

## Sources

- [Colosseum Copilot Introduction](https://docs.colosseum.com/copilot/introduction)
- [Colosseum Copilot B2B Stablecoin Payments Example](https://docs.colosseum.com/copilot/examples/b2b-stablecoin-payments)
- [Colosseum Copilot MCP Server (Glama)](https://glama.ai/mcp/servers/securecheckio/colosseum-copilot-mcp)
- [Colosseum Blog](https://blog.colosseum.com/)
