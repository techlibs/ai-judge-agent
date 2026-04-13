"use client";

import { useState } from "react";
import { Copy, Check, ExternalLink } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const BASE_SEPOLIA_EXPLORER = "https://sepolia.basescan.org/tx/";

export function TransactionLink({
  txHash,
}: {
  txHash: string | null;
}) {
  const [copied, setCopied] = useState(false);

  if (!txHash) {
    return (
      <span className="text-sm text-muted-foreground">Pending</span>
    );
  }

  const truncatedHash = `${txHash.slice(0, 6)}...${txHash.slice(-4)}`;
  const explorerUrl = `${BASE_SEPOLIA_EXPLORER}${txHash}`;

  async function handleCopy() {
    if (!txHash) return;
    await navigator.clipboard.writeText(txHash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger className="font-mono text-sm">
            {truncatedHash}
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-mono text-xs">{txHash}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
        aria-label={
          copied
            ? "Transaction hash copied"
            : "Copy transaction hash to clipboard"
        }
      >
        {copied ? (
          <Check className="h-4 w-4" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </button>

      <a
        href={explorerUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
        aria-label={`View transaction ${truncatedHash} on Base Sepolia block explorer`}
      >
        <ExternalLink className="h-4 w-4" />
      </a>
    </span>
  );
}
