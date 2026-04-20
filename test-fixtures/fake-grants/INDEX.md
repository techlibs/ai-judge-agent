# Fake / Bad Grant Fixtures

Adversarial proposals designed to stress-test the judge system's ability to distinguish real public-goods work from common failure modes. Paired 1:1 with the real fixtures in `../real-grants-with-media/` so the judge output is directly comparable.

## Archetypes

| # | Name | Failure mode | Expected judge behavior |
|---|------|--------------|-------------------------|
| 01 | **MoonRocket Finance** | Rug-pull / token-speculation scam | Low Tech (no real architecture), low Team (anonymous), low IPE alignment (anti-freedom profit extraction), low Cost (unjustified $950k), high anomaly-flag count |
| 02 | **BlockVerseAI Universal** | Buzzword vaporware — AI + blockchain + metaverse + quantum with no substance | Low Tech (no concrete stack), medium-low Impact (vague beneficiaries), low Cost (no breakdown), low Team (2-person "synergy leads") |
| 03 | **Nethereum Protocol v2** | Plagiarism / impersonation — claims to "reinvent Ethereum" from scratch, fake links, fake Satoshi team | Low Team (obvious impersonation), low Tech (unrealistic scope for budget), anomaly flags, reject |

## Design intent

- Each fake uses the **same on-the-wire schema** as the real fixtures so Ralph's `/api/evaluate` accepts it.
- None of them have a working GitHub (either no link, or a deliberately broken one) or a real demo video.
- Budgets are chosen to trigger the Cost judge's outlier detection: tiny-for-scope ($15k for "reimplement Ethereum") or huge-for-vapor ($950k for "revolutionary synergy").
- Team descriptions are chosen to trigger Team judge suspicion: anonymous wallets, impersonation of Satoshi, or LinkedIn-stuffing with no verifiable track record.

Comparison against the strong **rotki** baseline (83/100 Ralph aggregate) is the main evidence signal: if judges score these fakes meaningfully lower, the system is differentiating quality.
