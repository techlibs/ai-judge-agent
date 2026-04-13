import { type NextRequest, NextResponse } from "next/server";
import { getPublicClient } from "@/lib/chain/client";
import {
  IDENTITY_REGISTRY_ABI,
  REPUTATION_REGISTRY_ABI,
  getContractAddresses,
} from "@/lib/chain/contracts";
import { fetchFromIPFS } from "@/lib/ipfs/client";
import { proposalContentSchema } from "@/lib/ipfs/schemas";

const DEFAULT_PAGE_LIMIT = 20;
const MAX_PAGE_LIMIT = 100;
const MAX_PARALLEL_IPFS_FETCHES = 10;

// Deployment block to avoid scanning from block 0
const DEPLOYMENT_BLOCK = BigInt(process.env.DEPLOYMENT_BLOCK ?? "0");

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const limit = Math.min(
      MAX_PAGE_LIMIT,
      Math.max(1, Number(searchParams.get("limit") ?? String(DEFAULT_PAGE_LIMIT)))
    );

    const publicClient = getPublicClient();
    const { identityRegistry, reputationRegistry } = getContractAddresses();

    const logs = await publicClient.getLogs({
      address: identityRegistry,
      event: {
        type: "event",
        name: "ProjectRegistered",
        inputs: [
          { name: "tokenId", type: "uint256", indexed: true },
          { name: "owner", type: "address", indexed: true },
          { name: "agentURI", type: "string", indexed: false },
        ],
      },
      fromBlock: DEPLOYMENT_BLOCK,
      toBlock: "latest",
    });

    const totalCount = logs.length;
    const startIndex = (page - 1) * limit;
    const paginatedLogs = logs.reverse().slice(startIndex, startIndex + limit);

    async function enrichLog(log: (typeof logs)[number]) {
      const tokenId = log.args.tokenId?.toString() ?? "0";
      const owner = log.args.owner ?? "0x0";
      const ipfsCID = log.args.agentURI ?? "";

      const [feedbackCount, averageScore] =
        await publicClient.readContract({
          address: reputationRegistry,
          abi: REPUTATION_REGISTRY_ABI,
          functionName: "getSummary",
          args: [BigInt(tokenId)],
        });

      const count = Number(feedbackCount);
      const status = count > 0 ? "evaluated" : "submitted";

      let title = "Content unavailable";
      let description = "";
      let budget = 0;
      let submittedAt = "";
      try {
        const content = await fetchFromIPFS(
          ipfsCID,
          proposalContentSchema
        );
        title = content.title;
        description = content.description;
        budget = content.budget;
        submittedAt = content.submittedAt;
      } catch {
        // IPFS gateway may be temporarily unavailable
      }

      return {
        tokenId,
        owner,
        ipfsCID,
        status,
        feedbackCount: count,
        averageScore: Number(averageScore),
        title,
        description,
        budget,
        submittedAt,
      };
    }

    // Batch IPFS fetches to avoid overwhelming the gateway
    const proposals = [];
    for (let i = 0; i < paginatedLogs.length; i += MAX_PARALLEL_IPFS_FETCHES) {
      const batch = paginatedLogs.slice(i, i + MAX_PARALLEL_IPFS_FETCHES);
      const results = await Promise.all(batch.map(enrichLog));
      proposals.push(...results);
    }

    return NextResponse.json({
      proposals,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch proposals" },
      { status: 500 }
    );
  }
}
