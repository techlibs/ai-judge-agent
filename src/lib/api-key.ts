import { eq } from "drizzle-orm";
import { getDb } from "@/cache/client";
import { platformIntegrations } from "@/cache/schema";

const ALGORITHM = "SHA-256";

async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest(ALGORITHM, data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function validateApiKey(
  apiKey: string
): Promise<{ valid: boolean; platformId?: string; webhookSecret?: string }> {
  const keyHash = await hashApiKey(apiKey);
  const db = getDb();

  const results = await db
    .select()
    .from(platformIntegrations)
    .where(eq(platformIntegrations.apiKeyHash, keyHash))
    .limit(1);

  const platform = results[0];
  if (!platform || platform.status !== "active") {
    return { valid: false };
  }

  return {
    valid: true,
    platformId: platform.id,
    webhookSecret: platform.webhookSecret,
  };
}

export async function verifyWebhookSignature(
  body: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const expectedPrefix = "sha256=";
  if (!signature.startsWith(expectedPrefix)) {
    return false;
  }

  const providedHex = signature.slice(expectedPrefix.length);

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: ALGORITHM },
    false,
    ["sign"]
  );

  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(body)
  );

  const expectedHex = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (providedHex.length !== expectedHex.length) {
    return false;
  }

  // Constant-time comparison to prevent timing attacks
  let mismatch = 0;
  for (let i = 0; i < providedHex.length; i++) {
    mismatch |= providedHex.charCodeAt(i) ^ expectedHex.charCodeAt(i);
  }

  return mismatch === 0;
}
