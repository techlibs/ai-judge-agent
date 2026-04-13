import { type NextRequest, NextResponse } from "next/server";
import {
  getReputationHistory,
  getReputationSummary,
  getTxHashesForBlocks,
} from "@/lib/chain/reputation";
import { reputationResponseSchema } from "@/lib/chain/reputation-schemas";

const NUMERIC_ID_PATTERN = /^\d+$/;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tokenId: string }> },
): Promise<NextResponse> {
  try {
    const { tokenId } = await params;

    if (!NUMERIC_ID_PATTERN.test(tokenId)) {
      return NextResponse.json(
        { error: "Invalid tokenId" },
        { status: 400 },
      );
    }

    const [history, summary] = await Promise.all([
      getReputationHistory(tokenId),
      getReputationSummary(tokenId),
    ]);

    const blockNumbers = history.map((entry) => entry.blockNumber);
    const txHashMap = await getTxHashesForBlocks(tokenId, blockNumbers);

    const enrichedHistory = history.map((entry) => ({
      ...entry,
      txHash: txHashMap.get(entry.blockNumber) ?? null,
    }));

    const responseData = {
      tokenId,
      summary,
      history: enrichedHistory,
    };

    const validated = reputationResponseSchema.parse(responseData);
    const response = NextResponse.json(validated);
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=30, stale-while-revalidate=60",
    );

    return response;
  } catch (error) {
    console.error("Failed to fetch reputation data:", error);
    return NextResponse.json(
      { error: "Failed to fetch reputation data" },
      { status: 500 },
    );
  }
}
