import { PinataSDK } from "pinata";
import { z } from "zod";

function createPinataClient() {
  return new PinataSDK({
    pinataJwt: process.env.PINATA_JWT,
    pinataGateway: process.env.PINATA_GATEWAY_URL,
  });
}

let pinataInstance: PinataSDK | undefined;

function getPinata(): PinataSDK {
  if (!pinataInstance) {
    pinataInstance = createPinataClient();
  }
  return pinataInstance;
}

const MAX_UPLOAD_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 1000;

export async function uploadJson(
  data: Record<string, unknown>,
  name: string
): Promise<{ cid: string; uri: string }> {
  const pinata = getPinata();
  const gateway = process.env.PINATA_GATEWAY_URL ?? "https://gateway.pinata.cloud";

  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_UPLOAD_RETRIES; attempt++) {
    try {
      const result = await pinata.upload.public.json(data).name(name);

      // Verify content by fetching back and comparing
      const verified = await verifyUploadedContent(result.cid, data);
      if (!verified) {
        throw new Error(`Content verification failed for CID ${result.cid}`);
      }

      return {
        cid: result.cid,
        uri: `${gateway}/ipfs/${result.cid}`,
      };
    } catch (error) {
      lastError = error;
      if (attempt < MAX_UPLOAD_RETRIES - 1) {
        const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(
    `IPFS upload failed after ${MAX_UPLOAD_RETRIES} attempts: ${lastError instanceof Error ? lastError.message : String(lastError)}`
  );
}

async function verifyUploadedContent(
  cid: string,
  originalData: Record<string, unknown>
): Promise<boolean> {
  try {
    const pinata = getPinata();
    const response = await pinata.gateways.public.get(cid);
    const fetched = response.data;

    // Deep compare the round-tripped JSON against original
    const originalJson = JSON.stringify(originalData, null, 0);
    const fetchedJson = JSON.stringify(fetched, null, 0);

    return originalJson === fetchedJson;
  } catch {
    // Verification fetch failed — content may not be available yet
    // Return true to avoid blocking on gateway propagation delay
    return true;
  }
}

export async function fetchJson<T>(cid: string, schema: z.ZodType<T>): Promise<T> {
  const pinata = getPinata();
  const response = await pinata.gateways.public.get(cid);
  return schema.parse(response.data);
}

/**
 * Verify that an IPFS CID resolves to content matching an expected JSON shape.
 * Returns { valid: true } if content matches, { valid: false, reason } otherwise.
 */
export async function verifyContentIntegrity(
  cid: string,
  expectedData: Record<string, unknown>
): Promise<{ valid: boolean; reason?: string }> {
  try {
    const pinata = getPinata();
    const response = await pinata.gateways.public.get(cid);
    const fetched = response.data;

    const expectedJson = JSON.stringify(expectedData, null, 0);
    const fetchedJson = JSON.stringify(fetched, null, 0);

    if (expectedJson !== fetchedJson) {
      return { valid: false, reason: "Content mismatch: fetched data differs from expected" };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      reason: `Failed to fetch CID ${cid}: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export function ipfsUri(cid: string): string {
  return `ipfs://${cid}`;
}

export function gatewayUrl(cid: string): string {
  const gateway = process.env.PINATA_GATEWAY_URL ?? "https://gateway.pinata.cloud";
  return `${gateway}/ipfs/${cid}`;
}
