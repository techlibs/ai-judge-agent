import { createPublicClient, createWalletClient, http } from "viem";
import { baseSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { z } from "zod";
import { getServerEnv } from "@/lib/env";

const hexStringSchema = z
  .string()
  .regex(/^[0-9a-fA-F]+$/, "Must be a hex string");

export function getPublicClient() {
  const env = getServerEnv();
  return createPublicClient({
    chain: baseSepolia,
    transport: http(env.RPC_URL),
  });
}

export function getWalletClient() {
  const env = getServerEnv();
  if (!env.DEPLOYER_PRIVATE_KEY) {
    throw new Error("DEPLOYER_PRIVATE_KEY not configured");
  }
  const validatedKey = hexStringSchema.parse(env.DEPLOYER_PRIVATE_KEY);
  const account = privateKeyToAccount(`0x${validatedKey}`);
  return createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(env.RPC_URL),
  });
}
