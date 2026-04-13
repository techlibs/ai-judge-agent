import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { syncCache } from "@/cache/sync";

export async function POST() {
  const session = await auth();
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const startTime = Date.now();
  const result = await syncCache();
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  return NextResponse.json({
    synced: true,
    eventsProcessed: result.eventsProcessed,
    ipfsFetched: result.ipfsFetched,
    duration: `${duration}s`,
  });
}
