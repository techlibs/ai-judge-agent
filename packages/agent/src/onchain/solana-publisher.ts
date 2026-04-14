import {
  Connection,
  PublicKey,
  SystemProgram,
  type Keypair,
  type TransactionSignature,
} from "@solana/web3.js";
import { createHash } from "crypto";
import type { EvaluationReport } from "@ipe-city/common";
import { toOnchainScore } from "@ipe-city/common";

const PROGRAM_ID = new PublicKey("2RC6cF4pmnANHAPkpoR2RcPm79Zgq8G9Sz9JKotGMvS6");

export interface SolanaPublisherConfig {
  rpcUrl: string;
  payer: Keypair;
}

/**
 * Derive a PDA for the Solana grant evaluator program.
 */
function derivePda(seeds: Buffer[]): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(seeds, PROGRAM_ID);
}

/**
 * Compute SHA-256 hash (used for content hashing on Solana side).
 */
function sha256(data: string): Buffer {
  return createHash("sha256").update(data).digest();
}

/**
 * Publishes evaluation results to the Solana grant evaluator program.
 *
 * NOTE: This is a structural implementation showing the PDA derivation
 * and transaction flow. Full Anchor client integration requires the
 * generated IDL types from `anchor build`.
 */
export class SolanaPublisher {
  private connection: Connection;
  private payer: Keypair;

  constructor(config: SolanaPublisherConfig) {
    this.connection = new Connection(config.rpcUrl, "confirmed");
    this.payer = config.payer;
  }

  /**
   * Derive all relevant PDAs for a proposal evaluation.
   */
  deriveProposalPdas(proposalId: Buffer): {
    proposal: [PublicKey, number];
    consensus: [PublicKey, number];
  } {
    return {
      proposal: derivePda([Buffer.from("proposal"), proposalId]),
      consensus: derivePda([Buffer.from("consensus"), proposalId]),
    };
  }

  /**
   * Derive evaluation PDAs for a specific judge.
   */
  deriveEvaluationPdas(
    proposalId: Buffer,
    judgeId: bigint,
  ): {
    commit: [PublicKey, number];
    evaluation: [PublicKey, number];
  } {
    const judgeIdBuf = Buffer.alloc(8);
    judgeIdBuf.writeBigUInt64LE(judgeId);

    return {
      commit: derivePda([Buffer.from("eval_commit"), proposalId, judgeIdBuf]),
      evaluation: derivePda([Buffer.from("evaluation"), proposalId, judgeIdBuf]),
    };
  }

  /**
   * Derive criterion score PDA.
   */
  deriveCriterionScorePda(
    proposalId: Buffer,
    judgeId: bigint,
    criterionId: Buffer,
  ): [PublicKey, number] {
    const judgeIdBuf = Buffer.alloc(8);
    judgeIdBuf.writeBigUInt64LE(judgeId);

    return derivePda([
      Buffer.from("criterion_score"),
      proposalId,
      judgeIdBuf,
      criterionId,
    ]);
  }

  /**
   * Publish a full evaluation report.
   *
   * Flow: commit all judges → reveal all judges → store criterion scores → resolve consensus
   *
   * Returns transaction signatures for each phase.
   */
  async publishReport(report: EvaluationReport): Promise<{
    commitSignatures: TransactionSignature[];
    revealSignatures: TransactionSignature[];
    criterionScoreSignatures: TransactionSignature[];
    consensusSignature: TransactionSignature;
  }> {
    const proposalId = Buffer.from(report.proposalId.replace("0x", ""), "hex");

    // Phase 1: Commit evaluations
    const commitSignatures: TransactionSignature[] = [];
    for (let i = 0; i < report.verdicts.length; i++) {
      const verdict = report.verdicts[i]!;
      const judgeId = BigInt(i + 1);

      // Compute commit hash
      const commitData = [
        judgeId.toString(),
        report.proposalId,
        ...verdict.dimensions.map((d) => d.criterionId),
        ...verdict.dimensions.map((d) => toOnchainScore(d.score).toString()),
        toOnchainScore(verdict.overallScore).toString(),
        verdict.summary,
      ].join("|");

      const commitHash = sha256(commitData);

      // In production, this would be an Anchor instruction call
      // For now, we derive PDAs and log the intent
      const pdas = this.deriveEvaluationPdas(proposalId, judgeId);
      console.log(
        `Commit: judge=${judgeId} pda=${pdas.commit[0].toBase58()} hash=${commitHash.toString("hex")}`,
      );

      // Placeholder — actual Anchor TX would go here via generated client
      commitSignatures.push(`commit-${i}-placeholder` as TransactionSignature);
    }

    // Phase 2: Reveal evaluations
    const revealSignatures: TransactionSignature[] = [];
    for (let i = 0; i < report.verdicts.length; i++) {
      const verdict = report.verdicts[i]!;
      const judgeId = BigInt(i + 1);
      const pdas = this.deriveEvaluationPdas(proposalId, judgeId);

      console.log(
        `Reveal: judge=${judgeId} pda=${pdas.evaluation[0].toBase58()} score=${toOnchainScore(verdict.overallScore)}`,
      );

      revealSignatures.push(`reveal-${i}-placeholder` as TransactionSignature);
    }

    // Phase 3: Store criterion scores
    const criterionScoreSignatures: TransactionSignature[] = [];
    for (let i = 0; i < report.verdicts.length; i++) {
      const verdict = report.verdicts[i]!;
      const judgeId = BigInt(i + 1);

      for (const dim of verdict.dimensions) {
        const criterionId = sha256(dim.criterionName);
        const [pda] = this.deriveCriterionScorePda(proposalId, judgeId, criterionId);

        console.log(
          `CriterionScore: judge=${judgeId} criterion=${dim.criterionName} pda=${pda.toBase58()} score=${toOnchainScore(dim.score)}`,
        );

        criterionScoreSignatures.push(
          `criterion-${i}-${dim.criterionId}-placeholder` as TransactionSignature,
        );
      }
    }

    // Phase 4: Resolve consensus
    const [consensusPda] = this.deriveProposalPdas(proposalId).consensus;
    const judgeScores = report.verdicts.map((v) => toOnchainScore(v.overallScore));

    console.log(
      `Consensus: pda=${consensusPda.toBase58()} scores=[${judgeScores.join(",")}]`,
    );

    const consensusSignature = "consensus-placeholder" as TransactionSignature;

    return {
      commitSignatures,
      revealSignatures,
      criterionScoreSignatures,
      consensusSignature,
    };
  }
}
