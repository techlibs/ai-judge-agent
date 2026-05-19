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

  it("calls submitScore with scaled args and returns tx hash", async () => {
    writeContract.mockResolvedValueOnce("0xdead");
    const { submitEvaluationOnChain } = await import("./evaluation-registry");
    const result = await submitEvaluationOnChain({
      proposalIdHex: "0xabc",
      finalScore: 72,
      proposalContentCid: "bafyP",
      evaluationContentCid: "bafyE",
    });
    expect(result).toEqual({ txHash: "0xdead" });
    expect(writeContract).toHaveBeenCalledTimes(1);
    const call = writeContract.mock.calls.at(0)?.[0];
    if (!call) throw new Error("writeContract not called");
    expect(call.functionName).toBe("submitScore");
    expect(call.args[0]).toBe("0xabc");
    expect(call.args[2]).toBe(7200);     // 72 * 100
    expect(call.args[3]).toBe(10000);    // default reputation 1 * 10000
    expect(call.args[4]).toBe("bafyP");
    expect(call.args[5]).toBe("bafyE");
  });

  it("propagates wallet errors", async () => {
    writeContract.mockRejectedValueOnce(new Error("insufficient funds"));
    const { submitEvaluationOnChain } = await import("./evaluation-registry");
    await expect(
      submitEvaluationOnChain({
        proposalIdHex: "0xabc",
        finalScore: 50,
        proposalContentCid: "p",
        evaluationContentCid: "e",
      }),
    ).rejects.toThrow(/insufficient funds/);
  });
});
