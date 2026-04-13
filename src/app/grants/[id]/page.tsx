import { getProposalById } from "@/cache/queries";
import { sanitizeDisplayText } from "@/lib/sanitize-html";
import { ChainErrorBoundary } from "@/components/error-boundary";
import { notFound } from "next/navigation";
import Link from "next/link";

const DIMENSION_LABELS: Record<string, string> = {
  technical_feasibility: "Technical Feasibility",
  impact_potential: "Impact Potential",
  cost_efficiency: "Cost Efficiency",
  team_capability: "Team Capability",
};

interface ProposalDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProposalDetailPage({
  params,
}: ProposalDetailPageProps) {
  const { id } = await params;
  const proposal = await getProposalById(id);

  if (!proposal) {
    notFound();
  }

  const pinataGateway = process.env.PINATA_GATEWAY ?? "";
  const chainExplorerBase = "https://sepolia.basescan.org";

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/grants"
        className="mb-6 inline-flex items-center text-sm text-blue-600 hover:text-blue-500"
      >
        &larr; Back to proposals
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          {sanitizeDisplayText(proposal.title)}
        </h1>
        <div className="mt-3 flex items-center gap-3">
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
            {proposal.category}
          </span>
          <span className="text-sm text-gray-500">
            {proposal.budgetCurrency}{" "}
            {proposal.budgetAmount.toLocaleString()}
          </span>
          <span className="text-sm text-gray-500">
            Team size: {proposal.teamSize}
          </span>
        </div>
      </div>

      <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">Description</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">
          {sanitizeDisplayText(proposal.description)}
        </p>
      </div>

      <ChainErrorBoundary>
        {proposal.finalScore !== null && (
          <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Evaluation Score
              </h2>
              <div className="text-right">
                <div className="text-3xl font-bold text-gray-900">
                  {proposal.finalScore.toFixed(2)}
                </div>
                {proposal.adjustedScore !== null &&
                  proposal.adjustedScore !== proposal.finalScore && (
                    <div className="text-sm text-gray-500">
                      Adjusted: {proposal.adjustedScore.toFixed(2)}
                      {proposal.reputationMultiplier !== null && (
                        <span className="ml-1">
                          ({proposal.reputationMultiplier.toFixed(4)}x)
                        </span>
                      )}
                    </div>
                  )}
              </div>
            </div>
          </div>
        )}

        {proposal.dimensions.length > 0 && (
          <div className="mb-8 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Dimension Scores
            </h2>
            {proposal.dimensions.map((dim) => (
              <details
                key={dim.id}
                className="rounded-lg border border-gray-200 bg-white"
              >
                <summary className="cursor-pointer px-6 py-4">
                  <div className="inline-flex w-full items-center justify-between">
                    <span className="font-medium text-gray-900">
                      {DIMENSION_LABELS[dim.dimension] ?? dim.dimension}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-500">
                        Weight: {(dim.weight * 100).toFixed(0)}%
                      </span>
                      <span className="text-lg font-bold text-gray-900">
                        {dim.score.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </summary>
                <div className="border-t border-gray-100 px-6 py-4">
                  <h4 className="text-sm font-medium text-gray-700">
                    Reasoning
                  </h4>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600">
                    {sanitizeDisplayText(dim.reasoningChain)}
                  </p>
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-700">
                      Criteria Applied
                    </h4>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {(
                        JSON.parse(dim.rubricApplied) as {
                          criteria: string[];
                        }
                      ).criteria.map((criterion) => (
                        <span
                          key={criterion}
                          className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700"
                        >
                          {criterion}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-700">
                      Data Considered
                    </h4>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {(
                        JSON.parse(dim.inputDataConsidered) as string[]
                      ).map((field) => (
                        <span
                          key={field}
                          className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                        >
                          {field}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </details>
            ))}
          </div>
        )}
      </ChainErrorBoundary>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">Verification</h2>
        <div className="mt-4 space-y-3">
          {proposal.proposalContentCid && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Proposal (IPFS)</span>
              <a
                href={`https://${pinataGateway}/ipfs/${proposal.proposalContentCid}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline"
              >
                {proposal.proposalContentCid.slice(0, 20)}...
              </a>
            </div>
          )}
          {proposal.evaluationContentCid && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Evaluation (IPFS)</span>
              <a
                href={`https://${pinataGateway}/ipfs/${proposal.evaluationContentCid}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline"
              >
                {proposal.evaluationContentCid.slice(0, 20)}...
              </a>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">On-chain</span>
            <a
              href={`${chainExplorerBase}/address/${proposal.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline"
            >
              View on BaseScan
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
