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

export async function uploadJson(
  data: Record<string, unknown>,
  name: string
): Promise<{ cid: string; uri: string }> {
  const pinata = getPinata();
  const result = await pinata.upload.public.json(data).name(name);
  const gateway = process.env.PINATA_GATEWAY_URL ?? "https://gateway.pinata.cloud";
  return {
    cid: result.cid,
    uri: `${gateway}/ipfs/${result.cid}`,
  };
}

export async function fetchJson<T>(cid: string, schema: z.ZodType<T>): Promise<T> {
  const pinata = getPinata();
  const response = await pinata.gateways.public.get(cid);
  return schema.parse(response.data);
}

export function ipfsUri(cid: string): string {
  return `ipfs://${cid}`;
}

export function gatewayUrl(cid: string): string {
  const gateway = process.env.PINATA_GATEWAY_URL ?? "https://gateway.pinata.cloud";
  return `${gateway}/ipfs/${cid}`;
}
