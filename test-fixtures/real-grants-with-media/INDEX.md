# Real Grants With Media — Test Fixtures

Three real web3/public-goods grant recipients with BOTH a public GitHub repo (README present) and a publicly viewable YouTube demo video. Used to exercise the agent-reviewer's `extractGithubRepo` and `extractVideoContext` enrichment tools against real proposals.

## Projects

| # | Project | Profile | Grant program | GitHub | Video |
|---|---------|---------|---------------|--------|-------|
| 01 | rotki | Strong (established, well-funded) | Optimism RetroPGF + Octant + Gitcoin | [rotki/rotki](https://github.com/rotki/rotki) | [Rotki v1.6.1 demo](https://www.youtube.com/watch?v=Fdgibs_P2H4) |
| 02 | Hypercerts | Borderline/mixed (ambitious primitive, since archived) | Protocol Labs + Gitcoin GG20 | [hypercerts-org/hypercerts](https://github.com/hypercerts-org/hypercerts) | [Hypercerts demo](https://www.youtube.com/watch?v=8osT1iL7Vcc) |
| 03 | Kiwi News | Experimental/newer | Optimism RetroPGF + Octant | [attestate/kiwistand](https://github.com/attestate/kiwistand) | [Kiwi News @ DevNTell](https://www.youtube.com/watch?v=LjJ27GhofYQ) |

## URL verification (all returned HTTP 200 on 2026-04-19)

- https://github.com/rotki/rotki — 200
- https://github.com/hypercerts-org/hypercerts — 200 (repo archived but publicly readable)
- https://github.com/attestate/kiwistand — 200
- https://www.youtube.com/watch?v=Fdgibs_P2H4 — 200 (publicly viewable)
- https://www.youtube.com/watch?v=8osT1iL7Vcc — 200 (publicly viewable)
- https://www.youtube.com/watch?v=LjJ27GhofYQ — 200 (publicly viewable)

## Why these three

Judge-stress-testing across the four evaluation dimensions:

- **rotki** — "strong" baseline: mature codebase (3.8k stars, AGPL), multi-epoch grant history, real users. Should score high on Team Capability and Technical Feasibility; borderline on Cost Efficiency (already funded elsewhere).
- **Hypercerts** — "borderline/mixed": visionary primitive, funded by Protocol Labs + Gitcoin ($60k+ matching in GG20), but the main repo was archived in Feb 2025 in favor of split repos. Tests whether judges notice signals of pivot/deprecation and how they weight high-impact vision vs. execution risk.
- **Kiwi News** — "experimental/newer": niche decentralized Hacker News for crypto, smaller team, RetroPGF recipient. Should expose judges' ability to score novelty + community traction without large star counts.
