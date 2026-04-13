import { NextResponse } from "next/server";
import { getPublicClient } from "@/lib/chain/client";
import {
  IDENTITY_REGISTRY_ABI,
  REPUTATION_REGISTRY_ABI,
  getContractAddresses,
} from "@/lib/chain/contracts";
import { fetchFromIPFS } from "@/lib/ipfs/client";
import { proposalContentSchema } from "@/lib/ipfs/schemas";

export async function GET() {
  try {
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
      fromBlock: 0n,
      toBlock: "latest",
    });

    const proposals = await Promise.all(
      logs.map(async (log) => {
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
      })
    );

    proposals.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));

    return NextResponse.json(proposals);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch proposals" },
      { status: 500 }
    );
  }
}
