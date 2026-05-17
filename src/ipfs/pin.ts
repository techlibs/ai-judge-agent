import type { z } from "zod";
import { getPinataClient } from "./client";

export async function pinJsonToIpfs<T>(
  schema: z.ZodType<T>,
  data: unknown
): Promise<string> {
  const validated = schema.parse(data);

  const canonicalJson = JSON.stringify(
    validated,
    Object.keys(validated as Record<string, unknown>).sort()
  );

  const pinata = getPinataClient();
  const result = await pinata.upload.json(JSON.parse(canonicalJson));

  return result.cid;
}

export async function fetchJsonFromIpfs<T>(
  cid: string,
  schema: z.ZodType<T>
): Promise<T> {
  const gateway = process.env.PINATA_GATEWAY;
  if (!gateway) {
    throw new Error("PINATA_GATEWAY environment variable is required");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(`https://${gateway}/ipfs/${cid}`, {
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(
        `IPFS fetch failed for CID ${cid}: ${response.status}`
      );
    }

    const json: unknown = await response.json();
    return schema.parse(json);
  } finally {
    clearTimeout(timeoutId);
  }
}
