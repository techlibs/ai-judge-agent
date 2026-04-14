"use client";

import { useChat } from "ai/react";
import { useState, useRef, useEffect, useCallback } from "react";
import type { ProposalFormData } from "./schema";
import type { GithubRepoData } from "@/evaluation/agents/tools/extract-github";

const INITIAL_MESSAGE = "Hi! I'm here to help you create a grant proposal for IPE City. Tell me about your project -- what are you building and why does it matter?";

interface ProposalPreviewProps {
  readonly proposal: ProposalFormData;
  readonly onSubmit: () => void;
  readonly isSubmitting: boolean;
}

function ProposalPreview({ proposal, onSubmit, isSubmitting }: ProposalPreviewProps) {
  return (
    <div className="rounded-lg border border-green-200 bg-green-50 p-4 mt-4">
      <h3 className="text-lg font-semibold text-green-800 mb-3">Proposal Ready for Submission</h3>
      <dl className="space-y-2 text-sm">
        <div>
          <dt className="font-medium text-gray-700">Title</dt>
          <dd className="text-gray-900">{proposal.title}</dd>
        </div>
        <div>
          <dt className="font-medium text-gray-700">Category</dt>
          <dd className="text-gray-900 capitalize">{proposal.category}</dd>
        </div>
        <div>
          <dt className="font-medium text-gray-700">Budget</dt>
          <dd className="text-gray-900">{proposal.budgetAmount.toLocaleString()} {proposal.budgetCurrency}</dd>
        </div>
        <div>
          <dt className="font-medium text-gray-700">Team</dt>
          <dd className="text-gray-900">
            {proposal.teamMembers.map((m) => m.role).join(", ")}
          </dd>
        </div>
        <div>
          <dt className="font-medium text-gray-700">Description</dt>
          <dd className="text-gray-900 line-clamp-3">{proposal.description}</dd>
        </div>
      </dl>
      <button
        type="button"
        onClick={onSubmit}
        disabled={isSubmitting}
        className="mt-4 w-full rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? "Submitting..." : "Submit Proposal"}
      </button>
    </div>
  );
}

interface GithubRepoCardProps {
  readonly repo: GithubRepoData;
}

function GithubRepoCard({ repo }: GithubRepoCardProps) {
  const topLanguages = Object.entries(repo.languages)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([lang]) => lang);

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 mt-2 text-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="font-semibold text-blue-900">{repo.name}</h4>
          {repo.description && (
            <p className="text-blue-700 mt-1">{repo.description}</p>
          )}
        </div>
        <div className="flex items-center gap-1 text-blue-600 shrink-0">
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
          <span>{repo.stars.toLocaleString()}</span>
        </div>
      </div>
      {topLanguages.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {topLanguages.map((lang) => (
            <span
              key={lang}
              className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800"
            >
              {lang}
            </span>
          ))}
        </div>
      )}
      {repo.topics.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {repo.topics.slice(0, 5).map((topic) => (
            <span
              key={topic}
              className="inline-flex items-center rounded-full bg-blue-200 px-2 py-0.5 text-xs text-blue-700"
            >
              {topic}
            </span>
          ))}
        </div>
      )}
      <p className="text-xs text-blue-500 mt-2">
        GitHub data extracted — the assistant will use this to pre-fill your proposal.
      </p>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-2">
      <div className="flex gap-1">
        <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce [animation-delay:0ms]" />
        <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce [animation-delay:150ms]" />
        <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce [animation-delay:300ms]" />
      </div>
      <span className="text-xs text-gray-500 ml-2">AI is thinking...</span>
    </div>
  );
}

