import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { evaluations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { JUDGE_DIMENSIONS, type JudgeDimension } from "@/lib/constants";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; dimension: string }> }
) {
  const { id, dimension } = await params;

  if (!JUDGE_DIMENSIONS.includes(dimension as JudgeDimension)) {
    return NextResponse.json({ error: "Invalid dimension" }, { status: 400 });
  }

  const db = getDb();

  const existing = await db.query.evaluations.findFirst({
    where: and(
      eq(evaluations.proposalId, id),
      eq(evaluations.dimension, dimension as JudgeDimension)
    ),
  });

  if (!existing) {
    return NextResponse.json({ error: "No evaluation found" }, { status: 404 });
  }

  if (existing.status !== "failed") {
    return NextResponse.json(
      { error: "Evaluation is not in failed state" },
      { status: 409 }
    );
  }

  await db.delete(evaluations).where(eq(evaluations.id, existing.id));

  return NextResponse.json({
    status: "ready",
    stream: `/api/evaluate/${id}/${dimension}`,
  });
}
