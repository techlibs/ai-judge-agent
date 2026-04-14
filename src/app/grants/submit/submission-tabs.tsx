"use client";

import { useState } from "react";
import { ProposalChat } from "./proposal-chat";
import { ProposalSubmitForm } from "./form";

type SubmissionMode = "chat" | "form";

const TAB_STYLES = {
  active: "border-indigo-500 text-indigo-600",
  inactive: "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700",
} as const;

export function SubmissionTabs() {
  const [mode, setMode] = useState<SubmissionMode>("chat");

  return (
    <div>
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex gap-x-8" aria-label="Submission mode">
          <button
            type="button"
            onClick={() => setMode("chat")}
            className={`whitespace-nowrap border-b-2 py-3 px-1 text-sm font-medium ${
              mode === "chat" ? TAB_STYLES.active : TAB_STYLES.inactive
            }`}
            aria-current={mode === "chat" ? "page" : undefined}
          >
            Chat with AI
          </button>
          <button
            type="button"
            onClick={() => setMode("form")}
            className={`whitespace-nowrap border-b-2 py-3 px-1 text-sm font-medium ${
              mode === "form" ? TAB_STYLES.active : TAB_STYLES.inactive
            }`}
            aria-current={mode === "form" ? "page" : undefined}
          >
            Use Form
          </button>
        </nav>
      </div>

      {mode === "chat" && (
        <div>
          <p className="mb-4 text-sm text-gray-500">
            Describe your project and our AI assistant will help you build a complete proposal.
          </p>
          <ProposalChat />
        </div>
      )}

      {mode === "form" && <ProposalSubmitForm />}
    </div>
  );
}
