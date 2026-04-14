import { describe, it, expect, mock, beforeAll } from "bun:test";

// Mock the pinata module BEFORE importing the module under test
// The upload chain is: pinata.upload.public.json(data).name(name) → Promise<{cid}>
// The gateway chain is: pinata.gateways.public.get(cid) → Promise<{data}>

const MOCK_CID = "QmTestCid123";
const MOCK_GATEWAY = "https://gateway.pinata.cloud";

// We use a factory function so we can control behavior per-test via closures
let uploadJsonMock: ReturnType<typeof mock>;
let gatewayGetMock: ReturnType<typeof mock>;

uploadJsonMock = mock(() =>
  Promise.resolve({ cid: MOCK_CID })
);

gatewayGetMock = mock(() =>
  Promise.resolve({ data: { hello: "world" } })
);

// Build the mock PinataSDK class
class MockPinataSDK {
  upload = {
    public: {
      json: (_data: unknown) => ({
        name: (_name: string) => uploadJsonMock(),
      }),
    },
  };
  gateways = {
    public: {
      get: (cid: string) => gatewayGetMock(cid),
    },
  };
}

mock.module("pinata", () => ({
  PinataSDK: MockPinataSDK,
}));

// Module under test — loaded after mock.module so it sees our mock PinataSDK.
// We use beforeAll + module-level lets instead of top-level await import
// to ensure compatibility across Bun versions.
type IpfsClient = typeof import("@/lib/ipfs/client");
let uploadJson: IpfsClient["uploadJson"];
let verifyContentIntegrity: IpfsClient["verifyContentIntegrity"];

beforeAll(async () => {
  const mod = await import("@/lib/ipfs/client");
  uploadJson = mod.uploadJson;
  verifyContentIntegrity = mod.verifyContentIntegrity;
});

describe("uploadJson", () => {
  it("succeeds on first attempt and returns cid and uri", async () => {
    const testData = { hello: "world" };

    // uploadJsonMock returns success, gatewayGetMock returns matching data
    uploadJsonMock.mockImplementation(() => Promise.resolve({ cid: MOCK_CID }));
    gatewayGetMock.mockImplementation(() => Promise.resolve({ data: testData }));

    const result = await uploadJson(testData, "test-upload");

    expect(result.cid).toBe(MOCK_CID);
    expect(result.uri).toContain(MOCK_CID);
  });

  it("gracefully degrades when verification fetch throws (still returns result)", async () => {
    const testData = { key: "value" };

    uploadJsonMock.mockImplementation(() => Promise.resolve({ cid: MOCK_CID }));
    // verifyUploadedContent catches errors and returns true — so this should still succeed
    gatewayGetMock.mockImplementation(() => Promise.reject(new Error("gateway timeout")));

    const result = await uploadJson(testData, "test-graceful");

    expect(result.cid).toBe(MOCK_CID);
    expect(result.uri).toContain(MOCK_CID);
  });

  it("throws after all 3 attempts fail", async () => {
    // Override uploadJsonMock to always fail
    uploadJsonMock.mockImplementation(() => Promise.reject(new Error("upload error")));
    // Speed up by making setTimeout instant — replace global setTimeout temporarily
    const originalSetTimeout = globalThis.setTimeout;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore — intentionally replacing for test speed
    globalThis.setTimeout = (fn: () => void, _delay: number) => originalSetTimeout(fn, 0);

    try {
      await expect(
        uploadJson({ fail: true }, "fail-test")
      ).rejects.toThrow("IPFS upload failed after 3 attempts");
    } finally {
      globalThis.setTimeout = originalSetTimeout;
    }
  });
});

describe("verifyContentIntegrity", () => {
  it("returns valid:true when fetched data matches expected data", async () => {
    const expectedData = { foo: "bar", count: 42 };
    gatewayGetMock.mockImplementation(() => Promise.resolve({ data: expectedData }));

    const result = await verifyContentIntegrity(MOCK_CID, expectedData);

    expect(result.valid).toBe(true);
  });

  it("returns valid:false when fetched data does not match expected data", async () => {
    const expectedData = { foo: "bar" };
    const differentData = { foo: "baz" };
    gatewayGetMock.mockImplementation(() => Promise.resolve({ data: differentData }));

    const result = await verifyContentIntegrity(MOCK_CID, expectedData);

    expect(result.valid).toBe(false);
    expect(result.reason).toContain("mismatch");
  });

  it("returns valid:false when gateway fetch throws", async () => {
    gatewayGetMock.mockImplementation(() => Promise.reject(new Error("network error")));

    const result = await verifyContentIntegrity(MOCK_CID, { data: "expected" });

    expect(result.valid).toBe(false);
    expect(result.reason).toContain("Failed to fetch");
  });
});
