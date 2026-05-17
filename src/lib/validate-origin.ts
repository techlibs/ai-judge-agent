import { NextResponse, type NextRequest } from "next/server";

const WEBHOOK_PATH_PREFIX = "/api/webhooks/";

export function validateOrigin(request: NextRequest): NextResponse | null {
  const isWebhookEndpoint = request.nextUrl.pathname.startsWith(
    WEBHOOK_PATH_PREFIX
  );
  if (isWebhookEndpoint) {
    return null;
  }

  const isMutatingMethod = ["POST", "PUT", "PATCH", "DELETE"].includes(
    request.method
  );
  if (!isMutatingMethod) {
    return null;
  }

  const origin = request.headers.get("Origin");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!appUrl) {
    return null;
  }

  if (!origin) {
    return NextResponse.json(
      { error: "MISSING_ORIGIN", message: "Origin header is required" },
      { status: 403 }
    );
  }

  const allowedOrigin = new URL(appUrl).origin;
  if (origin !== allowedOrigin) {
    return NextResponse.json(
      { error: "INVALID_ORIGIN", message: "Origin not allowed" },
      { status: 403 }
    );
  }

  return null;
}
