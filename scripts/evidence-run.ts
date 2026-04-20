/**
 * E2E evidence driver: runs Spec Kit's judge pipeline against 6 fixtures
 * (3 real, 3 fake) without touching IPFS / chain / DB. Writes raw JSON
 * outputs to docs/e2e-evidence/raw-json/ in the main repo root.
 *
 * Usage (from .worktrees/speckit):
 *   bun run scripts/evidence-run.ts
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { sanitizeProposal } from "../src/evaluation/sanitization";
import { runAllDimensions } from "../src/evaluation/agents/runner";
import { computeWeightedScore } from "../src/evaluation/scoring";

const MAIN_REPO = resolve(__dirname, "../../..");
const FIXTURES_DIR = join(MAIN_REPO, "test-fixtures");
const OUT_DIR = join(MAIN_REPO, "docs/e2e-evidence/raw-json");

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

interface RealFixture {
  slug: string;
  outName: string;
  title: string;
  description: string;
  technicalDescription: string;
  budgetAmount: number;
  budgetCurrency: string;
  budgetBreakdown: Array<{ category: string; amount: number; description: string }>;
  teamMembers: Array<{ role: string; experience: string }>;
  category: string;
}

// Real-project fixtures are markdown; map them to structured proposals using
// the narrative facts already documented.
const REAL_FIXTURES: RealFixture[] = [
  {
    slug: "rotki",
    outName: "speckit_rotki.json",
    title: "rotki — privacy-preserving local-first crypto portfolio tracker",
    description:
      "rotki is an open-source, AGPL-3.0 licensed, local-first portfolio tracking, accounting, and management application for crypto assets. It has been maintained continuously since 2017 with monthly releases and ~3.8k GitHub stars at github.com/rotki/rotki. Unlike SaaS portfolio trackers, rotki runs entirely on the user's machine — transaction history, balances, tax reports, and DeFi positions are computed locally and encrypted at rest. It is a reference implementation of the local-first privacy-preserving pattern cited in ENS, Gitcoin, and Optimism governance. Prior public-goods funding includes Optimism RetroPGF rounds 2 and 3 (~30,000+ OP), Octant epochs, and Gitcoin Grants. Demo video on the official YouTube channel shows the v1.6.1 end-to-end flow.",
    technicalDescription:
      "Python backend + Electron/Vue frontend. Ingests exchange APIs (Binance, Coinbase, Kraken, 20+), EVM chain data (Ethereum, Optimism, Arbitrum, Polygon, Base) and DeFi protocol adapters (Uniswap v2/v3, Aave, Compound, Curve, etc). Local encrypted SQLite for transaction history. Accountant-grade tax report generator. CI/CD with signed macOS/Windows/Linux builds. 8-year release history on GitHub. Architecture: modular adapter pattern per exchange/protocol; price resolver with historical caching; async job runner for chain scans.",
    budgetAmount: 300000,
    budgetCurrency: "USD",
    budgetBreakdown: [
      { category: "salaries", amount: 210000, description: "5 full-time engineers for 12 months, ~70% of budget" },
      { category: "infrastructure", amount: 45000, description: "CI, release signing, macOS/Windows/Linux packaging, storage" },
      { category: "design_and_community", amount: 45000, description: "UX/design contractor and community management" },
    ],
    teamMembers: [
      { role: "Founder / Lead Engineer", experience: "Lefteris Karapetsas — ex-Ethereum Foundation DEVCON organizer, Brainbot, DAO hack responder. 8+ years shipping rotki." },
      { role: "Core engineer (backend)", experience: "5+ years Python / EVM data pipeline" },
      { role: "Core engineer (frontend)", experience: "5+ years Vue/Electron, desktop packaging" },
      { role: "Core engineer (integrations)", experience: "Exchange + DeFi protocol adapters" },
      { role: "Core engineer (DeFi)", experience: "DeFi protocol integrations, pricing" },
    ],
    category: "infrastructure",
  },
  {
    slug: "hypercerts",
    outName: "speckit_hypercerts.json",
    title: "Hypercerts — interoperable impact funding primitive",
    description:
      "Hypercerts are a semi-fungible token standard (ERC-1155-based) for representing claims about positive impact work that can be owned, transferred, and retired. The protocol was incubated within the Gitcoin + Protocol Labs ecosystem and aims to be a standard primitive for impact funding across retroactive public goods programs, climate credits, and science funding. GitHub repository at github.com/hypercerts-org/hypercerts is currently archived (2025) after a pivot; content and docs remain public. A conference demo from DevConnect is available on YouTube. This proposal seeks funding to fork and maintain the core library for an additional year given continued adoption by downstream funders.",
    technicalDescription:
      "Solidity smart contracts implementing ERC-1155 semi-fungible tokens with fractionalization and claim metadata on IPFS. SDK in TypeScript with viem + GraphQL subgraph for indexing. Reference frontend for minting and claim viewing. Deployed on Ethereum mainnet, Optimism, Celo. Claim metadata schema defines work scope, time period, contributors, rights. Protocol has been audited (2023). Recent archive of primary repo means maintenance continuity is the core risk.",
    budgetAmount: 250000,
    budgetCurrency: "USD",
    budgetBreakdown: [
      { category: "engineering", amount: 150000, description: "2 engineers to maintain contracts, SDK, subgraph for 12 months" },
      { category: "audit", amount: 40000, description: "Re-audit after any contract changes" },
      { category: "community", amount: 30000, description: "Community fund for downstream integrations" },
      { category: "infrastructure", amount: 30000, description: "Subgraph hosting, IPFS pinning, CI" },
    ],
    teamMembers: [
      { role: "Protocol lead", experience: "Originator of hypercerts primitive, 4+ years public-goods-funding research" },
      { role: "Smart contract engineer", experience: "5+ years Solidity, prior ERC-1155 work" },
      { role: "Protocol engineer", experience: "3+ years on subgraph + SDK maintenance" },
    ],
    category: "public_goods",
  },
  {
    slug: "kiwi",
    outName: "speckit_kiwi.json",
    title: "Kiwi News — attestation-based crypto news curation via kiwistand",
    description:
      "Kiwi News is an experimental, community-curated news feed for crypto/web3 content. Readers with an NFT pass submit story links, upvote, and comment. Upvotes are cryptographic attestations stored in kiwistand — a small, open P2P attestation network built by attestate (github.com/attestate/kiwistand). Demo on YouTube walks through the posting flow and the kiwistand attestation primitive. The project has been running continuously for ~2 years with a small but consistent daily user base and is referenced as a case study in decentralized social protocol discussions.",
    technicalDescription:
      "Node.js server running a small P2P attestation network (kiwistand) where each node maintains a set of signed messages (story submissions, upvotes, comments) and reconciles them with peers. Message format uses EIP-712 signatures so attestations are verifiable without trusting any node. Frontend is a lightweight server-rendered HTML site. Persistence via flat-file + SQLite. Limited scale (hundreds of active users) is a known constraint — the protocol is deliberately small and resilient rather than high-throughput.",
    budgetAmount: 120000,
    budgetCurrency: "USD",
    budgetBreakdown: [
      { category: "salaries", amount: 90000, description: "1 full-time engineer for 12 months" },
      { category: "infrastructure", amount: 15000, description: "Hosting, domain, backup nodes" },
      { category: "design_and_docs", amount: 15000, description: "Frontend polish, protocol docs" },
    ],
    teamMembers: [
      { role: "Founder / Engineer", experience: "tim.daubenschuetz / attestate — 5+ years building decentralized social and attestation primitives, prior work at rainbow.me" },
    ],
    category: "social_protocol",
  },
];

interface FakeRaw {
  proposal: {
    title: string;
    description: string;
    problemStatement?: string;
    proposedSolution?: string;
    teamMembers: Array<{ name: string; role: string }>;
    budgetAmount: number;
    budgetBreakdown: string;
    timeline?: string;
    category: string;
    demoDayDeliverable?: string;
    communityContribution?: string;
  };
}

function fakeToSpecKitInput(slug: string, outName: string, raw: FakeRaw): RealFixture {
  const p = raw.proposal;
  const description = [p.description, p.problemStatement, p.communityContribution]
    .filter((v): v is string => !!v)
    .join("\n\n");
  const technicalDescription = [p.proposedSolution, p.timeline, p.demoDayDeliverable]
    .filter((v): v is string => !!v)
    .join("\n\n");
  // The fake breakdown string is narrative; keep a single line item referencing it.
  const budgetBreakdown = [
    {
      category: "summary",
      amount: p.budgetAmount,
      description: p.budgetBreakdown.slice(0, 500),
    },
  ];
  const teamMembers = p.teamMembers.map((m) => ({
    role: m.role,
    experience: `Listed as "${m.name}" — ${m.role}`,
  }));
  return {
    slug,
    outName,
    title: p.title,
    description,
    technicalDescription,
    budgetAmount: p.budgetAmount,
    budgetCurrency: "USD",
    budgetBreakdown,
    teamMembers,
    category: p.category,
  };
}

async function evaluateOne(fx: RealFixture) {
  console.error(`[${fx.slug}] sanitizing + running 4 judges...`);
  const sanitized = sanitizeProposal({
    title: fx.title,
    description: fx.description,
    budgetAmount: fx.budgetAmount,
    budgetCurrency: fx.budgetCurrency,
    budgetBreakdown: fx.budgetBreakdown,
    technicalDescription: fx.technicalDescription,
    teamMembers: fx.teamMembers,
    category: fx.category,
  });
  const result = await runAllDimensions(sanitized, null);
  const { finalScore, reputationMultiplier, adjustedScore } = computeWeightedScore(
    result.scores,
    0
  );
  const out = {
    framework: "speckit",
    slug: fx.slug,
    title: fx.title,
    sanitizedProposal: sanitized,
    modelId: result.modelId,
    promptVersion: result.promptVersion,
    dimensions: result.scores,
    finalScore,
    reputationMultiplier,
    adjustedScore,
    evaluatedAt: new Date().toISOString(),
  };
  const outPath = join(OUT_DIR, fx.outName);
  writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.error(
    `[${fx.slug}] done → finalScore=${finalScore.toFixed(2)} adjusted=${adjustedScore.toFixed(2)}`
  );
  console.error(`[${fx.slug}] wrote ${outPath}`);
  return out;
}

async function main() {
  const inputs: RealFixture[] = [...REAL_FIXTURES];

  const fakeFiles: Array<[string, string]> = [
    ["fake-01-moonrocket", "speckit_fake-01-moonrocket.json"],
    ["fake-02-blockverseai", "speckit_fake-02-blockverseai.json"],
    ["fake-03-nethereum", "speckit_fake-03-nethereum.json"],
  ];
  for (const [base, outName] of fakeFiles) {
    const path = join(FIXTURES_DIR, "fake-grants", `${base}.json`);
    const raw = JSON.parse(readFileSync(path, "utf8")) as FakeRaw;
    inputs.push(fakeToSpecKitInput(base, outName, raw));
  }

  const summary: Array<{ slug: string; score: number; dims: Record<string, number> }> = [];
  for (const fx of inputs) {
    try {
      const r = await evaluateOne(fx);
      const dims: Record<string, number> = {};
      for (const d of r.dimensions) dims[d.dimension] = d.score;
      summary.push({ slug: fx.slug, score: r.finalScore, dims });
    } catch (err) {
      console.error(`[${fx.slug}] FAILED`, err);
    }
  }

  console.error("\n=== SUMMARY ===");
  for (const s of summary) {
    console.error(
      `${s.slug.padEnd(25)} final=${s.score.toFixed(2).padStart(5)} ` +
        `tech=${s.dims.technical_feasibility} impact=${s.dims.impact_potential} ` +
        `cost=${s.dims.cost_efficiency} team=${s.dims.team_capability}`
    );
  }
  writeFileSync(join(OUT_DIR, "speckit_summary.json"), JSON.stringify(summary, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
