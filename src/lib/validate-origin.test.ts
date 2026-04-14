import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { validateOrigin } from "@/lib/validate-origin";
import { NextRequest } from "next/server";

describe("validateOrigin", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  function makeRequest(
    url: string,
    options: { method?: string; headers?: Record<string, string> } = {}
  ): NextRequest {
    return new NextRequest(url, {
      method: options.method ?? "GET",
      headers: options.headers,
    });
  }

  // ---- GET requests ----

  it("returns null for GET requests", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.example.com");
    const req = makeRequest("https://app.example.com/api/proposals", {
      method: "GET",
    });
    expect(validateOrigin(req)).toBeNull();
  });

  it("returns null for HEAD requests", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.example.com");
    const req = makeRequest("https://app.example.com/api/proposals", {
      method: "HEAD",
    });
    expect(validateOrigin(req)).toBeNull();
  });

  // ---- Webhook paths ----

  it("returns null for webhook paths regardless of method", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.example.com");
    const req = makeRequest(
      "https://app.example.com/api/webhooks/stripe",
      { method: "POST" }
    );
    expect(validateOrigin(req)).toBeNull();
  });

  it("returns null for nested webhook paths", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.example.com");
    const req = makeRequest(
      "https://app.example.com/api/webhooks/github/events",
      { method: "POST" }
    );
    expect(validateOrigin(req)).toBeNull();
  });

  // ---- No APP_URL configured ----

  it("returns null when NEXT_PUBLIC_APP_URL is not configured", () => {
    // Not setting the env var (empty string from stubEnv)
    delete process.env.NEXT_PUBLIC_APP_URL;
    const req = makeRequest("https://app.example.com/api/proposals", {
      method: "POST",
    });
    expect(validateOrigin(req)).toBeNull();
  });

  // ---- Missing Origin header on mutating methods ----

  function expectResponse(req: NextRequest): Response {
    const response = validateOrigin(req);
    expect(response).not.toBeNull();
    return response as Response;
  }

  it("returns 403 when Origin header is missing on POST", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.example.com");
    const req = makeRequest("https://app.example.com/api/proposals", {
      method: "POST",
    });
    expect(expectResponse(req).status).toBe(403);
  });

  it("returns MISSING_ORIGIN error body when Origin is absent", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.example.com");
    const req = makeRequest("https://app.example.com/api/proposals", {
      method: "POST",
    });
    const body = (await expectResponse(req).json()) as { error: string; message: string };
    expect(body.error).toBe("MISSING_ORIGIN");
    expect(body.message).toBe("Origin header is required");
  });

  it("returns 403 for PUT without Origin", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.example.com");
    const req = makeRequest("https://app.example.com/api/proposals/1", {
      method: "PUT",
    });
    expect(expectResponse(req).status).toBe(403);
  });

  it("returns 403 for PATCH without Origin", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.example.com");
    const req = makeRequest("https://app.example.com/api/proposals/1", {
      method: "PATCH",
    });
    expect(expectResponse(req).status).toBe(403);
  });

  it("returns 403 for DELETE without Origin", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.example.com");
    const req = makeRequest("https://app.example.com/api/proposals/1", {
      method: "DELETE",
    });
    expect(expectResponse(req).status).toBe(403);
  });

  // ---- Origin mismatch ----

  it("returns 403 when Origin does not match APP_URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.example.com");
    const req = makeRequest("https://app.example.com/api/proposals", {
      method: "POST",
      headers: { Origin: "https://evil.com" },
    });
    const response = expectResponse(req);
    expect(response.status).toBe(403);
    const body = (await response.json()) as { error: string; message: string };
    expect(body.error).toBe("INVALID_ORIGIN");
  });

  // ---- Origin matches ----

  it("returns null when Origin matches APP_URL", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.example.com");
    const req = makeRequest("https://app.example.com/api/proposals", {
      method: "POST",
      headers: { Origin: "https://app.example.com" },
    });
    expect(validateOrigin(req)).toBeNull();
  });

  it("compares origin correctly when APP_URL has a path", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.example.com/subpath");
    const req = makeRequest("https://app.example.com/api/proposals", {
      method: "POST",
      headers: { Origin: "https://app.example.com" },
    });
    // new URL("https://app.example.com/subpath").origin === "https://app.example.com"
    expect(validateOrigin(req)).toBeNull();
  });

  it("rejects when Origin has a different port", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.example.com");
    const req = makeRequest("https://app.example.com/api/proposals", {
      method: "POST",
      headers: { Origin: "https://app.example.com:8080" },
    });
    expect(expectResponse(req).status).toBe(403);
  });
});
