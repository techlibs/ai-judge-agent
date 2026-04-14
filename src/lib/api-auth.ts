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
