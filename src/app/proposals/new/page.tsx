import type { Metadata } from "next";
import { NewProposalTabs } from "@/components/proposals/new-proposal-tabs";

export const metadata: Metadata = {
  title: "Submit a Proposal | IPE City Grants",
};

export default function NewProposalPage() {
  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-8 text-2xl font-semibold leading-tight">
        Submit a Proposal
      </h1>
      <NewProposalTabs />
    </div>
  );
}