export function ProposalChat() {
  const { messages, input, handleInputChange, handleSubmit, isLoading, error } = useChat({
    api: "/api/proposals/chat",
    initialMessages: [
      {
        id: "welcome",
        role: "assistant" as const,
        content: INITIAL_MESSAGE,
        parts: [{ type: "text" as const, text: INITIAL_MESSAGE }],
      },
    ],
  });

  const [extractedProposal, setExtractedProposal] = useState<ProposalFormData | null>(null);
  const [extractedRepos, setExtractedRepos] = useState<GithubRepoData[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ proposalId: string; detailUrl: string } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Watch for tool calls that extract a complete proposal or GitHub repo data
  useEffect(() => {
    const newRepos: GithubRepoData[] = [];

    for (const message of messages) {
      if (message.role !== "assistant") {
        continue;
      }
      for (const part of message.parts) {
        if (part.type !== "tool-invocation") {
          continue;
        }
        if (
          part.toolInvocation.toolName === "extractCompleteProposal" &&
          part.toolInvocation.state === "result" &&
          part.toolInvocation.result?.success === true &&
          part.toolInvocation.result?.proposal
        ) {
          setExtractedProposal(part.toolInvocation.result.proposal);
        }
        if (
          part.toolInvocation.toolName === "extractGithubRepo" &&
          part.toolInvocation.state === "result" &&
          part.toolInvocation.result?.name
        ) {
          newRepos.push(part.toolInvocation.result as GithubRepoData);
        }
      }
    }

    if (newRepos.length > 0) {
      setExtractedRepos(newRepos);
    }
  }, [messages]);

  const handleProposalSubmit = useCallback(async () => {
    if (!extractedProposal) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const formData = new FormData();
      formData.set("title", extractedProposal.title);
      formData.set("description", extractedProposal.description);
      formData.set("category", extractedProposal.category);
      formData.set("budgetAmount", String(extractedProposal.budgetAmount));
      formData.set("budgetCurrency", extractedProposal.budgetCurrency);
      formData.set("technicalDescription", extractedProposal.technicalDescription);
      formData.set("teamMembers", JSON.stringify(extractedProposal.teamMembers));
      formData.set("budgetBreakdown", JSON.stringify(extractedProposal.budgetBreakdown));

      const response = await fetch("/api/proposals/submit", {
        method: "POST",
        body: formData,
      });

      const result: unknown = await response.json();

      if (response.ok && typeof result === "object" && result !== null && "proposalId" in result) {
        const typed = result as { proposalId: string; detailUrl: string };
        setSubmitResult({ proposalId: typed.proposalId, detailUrl: typed.detailUrl });
      } else {
        const errorResult = result as { error?: string };
        setSubmitError(errorResult.error ?? "Submission failed. Please try again.");
      }
    } catch {
      setSubmitError("Network error. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }, [extractedProposal]);

  if (submitResult) {
    return (
      <div className="rounded-md bg-green-50 p-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-lg font-semibold text-green-800">Proposal Submitted Successfully</h3>
            <p className="mt-2 text-sm text-green-700">
              Your proposal has been submitted and is being evaluated by our AI judges.
            </p>
            <p className="mt-1 text-sm text-green-700">
              Proposal ID: <code className="font-mono text-xs">{submitResult.proposalId}</code>
            </p>
            <div className="mt-4">
              <a
                href={submitResult.detailUrl}
                className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-500"
              >
                View Proposal
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[600px] rounded-lg border border-gray-200 bg-white">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${
                message.role === "user"
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-900"
              }`}
            >
              <div className="whitespace-pre-wrap">
                {message.parts
                  .filter((part) => part.type === "text")
                  .map((part, index) => (
                    <span key={index}>
                      {part.type === "text" ? part.text : null}
                    </span>
                  ))}
              </div>
            </div>
          </div>
        ))}
        {isLoading && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* GitHub repo cards */}
      {extractedRepos.length > 0 && (
        <div className="px-4 space-y-2">
          {extractedRepos.map((repo) => (
            <GithubRepoCard key={repo.url} repo={repo} />
          ))}
        </div>
      )}

      {/* Extracted proposal preview */}
      {extractedProposal && !submitResult && (
        <div className="px-4">
          <ProposalPreview
            proposal={extractedProposal}
            onSubmit={handleProposalSubmit}
            isSubmitting={isSubmitting}
          />
        </div>
      )}

      {/* Error display */}
      {(error ?? submitError) && (
        <div className="px-4 py-2">
          <p className="text-sm text-red-600">{error?.message ?? submitError}</p>
        </div>
      )}

      {/* Input area */}
      <form onSubmit={handleSubmit} className="border-t border-gray-200 p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            placeholder="Describe your project..."
            disabled={isLoading}
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || input.trim().length === 0}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
