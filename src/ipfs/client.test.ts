import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockPinataSDK = vi.fn(() => ({
  upload: { json: vi.fn() },
  gateways: { get: vi.fn() },
}));

vi.mock("pinata", () => ({
  PinataSDK: mockPinataSDK,
}));

describe("ipfs/client", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    mockPinataSDK.mockClear();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("throws when PINATA_JWT is missing", async () => {
    delete process.env.PINATA_JWT;
    process.env.PINATA_GATEWAY = "my-gateway.mypinata.cloud";
    const mod = await import("./client");
    expect(() => mod.getPinataClient()).toThrow(
      "PINATA_JWT environment variable is required"
    );
  });

  it("throws when PINATA_GATEWAY is missing", async () => {
    process.env.PINATA_JWT = "test-jwt";
    delete process.env.PINATA_GATEWAY;
    const mod = await import("./client");
    expect(() => mod.getPinataClient()).toThrow(
      "PINATA_GATEWAY environment variable is required"
    );
  });

  it("returns SDK instance when both env vars are set", async () => {
    process.env.PINATA_JWT = "test-jwt";
    process.env.PINATA_GATEWAY = "my-gateway.mypinata.cloud";
    const mod = await import("./client");
    const client = mod.getPinataClient();
    expect(client).toBeDefined();
    expect(mockPinataSDK).toHaveBeenCalledWith({
      pinataJwt: "test-jwt",
      pinataGateway: "my-gateway.mypinata.cloud",
    });
  });

  it("returns the same instance on second call (singleton)", async () => {
    process.env.PINATA_JWT = "test-jwt";
    process.env.PINATA_GATEWAY = "my-gateway.mypinata.cloud";
    const mod = await import("./client");
    const first = mod.getPinataClient();
    const second = mod.getPinataClient();
    expect(first).toBe(second);
    // Constructor should only be called once
    expect(mockPinataSDK).toHaveBeenCalledTimes(1);
  });
});
