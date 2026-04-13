import { NextResponse } from "next/server";
import { decodeEventLog } from "viem";
import { proposalSchema } from "@/lib/schemas/proposal";
import { pinJSON } from "@/lib/ipfs/client";
import { getPublicClient, getWalletClient } from "@/lib/chain/client";
import {
  IDENTITY_REGISTRY_ABI,
  getContractAddresses,
} from "@/lib/chain/contracts";
import type { ProposalContent } from "@/lib/ipfs/types";

const MAX_BODY_SIZE = 50 * 1024;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;

// TODO: Replace with Redis-backed rate limiting for multi-instance deployments
const rateLimitStore = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitStore.get(ip) ?? [];
  const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  rateLimitStore.set(ip, recent);

  if (recent.length >= RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }

  recent.push(now);
  rateLimitStore.set(ip, recent);
  return false;
}

export async function POST(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many submissions. Try again later." },
      { status: 429 }
    );
  }

  const body: unknown = await request.json();
  const bodySize = new TextEncoder().encode(JSON.stringify(body)).byteLength;
  if (bodySize > MAX_BODY_SIZE) {
    return NextResponse.json({ error: "PAYLOAD_TOO_LARGE" }, { status: 413 });
  }
  const parsed = proposalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const content: ProposalContent = {
    ...parsed.data,
    submittedAt: new Date().toISOString(),
  };

  let ipfsCID: string;
  try {
    ipfsCID = await pinJSON(content);
  } catch {
    return NextResponse.json(
      { error: "Failed to pin content to IPFS" },
      { status: 500 }
    );
  }

  try {
    const walletClient = getWalletClient();
    const publicClient = getPublicClient();
    const { identityRegistry } = getContractAddresses();

    // TODO(v1-limitation): All proposals are owned by the deployer/server wallet
    // because there is no user wallet connection yet. When user wallets are added,
    // pass the user's address instead of walletClient.account.address.
    const txHash = await walletClient.writeContract({
      address: identityRegistry,
      abi: IDENTITY_REGISTRY_ABI,
      functionName: "register",
      args: [walletClient.account.address, ipfsCID],
    });

    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash,
    });

    let tokenId = "0";
    for (const log of receipt.logs) {
      try {
        const decoded = decodeEventLog({
          abi: IDENTITY_REGISTRY_ABI,
          data: log.data,
          topics: log.topics,
        });
        if (decoded.eventName === "ProjectRegistered") {
          tokenId = String(decoded.args.tokenId);
          break;
        }
      } catch {
        // Not a matching event log, continue
      }
    }

    return NextResponse.json({
      tokenId,
      ipfsCID,
      txHash,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to register on-chain" },
      { status: 500 }
    );
  }
}
