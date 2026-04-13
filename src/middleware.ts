import { type NextRequest, NextResponse } from "next/server";

const RATE_LIMIT_WINDOW_MS = 60_000;

const ROUTE_LIMITS: Record<string, number> = {
  "/api/proposals/submit": 5,
  "/api/evaluate": 3,
  "/api/proposals": 30,
  "/api/reputation": 30,
};

const DEFAULT_LIMIT = 60;

const requestLog = new Map<string, number[]>();

function getClientIp(request: NextRequest): string | null {
  return (
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    null
  );
}

function getRateLimit(pathname: string): number {
  for (const [route, limit] of Object.entries(ROUTE_LIMITS)) {
    if (pathname.startsWith(route)) return limit;
  }
  return DEFAULT_LIMIT;
}

function isRateLimited(ip: string, pathname: string): boolean {
  const limit = getRateLimit(pathname);
  const key = `${ip}:${pathname}`;
  const now = Date.now();

  const timestamps = requestLog.get(key) ?? [];
  const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

  if (recent.length >= limit) {
    requestLog.set(key, recent);
    return true;
  }

  recent.push(now);
  requestLog.set(key, recent);
  return false;
}

export function middleware(request: NextRequest) {
  const ip = getClientIp(request);
  if (!ip) {
    return NextResponse.json(
      { error: "Cannot determine client IP" },
      { status: 400 },
    );
  }

  const pathname = request.nextUrl.pathname;

  if (isRateLimited(ip, pathname)) {
    const limit = getRateLimit(pathname);
    return NextResponse.json(
      { error: "Too many requests. Try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": "60",
          "X-RateLimit-Limit": String(limit),
        },
      },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
