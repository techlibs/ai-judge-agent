import { createPublicClient, http, isAddress, type Address } from "viem";
import { base, baseSepolia } from "viem/chains";

const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? "84532");

const SUPPORTED_CHAINS = {
  [baseSepolia.id]: {
    chain: baseSepolia,
    defaultRpc: "https://sepolia.base.org",
  },
  [base.id]: {
    chain: base,
    defaultRpc: "https://mainnet.base.org",
  },
} as const;

function getChainConfig() {
  const config = SUPPORTED_CHAINS[CHAIN_ID as keyof typeof SUPPORTED_CHAINS];
  if (!config) {
    throw new Error(
      `Unsupported NEXT_PUBLIC_CHAIN_ID: ${CHAIN_ID}. Supported: ${Object.keys(SUPPORTED_CHAINS).join(", ")}`,
    );
  }
  return config;
}

const chainConfig = getChainConfig();
const RPC_URL = process.env.BASE_SEPOLIA_RPC_URL ?? chainConfig.defaultRpc;

export const publicClient = createPublicClient({
  chain: chainConfig.chain,
  transport: http(RPC_URL),
});

function getAddressFromEnv(envVar: string): Address {
  const value = process.env[envVar];
  if (!value) {
    throw new Error(`${envVar} environment variable is required`);
  }
  if (!isAddress(value)) {
    throw new Error(`${envVar} is not a valid address: ${value}`);
  }
  return value;
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
