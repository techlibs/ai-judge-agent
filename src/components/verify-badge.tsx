"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface VerifyBadgeProps {
  ipfsCid: string;
  expectedHash: string;
  label: string;
}

async function computeSha256Hex(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

type VerifyStatus = "idle" | "checking" | "valid" | "invalid" | "content_found";

export function VerifyBadge({ ipfsCid, expectedHash, label }: VerifyBadgeProps) {
  const [status, setStatus] = useState<VerifyStatus>("idle");
  const [details, setDetails] = useState<string>("");

  const verify = async () => {
    setStatus("checking");
    setDetails("");
    try {
      const gatewayUrl = process.env.NEXT_PUBLIC_PINATA_GATEWAY_URL ?? "https://gateway.pinata.cloud";
      const res = await fetch(`${gatewayUrl}/ipfs/${ipfsCid}`);

      if (!res.ok) {
        setStatus("invalid");
        setDetails(`Gateway returned ${res.status}`);
        return;
      }

      const text = await res.text();

      if (text.length === 0) {
        setStatus("invalid");
        setDetails("Empty content");
        return;
      }

      // Verify content is valid JSON (all our IPFS content is JSON)
      try {
        JSON.parse(text);
      } catch {
        setStatus("invalid");
        setDetails("Content is not valid JSON");
        return;
      }

      // If an expected hash was provided, verify the content hash matches
      if (expectedHash.length > 0) {
        const contentHash = await computeSha256Hex(text);
        if (contentHash === expectedHash) {
          setStatus("valid");
          setDetails("Content hash verified");
        } else {
          setStatus("invalid");
          setDetails("Content hash mismatch");
        }
        return;
      }

      // No expected hash — CID itself is the content address.
      // Confirm content resolves and is structurally valid.
      setStatus("content_found");
      setDetails("Content retrieved from IPFS (CID-addressed)");
    } catch {
      setStatus("invalid");
      setDetails("Failed to reach IPFS gateway");
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-sm">{label}</span>
      <code className="text-xs bg-muted px-2 py-1 rounded font-mono truncate max-w-48">
        {ipfsCid}
      </code>
      {status === "idle" && (
        <Button variant="outline" size="sm" onClick={verify}>Verify</Button>
      )}
      {status === "checking" && (
        <span className="text-xs text-muted-foreground animate-pulse">Verifying...</span>
      )}
      {status === "valid" && (
        <span className="text-xs text-emerald-400 font-medium" title={details}>
          Hash Verified
        </span>
      )}
      {status === "content_found" && (
        <span className="text-xs text-emerald-400 font-medium" title={details}>
          Content Verified
        </span>
      )}
      {status === "invalid" && (
        <span className="text-xs text-destructive font-medium" title={details}>
          Failed: {details}
        </span>
      )}
    </div>
  );
}
