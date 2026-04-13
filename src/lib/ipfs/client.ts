import { z } from "zod";
import { getServerEnv } from "@/lib/env";
import { pinataResponseSchema } from "./types";

const PINATA_API_URL = "https://api.pinata.cloud/pinning/pinJSONToIPFS";

const CID_PATTERN = /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|bafy[a-z2-7]{52,})$/;

function isValidCID(cid: string): boolean {
  return CID_PATTERN.test(cid);
}

export async function pinJSON(data: unknown): Promise<string> {
  const env = getServerEnv();
  if (!env.PINATA_JWT) {
    throw new Error("Pinata JWT not configured");
  }

  const response = await fetch(PINATA_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.PINATA_JWT}`,
    },
    body: JSON.stringify({ pinataContent: data }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Pinata pin failed (${response.status}): ${text}`);
  }

  const json: unknown = await response.json();
  const result = pinataResponseSchema.parse(json);
  return result.IpfsHash;
}

export async function fetchFromIPFS<T>(
  cid: string,
  schema: z.ZodType<T>
): Promise<T> {
  if (!isValidCID(cid)) {
    throw new Error(`Invalid IPFS CID format: ${cid}`);
  }

  const env = getServerEnv();
  const gatewayUrl =
    env.PINATA_GATEWAY_URL ?? "https://gateway.pinata.cloud/ipfs";
  const fetchUrl = env.PINATA_JWT
    ? `${gatewayUrl}/${cid}?pinataGatewayToken=${env.PINATA_JWT}`
    : `${gatewayUrl}/${cid}`;
  const response = await fetch(fetchUrl);

  if (!response.ok) {
    throw new Error(`IPFS fetch failed for ${cid} (${response.status})`);
  }

  const json: unknown = await response.json();
  return schema.parse(json);
}
