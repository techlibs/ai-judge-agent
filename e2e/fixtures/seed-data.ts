import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { sql } from "drizzle-orm";
import { keccak256, toHex } from "viem";

// ---------------------------------------------------------------------------
// Exported test constants
// ---------------------------------------------------------------------------

export const TEST_API_KEY = "test-api-key-12345";
export const TEST_WEBHOOK_SECRET = "test-webhook-secret";
export const EVALUATED_PROPOSAL_ID = "prop-evaluated-1";
export const PENDING_PROPOSAL_ID = "prop-pending-1";
export const FUNDED_PROPOSAL_ID = "prop-funded-1";
export const DISPUTED_PROPOSAL_ID = "prop-disputed-1";
export const FINALIZED_PROPOSAL_ID = "prop-funded-1";
export const CORRUPT_JSON_PROPOSAL_ID = "prop-corrupt-json";

// Duplicate detection: pre-computed keccak256 hash for "test-platform:dup-test-ext"
export const DUP_TEST_EXTERNAL_ID = "dup-test-ext";
export const DUP_TEST_PROPOSAL_ID = keccak256(toHex("test-platform:dup-test-ext"));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CATEGORIES = [
  "infrastructure",
  "defi",
  "education",
  "social",
  "gaming",
] as const;

const DIMENSIONS = [
  { name: "technical_feasibility", weight: 0.25 },
  { name: "impact_potential", weight: 0.3 },
  { name: "cost_efficiency", weight: 0.2 },
  { name: "team_capability", weight: 0.25 },
] as const;

interface ProposalSeed {
  id: string;
  fundingRoundId: string;
  status: string;
  title: string;
  description: string;
  budgetAmount: number;
  teamSize: number;
  index: number;
  finalScore?: number;
}

function buildProposals(): ProposalSeed[] {
  const proposals: ProposalSeed[] = [];

  const round1Titles = [
    "Solar Grid for Village",
    "Community Water Purification System",
    "Rural Broadband Network",
    "Sustainable Farming Toolkit",
    "Mobile Health Clinic Platform",
    "DeFi Lending Protocol",
    "Cross-chain Bridge Infrastructure",
    "DAO Governance Framework",
    "NFT Marketplace for Artisans",
    "Decentralized Identity Resolver",
    "Open-source Education Hub",
    "Youth STEM Workshop Series",
    "Agricultural Supply Chain Tracker",
    "Renewable Energy Microgrid",
    "Disaster Response Coordination Tool",
  ];

  const round2Titles = [
    "Play-to-Earn Gaming Ecosystem",
    "Social Impact Token Platform",
    "Decentralized Insurance Pool",
    "Public Goods Funding Dashboard",
    "AI-powered Grant Evaluator",
    "Community Governance Voting App",
    "Tokenized Carbon Credits Exchange",
    "Web3 Developer Onboarding Portal",
    "Peer-to-Peer Lending Network",
    "Digital Credential Verification System",
  ];

  // Round 1: pending (1-5)
  for (let i = 1; i <= 5; i++) {
    proposals.push({
      id: `prop-pending-${i}`,
      fundingRoundId: "round-1",
      status: "pending",
      title: `${round1Titles[i - 1]} ${i}`,
      description: `A comprehensive proposal to build ${round1Titles[i - 1].toLowerCase()} that serves underrepresented communities`,
      budgetAmount: 10000 + i * 8000,
      teamSize: 2 + (i % 4),
      index: i,
    });
  }

  // Round 1: evaluated (1-5) with specific scores for first three
  const evaluatedScores = [8.5, 6.0, 3.5, 7.8, 7.0];
  for (let i = 1; i <= 5; i++) {
    proposals.push({
      id: `prop-evaluated-${i}`,
      fundingRoundId: "round-1",
      status: "evaluated",
      title: `${round1Titles[4 + i]} ${i}`,
      description: `A comprehensive proposal to build ${round1Titles[4 + i].toLowerCase()} with proven methodology and strong team`,
      budgetAmount: 20000 + i * 10000,
      teamSize: 3 + (i % 3),
      index: 5 + i,
      finalScore: evaluatedScores[i - 1],
    });
  }

  // Round 1: funded (1-5) with first one at 9.5
  const fundedScores = [9.5, 8.0, 7.5, 8.2, 7.8];
  for (let i = 1; i <= 5; i++) {
    proposals.push({
      id: `prop-funded-${i}`,
      fundingRoundId: "round-1",
      status: "funded",
      title: `${round1Titles[9 + i]} ${i}`,
      description: `A comprehensive proposal to build ${round1Titles[9 + i].toLowerCase()} backed by rigorous technical analysis`,
      budgetAmount: 30000 + i * 12000,
      teamSize: 3 + (i % 3),
      index: 10 + i,
      finalScore: fundedScores[i - 1],
    });
  }

  // Round 2: disputed (1-5)
  const disputedScores = [5.5, 6.2, 4.8, 5.0, 6.5];
  for (let i = 1; i <= 5; i++) {
    proposals.push({
      id: `prop-disputed-${i}`,
      fundingRoundId: "round-2",
      status: "disputed",
      title: `${round2Titles[i - 1]} ${i}`,
      description: `A comprehensive proposal to build ${round2Titles[i - 1].toLowerCase()} currently under community review`,
      budgetAmount: 15000 + i * 9000,
      teamSize: 2 + (i % 4),
      index: 15 + i,
      finalScore: disputedScores[i - 1],
    });
  }

  // Round 2: evaluated (1-5)
  const evalR2Scores = [7.2, 6.8, 7.5, 8.0, 6.5];
  for (let i = 1; i <= 5; i++) {
    proposals.push({
      id: `prop-eval-r2-${i}`,
      fundingRoundId: "round-2",
      status: "evaluated",
      title: `${round2Titles[4 + i]} ${i}`,
      description: `A comprehensive proposal to build ${round2Titles[4 + i].toLowerCase()} with innovative approach and clear milestones`,
      budgetAmount: 25000 + i * 7000,
      teamSize: 3 + (i % 3),
      index: 20 + i,
      finalScore: evalR2Scores[i - 1],
    });
  }

  return proposals;
}

