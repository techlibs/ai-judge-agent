import { describe, it, expect } from "vitest";
import { verifyWebhookSignature, signPayload } from "./api-auth";

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
