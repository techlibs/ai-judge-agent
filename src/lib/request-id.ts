import { type NextRequest } from "next/server";

const REQUEST_ID_HEADER = "x-request-id";

export function getRequestId(request: NextRequest): string {
  const existing = request.headers.get(REQUEST_ID_HEADER);
  if (existing) {
    return existing;
  }

  return crypto.randomUUID();
}
