import { auth } from "@/lib/auth";

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
          <SyncButton />
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Session Info
          </h2>
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">User</span>
              <span className="font-medium text-gray-900">
                {session.user?.email ?? "Not authenticated"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SyncButton() {
  return (
    <form
      action={async () => {
        "use server";
        const session = await auth();
        if (!session) return;

        await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? ""}/api/sync`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
      }}
    >
      <button
        type="submit"
        className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        Trigger Sync
      </button>
    </form>
  );
}
