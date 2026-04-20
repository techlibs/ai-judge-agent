/**
 * Standalone E2E judge evaluation script.
 *
 * Runs the Superpower judge agents against 6 grant-proposal fixtures
 * (3 real projects, 3 adversarial fakes) and writes one JSON per fixture
 * to docs/e2e-evidence/raw-json/superpower_<slug>.json in the repo root.
 *
 * Bypasses the HTTP submission path (DB, IPFS, Colosseum research) to
 * capture the judge discrimination signal directly. Uses OPENAI_API_KEY
 * from .env.local via bun's auto-loading.
 *
 * Run from .worktrees/superpower:
 *   bun run scripts/e2e-judge-fixtures.ts
 */
import fs from "node:fs/promises";
import path from "node:path";
import { mastra } from "@/lib/mastra";
import { JUDGE_DIMENSIONS, type JudgeDimension, DIMENSION_WEIGHTS } from "@/lib/constants";
import { buildProposalContext } from "@/lib/judges/prompts";
import { JudgeEvaluationSchema } from "@/lib/judges/schemas";
import { computeAggregateScore } from "@/lib/judges/weights";
import type { ProposalInput } from "@/types";

const REPO_ROOT = path.resolve(__dirname, "../../..");
const OUT_DIR = path.join(REPO_ROOT, "docs/e2e-evidence/raw-json");
const FAKE_DIR = path.join(REPO_ROOT, "test-fixtures/fake-grants");
const REAL_DIR = path.join(REPO_ROOT, "test-fixtures/real-grants-with-media");

interface FixtureJob {
  slug: string;
  proposal: ProposalInput;
}

