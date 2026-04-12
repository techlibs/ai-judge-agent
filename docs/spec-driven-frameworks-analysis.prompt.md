# Prompt Record: Spec-Driven Frameworks Analysis

> Companion to [`spec-driven-frameworks-analysis.md`](./spec-driven-frameworks-analysis.md)

---

## Prompt

The exact user input:

```
https://github.com/github/spec-kit
https://github.com/obra/superpowers
https://github.com/gsd-build/get-shit-done

analyze these 3 alternatives as spec driven developement framework, analyze the
pros / cons between them and compare to decide which is better, and why.

also, research for others best options alternatives besides these 3 to write the
final document on @docs/
```

## Intent

The user had identified three leading spec-driven development frameworks and wanted:

1. A structured, comparative analysis — not just summaries, but direct comparison on shared dimensions
2. A recommendation with reasoning — not "it depends" but an opinionated verdict backed by evidence
3. Awareness of the broader landscape — are there better options the user hasn't considered?
4. A reference document stored in the codebase — not a chat response, but a durable artifact

**Why these three specifically:** The user was evaluating tooling for AI-assisted development workflows. These three represent distinct philosophies — TDD-strict (Superpowers), extensible-ecosystem (Spec-Kit), and context-engineering (GSD) — making them natural comparison candidates.

## Agent Architecture

The analysis was produced using a **parallel multi-agent research pattern** followed by sequential synthesis.

### Phase 1: Parallel Deep Research (3 agents)

Three `Explore` agents launched simultaneously, one per framework:

```
[User Prompt]
      |
      +---> Agent 1: "Research github/spec-kit"
      |       - WebFetch: README, docs, extensions, issues
      |       - Analyzed: workflow, spec templates, CLI, maturity
      |
      +---> Agent 2: "Research obra/superpowers"
      |       - WebFetch: README, skills, changelog, specs
      |       - Analyzed: 7-stage pipeline, TDD enforcement, adoption
      |
      +---> Agent 3: "Research gsd-build/get-shit-done"
              - WebFetch: README, architecture, agents, features
              - Analyzed: context engineering, wave execution, 24 agents
```

**Why parallel:** The three frameworks are independent — no research on one informs research on another. Parallel execution cut wall-clock time by ~3x.

**Why Explore agents:** Each needed to fetch remote content (GitHub READMEs, documentation), navigate repository structures, and synthesize findings. The Explore agent type has WebFetch and broad search capabilities suited to this.

### Phase 2: Alternatives Research (1 agent)

A single `Explore` agent searched for additional frameworks:

```
Agent 4: "Research alternative spec frameworks"
  - WebSearch: "spec driven development framework AI",
               "AI coding agent workflow framework",
               "specification first development claude code"
  - WebFetch: Kiro, OpenSpec, Aider, Claude Squad, Mastra repos
  - Cross-referenced: Martin Fowler's SDD tools article,
                       GitHub Blog on SDD,
                       Medium survey of 30+ frameworks
```

**Why sequential (after Phase 1):** The alternatives search needed to know what the primary three offered in order to find meaningfully different options — not just more of the same.

### Phase 3: Synthesis (main agent)

The orchestrating agent (Claude Opus 4.6, 1M context) received all four agent reports and:

1. Identified 7 comparison dimensions from the raw research
2. Built the scoring rubric (weighted by relevance to AI-assisted development)
3. Wrote the analysis with direct cross-references between frameworks
4. Produced the decision matrix mapping use cases to recommendations

```
[Agent 1 Report] --+
[Agent 2 Report] --+--> [Main Agent: Synthesis & Writing]
[Agent 3 Report] --+        |
[Agent 4 Report] --+        +--> docs/spec-driven-frameworks-analysis.md
```

## Methodology

### Research strategy

Each framework was evaluated on the same 7 dimensions to enable fair comparison:

1. **Spec methodology** — How are specs written, structured, and enforced?
2. **AI integration depth** — How many platforms? How deep is the integration?
3. **Quality assurance** — What testing, review, and verification gates exist?
4. **Context management** — How does the framework handle context window limits?
5. **Flexibility** — Can it scale down for small tasks and up for large ones?
6. **Maturity & community** — Stars, version stability, contributor base, adoption signals
7. **Documentation** — Quality, completeness, internationalization

### Scoring approach

Each dimension was scored 1-10 per framework, then weighted:
- 20% for spec methodology (core purpose)
- 15% each for AI integration, quality assurance, context management, flexibility
- 10% each for maturity and documentation

Weights reflect what matters most for **daily use in AI-assisted development** — not theoretical completeness.

### Alternative filtering

From the broader search, alternatives were filtered by:
- Must be **spec-driven** (not just an AI coding tool)
- Must have **meaningful adoption** (stars, active development)
- Must offer something **distinct** from the top three

This excluded pure implementation tools (Aider, Cline) and agent infrastructure (Mastra) from the primary comparison while noting them as complementary options.

## Model & Tools

| Component | Value |
|-----------|-------|
| **Model** | Claude Opus 4.6 (1M context) |
| **Agent type** | Explore (for research), main agent for synthesis |
| **Tools used** | WebFetch (GitHub repos, docs), WebSearch (alternatives), Glob/Read (local files) |
| **Plan mode** | Yes — plan was created and approved before writing |
| **Total agents spawned** | 4 (3 parallel + 1 sequential) |

## Limitations

### What this analysis does NOT cover

- **Hands-on benchmarking** — No framework was installed and run on a real project. All evaluation is based on documentation, community signals, and architectural analysis.
- **Cost comparison** — Token consumption per framework was not measured. GSD's fresh-context architecture likely uses more tokens; Superpowers' sequential approach likely uses fewer.
- **Team-scale validation** — All three frameworks claim team support, but evaluation focused on individual developer experience. Multi-developer collaboration patterns were not tested.
- **Version currency** — Star counts and version numbers are snapshots from April 2026. These frameworks are evolving rapidly; rankings may shift.

### Potential biases

- **Popularity bias** — Star counts influence perception but don't directly measure quality. A framework with 148k stars isn't necessarily 3x better than one with 51k.
- **Documentation bias** — Better-documented frameworks appear more capable because more features are discoverable. Under-documented features in any framework may have been missed.
- **Recency bias** — The research agent accessed current GitHub state. Historical stability and long-term maintenance patterns were not deeply analyzed.

## How to Reproduce

To regenerate or update this analysis:

### Using Claude Code

```
# From the project root, open Claude Code and prompt:

https://github.com/github/spec-kit
https://github.com/obra/superpowers
https://github.com/gsd-build/get-shit-done

analyze these 3 alternatives as spec driven development framework, analyze the
pros / cons between them and compare to decide which is better, and why.

also, research for others best options alternatives besides these 3 to write the
final document on @docs/
```

The agent will follow a similar multi-agent research pattern. Results may vary based on:
- Current framework versions and features (check GitHub for latest)
- Model capabilities at time of generation
- Which alternatives surface in web search results

### Manual update

If updating specific sections:
1. Check each framework's GitHub repo for version changes, new features, or deprecations
2. Update the comparison matrix and scores accordingly
3. Re-evaluate the recommendation if the landscape has shifted significantly
4. Update this prompt file's limitations section with any new caveats
