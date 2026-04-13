import { ProposalForm } from "@/components/proposal-form";

export default function SubmitPage() {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Submit a Grant Proposal</h1>
        <p className="text-muted-foreground">
          Your proposal will be evaluated by 4 AI judges across Technical Feasibility,
          Impact Potential, Cost Efficiency, and Team Capability.
        </p>
      </div>
      <ProposalForm />
    </div>
  );
}
