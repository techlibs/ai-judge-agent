import { SubmissionTabs } from "./submission-tabs";

export default function SubmitProposalPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Submit a Grant Proposal</h1>
        <p className="mt-2 text-sm text-gray-600">
          Submit your proposal for AI-powered evaluation across Technical Feasibility, Impact Potential, Cost Efficiency, and Team Capability.
        </p>
      </div>
      <SubmissionTabs />
    </div>
  );
}
