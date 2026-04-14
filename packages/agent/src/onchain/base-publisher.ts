import {
  createPublicClient,
  createWalletClient,
  http,
  type PublicClient,
  type WalletClient,
  type Chain,
  type Account,
  getContract,
} from "viem";
import { base, baseSepolia } from "viem/chains";
import type { EvaluationReport, JudgeVerdict } from "@ipe-city/common";
import { toOnchainScore } from "@ipe-city/common";
import { computeCommitHash, computeCriterionId, generateSalt } from "./hash.js";

// ABI fragments for GrantRouter interactions
const GRANT_ROUTER_ABI = [
  {
    name: "startEvaluation",
    type: "function",
    inputs: [
      { name: "proposalId", type: "bytes32" },
      { name: "judgeIds", type: "uint256[]" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    name: "commitJudgeEvaluation",
    type: "function",
    inputs: [
      { name: "proposalId", type: "bytes32" },
      { name: "judgeId", type: "uint256" },
      { name: "commitHash", type: "bytes32" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    name: "revealJudgeEvaluation",
    type: "function",
    inputs: [
      { name: "proposalId", type: "bytes32" },
      { name: "judgeId", type: "uint256" },
      { name: "criterionIds", type: "bytes32[]" },
      { name: "scores", type: "uint16[]" },
      { name: "overallScore", type: "uint16" },
      { name: "reasoning", type: "bytes" },
      { name: "salt", type: "bytes32" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    name: "finalizeEvaluation",
    type: "function",
    inputs: [
      { name: "proposalId", type: "bytes32" },
      { name: "judgeScores", type: "uint16[]" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

export interface BasePublisherConfig {
  chain: "base" | "base-sepolia";
  rpcUrl: string;
  routerAddress: `0x${string}`;
  account: Account;
}

interface CommitData {
  judgeId: bigint;
  commitHash: `0x${string}`;
  salt: `0x${string}`;
  criterionIds: `0x${string}`[];
  scores: number[];
  overallScore: number;
  reasoning: string;
}

/**
 * Publishes evaluation results to Base (Ethereum L2) contracts.
 */
export class BasePublisher {
  private publicClient: PublicClient;
  private walletClient: WalletClient;
  private chain: Chain;
  private routerAddress: `0x${string}`;

  constructor(config: BasePublisherConfig) {
    this.chain = config.chain === "base" ? base : baseSepolia;
    this.routerAddress = config.routerAddress;

    this.publicClient = createPublicClient({
      chain: this.chain,
      transport: http(config.rpcUrl),
    });

    this.walletClient = createWalletClient({
      chain: this.chain,
      transport: http(config.rpcUrl),
      account: config.account,
    });
  }

  /**
   * Publish a full evaluation report on-chain via commit-reveal.
   */
  async publishReport(report: EvaluationReport): Promise<{
    commitTxHashes: `0x${string}`[];
    revealTxHashes: `0x${string}`[];
    finalizeTxHash: `0x${string}`;
  }> {
    const proposalId = report.proposalId as `0x${string}`;

    // Phase 1: Compute commits for all judges
    const commitDataList: CommitData[] = report.verdicts.map((verdict, idx) => {
      const criterionIds = verdict.dimensions.map((d) => computeCriterionId(d.criterionName));
      const scores = verdict.dimensions.map((d) => d.score);
      const salt = generateSalt();

      const commitHash = computeCommitHash({
        judgeId: BigInt(idx + 1),
        proposalId,
        criterionIds,
        scores,
        overallScore: verdict.overallScore,
        reasoning: verdict.summary,
        salt,
      });

      return {
        judgeId: BigInt(idx + 1),
        commitHash,
        salt,
        criterionIds,
        scores,
        overallScore: verdict.overallScore,
        reasoning: verdict.summary,
      };
    });

    // Phase 2: Submit commits
    const commitTxHashes: `0x${string}`[] = [];
    for (const commit of commitDataList) {
      const hash = await this.walletClient.writeContract({
        address: this.routerAddress,
        abi: GRANT_ROUTER_ABI,
        functionName: "commitJudgeEvaluation",
        args: [proposalId, commit.judgeId, commit.commitHash],
      });
      commitTxHashes.push(hash);
    }

    // Wait for all commits to be mined
    for (const hash of commitTxHashes) {
      await this.publicClient.waitForTransactionReceipt({ hash });
    }

    // Phase 3: Reveal evaluations
    const revealTxHashes: `0x${string}`[] = [];
    for (const commit of commitDataList) {
      const onchainScores = commit.scores.map((s) => toOnchainScore(s));
      const hash = await this.walletClient.writeContract({
        address: this.routerAddress,
        abi: GRANT_ROUTER_ABI,
        functionName: "revealJudgeEvaluation",
        args: [
          proposalId,
          commit.judgeId,
          commit.criterionIds,
          onchainScores,
          toOnchainScore(commit.overallScore),
          new TextEncoder().encode(commit.reasoning) as unknown as `0x${string}`,
          commit.salt,
        ],
      });
      revealTxHashes.push(hash);
    }

    // Wait for all reveals
    for (const hash of revealTxHashes) {
      await this.publicClient.waitForTransactionReceipt({ hash });
    }

    // Phase 4: Finalize (resolve consensus)
    const judgeScores = report.verdicts.map((v) => toOnchainScore(v.overallScore));
    const finalizeTxHash = await this.walletClient.writeContract({
      address: this.routerAddress,
      abi: GRANT_ROUTER_ABI,
      functionName: "finalizeEvaluation",
      args: [proposalId, judgeScores],
    });

    await this.publicClient.waitForTransactionReceipt({ hash: finalizeTxHash });

    return { commitTxHashes, revealTxHashes, finalizeTxHash };
  }
}
