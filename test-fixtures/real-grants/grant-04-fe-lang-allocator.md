# Fe Lang — Memory Allocator for the Standard Library

**Grant Program**: Ethereum Foundation Ecosystem Support Program (ESP), Q1 2024 allocation
**Amount**: Small ESP grant (exact amount not disclosed in allocation table)
**Source URL**: https://blog.ethereum.org/en/2024/05/14/esp-allocation-q124

## Project Description

Fe is an Ethereum-focused, statically-typed smart-contract programming language inspired by Python and Rust. This grant funds the implementation of a memory allocator inside Fe's standard library. Today, Fe's memory model is rigidly tied to compiler-built-in types; the allocator unlocks user-definable memory layouts so that developers can replace the built-in memory types with standard-library implementations and, more importantly, implement their own types on top of a common allocator interface. This is foundational infrastructure that every subsequent stdlib data structure (vectors, maps, strings) depends on.

## Team

**Saif Katout** — solo contributor, existing core-adjacent contributor to the Fe language project. Fe itself is maintained by a small team with long-running support from the Ethereum Foundation.

## Milestones & Deliverables

- Design document for the allocator interface compatible with Fe's ownership model
- Reference allocator implementation merged into the Fe standard library
- Refactor of at least one existing built-in memory type to use the new allocator
- Public example demonstrating a user-defined type using the allocator
- Documentation in the Fe language book

## Budget Breakdown

Not publicly itemized. ESP developer-tooling grants of this type typically range $10k–$50k and cover a fraction of contributor time over 3–6 months, with no token incentives attached. The scope is the work itself, not a marketing or TVL target.

## Impact Claims

- Unblocks richer standard-library data structures in Fe, which has been a known gap
- Moves Fe closer to production readiness as an alternative to Solidity and Vyper
- Improves the long-term diversity and safety of the EVM smart-contract language ecosystem — a core public-good goal of the ESP
- Output is MIT/Apache open source, permanently available to the ecosystem

## Outcome (if known)

Approved and listed in the EF ESP Q1 2024 allocation update alongside 104 other small grants (ESP disbursed ~$3M across 105 projects in 2024). No public post-mortem yet. A useful edge case for the judge pipeline: tiny budget, single contributor, pure R&D, no revenue/TVL metrics — tests whether the Impact judge can recognize infrastructure value without DeFi-style quantitative claims, and whether the Team judge can reason about lone open-source contributors.
