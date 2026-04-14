const BASE_MAINNET_CHAIN_ID = 8453;

const EXPLORER_URLS: Record<number, string> = {
  [BASE_MAINNET_CHAIN_ID]: "https://basescan.org",
  84532: "https://sepolia.basescan.org",
};

export function getExplorerBaseUrl(): string {
  const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? "84532");
  return EXPLORER_URLS[chainId] ?? "https://sepolia.basescan.org";
}

export function buildIpfsUrl(cid: string): string | null {
  const gateway = process.env.PINATA_GATEWAY;
  if (!gateway) {
    return null;
  }
  return `https://${gateway}/ipfs/${cid}`;
}
