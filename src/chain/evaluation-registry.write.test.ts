import { describe, it, expect, vi, beforeEach } from "vitest";

const writeContract = vi.fn();

vi.mock("./contracts", () => ({
  publicClient: {},
  getEvaluationRegistryAddress: () => "0xa86D6684De7878C36F03697657702A86D13028d8",
  getDeploymentBlock: () => 0n,
  getWalletClient: () => ({
    account: { address: "0x1111111111111111111111111111111111111111" },
    writeContract,
  }),
}));

describe("submitEvaluationOnChain", () => {
  beforeEach(() => {
    writeContract.mockReset();
  });

  it("passes per-mille finalScore through to submitScore", async () => {
    writeContract.mockResolvedValueOnce("0xdead");
    const { submitEvaluationOnChain } = await import("./evaluation-registry");
    const result = await submitEvaluationOnChain({
      proposalIdHex: "0xabc",
      finalScoreMille: 720,
      proposalContentCid: "bafyP",
      evaluationContentCid: "bafyE",
    });
    expect(result).toEqual({ txHash: "0xdead" });
    expect(writeContract).toHaveBeenCalledTimes(1);
    const call = writeContract.mock.calls.at(0)?.[0];
    if (!call) throw new Error("writeContract not called");
    expect(call.functionName).toBe("submitScore");
    expect(call.args[0]).toBe("0xabc");
    expect(call.args[2]).toBe(720);
    expect(call.args[3]).toBe(10000);    // default reputation 1 * 10000
    expect(call.args[4]).toBe("bafyP");
    expect(call.args[5]).toBe("bafyE");
  });

  it("clamps finalScore at contract max of 1000", async () => {
    writeContract.mockResolvedValueOnce("0xfeed");
    const { submitEvaluationOnChain } = await import("./evaluation-registry");
    await submitEvaluationOnChain({
      proposalIdHex: "0xabc",
      finalScoreMille: 9999,
      proposalContentCid: "p",
      evaluationContentCid: "e",
    });
    const call = writeContract.mock.calls.at(0)?.[0];
    if (!call) throw new Error("writeContract not called");
    expect(call.args[2]).toBe(1000);
  });

  it("rounds fractional finalScore to nearest integer", async () => {
    writeContract.mockResolvedValueOnce("0xbeef");
    const { submitEvaluationOnChain } = await import("./evaluation-registry");
    await submitEvaluationOnChain({
      proposalIdHex: "0xabc",
      finalScoreMille: 770.4,
      proposalContentCid: "p",
      evaluationContentCid: "e",
    });
    const call = writeContract.mock.calls.at(0)?.[0];
    if (!call) throw new Error("writeContract not called");
    expect(call.args[2]).toBe(770);
  });

  it("propagates wallet errors", async () => {
    writeContract.mockRejectedValueOnce(new Error("insufficient funds"));
    const { submitEvaluationOnChain } = await import("./evaluation-registry");
    await expect(
      submitEvaluationOnChain({
        proposalIdHex: "0xabc",
        finalScoreMille: 500,
        proposalContentCid: "p",
        evaluationContentCid: "e",
      }),
    ).rejects.toThrow(/insufficient funds/);
  });
});
