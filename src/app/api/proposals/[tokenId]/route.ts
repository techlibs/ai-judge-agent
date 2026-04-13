import { NextResponse } from "next/server";
import { getPublicClient } from "@/lib/chain/client";
import {
  IDENTITY_REGISTRY_ABI,
  REPUTATION_REGISTRY_ABI,
  getContractAddresses,
} from "@/lib/chain/contracts";
import { fetchFromIPFS } from "@/lib/ipfs/client";
import { proposalContentSchema } from "@/lib/ipfs/schemas";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tokenId: string }> }
) {
  const { tokenId } = await params;

  try {
    const publicClient = getPublicClient();
    const { identityRegistry, reputationRegistry } = getContractAddresses();

    let owner: string;
    let agentURI: string;
    try {
      const result = await publicClient.readContract({
        address: identityRegistry,
        abi: IDENTITY_REGISTRY_ABI,
        functionName: "getMetadata",
        args: [BigInt(tokenId)],
      });
      owner = result[0];
      agentURI = result[1];
    } catch {
      return NextResponse.json(
        { error: "Proposal not found" },
        { status: 404 }
      );
    }

    const [feedbackCount, averageScore] = await publicClient.readContract({
      address: reputationRegistry,
      abi: REPUTATION_REGISTRY_ABI,
      functionName: "getSummary",
      args: [BigInt(tokenId)],
    });

    const count = Number(feedbackCount);
    const status = count > 0 ? "evaluated" : "submitted";

    let content;
    try {
      content = await fetchFromIPFS(agentURI, proposalContentSchema);
    } catch {
      return NextResponse.json(
        { error: "Failed to fetch content from IPFS" },
        { status: 502 }
      );
    }

    return NextResponse.json({
      tokenId,
      owner,
      ipfsCID: agentURI,
      status,
      feedbackCount: count,
      averageScore: Number(averageScore),
      content,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch proposal" },
      { status: 500 }
    );
  }
}
