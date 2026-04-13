import { NextResponse, type NextRequest } from "next/server";
import { listProposals } from "@/cache/queries";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const fundingRoundId = searchParams.get("fundingRoundId") ?? undefined;
  const status = searchParams.get("status") ?? undefined;
  const search = searchParams.get("search") ?? undefined;
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") ?? "20", 10);
  const sort = searchParams.get("sort") ?? "chainTimestamp";
  const order =
    searchParams.get("order") === "asc" ? ("asc" as const) : ("desc" as const);

  const result = await listProposals({
    fundingRoundId,
    status,
    search,
    page: isNaN(page) ? 1 : page,
    pageSize: isNaN(pageSize) ? 20 : pageSize,
    sort,
    order,
  });

  return NextResponse.json({
    data: result.data,
    pagination: result.pagination,
    source: "cache",
  });
}
