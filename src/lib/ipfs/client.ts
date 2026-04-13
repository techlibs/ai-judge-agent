import { z } from "zod";
import { getServerEnv } from "@/lib/env";
import { pinataResponseSchema } from "./types";

const PINATA_API_URL = "https://api.pinata.cloud/pinning/pinJSONToIPFS";

export async function pinJSON(data: unknown): Promise<string> {
  const env = getServerEnv();
  if (!env.PINATA_API_KEY || !env.PINATA_SECRET_KEY) {
    throw new Error("Pinata credentials not configured");
  }

  const response = await fetch(PINATA_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      pinata_api_key: env.PINATA_API_KEY,
      pinata_secret_api_key: env.PINATA_SECRET_KEY,
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
  const env = getServerEnv();
  const gatewayUrl =
    env.PINATA_GATEWAY_URL ?? "https://gateway.pinata.cloud/ipfs";
  const response = await fetch(`${gatewayUrl}/${cid}`);

  if (!response.ok) {
    throw new Error(`IPFS fetch failed for ${cid} (${response.status})`);
  }

  const json: unknown = await response.json();
  return schema.parse(json);
}
