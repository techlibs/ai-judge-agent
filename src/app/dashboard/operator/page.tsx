import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { SyncForm } from "./sync-form";

async function triggerSync(): Promise<{ success: boolean; message: string }> {
  "use server";

  const session = await auth();
  if (!session?.user?.email && !session?.user?.name) {
    return { success: false, message: "Unauthorized" };
  }

  try {
    const { syncCache } = await import("@/cache/sync");
    const startTime = Date.now();
    const result = await syncCache();
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    revalidatePath("/grants");
    return {
      success: true,
      message: `Synced ${result.eventsProcessed} events, ${result.ipfsFetched} IPFS fetches in ${duration}s`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Sync failed";
    return { success: false, message: msg };
  }
}

export default async function OperatorDashboard() {
  const session = await auth();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          Operator Dashboard
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Manage cache sync and monitor evaluation jobs
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900">Cache Sync</h2>
          <p className="mt-2 text-sm text-gray-600">
            Trigger an incremental rebuild of the local cache from The Graph and
            IPFS data.
          </p>
          <SyncForm triggerSync={triggerSync} />
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Session Info
          </h2>
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">User</span>
              <span className="font-medium text-gray-900">
                {session?.user?.email ?? "Not authenticated"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
