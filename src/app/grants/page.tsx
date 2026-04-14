import Link from "next/link";

export default function GrantsPage() {
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

      <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
          />
        </svg>
        <h3 className="mt-4 text-lg font-semibold text-gray-900">
          No proposals yet
        </h3>
        <p className="mt-2 text-sm text-gray-500">
          Evaluated proposals will appear here once on-chain indexing is
          connected. Submit a proposal to start the evaluation process.
        </p>
        <div className="mt-6">
          <Link
            href="/grants/submit"
            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
          >
            Submit Your First Proposal
          </Link>
        </div>
      </div>
    </div>
  );
}
