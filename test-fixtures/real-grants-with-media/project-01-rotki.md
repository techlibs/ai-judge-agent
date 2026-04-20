# rotki

**Grant program**: Optimism RetroPGF (Rounds 2 & 3), Octant Epoch grants, Gitcoin Grants
**Amount**: ~30,000+ OP from Optimism RetroPGF 2, additional allocations in RetroPGF 3 and Octant epochs; cumulative public-goods funding in the six-figure USD range
**Status/outcome**: Active, maintained continuously since 2017; widely cited as a canonical public-goods project in RetroPGF governance debates

## Links
- **GitHub**: https://github.com/rotki/rotki (3.8k stars, AGPL-3.0, README + docs present)
- **Video**: https://www.youtube.com/watch?v=Fdgibs_P2H4 ("Rotki v1.6.1 demo" on the official rotki channel)
- **Website**: https://rotki.com/

## Project summary
rotki is an open-source, local-first portfolio tracking, accounting, and management application for crypto assets. Unlike SaaS portfolio trackers (CoinTracker, Zerion, DeBank), rotki runs entirely on the user's own machine — transaction history, balances, tax reports, and DeFi positions are computed locally and encrypted at rest, so no custodian or third-party backend sees the user's wallet map.

The problem it solves is real and under-addressed: crypto users who care about privacy have historically been forced to choose between convenience (cloud trackers that aggregate across addresses, inevitably leaking graph data) and manual bookkeeping. rotki provides a polished GUI on top of a Python backend that ingests exchange APIs, EVM chain data, and DeFi protocol adapters, then produces accountant-grade reports.

Its impact in the public-goods ecosystem is twofold: (1) it has become a reference for the "local-first, privacy-preserving" design pattern cited in ENS, Gitcoin, and Optimism governance threads; (2) it demonstrates that a small independent team can sustain AGPL copyleft software for nearly a decade on public-goods funding alone.

## Team
Led by Lefteris Karapetsas (ex-Ethereum Foundation DEVCON organizer, Brainbot, DAO hack responder). Small full-time core team (~5) based primarily in Europe, augmented by open-source contributors. Transparent with real identities, regular DappCon talks, consistent release cadence.

## Budget
Has historically requested funding in the $100–300k USD-equivalent range per epoch/round to cover 3–5 full-time engineers. Breakdown typically: ~70% salaries, ~15% infra (CI, release signing, macOS/Windows/Linux packaging), ~15% UX/design and community.

## Why this is a good judge-agent test case
Baseline "strong" project — high signals on Team Capability (known maintainer, long history), Technical Feasibility (shipping production software), and Impact (referenced by peers). Should stress the judge on Cost Efficiency: the project is already well-funded by other programs, so a naïve judge might over-reward it while a calibrated judge flags diminishing marginal impact.
