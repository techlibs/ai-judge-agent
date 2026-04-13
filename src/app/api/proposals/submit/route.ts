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

export async function POST(request: Request) {
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
