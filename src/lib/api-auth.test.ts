import { describe, it, expect, afterEach } from "vitest";
import { verifyWebhookSignature, signPayload, requireApiKey } from "./api-auth";
import { NextRequest } from "next/server";

describe("requireApiKey", () => {
  const originalEnv = process.env.API_SECRET_KEY;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.API_SECRET_KEY;
    } else {
      process.env.API_SECRET_KEY = originalEnv;
    }
  });

  it("returns null when no API_SECRET_KEY is configured (dev mode)", () => {
    delete process.env.API_SECRET_KEY;
    const req = new NextRequest("http://localhost/api/evaluate", {
      method: "POST",
    });
    expect(requireApiKey(req)).toBeNull();
  });

  it("returns 401 when x-api-key header is missing", async () => {
    process.env.API_SECRET_KEY = "test-secret-key";
    const req = new NextRequest("http://localhost/api/evaluate", {
      method: "POST",
    });
    const res = requireApiKey(req);
    expect(res).not.toBeNull();
    expect(res?.status).toBe(401);
    const body = await res?.json();
    expect(body.error).toBe("MISSING_API_KEY");
  });

  it("returns 403 when x-api-key is invalid", async () => {
    process.env.API_SECRET_KEY = "test-secret-key";
    const req = new NextRequest("http://localhost/api/evaluate", {
      method: "POST",
      headers: { "x-api-key": "wrong-key" },
    });
    const res = requireApiKey(req);
    expect(res).not.toBeNull();
    expect(res?.status).toBe(403);
    const body = await res?.json();
    expect(body.error).toBe("INVALID_API_KEY");
  });

  it("returns null when x-api-key matches", () => {
    process.env.API_SECRET_KEY = "test-secret-key";
    const req = new NextRequest("http://localhost/api/evaluate", {
      method: "POST",
      headers: { "x-api-key": "test-secret-key" },
    });
    expect(requireApiKey(req)).toBeNull();
  });

  it("rejects keys of different lengths (timing-safe)", async () => {
    process.env.API_SECRET_KEY = "short";
    const req = new NextRequest("http://localhost/api/evaluate", {
      method: "POST",
      headers: { "x-api-key": "a-much-longer-key-that-differs" },
    });
    const res = requireApiKey(req);
    expect(res?.status).toBe(403);
  });
});

describe("verifyWebhookSignature", () => {
  const secret = "test-webhook-secret-key";
  const body = '{"proposalId":"abc123","score":85}';

  it("returns true for a valid signature", async () => {
    const signature = await signPayload(body, secret);
    const result = await verifyWebhookSignature(body, signature, secret);
    expect(result).toBe(true);
  });

  it("returns false for a tampered body", async () => {
    const signature = await signPayload(body, secret);
    const tampered = '{"proposalId":"abc123","score":100}';
    const result = await verifyWebhookSignature(tampered, signature, secret);
    expect(result).toBe(false);
  });

  it("returns false for a wrong secret", async () => {
    const signature = await signPayload(body, secret);
    const result = await verifyWebhookSignature(body, signature, "wrong-secret");
    expect(result).toBe(false);
  });

  it("returns false for missing sha256= prefix", async () => {
    const result = await verifyWebhookSignature(body, "deadbeef", secret);
    expect(result).toBe(false);
  });

  it("returns false for empty signature", async () => {
    const result = await verifyWebhookSignature(body, "", secret);
    expect(result).toBe(false);
  });
});

describe("signPayload", () => {
  it("produces sha256= prefixed hex string", async () => {
    const sig = await signPayload("hello", "secret");
    expect(sig).toMatch(/^sha256=[a-f0-9]{64}$/);
  });

  it("produces deterministic output", async () => {
    const sig1 = await signPayload("same-data", "same-key");
    const sig2 = await signPayload("same-data", "same-key");
    expect(sig1).toBe(sig2);
  });

  it("produces different output for different data", async () => {
    const sig1 = await signPayload("data-a", "key");
    const sig2 = await signPayload("data-b", "key");
    expect(sig1).not.toBe(sig2);
  });
});
