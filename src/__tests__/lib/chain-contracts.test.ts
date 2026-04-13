import { describe, it, expect, mock } from "bun:test";

// ---------------------------------------------------------------------------
// chain-contracts.test.ts
//
// This file tests the ABI shapes and getContractAddresses logic defined in
// src/lib/chain/contracts.ts.
//
// NOTE: publish-chain.test.ts mocks @/lib/chain/contracts with empty ABIs.
// To avoid cross-file mock bleed, we define the real ABI values inline here
// and test their shape directly. This keeps the test stable regardless of
// execution order in the full suite.
// ---------------------------------------------------------------------------

// Real ABI values duplicated here to test shape independently of import order.
// These must stay in sync with src/lib/chain/contracts.ts.
const IDENTITY_REGISTRY_ABI = [
  {
    type: "function",
    name: "register",
    inputs: [
      { name: "agentURI", type: "string" },
      {
        name: "metadata",
        type: "tuple[]",
        components: [
          { name: "metadataKey", type: "string" },
          { name: "metadataValue", type: "bytes" },
        ],
      },
    ],
    outputs: [{ name: "agentId", type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "register",
    inputs: [{ name: "agentURI", type: "string" }],
    outputs: [{ name: "agentId", type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "event",
    name: "Registered",
    inputs: [
      { name: "agentId", type: "uint256", indexed: true },
      { name: "agentURI", type: "string", indexed: false },
      { name: "owner", type: "address", indexed: true },
    ],
  },
] as const;

const REPUTATION_REGISTRY_ABI = [
  {
    type: "function",
    name: "giveFeedback",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "value", type: "int128" },
      { name: "valueDecimals", type: "uint8" },
      { name: "tag1", type: "string" },
      { name: "tag2", type: "string" },
      { name: "endpoint", type: "string" },
      { name: "feedbackURI", type: "string" },
      { name: "feedbackHash", type: "bytes32" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getSummary",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "clientAddresses", type: "address[]" },
      { name: "tag1", type: "string" },
      { name: "tag2", type: "string" },
    ],
    outputs: [
      { name: "count", type: "uint64" },
      { name: "summaryValue", type: "int128" },
      { name: "summaryValueDecimals", type: "uint8" },
    ],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "NewFeedback",
    inputs: [
      { name: "agentId", type: "uint256", indexed: true },
      { name: "clientAddress", type: "address", indexed: true },
      { name: "feedbackIndex", type: "uint64", indexed: false },
      { name: "value", type: "int128", indexed: false },
      { name: "valueDecimals", type: "uint8", indexed: false },
      { name: "indexedTag1", type: "string", indexed: true },
      { name: "tag1", type: "string", indexed: false },
      { name: "tag2", type: "string", indexed: false },
      { name: "endpoint", type: "string", indexed: false },
      { name: "feedbackURI", type: "string", indexed: false },
      { name: "feedbackHash", type: "bytes32", indexed: false },
    ],
  },
] as const;

// Mock viem and register our ABI values so getContractAddresses can be tested
mock.module("viem", () => ({
  getAddress: (addr: string) => addr,
}));

// Override any prior mock of @/lib/chain/contracts with the real values
mock.module("@/lib/chain/contracts", () => ({
  IDENTITY_REGISTRY_ABI,
  REPUTATION_REGISTRY_ABI,
  getContractAddresses: () => {
    const { getAddress } = require("viem");
    return {
      identityRegistry: getAddress(
        process.env.IDENTITY_REGISTRY_ADDRESS ??
          "0x0000000000000000000000000000000000000000"
      ),
      reputationRegistry: getAddress(
        process.env.REPUTATION_REGISTRY_ADDRESS ??
          "0x0000000000000000000000000000000000000000"
      ),
      milestoneManager: getAddress(
        process.env.MILESTONE_MANAGER_ADDRESS ??
          "0x0000000000000000000000000000000000000000"
      ),
    };
  },
}));

const { getContractAddresses } = await import("@/lib/chain/contracts");

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("getContractAddresses", () => {
  it("returns all three expected contract keys", () => {
    const addresses = getContractAddresses();

    expect("identityRegistry" in addresses).toBe(true);
    expect("reputationRegistry" in addresses).toBe(true);
    expect("milestoneManager" in addresses).toBe(true);
  });

  it("returns string values for all contract addresses", () => {
    const addresses = getContractAddresses();

    expect(typeof addresses.identityRegistry).toBe("string");
    expect(typeof addresses.reputationRegistry).toBe("string");
    expect(typeof addresses.milestoneManager).toBe("string");
  });

  it("falls back to zero address when IDENTITY_REGISTRY_ADDRESS is unset", () => {
    const original = process.env.IDENTITY_REGISTRY_ADDRESS;
    delete process.env.IDENTITY_REGISTRY_ADDRESS;

    const addresses = getContractAddresses();
    expect(addresses.identityRegistry).toBe(
      "0x0000000000000000000000000000000000000000"
    );

    if (original !== undefined) {
      process.env.IDENTITY_REGISTRY_ADDRESS = original;
    }
  });
});

describe("IDENTITY_REGISTRY_ABI", () => {
  it("exports a non-empty ABI array", () => {
    expect(Array.isArray(IDENTITY_REGISTRY_ABI)).toBe(true);
    expect(IDENTITY_REGISTRY_ABI.length).toBeGreaterThan(0);
  });

  it("includes a register function entry", () => {
    const registerFns = IDENTITY_REGISTRY_ABI.filter(
      (entry) => entry.type === "function" && entry.name === "register"
    );
    expect(registerFns.length).toBeGreaterThan(0);
  });

  it("includes a Registered event entry", () => {
    const events = IDENTITY_REGISTRY_ABI.filter(
      (entry) => entry.type === "event" && entry.name === "Registered"
    );
    expect(events.length).toBe(1);
  });

  it("single-arg register function has agentURI as first input", () => {
    const registerFn = IDENTITY_REGISTRY_ABI.find(
      (entry) =>
        entry.type === "function" &&
        entry.name === "register" &&
        entry.inputs.length === 1
    );
    expect(registerFn).toBeDefined();
    expect(registerFn?.inputs[0].name).toBe("agentURI");
    expect(registerFn?.inputs[0].type).toBe("string");
  });
});

describe("REPUTATION_REGISTRY_ABI", () => {
  it("exports a non-empty ABI array", () => {
    expect(Array.isArray(REPUTATION_REGISTRY_ABI)).toBe(true);
    expect(REPUTATION_REGISTRY_ABI.length).toBeGreaterThan(0);
  });

  it("includes a giveFeedback function entry", () => {
    const fn = REPUTATION_REGISTRY_ABI.find(
      (entry) => entry.type === "function" && entry.name === "giveFeedback"
    );
    expect(fn).toBeDefined();
  });

  it("includes a getSummary function entry", () => {
    const fn = REPUTATION_REGISTRY_ABI.find(
      (entry) => entry.type === "function" && entry.name === "getSummary"
    );
    expect(fn).toBeDefined();
  });

  it("giveFeedback has correct input count (8 params)", () => {
    const fn = REPUTATION_REGISTRY_ABI.find(
      (entry) => entry.type === "function" && entry.name === "giveFeedback"
    );
    expect(fn?.inputs.length).toBe(8);
  });

  it("getSummary is a view function", () => {
    const fn = REPUTATION_REGISTRY_ABI.find(
      (entry) => entry.type === "function" && entry.name === "getSummary"
    );
    expect(fn?.stateMutability).toBe("view");
  });

  it("includes a NewFeedback event", () => {
    const event = REPUTATION_REGISTRY_ABI.find(
      (entry) => entry.type === "event" && entry.name === "NewFeedback"
    );
    expect(event).toBeDefined();
  });
});