function hasScore(status: string): boolean {
  return status === "evaluated" || status === "funded" || status === "disputed";
}

// ---------------------------------------------------------------------------
// Main seed function
// ---------------------------------------------------------------------------

export async function seedTestData(dbUrl: string): Promise<void> {
  const client = createClient({ url: dbUrl });
  const db = drizzle(client);

  try {
    // 1. Platform Integrations
    await db.run(sql`
      INSERT OR IGNORE INTO platform_integrations (id, name, webhook_url, api_key_hash, webhook_secret, status, created_at)
      VALUES (
        'test-platform',
        'Test Platform',
        'https://test.example.com/webhook',
        '2688f4e126ca5efd4a60022073e6cd90017626e56c3f30b194d53e6299edfe3c',
        'test-webhook-secret',
        'active',
        '2026-04-01T00:00:00Z'
      )
    `);

    // 2. Proposals
    const proposals = buildProposals();

    for (const p of proposals) {
      const category = CATEGORIES[p.index % CATEGORIES.length];
      const chainTimestamp = 1712000000 + p.index * 3600;

      if (hasScore(p.status) && p.finalScore !== undefined) {
        const adjustedScore =
          Math.round(p.finalScore * 1.005 * 100) / 100;

        await db.run(sql`
          INSERT OR IGNORE INTO proposals (
            id, external_id, platform_source, funding_round_id, title, description,
            budget_amount, budget_currency, technical_description, team_profile_hash,
            team_size, category, status, submitted_at, chain_timestamp,
            proposal_content_cid, evaluation_content_cid,
            final_score, adjusted_score, reputation_multiplier, evaluated_at
          ) VALUES (
            ${p.id}, ${`${p.id}-ext`}, 'test-platform', ${p.fundingRoundId},
            ${p.title}, ${p.description},
            ${p.budgetAmount}, 'USD',
            ${`Technical implementation details for proposal ${p.id}`},
            ${`0xhash${p.index}`}, ${p.teamSize}, ${category}, ${p.status},
            '2026-04-01T10:00:00Z', ${chainTimestamp},
            ${`bafybeig${p.id}`}, ${`bafybeih${p.id}`},
            ${p.finalScore}, ${adjustedScore}, 1.005, '2026-04-01T12:00:00Z'
          )
        `);
      } else {
        await db.run(sql`
          INSERT OR IGNORE INTO proposals (
            id, external_id, platform_source, funding_round_id, title, description,
            budget_amount, budget_currency, technical_description, team_profile_hash,
            team_size, category, status, submitted_at, chain_timestamp
          ) VALUES (
            ${p.id}, ${`${p.id}-ext`}, 'test-platform', ${p.fundingRoundId},
            ${p.title}, ${p.description},
            ${p.budgetAmount}, 'USD',
            ${`Technical implementation details for proposal ${p.id}`},
            ${`0xhash${p.index}`}, ${p.teamSize}, ${category}, ${p.status},
            '2026-04-01T10:00:00Z', ${chainTimestamp}
          )
        `);
      }
    }

    // 3. Dimension Scores (4 per scored proposal)
    const scoredProposals = proposals.filter(
      (p) => hasScore(p.status) && p.finalScore !== undefined
    );

    for (const p of scoredProposals) {
      const baseScore = p.finalScore ?? 7.0;
      const scoreVariations = [0.3, -0.2, 0.5, -0.1];

      for (let d = 0; d < DIMENSIONS.length; d++) {
        const dim = DIMENSIONS[d];
        const dimScore =
          Math.round(
            Math.min(9.5, Math.max(6.0, baseScore + scoreVariations[d])) * 10
          ) / 10;

        await db.run(sql`
          INSERT OR IGNORE INTO dimension_scores (
            id, proposal_id, dimension, weight, score,
            reasoning_chain, input_data_considered, rubric_applied,
            model_id, prompt_version
          ) VALUES (
            ${`${p.id}-${dim.name}`}, ${p.id}, ${dim.name}, ${dim.weight}, ${dimScore},
            ${`The proposal demonstrates strong ${dim.name.replace(/_/g, " ")} characteristics with clear evidence of planning and execution capability`},
            '["title","description","budget"]',
            '{"criteria":["criterion1","criterion2","criterion3"]}',
            'claude-sonnet-4-6', 'v1.0'
          )
        `);
      }
    }

    // 4. Fund Releases (one per funded proposal)
    const fundedProposals = proposals.filter((p) => p.status === "funded");
    const fundAmounts = [
      "15000000000000000000",
      "12000000000000000000",
      "18000000000000000000",
      "10000000000000000000",
      "14000000000000000000",
    ];

    for (let i = 0; i < fundedProposals.length; i++) {
      const fp = fundedProposals[i];
      const score = fp.finalScore ?? 7.5;
      const releasePercentage = Math.round((score / 10) * 100 * 10) / 10;
      const releasedAt = 1712100000 + (i + 1) * 3600;
      const txHash = `0xabc${i + 1}def456789`;

      await db.run(sql`
        INSERT OR IGNORE INTO fund_releases (
          id, project_id, milestone_index, score, release_percentage,
          amount, tx_hash, released_at
        ) VALUES (
          ${`${fp.id}-release`}, ${fp.id}, 0, ${score}, ${releasePercentage},
          ${fundAmounts[i]}, ${txHash}, ${releasedAt}
        )
      `);
    }

    // 5. Disputes
    // prop-disputed-1: 2 disputes
    await db.run(sql`
      INSERT OR IGNORE INTO disputes (
        id, proposal_id, status, stake_amount, deadline, evidence_cid,
        initiator_address, uphold_votes, overturn_votes
      ) VALUES (
        1, 'prop-disputed-1', 'open', '1500000000000000000', 1712600000,
        'bafybeij-evidence-1', '0x1234567890abcdef1234567890abcdef12345678',
        3, 2
      )
    `);

    await db.run(sql`
      INSERT OR IGNORE INTO disputes (
        id, proposal_id, status, new_score, stake_amount, deadline,
        resolved_at, evidence_cid, initiator_address, uphold_votes, overturn_votes
      ) VALUES (
        2, 'prop-disputed-1', 'upheld', 7.2, '2000000000000000000', 1712500000,
        1712550000, 'bafybeij-evidence-2', '0xabcdef1234567890abcdef1234567890abcdef12',
        5, 1
      )
    `);

    // prop-disputed-2: 1 dispute
    await db.run(sql`
      INSERT OR IGNORE INTO disputes (
        id, proposal_id, status, new_score, stake_amount, deadline,
        resolved_at, evidence_cid, initiator_address, uphold_votes, overturn_votes
      ) VALUES (
        3, 'prop-disputed-2', 'overturned', 8.0, '1000000000000000000', 1712400000,
        1712450000, 'bafybeij-evidence-3', '0x9876543210fedcba9876543210fedcba98765432',
        1, 4
      )
    `);

    // prop-disputed-3: 1 dispute
    await db.run(sql`
      INSERT OR IGNORE INTO disputes (
        id, proposal_id, status, stake_amount, deadline, evidence_cid,
        initiator_address, uphold_votes, overturn_votes
      ) VALUES (
        4, 'prop-disputed-3', 'open', '1200000000000000000', 1712700000,
        'bafybeij-evidence-4', '0xaaaa567890abcdef1234567890abcdef12345678',
        2, 1
      )
    `);

    // prop-disputed-4: 1 dispute
    await db.run(sql`
      INSERT OR IGNORE INTO disputes (
        id, proposal_id, status, stake_amount, deadline, evidence_cid,
        initiator_address, uphold_votes, overturn_votes
      ) VALUES (
        5, 'prop-disputed-4', 'open', '1800000000000000000', 1712800000,
        'bafybeij-evidence-5', '0xbbbb567890abcdef1234567890abcdef12345678',
        0, 0
      )
    `);

    // prop-disputed-5: 1 dispute
    await db.run(sql`
      INSERT OR IGNORE INTO disputes (
        id, proposal_id, status, stake_amount, deadline, evidence_cid,
        initiator_address, uphold_votes, overturn_votes
      ) VALUES (
        6, 'prop-disputed-5', 'open', '2500000000000000000', 1712900000,
        'bafybeij-evidence-6', '0xcccc567890abcdef1234567890abcdef12345678',
        1, 3
      )
    `);

    // 6. Funding Round Stats
    await db.run(sql`
      INSERT OR IGNORE INTO funding_round_stats (
        funding_round_id, proposal_count, evaluated_count, average_score,
        total_funds_released, dispute_count
      ) VALUES (
        'round-1', 15, 10, 7.2, '75000000000000000000', 0
      )
    `);

    await db.run(sql`
      INSERT OR IGNORE INTO funding_round_stats (
        funding_round_id, proposal_count, evaluated_count, average_score,
        total_funds_released, dispute_count
      ) VALUES (
        'round-2', 10, 5, 6.8, '0', 5
      )
    `);

    // 7. Evaluation Jobs
    await db.run(sql`
      INSERT OR IGNORE INTO evaluation_jobs (
        id, proposal_id, status, retry_count, started_at, completed_at
      ) VALUES (
        'prop-funded-1', 'prop-funded-1', 'complete', 0,
        '2026-04-01T11:00:00Z', '2026-04-01T11:05:00Z'
      )
    `);

    await db.run(sql`
      INSERT OR IGNORE INTO evaluation_jobs (
        id, proposal_id, status, retry_count
      ) VALUES (
        'prop-pending-1', 'prop-pending-1', 'pending', 0
      )
    `);

    await db.run(sql`
      INSERT OR IGNORE INTO evaluation_jobs (
        id, proposal_id, status, retry_count, error
      ) VALUES (
        'prop-pending-2', 'prop-pending-2', 'failed', 3, 'IPFS pin failed'
      )
    `);

    // 8. Corrupt JSON proposal for M-04 testing
    await db.run(sql`
      INSERT OR IGNORE INTO proposals (
        id, external_id, platform_source, funding_round_id, title, description,
        budget_amount, budget_currency, technical_description, team_profile_hash,
        team_size, category, status, submitted_at, chain_timestamp,
        proposal_content_cid, evaluation_content_cid,
        final_score, adjusted_score, reputation_multiplier, evaluated_at
      ) VALUES (
        'prop-corrupt-json', 'ext-corrupt-json', 'test-platform', 'round-1',
        'Corrupt JSON Test Proposal',
        'Proposal with corrupt dimension score data for M-04 testing',
        10000, 'USD',
        'Technical implementation details for corrupt JSON test',
        '0xhashcorrupt', 3, 'infrastructure', 'evaluated',
        '2026-04-01T10:00:00Z', 1712100000,
        'bafybeigcorrupt', 'bafybeihcorrupt',
        75, 75.38, 1.005, '2026-04-01T12:00:00Z'
      )
    `);

    // Dimension scores for corrupt JSON proposal — one has invalid rubricApplied
    const corruptDimensions = [
      { name: "technical_feasibility", weight: 0.25, score: 80, rubric: "not-valid-json{{" },
      { name: "impact_potential", weight: 0.30, score: 70, rubric: '{"criteria": "test"}' },
      { name: "cost_efficiency", weight: 0.20, score: 75, rubric: '{"criteria": "test"}' },
      { name: "team_capability", weight: 0.25, score: 80, rubric: '{"criteria": "test"}' },
    ];

    for (const dim of corruptDimensions) {
      await db.run(sql`
        INSERT OR IGNORE INTO dimension_scores (
          id, proposal_id, dimension, weight, score,
          reasoning_chain, input_data_considered, rubric_applied,
          model_id, prompt_version
        ) VALUES (
          ${`prop-corrupt-json-${dim.name}`}, 'prop-corrupt-json', ${dim.name}, ${dim.weight}, ${dim.score},
          'Test reasoning',
          '{"test": true}',
          ${dim.rubric},
          'claude-sonnet-4-6', 'v1.0'
        )
      `);
    }

    // 9. Duplicate detection seed: evaluation job with keccak256 proposalId
    const dupProposalId = keccak256(toHex("test-platform:dup-test-ext"));
    await db.run(sql`
      INSERT OR IGNORE INTO evaluation_jobs (
        id, proposal_id, status, retry_count, started_at, completed_at
      ) VALUES (
        ${`dup-job-${dupProposalId.slice(0, 10)}`}, ${dupProposalId}, 'complete', 0,
        '2026-04-01T11:00:00Z', '2026-04-01T11:05:00Z'
      )
    `);
  } finally {
    client.close();
  }
}

export default seedTestData;
