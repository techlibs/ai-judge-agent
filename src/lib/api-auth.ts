import { NextResponse, type NextRequest } from "next/server";

const AUTH_HEADER = "x-api-key";

export function requireApiKey(request: NextRequest): NextResponse | null {
  const expectedKey = process.env.API_SECRET_KEY;
  if (!expectedKey) {
    // If no key is configured, skip auth (development mode)
    return null;
  }

  const providedKey = request.headers.get(AUTH_HEADER);
  if (!providedKey) {
    return NextResponse.json(
      { error: "MISSING_API_KEY", message: "x-api-key header is required" },
      { status: 401 }
    );
  }

  // Constant-time comparison to prevent timing attacks
  if (!timingSafeEqual(providedKey, expectedKey)) {
    return NextResponse.json(
      { error: "INVALID_API_KEY", message: "Invalid API key" },
      { status: 403 }
    );
  }

  return null;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Still do a full comparison to avoid length oracle
    compareStrings(a, b);
    return false;
  }
  return compareStrings(a, b);
}

function compareStrings(a: string, b: string): boolean {
  const maxLen = Math.max(a.length, b.length);
  let mismatch = 0;
  for (let i = 0; i < maxLen; i++) {
    const charA = i < a.length ? a.charCodeAt(i) : 0;
    const charB = i < b.length ? b.charCodeAt(i) : 0;
    mismatch |= charA ^ charB;
  }
  return mismatch === 0;
}

const HMAC_ALGORITHM = "SHA-256";
const HMAC_SIGNATURE_PREFIX = "sha256=";

/**
 * Verify HMAC-SHA256 webhook signature for data integrity.
 * Used to authenticate incoming webhooks from trusted platforms.
 *
 * Expected header format: `sha256=<hex-encoded HMAC>`
 */
export async function verifyWebhookSignature(
  body: string,
  signature: string,
  secret: string
): Promise<boolean> {
  if (!signature.startsWith(HMAC_SIGNATURE_PREFIX)) {
    return false;
  }

  const providedHex = signature.slice(HMAC_SIGNATURE_PREFIX.length);

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: HMAC_ALGORITHM },
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

  // Constant-time comparison to prevent timing attacks
  return timingSafeEqual(providedHex, expectedHex);
}

/**
 * Generate HMAC-SHA256 signature for outgoing data.
 * Used to sign evaluation results before publishing on-chain.
 */
export async function signPayload(
  payload: string,
  secret: string
): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: HMAC_ALGORITHM },
    false,
    ["sign"]
  );

  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload)
  );

  const hex = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return `${HMAC_SIGNATURE_PREFIX}${hex}`;
}
