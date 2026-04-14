"use client";

import { useState, useTransition } from "react";

interface SyncFormProps {
  triggerSync: () => Promise<{ success: boolean; message: string }>;
}

export function SyncForm({ triggerSync }: SyncFormProps) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  function handleSync() {
    setResult(null);
    startTransition(async () => {
      const res = await triggerSync();
      setResult(res);
    });
  }

  return (
    <div className="mt-4 space-y-3">
      <button
        type="button"
        onClick={handleSync}
        disabled={isPending}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {isPending ? "Syncing..." : "Trigger Sync"}
      </button>

      {result && (
        <div
          className={`rounded-md p-3 text-sm ${
            result.success
              ? "border border-green-200 bg-green-50 text-green-800"
              : "border border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {result.message}
        </div>
      )}
    </div>
  );
}
