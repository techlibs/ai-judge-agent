import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { z } from "zod";

const mockUploadJson = vi.fn();
const mockPinataClient = {
  upload: { json: mockUploadJson },
};

vi.mock("./client", () => ({
  getPinataClient: () => mockPinataClient,
}));

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { pinJsonToIpfs, fetchJsonFromIpfs } from "./pin";

const TestSchema = z.object({
  name: z.string(),
  value: z.number(),
});

describe("ipfs/pin", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("pinJsonToIpfs", () => {
    it("validates data against schema and returns CID", async () => {
      mockUploadJson.mockResolvedValue({ cid: "QmTestCid123" });
      const result = await pinJsonToIpfs(TestSchema, {
        name: "test",
        value: 42,
      });
      expect(result).toBe("QmTestCid123");
      expect(mockUploadJson).toHaveBeenCalled();
    });

    it("throws when data fails schema validation", async () => {
      await expect(
        pinJsonToIpfs(TestSchema, { name: "test", value: "not-a-number" })
      ).rejects.toThrow();
    });

    it("throws when data is missing required fields", async () => {
      await expect(
        pinJsonToIpfs(TestSchema, { name: "test" })
      ).rejects.toThrow();
    });

    it("pins canonical (sorted keys) JSON", async () => {
      mockUploadJson.mockResolvedValue({ cid: "QmSorted" });
      await pinJsonToIpfs(TestSchema, { value: 1, name: "alpha" });
      const pinnedData = mockUploadJson.mock.calls[0]?.[0] as Record<string, unknown>;
      const keys = Object.keys(pinnedData);
      expect(keys).toEqual(["name", "value"]);
    });
  });

  describe("fetchJsonFromIpfs", () => {
    it("throws when PINATA_GATEWAY is missing", async () => {
      delete process.env.PINATA_GATEWAY;
      await expect(
        fetchJsonFromIpfs("QmTest", TestSchema)
      ).rejects.toThrow("PINATA_GATEWAY environment variable is required");
    });

    it("fetches and validates data from IPFS", async () => {
      process.env.PINATA_GATEWAY = "my-gateway.mypinata.cloud";
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ name: "fetched", value: 99 }),
      });
      const result = await fetchJsonFromIpfs("QmTest123", TestSchema);
      expect(result).toEqual({ name: "fetched", value: 99 });
      expect(mockFetch).toHaveBeenCalledWith(
        "https://my-gateway.mypinata.cloud/ipfs/QmTest123",
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
    });

    it("throws on non-OK response (e.g. 404)", async () => {
      process.env.PINATA_GATEWAY = "my-gateway.mypinata.cloud";
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
      });
      await expect(
        fetchJsonFromIpfs("QmNotFound", TestSchema)
      ).rejects.toThrow("IPFS fetch failed for CID QmNotFound: 404");
    });

    it("throws when fetched data fails schema validation", async () => {
      process.env.PINATA_GATEWAY = "my-gateway.mypinata.cloud";
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ wrong: "shape" }),
      });
      await expect(
        fetchJsonFromIpfs("QmBadData", TestSchema)
      ).rejects.toThrow();
    });

    it("throws on timeout (abort)", async () => {
      process.env.PINATA_GATEWAY = "my-gateway.mypinata.cloud";
      mockFetch.mockImplementation(() => {
        const error = new DOMException("The operation was aborted", "AbortError");
        return Promise.reject(error);
      });
      await expect(
        fetchJsonFromIpfs("QmSlow", TestSchema)
      ).rejects.toThrow();
    });
  });
});
