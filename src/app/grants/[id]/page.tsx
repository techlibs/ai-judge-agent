import Link from "next/link";
import { DIMENSION_LABELS, type JudgeDimension } from "@/lib/constants";

interface GrantDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function GrantDetailPage({ params }: GrantDetailPageProps) {
  const { id } = await params;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Link
          href="/grants"
          className="text-sm text-blue-600 hover:text-blue-500"
        >
          &larr; Back to Proposals
        </Link>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Proposal Evaluation
        </h1>
        <p className="mt-2 font-mono text-xs text-gray-500">ID: {id}</p>

        <div className="mt-8 rounded-md bg-blue-50 p-6">
          <h2 className="text-lg font-semibold text-blue-900">
            Evaluation Submitted
          </h2>
          <p className="mt-2 text-sm text-blue-700">
            This proposal has been evaluated by our AI judges across four
            dimensions. Results will be available on-chain once the evaluation
            transaction is confirmed.
          </p>
        </div>

        <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-900">
            Scoring Dimensions
          </h3>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {(Object.entries(DIMENSION_LABELS) as Array<[JudgeDimension, string]>).map(
              ([dim, label]) => (
                <div
                  key={dim}
                  className="rounded-md border border-gray-200 p-4"
                >
                  <p className="text-sm font-medium text-gray-500">{label}</p>
                  <p className="mt-1 text-sm text-gray-400">
                    Awaiting on-chain confirmation
                  </p>
                </div>
              )
            )}
          </div>
        </div>

        <div className="mt-8 rounded-md border border-gray-100 bg-gray-50 p-4">
          <p className="text-xs text-gray-500">
            Evaluation scores are published to the EvaluationRegistry contract
            on Base. Once confirmed, scores and justifications will appear here
            automatically.
          </p>
        </div>
      </div>
    </div>
  );
}