const REAL_PROPOSALS: Array<{ slug: string; file: string; build: () => ProposalInput }> = [
  {
    slug: "rotki",
    file: "project-01-rotki.md",
    build: () => ({
      title: "rotki — local-first privacy-preserving portfolio tracker",
      description:
        "rotki is an open-source, local-first portfolio tracking, accounting, and management application for crypto assets. Unlike SaaS portfolio trackers (CoinTracker, Zerion, DeBank), rotki runs entirely on the user's own machine — transaction history, balances, tax reports, and DeFi positions are computed locally and encrypted at rest, so no custodian or third-party backend sees the user's wallet map. The project has been maintained continuously since 2017 with 3.8k GitHub stars and AGPL-3.0 license. Video demo: https://www.youtube.com/watch?v=Fdgibs_P2H4. GitHub: https://github.com/rotki/rotki.",
      problemStatement:
        "Crypto users who care about privacy have historically been forced to choose between convenience (cloud trackers that aggregate across addresses, inevitably leaking graph data) and manual bookkeeping. There is no local-first, accountant-grade option that preserves wallet-graph privacy.",
      proposedSolution:
        "A polished GUI on top of a Python backend that ingests exchange APIs, EVM chain data, and DeFi protocol adapters, then produces accountant-grade reports. Encrypted-at-rest local database; AGPL-3.0 copyleft to ensure downstream openness. Python + Electron stack for cross-platform desktop distribution.",
      teamMembers: [
        { name: "Lefteris Karapetsas", role: "Founder & lead engineer" },
        { name: "Core engineer 2", role: "Full-time engineer" },
        { name: "Core engineer 3", role: "Full-time engineer" },
        { name: "Core engineer 4", role: "Full-time engineer" },
        { name: "Core engineer 5", role: "Full-time engineer" },
      ],
      budgetAmount: 300000,
      budgetBreakdown:
        "~70% salaries for 5 FTE engineers over 12 months, ~15% infrastructure (CI, release signing, macOS/Windows/Linux packaging, download hosting), ~15% UX/design and community operations.",
      timeline:
        "Monthly public releases. Quarterly retrospective and roadmap review. 12-month funding cycle aligned with RetroPGF epochs.",
      category: "infrastructure",
      residencyDuration: "4-weeks",
      demoDayDeliverable:
        "Live demo of the privacy-preserving accounting pipeline at IPE Village, including tax-report generation and DeFi position reconciliation.",
      communityContribution:
        "Provide a reference implementation for local-first, privacy-preserving design that others in the IPE City ecosystem can build on. Host a workshop on building AGPL-copyleft sustainable open source.",
      priorIpeParticipation: false,
      links: [
        "https://github.com/rotki/rotki",
        "https://www.youtube.com/watch?v=Fdgibs_P2H4",
        "https://rotki.com/",
      ],
    }),
  },
  {
    slug: "hypercerts",
    file: "project-02-hypercerts.md",
    build: () => ({
      title: "Hypercerts — on-chain impact certificates (ERC-1155)",
      description:
        "Hypercerts is a standard and toolkit for on-chain impact certificates — semi-fungible ERC-1155 tokens that represent claims of positive impact. Funders can mint hypercerts when they fund a public-goods project, creating a verifiable history of who backed what. The project was incubated by Protocol Labs and the Network Goods group. GitHub: https://github.com/hypercerts-org/hypercerts (archived in 2025 after a strategic pivot). Video: https://www.youtube.com/watch?v=8osT1iL7Vcc.",
      problemStatement:
        "Public-goods funding history is fragmented across Gitcoin Grants, Optimism RetroPGF, Octant, and ad-hoc grant programs. There is no shared, on-chain record of what got funded, who funded it, and what impact resulted. This makes retro-active funding (like RetroPGF) hard to calibrate and easy to game.",
      proposedSolution:
        "Deploy ERC-1155-based semi-fungible tokens encoding an impact claim (scope, time period, work, contributors). Build a registry, indexer, and UI for minting, evaluating, and trading hypercerts. Integrate with existing funding programs so every grant produces a hypercert automatically.",
      teamMembers: [
        { name: "Holke Brammer", role: "Research lead" },
        { name: "Network Goods team", role: "Contributors (Protocol Labs)" },
      ],
      budgetAmount: 250000,
      budgetBreakdown:
        "60% engineering (smart contracts, indexer, frontend), 20% research and community, 10% audits, 10% grants program integrations.",
      timeline:
        "6-month cycle: Month 1-2 standard spec + audits, Month 3-4 indexer + UI, Month 5-6 integrations with Gitcoin / Optimism / Octant.",
      category: "infrastructure",
      residencyDuration: "4-weeks",
      demoDayDeliverable:
        "Live mint flow at IPE Village: a funder mints a hypercert for an IPE grant, then hands it to the recipient.",
      communityContribution:
        "Open-source spec + reference contracts that any grant program (including IPE City's) can adopt to issue on-chain impact certificates.",
      priorIpeParticipation: false,
      links: [
        "https://github.com/hypercerts-org/hypercerts",
        "https://www.youtube.com/watch?v=8osT1iL7Vcc",
      ],
    }),
  },
  {
    slug: "kiwi",
    file: "project-03-kiwi-news.md",
    build: () => ({
      title: "Kiwi News — peer-to-peer attestation-based news aggregator",
      description:
        "Kiwi News is a decentralized Hacker-News-style link aggregator for the crypto/web3 community. Instead of a centralized server deciding ranking, contributors stake and submit links as signed attestations to a peer-to-peer network (kiwistand). Reputation is earned through curation quality, and the frontend reads the kiwistand P2P network directly. GitHub: https://github.com/attestate/kiwistand. Video: https://www.youtube.com/watch?v=LjJ27GhofYQ.",
      problemStatement:
        "Crypto news aggregation (Hacker News, Reddit, Twitter) is centralized, algorithmically opaque, and vulnerable to shadow-banning and moderation overreach. The crypto community needs a censorship-resistant alternative where curation is verifiable on-chain and attestations form a portable reputation.",
      proposedSolution:
        "Build kiwistand — a P2P attestation network where each submission or upvote is a signed message. Frontend aggregates attestations and computes ranking client-side. Tokenized curation (stake to submit, earn on quality upvotes). Ethereum-based identity via ENS.",
      teamMembers: [
        { name: "Tim Daubenschütz", role: "Founder & engineer" },
        { name: "Contributor 2", role: "Protocol engineer" },
      ],
      budgetAmount: 120000,
      budgetBreakdown:
        "70% two-engineer salaries over 9 months, 20% infrastructure (relay nodes, indexer), 10% design/community moderation.",
      timeline:
        "Q1: stabilize P2P attestation network. Q2: ENS + wallet integration. Q3: reputation-weighted ranking v2.",
      category: "community",
      residencyDuration: "3-weeks",
      demoDayDeliverable:
        "Live Kiwi News feed with IPE Village residents submitting and curating links from the venue.",
      communityContribution:
        "Publish the kiwistand protocol spec and operate a relay that other apps can read from. Workshop on attestation-based reputation.",
      priorIpeParticipation: false,
      links: [
        "https://github.com/attestate/kiwistand",
        "https://www.youtube.com/watch?v=LjJ27GhofYQ",
        "https://news.kiwistand.com/",
      ],
    }),
  },
];

