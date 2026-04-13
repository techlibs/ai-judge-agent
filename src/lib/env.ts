import { z } from "zod";

const serverEnvSchema = z.object({
  PINATA_API_KEY: z.string().min(1).optional(),
  PINATA_SECRET_KEY: z.string().min(1).optional(),
  PINATA_GATEWAY_URL: z.string().url().optional(),
  RPC_URL: z.string().url().min(1),
  DEPLOYER_PRIVATE_KEY: z.string().min(1),
});

const clientEnvSchema = z.object({
  NEXT_PUBLIC_CHAIN_ID: z.string().default("84532"),
  NEXT_PUBLIC_IDENTITY_REGISTRY_ADDRESS: z.string().optional(),
  NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS: z.string().optional(),
});

/** Server env -- only accessible in server components and API routes */
export function getServerEnv() {
  return serverEnvSchema.parse(process.env);
}

/** Client env -- safe to use in client components */
export function getClientEnv() {
  return clientEnvSchema.parse({
    NEXT_PUBLIC_CHAIN_ID: process.env.NEXT_PUBLIC_CHAIN_ID,
    NEXT_PUBLIC_IDENTITY_REGISTRY_ADDRESS:
      process.env.NEXT_PUBLIC_IDENTITY_REGISTRY_ADDRESS,
    NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS:
      process.env.NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS,
  });
}
