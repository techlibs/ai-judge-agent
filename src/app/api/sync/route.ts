import { NextResponse } from "next/server";

export async function POST() {
  try {
    const { auth } = await import("@/lib/auth");
    const session = await auth();
    if (!session?.user?.email && !session?.user?.name) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { syncCache } = await import("@/cache/sync");
    const startTime = Date.now();
    const result = await syncCache();
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    return NextResponse.json({
      synced: true,
      eventsProcessed: result.eventsProcessed,
      ipfsFetched: result.ipfsFetched,
      duration: `${duration}s`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