async function loadFakeFixtures(): Promise<FixtureJob[]> {
  const files = [
    ["fake-01-moonrocket", "fake-01-moonrocket.json"],
    ["fake-02-blockverseai", "fake-02-blockverseai.json"],
    ["fake-03-nethereum", "fake-03-nethereum.json"],
  ] as const;
  const jobs: FixtureJob[] = [];
  for (const [slug, file] of files) {
    const raw = await fs.readFile(path.join(FAKE_DIR, file), "utf-8");
    const parsed = JSON.parse(raw) as { proposal: ProposalInput };
    jobs.push({ slug, proposal: parsed.proposal });
  }
  return jobs;
}

function loadRealFixtures(): FixtureJob[] {
  return REAL_PROPOSALS.map((r) => ({ slug: r.slug, proposal: r.build() }));
}

async function evaluateOne(job: FixtureJob) {
  const proposalContext = buildProposalContext(job.proposal);
  const perDimension: Record<string, unknown> = {};
  for (const dim of JUDGE_DIMENSIONS) {
    const agent = mastra.getAgent(`judge-${dim}`);
    const started = Date.now();
    const res = await agent.generate(proposalContext, {
      structuredOutput: { schema: JudgeEvaluationSchema },
    });
    const elapsedMs = Date.now() - started;
    const parsed = res.object;
    if (!parsed) {
      throw new Error(`Judge ${dim} returned no structured output for ${job.slug}`);
    }
    perDimension[dim] = { ...parsed, elapsedMs };
    console.log(`[${job.slug}] ${dim}: score=${parsed.score} rec=${parsed.recommendation} conf=${parsed.confidence} (${elapsedMs}ms)`);
  }
  const scores = Object.fromEntries(
    JUDGE_DIMENSIONS.map((d) => [d, (perDimension[d] as { score: number }).score])
  ) as Record<JudgeDimension, number>;
  const aggregate = computeAggregateScore(scores);
  return { proposalTitle: job.proposal.title, dimensions: perDimension, aggregateScoreBps: aggregate, weights: DIMENSION_WEIGHTS };
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const jobs = [...loadRealFixtures(), ...(await loadFakeFixtures())];
  console.log(`Evaluating ${jobs.length} fixtures via Superpower judge agents (OpenAI gpt-4o)...`);
  for (const job of jobs) {
    try {
      const result = await evaluateOne(job);
      const payload = {
        framework: "superpower",
        fixtureSlug: job.slug,
        evaluatedAt: new Date().toISOString(),
        model: "gpt-4o",
        note: "Evaluated via direct judge-agent invocation (HTTP submission path bypassed due to Origin header + IPFS + DB requirements). Colosseum research phase also skipped. Prompts and schemas are identical to the Cloud Run service.",
        ...result,
      };
      const outFile = path.join(OUT_DIR, `superpower_${job.slug}.json`);
      await fs.writeFile(outFile, JSON.stringify(payload, null, 2));
      console.log(`  → wrote ${outFile}`);
    } catch (err) {
      console.error(`  × ${job.slug} failed:`, err);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
