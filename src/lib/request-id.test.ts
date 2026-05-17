import { describe, it, expect } from "vitest";
import { getRequestId } from "@/lib/request-id";
import { NextRequest } from "next/server";

describe("getRequestId", () => {
  it("returns the existing x-request-id header when present", () => {
    const request = new NextRequest("https://example.com/api/test", {
      headers: { "x-request-id": "abc-123" },
    });
    expect(getRequestId(request)).toBe("abc-123");
  });

  it("generates a UUID when x-request-id header is missing", () => {
    const request = new NextRequest("https://example.com/api/test");
    const id = getRequestId(request);
    // UUID v4 format: 8-4-4-4-12 hex chars
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });

  it("generates different UUIDs for different requests without header", () => {
    const req1 = new NextRequest("https://example.com/api/test");
    const req2 = new NextRequest("https://example.com/api/test");
    const id1 = getRequestId(req1);
    const id2 = getRequestId(req2);
    expect(id1).not.toBe(id2);
  });

  it("returns the exact header value without modification", () => {
    const customId = "custom-request-id-with-special-chars_123";
    const request = new NextRequest("https://example.com/api/test", {
      headers: { "x-request-id": customId },
    });
    expect(getRequestId(request)).toBe(customId);
  });
});
