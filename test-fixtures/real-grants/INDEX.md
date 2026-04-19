# Real Grant Proposals — Test Fixtures

A curated corpus of real, publicly-available grant proposals from well-known web3 and open-source grant programs. Used to validate the Agent Reviewer AI Judge pipeline by comparing its scores to actual funding decisions.

| # | Project | Program / Round | Amount | Profile | Status | Source |
|---|---------|-----------------|--------|---------|--------|--------|
| 01 | Aave (GHO on Arbitrum) | Arbitrum LTIPP (Mar 2024) | 750,000 ARB | High-quality, blue-chip DeFi infra | Approved, executed | [forum](https://forum.arbitrum.foundation/t/aave-ltipp-application-final/21741) |
| 02 | Pyth Network | Arbitrum LTIPP (Mar 2024) | 1,000,000 ARB | Infrastructure / oracle; heavily over-budgeted vs actual spend | Approved, ~66k ARB distributed | [forum](https://forum.arbitrum.foundation/t/pyth-network-ltipp-application-draft/22003) |
| 03 | Aark | Arbitrum LTIPP (Mar 2024) | 900,000 ARB | Contentious: prior airdrop controversy, smaller/newer DEX | Mixed reception | [forum](https://forum.arbitrum.foundation/t/aark-ltipp-application-final/21464) |
| 04 | Fe Lang Memory Allocator | Ethereum Foundation ESP Q1 2024 | Small ESP grant (amount undisclosed) | Experimental solo-researcher tooling | Approved | [blog](https://blog.ethereum.org/en/2024/05/14/esp-allocation-q124) |
| 05 | L2BEAT | Optimism RetroPGF Round 3 (Jan 2024) | 256,000 OP | Retroactive public goods (non-DeFi, research/transparency) | Awarded | [announcement](https://optimism.mirror.xyz/37Bgum6MfTJWDuE41CH9RXSH5KBm_RCL5zsSFeRZl4E) |

## How to use

Each `grant-NN-*.md` file is shaped like a proposal submission — paste the body into the Agent Reviewer's proposal form for each of the three SDD worktrees (GSD, Spec Kit, Superpowers) and compare the four judge scores (Technical Feasibility, Impact Potential, Cost Efficiency, Team Capability) to the real funding outcome.

## Coverage rationale

- **Grant 01 (Aave)**: benchmark for a well-funded, clearly high-quality infra grant. Judges should score this high across all dimensions.
- **Grant 02 (Pyth)**: infrastructure with strong claims but huge over-requested budget — Cost Efficiency judge should flag.
- **Grant 03 (Aark)**: controversial/smaller project — Team Capability and Impact judges should be discriminating.
- **Grant 04 (Fe Lang)**: solo-researcher experimental tooling — tests judges on small, non-DeFi, pure R&D.
- **Grant 05 (L2BEAT)**: pure public good (transparency/research), retroactive funding model, non-DeFi domain.
