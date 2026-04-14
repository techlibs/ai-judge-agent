import { NextResponse } from "next/server";
import { syncCache } from "@/cache/sync";

export async function POST() {
  let session;
  try {
    const { auth } = await import("@/lib/auth");
    session = await auth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
