# Prompting Transparency Convention

This project treats **prompts as first-class artifacts**. Every AI-generated document in `docs/` has a companion `.prompt.md` file that records how it was produced — the exact prompt, the agent architecture, the reasoning behind the approach, and the tools involved.

## Why

AI-generated content without provenance is a black box. For an educational project, the *process* of generating knowledge is as important as the knowledge itself. By keeping prompt metadata alongside outputs, we enable:

- **Reproducibility** — anyone can re-run or adapt the prompt to get updated results
- **Auditability** — readers can evaluate whether the methodology was sound
- **Learning** — the prompt itself teaches how to elicit quality output from AI agents
- **Iteration** — future prompts can build on what worked and avoid what didn't

## Convention

```
docs/
  some-analysis.md              # The generated artifact
  some-analysis.prompt.md       # How it was generated
```

### Prompt file structure

Each `.prompt.md` follows this format:

| Section | Purpose |
|---------|---------|
| **Prompt** | The exact user input that initiated the generation |
| **Intent** | What the user was trying to achieve and why |
| **Agent Architecture** | Which AI agents were spawned, in what order, with what specializations |
| **Methodology** | The research and synthesis strategy — what was searched, compared, scored |
| **Model & Tools** | The model, tools, and capabilities used |
| **Limitations** | Known gaps, biases, or caveats in the output |
| **How to Reproduce** | Steps to regenerate or update the document |

## Principles

1. **Record the actual prompt, not a sanitized version.** Warts and all — the raw input is the most useful artifact for learning.
2. **Document the agent topology.** Multi-agent workflows have architecture. Show it.
3. **Be honest about limitations.** What the AI couldn't verify, what data might be stale, what perspectives are missing.
4. **Keep it lightweight.** The prompt file should be shorter than the output it describes. If it's not, the process was probably over-engineered.
