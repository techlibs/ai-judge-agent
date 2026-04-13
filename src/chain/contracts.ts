import { createPublicClient, http, type Address } from "viem";
import { baseSepolia } from "viem/chains";

const RPC_URL =
  process.env.BASE_SEPOLIA_RPC_URL ?? "https://sepolia.base.org";

export const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(RPC_URL),
});

function getAddressFromEnv(envVar: string): Address {
  const value = process.env[envVar];
  if (!value) {
    throw new Error(`${envVar} environment variable is required`);
  }
  return value as Address;
}

export function getEvaluationRegistryAddress(): Address {
  return getAddressFromEnv("NEXT_PUBLIC_EVALUATION_REGISTRY_ADDRESS");
}

export function getIdentityRegistryAddress(): Address {
  return getAddressFromEnv("NEXT_PUBLIC_IDENTITY_REGISTRY_ADDRESS");
}

export function getMilestoneManagerAddress(): Address {
  return getAddressFromEnv("NEXT_PUBLIC_MILESTONE_MANAGER_ADDRESS");
}

export function getReputationRegistryAddress(): Address {
  return getAddressFromEnv("NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS");
}

export function getValidationRegistryAddress(): Address {
  return getAddressFromEnv("NEXT_PUBLIC_VALIDATION_REGISTRY_ADDRESS");
}

export function getDisputeRegistryAddress(): Address {
  return getAddressFromEnv("NEXT_PUBLIC_DISPUTE_REGISTRY_ADDRESS");
}

export function getDeploymentBlock(): bigint {
  const block = process.env.DEPLOYMENT_BLOCK;
  return block ? BigInt(block) : 0n;
}
