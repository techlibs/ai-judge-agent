import { listProposals } from "@/cache/queries";
import { sanitizeDisplayText } from "@/lib/sanitize-html";
import Link from "next/link";

const SCORE_COLOR_THRESHOLDS = {
  HIGH: 7,
  MEDIUM: 5,
} as const;

function getScoreColor(score: number | null): string {
  if (score === null) return "text-gray-400";
  if (score >= SCORE_COLOR_THRESHOLDS.HIGH) return "text-green-600";
  if (score >= SCORE_COLOR_THRESHOLDS.MEDIUM) return "text-yellow-600";
  return "text-red-600";
}

function getStatusBadge(status: string): string {
  switch (status) {
    case "evaluated":
      return "bg-green-100 text-green-800";
    case "pending":
      return "bg-yellow-100 text-yellow-800";
    case "funded":
      return "bg-blue-100 text-blue-800";
    case "disputed":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

interface GrantsPageProps {
  searchParams: Promise<{
    fundingRoundId?: string;
    status?: string;
    search?: string;
    page?: string;
  }>;
}

export default async function GrantsPage({ searchParams }: GrantsPageProps) {
  const params = await searchParams;
  const page = parseInt(params.page ?? "1", 10);

  const result = await listProposals({
    fundingRoundId: params.fundingRoundId,
    status: params.status,
    search: params.search,
    page: isNaN(page) ? 1 : page,
    pageSize: 20,
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Grant Proposals
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            AI-evaluated grant proposals with transparent scoring
          </p>
        </div>
        <Link
          href="/grants/submit"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Submit Proposal
        </Link>
      </div>

      <div className="mb-6 flex flex-wrap gap-4">
        <form className="flex gap-2">
          <input
            type="text"
            name="search"
            placeholder="Search proposals..."
            defaultValue={params.search}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Search
          </button>
        </form>
      </div>

      {result.data.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
          <p className="text-gray-500">No proposals found</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {result.data.map((proposal) => (
            <Link
              key={proposal.id}
              href={`/grants/${proposal.id}`}
              className="block rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {sanitizeDisplayText(proposal.title)}
                  </h2>
                  <p className="mt-1 line-clamp-2 text-sm text-gray-600">
                    {sanitizeDisplayText(proposal.description)}
                  </p>
                  <div className="mt-3 flex items-center gap-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusBadge(proposal.status)}`}
                    >
                      {proposal.status}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                      {proposal.category}
                    </span>
                    <span className="text-xs text-gray-500">
                      {proposal.budgetCurrency}{" "}
                      {proposal.budgetAmount.toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="ml-4 text-right">
                  <div
                    className={`text-2xl font-bold ${getScoreColor(proposal.finalScore)}`}
                  >
                    {proposal.finalScore !== null
                      ? proposal.finalScore.toFixed(2)
                      : "--"}
                  </div>
                  <div className="text-xs text-gray-500">score</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {result.pagination.totalPages > 1 && (
        <div className="mt-8 flex items-center justify-between">
          <p className="text-sm text-gray-700">
            Page {result.pagination.page} of {result.pagination.totalPages} (
            {result.pagination.total} total)
          </p>
          <div className="flex gap-2">
            {result.pagination.page > 1 && (
              <Link
                href={`/grants?page=${result.pagination.page - 1}${params.search ? `&search=${params.search}` : ""}`}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
              >
                Previous
              </Link>
            )}
            {result.pagination.page < result.pagination.totalPages && (
              <Link
                href={`/grants?page=${result.pagination.page + 1}${params.search ? `&search=${params.search}` : ""}`}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
