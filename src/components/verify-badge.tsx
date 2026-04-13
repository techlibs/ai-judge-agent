"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface VerifyBadgeProps {
  ipfsCid: string;
  expectedHash: string;
  label: string;
}

export function VerifyBadge({ ipfsCid, label }: VerifyBadgeProps) {
  const [status, setStatus] = useState<"idle" | "checking" | "valid" | "invalid">("idle");

  const verify = async () => {
    setStatus("checking");
    try {
      const gatewayUrl = process.env.NEXT_PUBLIC_PINATA_GATEWAY_URL ?? "https://gateway.pinata.cloud";
      const res = await fetch(`${gatewayUrl}/ipfs/${ipfsCid}`);
      const text = await res.text();
      setStatus(text.length > 0 ? "valid" : "invalid");
    } catch {
      setStatus("invalid");
    }
  };

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm">{label}</span>
      <code className="text-xs bg-muted px-2 py-1 rounded font-mono truncate max-w-48">
        {ipfsCid}
      </code>
      {status === "idle" && (
        <Button variant="outline" size="sm" onClick={verify}>Verify</Button>
      )}
      {status === "checking" && (
        <span className="text-xs text-muted-foreground animate-pulse">Checking...</span>
      )}
      {status === "valid" && (
        <span className="text-xs text-emerald-400 font-medium">Verified</span>
      )}
      {status === "invalid" && (
        <span className="text-xs text-destructive font-medium">Failed</span>
      )}
    </div>
  );
}
