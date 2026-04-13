import { NextResponse } from "next/server";
import { checkAndFinalizeEvaluation } from "@/lib/evaluation/orchestrator";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const result = await checkAndFinalizeEvaluation(id);
    if (result.complete) {
      return NextResponse.json({ status: "published", aggregateScore: result.aggregateScore });
    }
    return NextResponse.json({ status: "not_ready" }, { status: 202 });
  } catch {
    return NextResponse.json({ status: "failed" }, { status: 500 });
  }
}
